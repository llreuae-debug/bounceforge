import { ALL_FORMATS, BufferSource, EncodedPacketSink, Input } from 'mediabunny';
import { renderDropAudio, type DropMix, type PlayerSource } from './audio';
import { renderFrame, type RenderOptions } from './render';
import { DropRenderer3D } from './render3d';
import type { Scene } from './scene';

export type ExportPreset = '1080' | '1440' | '4k';

export const EXPORT_PRESETS: Record<ExportPreset, { label: string; width: number; height: number; bitrate: number; minBitrate: number }> = {
  // Encoder targets are set above the delivered minimums (1080p ≥ 12, 1440p ≥ 24, 4K ≥ 45 Mbps):
  // hardware encoders deliver roughly 80-95% of a constant-bitrate target on clean CG content
  '1080': { label: '1080p Fast', width: 1080, height: 1920, bitrate: 14e6, minBitrate: 12e6 },
  '1440': { label: '1440p', width: 1440, height: 2560, bitrate: 28e6, minBitrate: 24e6 },
  '4k': { label: '4K', width: 2160, height: 3840, bitrate: 66e6, minBitrate: 45e6 },
};

export interface ExportProgress {
  percent: number;
  etaSeconds: number;
  stage: 'audio' | 'video' | 'finishing' | 'verifying';
  fps?: number;
}

export interface ExportVerification {
  ok: boolean;
  width: number;
  height: number;
  duration: number;
  videoCodec: string;
  audioCodec: string | null;
  /** Audio vs video start offset in ms (what viewers would hear as drift) */
  driftMs: number;
  /** Audio track length minus video length in ms */
  tailMs: number;
  frames: number;
  fps: number;
  /** Largest gap between consecutive frame timestamps divided by the frame duration (1 = constant) */
  frameGapRatio: number;
  videoKbps: number;
  audioKbps: number;
  audioSampleRate: number;
  audioChannels: number;
  profile: string;
  fastStart: boolean;
  problems: string[];
}

export interface ExportResult {
  blob: Blob;
  url: string;
  filename: string;
  mime: string;
  ms: number;
  codec?: string;
  method: 'webcodecs-worker' | 'mediarecorder';
  verification: ExportVerification | null;
}

export interface ExportRequest {
  scene: Scene;
  render: RenderOptions;
  audio: PlayerSource;
  mix: DropMix;
  preset: ExportPreset;
  fps: 30 | 60;
  name: string;
  /** For the file name: bounceforge_[style]_[seed]_[res]_[fps]fps.mp4 */
  style: string;
  seed: number;
  use3d: boolean;
  onProgress: (p: ExportProgress) => void;
  signal: AbortSignal;
}

export function canUseWorkerExport(): boolean {
  return typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined' && typeof VideoEncoder !== 'undefined' && typeof AudioEncoder !== 'undefined';
}

/** Rough upfront estimate (refined live from the measured frame rate). */
export function estimateExportSeconds(preset: ExportPreset, fps: number, duration: number): number {
  const perFrame = preset === '4k' ? 0.04 : preset === '1440' ? 0.0085 : 0.0055;
  return Math.round(duration * fps * perFrame + 3);
}

export async function exportDropVideo(req: ExportRequest): Promise<ExportResult> {
  const t0 = performance.now();
  const { width, height, bitrate } = EXPORT_PRESETS[req.preset];
  const duration = req.audio.duration;
  req.onProgress({ percent: 1, etaSeconds: estimateExportSeconds(req.preset, req.fps, duration), stage: 'video' });
  // Audio renders on the main thread while the worker renders/encodes frames
  const audioP = renderDropAudio(req.audio, req.mix).then((a) => {
    console.info(`[drop export] audio rendered in ${(performance.now() - t0).toFixed(0)}ms`);
    return a;
  });
  const base = `bounceforge_${req.style}_${req.seed}_${width}x${height}_${req.fps}fps`;

  if (canUseWorkerExport()) {
    try {
      const buf = await runWorker(req, audioP, width, height, bitrate, duration);
      console.info(`[drop export] video encoded at ${(performance.now() - t0).toFixed(0)}ms`);
      const blob = new Blob([buf.buffer], { type: 'video/mp4' });
      req.onProgress({ percent: 98, etaSeconds: 0, stage: 'verifying' });
      const verification = await verifyExport(blob, width, height, duration, req.fps, EXPORT_PRESETS[req.preset].minBitrate);
      return { blob, url: URL.createObjectURL(blob), filename: `${base}.mp4`, mime: 'video/mp4', ms: performance.now() - t0, codec: buf.codec, method: 'webcodecs-worker', verification };
    } catch (e: any) {
      if (e?.name === 'AbortError') throw e;
      if (!/cannot encode/i.test(e?.message || '')) throw e;
      // fall through to MediaRecorder
    }
  }
  const audio = await audioP;
  if (req.signal.aborted) throw new DOMException('Export cancelled', 'AbortError');
  return recordRealtime(req, audio, width, height, duration, base, t0);
}

function runWorker(req: ExportRequest, audioP: Promise<AudioBuffer>, width: number, height: number, bitrate: number, duration: number): Promise<{ buffer: ArrayBuffer; codec: string }> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./exportWorker.ts', import.meta.url), { type: 'module' });
    const onAbort = () => worker.postMessage({ type: 'cancel' });
    req.signal.addEventListener('abort', onAbort);
    const finish = () => {
      req.signal.removeEventListener('abort', onAbort);
      worker.terminate();
    };
    worker.onmessage = (e) => {
      const m = e.data;
      if (m.type === 'progress') req.onProgress({ percent: m.percent, etaSeconds: Math.max(0, Math.round(m.eta)), stage: m.stage === 'audio' ? 'finishing' : 'video', fps: m.fps });
      else if (m.type === 'done') {
        finish();
        resolve({ buffer: m.buffer, codec: m.codec });
      } else if (m.type === 'cancelled') {
        finish();
        reject(new DOMException('Export cancelled', 'AbortError'));
      } else if (m.type === 'error') {
        finish();
        reject(new Error(m.message));
      }
    };
    worker.onerror = (e) => {
      finish();
      reject(new Error(e.message || 'Export worker failed to start'));
    };
    worker.postMessage({ type: 'start', job: { scene: req.scene, opts: req.render, width, height, fps: req.fps, duration, bitrate, minBitrate: EXPORT_PRESETS[req.preset].minBitrate, use3d: req.use3d } });
    audioP.then(
      (audio) => {
        const left = new Float32Array(audio.getChannelData(0));
        const right = new Float32Array(audio.numberOfChannels > 1 ? audio.getChannelData(1) : audio.getChannelData(0));
        worker.postMessage({ type: 'audio', left, right }, [left.buffer, right.buffer]);
      },
      (err) => {
        finish();
        reject(err);
      }
    );
  });
}

/** Reads the finished MP4 back: dimensions, frame rate, codecs, bitrates, faststart and A/V sync. */
export async function verifyExport(blob: Blob, width: number, height: number, duration: number, fps: number, minVideoBps = 0): Promise<ExportVerification> {
  const problems: string[] = [];
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const input = new Input({ formats: ALL_FORMATS, source: new BufferSource(bytes) });
  const video = await input.getPrimaryVideoTrack();
  const audio = (await input.getAudioTracks())[0] ?? null;
  const w = video ? await video.getDisplayWidth() : 0;
  const h = video ? await video.getDisplayHeight() : 0;
  const vDur = video ? await video.computeDuration() : 0;
  const aDur = audio ? await audio.computeDuration() : 0;
  const total = await input.computeDuration().catch(() => Math.max(vDur, aDur));
  const codecStr = video ? (await video.getCodecParameterString()) || '' : '';
  // Walk every video packet: count frames, check constant spacing, measure bitrate
  let frames = 0;
  let vBytes = 0;
  let maxGap = 0;
  let prev = -1;
  if (video) {
    const sink = new EncodedPacketSink(video);
    for await (const p of sink.packets()) {
      frames++;
      vBytes += p.byteLength;
      if (prev >= 0) maxGap = Math.max(maxGap, p.timestamp - prev);
      prev = p.timestamp;
    }
  }
  let aBytes = 0;
  if (audio) for await (const p of new EncodedPacketSink(audio).packets()) aBytes += p.byteLength;
  const sr = audio ? await audio.getSampleRate() : 0;
  const ch = audio ? await audio.getNumberOfChannels() : 0;
  // Fast start: the moov box comes before mdat
  const find = (tag: string) => {
    for (let i = 4; i < Math.min(bytes.length - 4, 64 * 1024 * 1024); i++) if (bytes[i] === tag.charCodeAt(0) && bytes[i + 1] === tag.charCodeAt(1) && bytes[i + 2] === tag.charCodeAt(2) && bytes[i + 3] === tag.charCodeAt(3)) return i;
    return -1;
  };
  const moov = find('moov');
  const mdat = find('mdat');
  const fastStart = moov >= 0 && (mdat < 0 || moov < mdat);
  const vStart = video ? await video.getFirstTimestamp() : 0;
  const aStart = audio ? await audio.getFirstTimestamp() : 0;
  // Negative first timestamps are encoder priming trimmed by the edit list: presentation starts at 0
  const driftMs = Math.abs(Math.max(0, aStart) - Math.max(0, vStart)) * 1000;
  const tailMs = (aDur - vDur) * 1000;
  const expectedFrames = Math.round(duration * fps);
  const videoKbps = (vBytes * 8) / Math.max(0.001, vDur) / 1000;
  const audioKbps = (aBytes * 8) / Math.max(0.001, aDur) / 1000;
  const profile = /^avc1\.64/i.test(codecStr) ? 'High' : /^avc1\.4d/i.test(codecStr) ? 'Main' : /^avc1\.42/i.test(codecStr) ? 'Baseline' : codecStr;

  if (!video) problems.push('No video track.');
  if (w !== width || h !== height) problems.push(`Video is ${w}×${h}, expected ${width}×${height}.`);
  if (Math.abs(total - duration) > 0.05) problems.push(`Duration ${total.toFixed(3)}s, expected ${duration.toFixed(3)}s.`);
  if (frames !== expectedFrames) problems.push(`${frames} frames, expected ${expectedFrames} (${fps} fps).`);
  if (maxGap * fps > 1.01) problems.push(`Frame spacing not constant (largest gap ${(maxGap * 1000).toFixed(1)}ms).`);
  if (profile !== 'High') problems.push(`H.264 profile is ${profile}, expected High.`);
  if (!fastStart) problems.push('MP4 is not fast-start (moov after mdat).');
  if (minVideoBps && videoKbps * 1000 < minVideoBps) problems.push(`Video bitrate ${(videoKbps / 1000).toFixed(1)} Mbps is below ${(minVideoBps / 1e6).toFixed(0)} Mbps.`);
  if (!audio) problems.push('No audio track.');
  else {
    if (sr !== 48000 || ch !== 2) problems.push(`Audio is ${sr} Hz × ${ch} ch, expected 48000 Hz stereo.`);
    if (driftMs > 1) problems.push(`Audio starts ${driftMs.toFixed(1)}ms away from the video.`);
    if (Math.abs(tailMs) > 1000 / fps) problems.push(`Audio/video lengths differ by ${tailMs.toFixed(1)}ms.`);
  }
  return {
    ok: problems.length === 0,
    width: w,
    height: h,
    duration: total,
    videoCodec: codecStr || (video ? String(await video.getCodec()) : 'none'),
    audioCodec: audio ? String((await audio.getCodecParameterString()) || (await audio.getCodec()) || 'unknown') : null,
    driftMs,
    tailMs,
    frames,
    fps: frames / Math.max(0.001, vDur),
    frameGapRatio: maxGap * fps,
    videoKbps,
    audioKbps,
    audioSampleRate: sr,
    audioChannels: ch,
    profile,
    fastStart,
    problems,
  };
}

/** Fallback for browsers without WebCodecs: real-time capture driven by the audio clock. */
async function recordRealtime(req: ExportRequest, audio: AudioBuffer, width: number, height: number, duration: number, base: string, t0: number): Promise<ExportResult> {
  if (typeof MediaRecorder === 'undefined') throw new Error('This browser can not export video (no WebCodecs or MediaRecorder).');
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  let r3d: DropRenderer3D | null = null;
  if (req.use3d) {
    try {
      const gl = document.createElement('canvas');
      r3d = new DropRenderer3D(gl, width, height);
    } catch {
      r3d = null;
    }
  }
  const ac = new AudioContext({ sampleRate: 48000 });
  const dest = ac.createMediaStreamDestination();
  const src = ac.createBufferSource();
  src.buffer = audio;
  src.connect(dest);
  const stream = canvas.captureStream(req.fps);
  dest.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));
  const mime = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m)) || 'video/webm';
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: EXPORT_PRESETS[req.preset].bitrate });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<void>((r) => (rec.onstop = () => r()));
  rec.start(500);
  const start = ac.currentTime + 0.1;
  src.start(start);
  await new Promise<void>((resolve) => {
    const tick = () => {
      if (req.signal.aborted) return resolve();
      const t = ac.currentTime - start;
      if (t >= duration) return resolve();
      const tt = Math.max(0, t);
      if (r3d) r3d.composite(ctx, req.scene, tt, req.render);
      else renderFrame(ctx, req.scene, tt, width, height, req.render);
      req.onProgress({ percent: (tt / duration) * 95, etaSeconds: Math.round(duration - tt), stage: 'video' });
      requestAnimationFrame(tick);
    };
    tick();
  });
  rec.stop();
  await done;
  src.stop();
  void ac.close();
  r3d?.dispose();
  if (req.signal.aborted) throw new DOMException('Export cancelled', 'AbortError');
  const blob = new Blob(chunks, { type: mime.split(';')[0] });
  const ext = mime.includes('mp4') ? 'mp4' : 'webm';
  return { blob, url: URL.createObjectURL(blob), filename: `${base}.${ext}`, mime, ms: performance.now() - t0, method: 'mediarecorder', verification: null };
}
