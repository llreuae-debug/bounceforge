/// <reference lib="webworker" />
import { AudioSample, AudioSampleSource, BufferTarget, EncodedAudioPacketSource, EncodedPacket, EncodedVideoPacketSource, Mp4OutputFormat, Output, canEncodeAudio } from 'mediabunny';
import { registerAacEncoder } from '@mediabunny/aac-encoder';
import { renderFrame, type RenderOptions } from './render';
import { DropRenderer3D } from './render3d';
import type { Scene } from './scene';

/**
 * Background export: renders every frame on an OffscreenCanvas (3D + overlays) and encodes
 * H.264 High (constant bitrate) + AAC-LC 320 kbps into a fast-start MP4, off the main thread.
 * Frame i is rendered at exactly i / fps and the audio is the pre-rendered 48kHz mix. The muxer
 * writes an edit list that removes the AAC encoder priming, so sound and picture start together.
 */

export interface ExportJob {
  scene: Scene;
  opts: RenderOptions;
  width: number;
  height: number;
  fps: number;
  duration: number;
  bitrate: number;
  /** Delivered bitrate floor (quantizer mode lowers QP until the running bitrate stays above it) */
  minBitrate: number;
  use3d: boolean;
}

let cancelled = false;
const AAC_BPS = 320000;
/** Standard AAC-LC encoder delay (2112 samples, Apple AudioToolbox / most encoders) when it can't be measured */
const DEFAULT_AAC_PRIMING = 2112 / 48000;
const AAC_CONFIG: AudioEncoderConfig = { codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: AAC_BPS, bitrateMode: 'constant' };

async function nativeAacSupported(): Promise<boolean> {
  if (typeof AudioEncoder === 'undefined' || typeof AudioDecoder === 'undefined') return false;
  try {
    return !!(await AudioEncoder.isConfigSupported(AAC_CONFIG)).supported;
  } catch {
    return false;
  }
}

function planarChunk(left: Float32Array, right: Float32Array, off: number, n: number, at = off): AudioData {
  const planar = new Float32Array(n * 2);
  planar.set(left.subarray(off, off + n), 0);
  planar.set(right.subarray(off, off + n), n);
  return new AudioData({ format: 'f32-planar', sampleRate: 48000, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round((at * 1e6) / 48000), data: planar });
}

/** Encode an impulse and decode it again: the shift is the encoder's priming delay (in seconds). */
async function measureAacPriming(): Promise<number> {
  const n = 48000 / 2;
  const at = 9600;
  const l = new Float32Array(n);
  l[at] = 0.9;
  const chunks: EncodedAudioChunk[] = [];
  let decoderConfig: AudioDecoderConfig | undefined;
  const enc = new AudioEncoder({
    output: (c, m) => {
      chunks.push(c);
      if (m?.decoderConfig) decoderConfig = m.decoderConfig;
    },
    error: () => {},
  });
  enc.configure(AAC_CONFIG);
  enc.encode(planarChunk(l, l, 0, n));
  await enc.flush();
  enc.close();
  if (!decoderConfig) return DEFAULT_AAC_PRIMING;
  const out: Float32Array[] = [];
  const dec = new AudioDecoder({
    output: (d) => {
      const buf = new Float32Array(d.numberOfFrames);
      d.copyTo(buf, { planeIndex: 0, format: 'f32-planar' });
      out.push(buf);
      d.close();
    },
    error: () => {},
  });
  try {
    dec.configure(decoderConfig);
    for (const c of chunks) dec.decode(c);
    await dec.flush();
  } catch {
    // Some browsers (WebKit) can't decode their own AAC here: use the standard encoder delay
    return DEFAULT_AAC_PRIMING;
  } finally {
    if (dec.state !== 'closed') dec.close();
  }
  let i = 0;
  let best = -1;
  let bestV = 0;
  for (const b of out) for (let k = 0; k < b.length; k++, i++) if (Math.abs(b[k]) > bestV) { bestV = Math.abs(b[k]); best = i; }
  const shift = best - at;
  return shift > 0 && shift < 8192 ? shift / 48000 : DEFAULT_AAC_PRIMING;
}

/**
 * Native AAC: packets are shifted back by the measured priming, so the MP4 edit list trims it and
 * decoded audio lines up with frame 0; packets past the end are dropped (≤ 1 AAC frame of slack).
 */
async function encodeAacPackets(src: EncodedAudioPacketSource, left: Float32Array, right: Float32Array, duration: number, priming: number): Promise<void> {
  const pending: { chunk: EncodedAudioChunk; meta?: EncodedAudioChunkMetadata }[] = [];
  let err: Error | null = null;
  const enc = new AudioEncoder({ output: (chunk, meta) => pending.push({ chunk, meta }), error: (e) => (err = e as Error) });
  enc.configure(AAC_CONFIG);
  const samples = Math.round(duration * 48000);
  // Feed the priming length of extra silence at the end so the last real samples are flushed out
  const padded = samples + Math.round(priming * 48000) + 1024;
  for (let off = 0; off < padded; off += 4096) {
    const n = Math.min(4096, padded - off);
    if (off >= samples) {
      const z = new Float32Array(n);
      enc.encode(planarChunk(z, z, 0, n, off));
    } else if (off + n > samples) {
      // Last partial chunk: real samples, then silence
      const l = new Float32Array(n);
      const r = new Float32Array(n);
      l.set(left.subarray(off, samples));
      r.set(right.subarray(off, samples));
      enc.encode(planarChunk(l, r, 0, n, off));
    } else enc.encode(planarChunk(left, right, off, n));
  }
  await enc.flush();
  enc.close();
  if (err) throw err;
  // We always encode AAC-LC 48kHz stereo, so write that AudioSpecificConfig ourselves (some
  // browsers report a wrong one, which leaves the track undecodable): 2 (LC) | 3 (48k) | 2 (stereo)
  const asc: EncodedAudioChunkMetadata = {
    decoderConfig: { codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, description: new Uint8Array([0x11, 0x90]) },
  };
  let first = true;
  for (const { chunk } of pending) {
    const p = EncodedPacket.fromEncodedChunk(chunk);
    const ts = p.timestamp - priming;
    if (ts >= duration - 1e-6) break;
    // Clip the last packet so the track ends exactly at the video's end
    const dur = Math.min(p.duration, duration - ts);
    await src.add(p.clone({ timestamp: ts, duration: dur }), first ? asc : undefined);
    first = false;
  }
}
// The audio mix is rendered on the main thread in parallel and arrives while frames encode
let audioReady: (a: { left: Float32Array; right: Float32Array }) => void = () => {};
let audioPromise = new Promise<{ left: Float32Array; right: Float32Array }>((r) => (audioReady = r));

function candidates(width: number, fps: number): string[] {
  if (width >= 2160) return ['avc1.640034', 'avc1.640033'];
  if (width >= 1440) return fps > 30 ? ['avc1.640033', 'avc1.640034'] : ['avc1.640032', 'avc1.640033'];
  return fps > 30 ? ['avc1.64002a', 'avc1.640032'] : ['avc1.640028', 'avc1.64002a'];
}

interface VideoPlan {
  config: VideoEncoderConfig;
  quantizer: boolean;
}

/** H.264 High: quantizer mode (constant quality, bitrate floor enforced) where supported, else CBR. */
async function pickVideo(job: ExportJob): Promise<VideoPlan> {
  for (const codec of candidates(job.width, job.fps)) {
    for (const hw of ['prefer-hardware', 'no-preference', 'prefer-software'] as const) {
      // Quantizer mode is honoured by Chromium encoders; other engines accept the config but ignore
      // the per-frame QP, so they use constant bitrate instead
      const chromium = /Chrome|Chromium|Edg\//.test(self.navigator.userAgent);
      for (const quantizer of chromium ? [true, false] : [false]) {
        const config: VideoEncoderConfig = {
          codec,
          width: job.width,
          height: job.height,
          framerate: job.fps,
          hardwareAcceleration: hw,
          latencyMode: 'quality',
          avc: { format: 'avc' },
          ...(quantizer ? { bitrateMode: 'quantizer' as const } : { bitrate: job.bitrate, bitrateMode: 'constant' as const }),
        };
        try {
          const r = await VideoEncoder.isConfigSupported(config);
          if (r.supported) return { config, quantizer };
        } catch {
          /* next */
        }
      }
    }
  }
  throw new Error(`This browser cannot encode H.264 High at ${job.width}×${job.height} ${job.fps}fps. Try a lower resolution.`);
}

async function run(job: ExportJob): Promise<void> {
  cancelled = false;
  const t0 = performance.now();
  const plan = await pickVideo(job);
  const codec = plan.config.codec;
  const hw = plan.config.hardwareAcceleration;
  const nativeAac = await nativeAacSupported();
  if (!nativeAac && !(await canEncodeAudio('aac', { numberOfChannels: 2, sampleRate: 48000, bitrate: AAC_BPS }))) registerAacEncoder();
  // Measure this browser's AAC encoder delay so the edit list can cancel it exactly
  const priming = nativeAac ? await measureAacPriming().catch(() => DEFAULT_AAC_PRIMING) : 0;

  const out = new OffscreenCanvas(job.width, job.height);
  const ctx = out.getContext('2d', { alpha: false }) as OffscreenCanvasRenderingContext2D;
  let r3d: DropRenderer3D | null = null;
  if (job.use3d) {
    try {
      r3d = new DropRenderer3D(new OffscreenCanvas(job.width, job.height), job.width, job.height, { shadowSize: job.width >= 2160 ? 2048 : 1536, maxCached: 2 });
    } catch {
      r3d = null;
    }
  }

  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() });
  const video = new EncodedVideoPacketSource('avc');
  let vErr: Error | null = null;
  // Packets are muxed strictly in encoder output order
  let vChain: Promise<void> = Promise.resolve();
  let firstMeta = true;
  let windowBytes = 0;
  const venc = new VideoEncoder({
    output: (chunk, meta) => {
      windowBytes += chunk.byteLength;
      const packet = EncodedPacket.fromEncodedChunk(chunk);
      const m = firstMeta ? meta : undefined;
      firstMeta = false;
      vChain = vChain.then(() => video.add(packet, m));
    },
    error: (e) => (vErr = e as Error),
  });
  venc.configure(plan.config);
  // Quantizer start points (lower = better); the loop below only ever spends more bits to meet the floor
  let qp = job.width >= 2160 ? 12 : job.width >= 1440 ? 15 : 17;
  const floorBytesPerSec = (job.minBitrate * 1.12) / 8;
  const audio = nativeAac ? new EncodedAudioPacketSource('aac') : new AudioSampleSource({ codec: 'aac', bitrate: AAC_BPS });
  output.addVideoTrack(video, { frameRate: job.fps });
  output.addAudioTrack(audio);
  await output.start();

  const total = Math.round(job.duration * job.fps);
  let lastPost = 0;
  const rateWindow: [number, number][] = [];
  for (let i = 0; i < total; i++) {
    if (cancelled) {
      venc.close();
      await output.cancel();
      r3d?.dispose();
      self.postMessage({ type: 'cancelled' });
      return;
    }
    const t = i / job.fps;
    if (r3d) r3d.composite(ctx, job.scene, t, job.opts);
    else renderFrame(ctx, job.scene, t, job.width, job.height, job.opts);
    const frame = new VideoFrame(out, { timestamp: Math.round((i * 1e6) / job.fps), duration: Math.round(1e6 / job.fps) });
    venc.encode(frame, plan.quantizer ? { keyFrame: i % (job.fps * 2) === 0, avc: { quantizer: qp } } : { keyFrame: i % (job.fps * 2) === 0 });
    frame.close();
    while (venc.encodeQueueSize > 6) await new Promise((r) => setTimeout(r, 1));
    if (vErr) throw vErr;
    if (plan.quantizer && (i + 1) % job.fps === 0) {
      // Once per second: keep the delivered bitrate above the floor
      if (windowBytes < floorBytesPerSec) qp = Math.max(2, qp - (windowBytes < floorBytesPerSec * 0.7 ? 2 : 1));
      else if (windowBytes > floorBytesPerSec * 2.2) qp = Math.min(30, qp + 1);
      windowBytes = 0;
    }
    const now = performance.now();
    if (now - lastPost > 250 || i === total - 1) {
      lastPost = now;
      // ETA from the recent frame rate (start-up and encoder warm-up would skew a running average)
      rateWindow.push([now, i + 1]);
      while (rateWindow.length > 2 && now - rateWindow[0][0] > 3000) rateWindow.shift();
      const [w0t, w0f] = rateWindow[0];
      const rate = rateWindow.length > 1 && now > w0t ? ((i + 1 - w0f) * 1000) / (now - w0t) : (i + 1) / Math.max(0.001, (now - t0) / 1000);
      self.postMessage({ type: 'progress', frame: i + 1, total, percent: ((i + 1) / total) * 92, eta: (total - i - 1) / rate + 1.5, fps: rate });
      // Yield so a cancel message can arrive
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  await venc.flush();
  venc.close();
  await vChain;
  if (vErr) throw vErr;
  video.close();
  r3d?.dispose();

  // Audio: the pre-rendered mix, exactly duration * 48000 samples
  self.postMessage({ type: 'progress', frame: total, total, percent: 94, eta: 1, stage: 'audio' });
  const { left, right } = await audioPromise;
  if (audio instanceof EncodedAudioPacketSource) {
    await encodeAacPackets(audio, left, right, job.duration, priming);
  } else {
    const samples = Math.round(job.duration * 48000);
    for (let off = 0; off < samples; off += 48000) {
      const n = Math.min(48000, samples - off);
      const planar = new Float32Array(n * 2);
      planar.set(left.subarray(off, off + n), 0);
      planar.set(right.subarray(off, off + n), n);
      const smp = new AudioSample({ data: planar, format: 'f32-planar', numberOfChannels: 2, sampleRate: 48000, timestamp: off / 48000 });
      await audio.add(smp);
      smp.close();
    }
  }
  audio.close();
  await output.finalize();
  const buffer = (output.target as BufferTarget).buffer!;
  self.postMessage({ type: 'done', buffer, codec, hw, ms: performance.now() - t0 }, [buffer]);
}

self.onmessage = (e: MessageEvent) => {
  const m = e.data;
  if (m.type === 'cancel') {
    cancelled = true;
    return;
  }
  if (m.type === 'audio') {
    audioReady({ left: m.left, right: m.right });
    return;
  }
  if (m.type === 'start') {
    audioPromise = new Promise((r) => (audioReady = r));
    run(m.job as ExportJob).catch((err) => self.postMessage({ type: 'error', message: err?.message || String(err) }));
  }
};
