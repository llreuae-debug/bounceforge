/// <reference lib="webworker" />
import { ArrayBufferTarget, Muxer } from 'mp4-muxer';
import { renderFrame, type RenderOptions } from './render';
import { DropRenderer3D } from './render3d';
import type { Scene } from './scene';

/**
 * Background export: renders every frame on an OffscreenCanvas (3D + overlays) and encodes
 * H.264 + AAC with WebCodecs into an MP4, off the main thread. Frame i is rendered at exactly
 * i / fps and the audio is the pre-rendered 48kHz mix, so video and audio cannot drift.
 */

export interface ExportJob {
  scene: Scene;
  opts: RenderOptions;
  width: number;
  height: number;
  fps: number;
  duration: number;
  bitrate: number;
  left: Float32Array;
  right: Float32Array;
  use3d: boolean;
}

let cancelled = false;

function candidates(width: number, fps: number): string[] {
  if (width >= 2160) return ['avc1.640034', 'avc1.640033', 'avc1.4d4034', 'avc1.64002a'];
  if (width >= 1440) return ['avc1.640033', 'avc1.640032', 'avc1.4d4032', 'avc1.64002a'];
  return fps > 30 ? ['avc1.64002a', 'avc1.640029', 'avc1.4d402a'] : ['avc1.640028', 'avc1.64002a', 'avc1.4d4028', 'avc1.42e028'];
}

async function pickConfig(job: ExportJob): Promise<VideoEncoderConfig> {
  for (const codec of candidates(job.width, job.fps)) {
    for (const hw of ['prefer-hardware', 'no-preference'] as const) {
      const cfg: VideoEncoderConfig = { codec, width: job.width, height: job.height, bitrate: job.bitrate, framerate: job.fps, hardwareAcceleration: hw, avc: { format: 'avc' } };
      try {
        const r = await VideoEncoder.isConfigSupported(cfg);
        if (r.supported) return { ...cfg, ...(r.config as VideoEncoderConfig) };
      } catch {
        /* try the next one */
      }
    }
  }
  throw new Error(`This browser cannot encode H.264 at ${job.width}×${job.height}. Try a lower resolution.`);
}

async function run(job: ExportJob): Promise<void> {
  cancelled = false;
  const t0 = performance.now();
  const config = await pickConfig(job);
  const aacOk = typeof AudioEncoder !== 'undefined' && (await AudioEncoder.isConfigSupported({ codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 192000 }).catch(() => ({ supported: false }))).supported;
  if (!aacOk) throw new Error('NO_AAC');

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: { codec: 'avc', width: job.width, height: job.height, frameRate: job.fps },
    audio: { codec: 'aac', sampleRate: 48000, numberOfChannels: 2 },
    fastStart: 'in-memory',
    firstTimestampBehavior: 'offset',
  });
  let encErr: Error | null = null;
  const venc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => (encErr = e as Error) });
  venc.configure(config);

  const out = new OffscreenCanvas(job.width, job.height);
  const ctx = out.getContext('2d', { alpha: false }) as OffscreenCanvasRenderingContext2D;
  let r3d: DropRenderer3D | null = null;
  if (job.use3d) {
    try {
      r3d = new DropRenderer3D(new OffscreenCanvas(job.width, job.height), job.width, job.height, { shadowSize: job.width >= 2160 ? 2048 : 1536 });
    } catch {
      r3d = null;
    }
  }

  const total = Math.round(job.duration * job.fps);
  let lastPost = 0;
  for (let i = 0; i < total; i++) {
    if (cancelled) {
      venc.close();
      r3d?.dispose();
      self.postMessage({ type: 'cancelled' });
      return;
    }
    if (encErr) throw encErr;
    const t = i / job.fps;
    if (r3d) r3d.composite(ctx, job.scene, t, job.opts);
    else renderFrame(ctx, job.scene, t, job.width, job.height, job.opts);
    const frame = new VideoFrame(out, { timestamp: Math.round((i * 1e6) / job.fps), duration: Math.round(1e6 / job.fps) });
    venc.encode(frame, { keyFrame: i % (job.fps * 2) === 0 });
    frame.close();
    while (venc.encodeQueueSize > 8) await new Promise((r) => setTimeout(r, 2));
    const now = performance.now();
    if (now - lastPost > 250 || i === total - 1) {
      lastPost = now;
      const elapsed = (now - t0) / 1000;
      const rate = (i + 1) / Math.max(0.001, elapsed);
      self.postMessage({ type: 'progress', frame: i + 1, total, percent: ((i + 1) / total) * 92, eta: (total - i - 1) / rate + 1.5, fps: rate });
      // Yield so a cancel message can arrive
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  await venc.flush();
  venc.close();
  r3d?.dispose();

  // Audio: the pre-rendered mix, exactly duration * 48000 samples
  self.postMessage({ type: 'progress', frame: total, total, percent: 94, eta: 1, stage: 'audio' });
  const aenc = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: (e) => (encErr = e as Error) });
  aenc.configure({ codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: job.width >= 1440 ? 256000 : 192000 });
  const samples = Math.round(job.duration * 48000);
  const chunk = 4096;
  for (let off = 0; off < samples; off += chunk) {
    const n = Math.min(chunk, samples - off);
    const planar = new Float32Array(n * 2);
    planar.set(job.left.subarray(off, off + n), 0);
    planar.set(job.right.subarray(off, off + n), n);
    const ad = new AudioData({ format: 'f32-planar', sampleRate: 48000, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round((off * 1e6) / 48000), data: planar });
    aenc.encode(ad);
    ad.close();
  }
  await aenc.flush();
  aenc.close();
  if (encErr) throw encErr;
  muxer.finalize();
  const buffer = target.buffer;
  self.postMessage({ type: 'done', buffer, codec: config.codec, hw: config.hardwareAcceleration, ms: performance.now() - t0 }, [buffer]);
}

self.onmessage = (e: MessageEvent) => {
  const m = e.data;
  if (m.type === 'cancel') {
    cancelled = true;
    return;
  }
  if (m.type === 'start') {
    run(m.job as ExportJob).catch((err) => self.postMessage({ type: 'error', message: err?.message || String(err) }));
  }
};
