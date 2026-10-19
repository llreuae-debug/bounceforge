import { ALL_FORMATS, BufferSource, Input } from 'mediabunny';
import { renderDropAudio, type DropMix, type PlayerSource } from './audio';
import { renderFrame, type RenderOptions } from './render';
import { DropRenderer3D } from './render3d';
import type { Scene } from './scene';

export type ExportPreset = '1080' | '1440' | '4k';

export const EXPORT_PRESETS: Record<ExportPreset, { label: string; width: number; height: number; bitrate: number }> = {
  '1080': { label: '1080p Fast', width: 1080, height: 1920, bitrate: 12e6 },
  '1440': { label: '1440p', width: 1440, height: 2560, bitrate: 22e6 },
  '4k': { label: '4K', width: 2160, height: 3840, bitrate: 45e6 },
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
  /** |video duration − audio duration| in ms */
  driftMs: number;
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
  use3d: boolean;
  onProgress: (p: ExportProgress) => void;
  signal: AbortSignal;
}

export function canUseWorkerExport(): boolean {
  return typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined' && typeof VideoEncoder !== 'undefined' && typeof AudioEncoder !== 'undefined';
}

/** Rough upfront estimate (refined live from the measured frame rate). */
export function estimateExportSeconds(preset: ExportPreset, fps: number, duration: number): number {
  const perFrame = preset === '4k' ? 0.028 : preset === '1440' ? 0.014 : 0.007;
  return Math.round(duration * fps * perFrame + 3);
}

export async function exportDropVideo(req: ExportRequest): Promise<ExportResult> {
  const t0 = performance.now();
  const { width, height, bitrate } = EXPORT_PRESETS[req.preset];
  const duration = req.audio.duration;
  req.onProgress({ percent: 1, etaSeconds: estimateExportSeconds(req.preset, req.fps, duration), stage: 'audio' });
  const audio = await renderDropAudio(req.audio, req.mix);
  if (req.signal.aborted) throw new DOMException('Export cancelled', 'AbortError');
  const base = `bounceforge3d_${req.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}_${width}x${height}_${req.fps}fps`;

  if (canUseWorkerExport()) {
    try {
      const buf = await runWorker(req, audio, width, height, bitrate, duration);
      const blob = new Blob([buf.buffer], { type: 'video/mp4' });
      req.onProgress({ percent: 98, etaSeconds: 0, stage: 'verifying' });
      const verification = await verifyExport(blob, width, height, duration, req.fps);
      return { blob, url: URL.createObjectURL(blob), filename: `${base}.mp4`, mime: 'video/mp4', ms: performance.now() - t0, codec: buf.codec, method: 'webcodecs-worker', verification };
    } catch (e: any) {
      if (e?.name === 'AbortError') throw e;
      if (e?.message !== 'NO_AAC' && !/cannot encode/i.test(e?.message || '')) throw e;
      // fall through to MediaRecorder
    }
  }
  return recordRealtime(req, audio, width, height, duration, base, t0);
}

function runWorker(req: ExportRequest, audio: AudioBuffer, width: number, height: number, bitrate: number, duration: number): Promise<{ buffer: ArrayBuffer; codec: string }> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./exportWorker.ts', import.meta.url), { type: 'module' });
    const left = new Float32Array(audio.getChannelData(0));
    const right = new Float32Array(audio.numberOfChannels > 1 ? audio.getChannelData(1) : audio.getChannelData(0));
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
    worker.postMessage(
      { type: 'start', job: { scene: req.scene, opts: req.render, width, height, fps: req.fps, duration, bitrate, left, right, use3d: req.use3d } },
      [left.buffer, right.buffer]
    );
  });
}

/** Reads the finished MP4 back: dimensions, duration, codecs and audio/video drift. */
export async function verifyExport(blob: Blob, width: number, height: number, duration: number, fps: number): Promise<ExportVerification> {
  const problems: string[] = [];
  const input = new Input({ formats: ALL_FORMATS, source: new BufferSource(await blob.arrayBuffer()) });
  const video = await input.getPrimaryVideoTrack();
  const audio = (await input.getAudioTracks())[0] ?? null;
  const w = video ? await video.getDisplayWidth() : 0;
  const h = video ? await video.getDisplayHeight() : 0;
  const vDur = video ? await video.computeDuration() : 0;
  const aDur = audio ? await audio.computeDuration() : 0;
  const total = await input.computeDuration().catch(() => Math.max(vDur, aDur));
  if (!video) problems.push('No video track.');
  if (w !== width || h !== height) problems.push(`Video is ${w}×${h}, expected ${width}×${height}.`);
  if (Math.abs(total - duration) > 0.15) problems.push(`Duration ${total.toFixed(2)}s, expected ${duration.toFixed(2)}s.`);
  if (!audio) problems.push('No audio track.');
  const driftMs = Math.abs(vDur - aDur) * 1000;
  // AAC frames are 1024 samples (21ms): allow one AAC frame + one video frame
  if (audio && driftMs > 1000 / fps + 25) problems.push(`Audio/video lengths differ by ${driftMs.toFixed(0)}ms.`);
  return {
    ok: problems.length === 0,
    width: w,
    height: h,
    duration: total,
    videoCodec: video ? String((await video.getCodec()) || 'unknown') : 'none',
    audioCodec: audio ? String((await audio.getCodec()) || 'unknown') : null,
    driftMs,
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
