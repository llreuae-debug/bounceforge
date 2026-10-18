import { Muxer, ArrayBufferTarget, FileSystemWritableFileStreamTarget } from 'mp4-muxer';
import { PhysicsWorld } from '../engine/world';
import { getModeById } from '../modes/registry';
import { WorldRenderer, VisualSettings } from '../render/renderer';
import { OverlaySettings, drawOverlays } from '../render/overlays';
import { AudioSettings, NoteItem } from '../audio/types';
import { renderOfflineAudio } from '../audio/offlineRender';
import { withTargetDuration } from '../engine/duration';
import { requestWakeLock, releaseWakeLock } from '../platform/wakeLock';
import { ensureFontLoaded } from '../i18n/fonts';
import type { BallPhysicsSettings, WallControlsSettings, CustomBallConfig } from '../presets/presetService';

export interface ExportConfig {
  width: number;
  height: number;
  fps: number;
  duration: number; // in seconds
  seed: number;
  modeId: string;
  modeSettings: Record<string, any>;
  visuals: VisualSettings;
  overlays: OverlaySettings;
  audioSettings: AudioSettings;
  ballPhysics?: Partial<BallPhysicsSettings>;
  wallControls?: Partial<WallControlsSettings>;
  customBall?: Partial<CustomBallConfig>;
  customNotes?: NoteItem[];
  bitrate?: number;
  fileHandle?: any; // FileSystemFileHandle for Chrome/Edge direct streaming
}

export interface ExportProgress {
  frame: number;
  totalFrames: number;
  percent: number;
  stage: 'physics' | 'audio' | 'video' | 'muxing' | 'complete';
  etaSeconds: number;
  previewDataUrl?: string;
  codecChosen?: string;
  pausedMessage?: string;
  isPaused?: boolean;
  isQuickRecord?: boolean;
}

export function checkGpu4KCapability(): { canDo4K: boolean; maxTextureSize: number; reason?: string } {
  if (typeof window === 'undefined') return { canDo4K: true, maxTextureSize: 8192 };
  try {
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
    if (!gl) {
      return { canDo4K: false, maxTextureSize: 2048, reason: 'WebGL is disabled or unavailable' };
    }
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;
    if (maxTextureSize < 3840) {
      return {
        canDo4K: false,
        maxTextureSize,
        reason: `GPU maximum texture size is ${maxTextureSize}px (3840px required for 4K vertical)`,
      };
    }
    return { canDo4K: true, maxTextureSize };
  } catch (e: any) {
    return { canDo4K: false, maxTextureSize: 2048, reason: e?.message || 'GPU check failed' };
  }
}

export class VideoExporter {
  private cancelled: boolean = false;

  cancel(): void {
    this.cancelled = true;
  }

  async exportVideo(
    config: ExportConfig,
    onProgress: (p: ExportProgress) => void
  ): Promise<{ blob: Blob; thumbnailBlob?: Blob; filename: string; codecLabel: string }> {
    this.cancelled = false;
    await requestWakeLock();
    try {
      return await this.runExport(config, onProgress);
    } finally {
      await releaseWakeLock();
    }
  }

  private async runExport(
    config: ExportConfig,
    onProgress: (p: ExportProgress) => void
  ): Promise<{ blob: Blob; thumbnailBlob?: Blob; filename: string; codecLabel: string }> {
    const {
      width,
      height,
      fps,
      duration,
      seed,
      modeId,
      modeSettings,
      visuals,
      overlays,
      audioSettings,
      customNotes,
      fileHandle,
    } = config;

    // Strict 4K / 8K Dimension Validation (Vertical 2160x3840 or 4320x7680)
    const is4K = (width === 2160 && height === 3840) || (width === 3840 && height === 2160);
    const is8K = (width === 4320 && height === 7680) || (width === 7680 && height === 4320);
    if (!is4K && !is8K && (width >= 2160 || height >= 2160)) {
      console.warn(`Adjusting Ultra HD dimensions (requested ${width}x${height})`);
    }

    // Preload video language font to prevent fallback boxes in exported frames
    await ensureFontLoaded(overlays?.videoLanguage || 'en');

    const totalFrames = Math.ceil(duration * fps);
    const dt = 1 / fps;
    const finishSettings = withTargetDuration(modeSettings, duration);

    // True Resolution OffscreenCanvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    if (canvas.width !== width || canvas.height !== height) {
      throw new Error(`Canvas allocation failed: expected ${width}x${height}, got ${canvas.width}x${canvas.height}`);
    }

    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true })!;

    // Initialize 2D Simulation
    const mode = getModeById(modeId);
    const world = new PhysicsWorld(width, height, seed);
    mode.setup(world, modeSettings, seed);
    world.applyGlobalModifiers(config.ballPhysics, config.wallControls, config.customBall);
    const renderer = new WorldRenderer();
    if (mode.onCollision) {
      const onCol = mode.onCollision;
      world.eventBus.subscribe((ev) => {
        onCol(world, ev, modeSettings);
      });
    }

    const hasWebCodecs = typeof window !== 'undefined' && 'VideoEncoder' in window && 'AudioEncoder' in window;

    // Bitrate specifications:
    // 8K60 = 110 Mbps, 8K30 = 85 Mbps, 4K60 = 60 Mbps, 4K30 = 45 Mbps, 1440p = 25 Mbps, 1080p60 = 16 Mbps, 1080p30 = 12 Mbps
    let bitrate = config.bitrate;
    if (!bitrate) {
      if (width >= 4320) {
        bitrate = fps >= 60 ? 110000000 : 85000000;
      } else if (width >= 2160) {
        bitrate = fps >= 60 ? 60000000 : 45000000;
      } else if (width >= 1440) {
        bitrate = 25000000;
      } else {
        bitrate = fps >= 60 ? 16000000 : 12000000;
      }
    }

    if (!hasWebCodecs) {
      return this.exportFallback(config, world, canvas, ctx, onProgress);
    }

    // Codec Negotiation Strategy for Apple QuickTime Player & broad player compatibility:
    // H.264 Levels for 4K:
    // - 2160x3840 @ 60fps: "avc1.640034" (High 5.2) -> "avc1.4d4034" (Main 5.2) -> "avc1.420034" (Baseline 5.2)
    // - 2160x3840 @ 30fps: "avc1.640033" (High 5.1) -> "avc1.4d4033" (Main 5.1) -> "avc1.420033" (Baseline 5.1)
    // - 1440x2560: "avc1.640032" (High 5.0) -> "avc1.4d4032" (Main 5.0)
    // - 1080x1920: "avc1.64002A" (High 4.2) -> "avc1.4d402A" (Main 4.2) -> "avc1.42002A" (Baseline 4.2)
    let candidateCodecs: Array<{ codec: string; hw: 'prefer-hardware' | 'no-preference'; label: string }>;
    if (width >= 2160) {
      candidateCodecs = [
        // 60fps High 5.2
        { codec: 'avc1.640034', hw: 'prefer-hardware', label: `h.264 4k high 5.2 (hw)` },
        { codec: 'avc1.640034', hw: 'no-preference', label: `h.264 4k high 5.2` },
        // 60fps Main 5.2
        { codec: 'avc1.4d4034', hw: 'no-preference', label: `h.264 4k main 5.2` },
        // 30fps High 5.1 (widely supported across all 4K GPUs)
        { codec: 'avc1.640033', hw: 'prefer-hardware', label: `h.264 4k high 5.1 (hw)` },
        { codec: 'avc1.640033', hw: 'no-preference', label: `h.264 4k high 5.1` },
        // 30fps Main 5.1
        { codec: 'avc1.4d4033', hw: 'no-preference', label: `h.264 4k main 5.1` },
        // Baseline 5.1
        { codec: 'avc1.420033', hw: 'no-preference', label: `h.264 4k baseline 5.1` },
        // Universal 4.2 fallback
        { codec: 'avc1.64002a', hw: 'no-preference', label: `h.264 4k high 4.2` },
        { codec: 'avc1.4d402a', hw: 'no-preference', label: `h.264 4k main 4.2` },
      ];
    } else if (width >= 1440) {
      candidateCodecs = [
        { codec: 'avc1.640032', hw: 'prefer-hardware', label: 'h.264 1440p high (hw)' },
        { codec: 'avc1.640032', hw: 'no-preference', label: 'h.264 1440p high' },
        { codec: 'avc1.4d4032', hw: 'no-preference', label: 'h.264 1440p main' },
        { codec: 'avc1.420032', hw: 'no-preference', label: 'h.264 1440p baseline' },
      ];
    } else {
      const topLevel = fps >= 60 ? '64002A' : '640028';
      const mainLevel = fps >= 60 ? '4d402A' : '4d4028';
      const baseLevel = fps >= 60 ? '42002A' : '420028';
      candidateCodecs = [
        { codec: `avc1.${topLevel}`, hw: 'prefer-hardware', label: `h.264 1080p high ${fps}fps (hw)` },
        { codec: `avc1.${topLevel}`, hw: 'no-preference', label: `h.264 1080p high ${fps}fps` },
        { codec: `avc1.${mainLevel}`, hw: 'no-preference', label: `h.264 1080p main ${fps}fps` },
        { codec: `avc1.${baseLevel}`, hw: 'no-preference', label: `h.264 1080p baseline ${fps}fps` },
      ];
    }

    let chosenEncoderConfig: VideoEncoderConfig | null = null;
    let chosenCodecLabel = 'h.264';

    for (const c of candidateCodecs) {
      // Test 1: Full quality AVC configuration
      const testConfig1: VideoEncoderConfig = {
        codec: c.codec,
        width,
        height,
        bitrate,
        framerate: fps,
        hardwareAcceleration: c.hw,
        latencyMode: 'quality',
        bitrateMode: 'variable',
        avc: { format: 'avc' },
      };

      try {
        const support = await VideoEncoder.isConfigSupported(testConfig1);
        if (support.supported) {
          chosenEncoderConfig = {
            ...(support.config || testConfig1),
            avc: { format: 'avc' },
          };
          chosenCodecLabel = c.label;
          break;
        }
      } catch {
        // Continue to relaxed test
      }

      // Test 2: Relaxed AVC configuration (without strict latencyMode / bitrateMode constraints)
      const testConfig2: VideoEncoderConfig = {
        codec: c.codec,
        width,
        height,
        bitrate,
        framerate: fps,
        hardwareAcceleration: c.hw,
        avc: { format: 'avc' },
      };

      try {
        const support = await VideoEncoder.isConfigSupported(testConfig2);
        if (support.supported) {
          chosenEncoderConfig = {
            ...(support.config || testConfig2),
            avc: { format: 'avc' },
          };
          chosenCodecLabel = c.label;
          break;
        }
      } catch {
        // Continue
      }
    }

    if (!chosenEncoderConfig) {
      chosenEncoderConfig = {
        codec: candidateCodecs[0].codec,
        width,
        height,
        bitrate,
        framerate: fps,
        hardwareAcceleration: 'no-preference',
        avc: { format: 'avc' },
      };
      chosenCodecLabel = candidateCodecs[0].label;
    }

    console.log(`🎬 VideoEncoder chosen: ${chosenCodecLabel} (${chosenEncoderConfig.codec})`);

    // In-memory ArrayBuffer target guarantees full moov atom placement at front (fastStart)
    // and produces a 100% valid MP4 blob recognized by QuickTime Player.
    const muxerTarget = new ArrayBufferTarget();

    const muxer = new Muxer({
      target: muxerTarget,
      video: {
        codec: 'avc',
        width,
        height,
      },
      audio: {
        codec: 'aac',
        sampleRate: 48000,
        numberOfChannels: 2,
      },
      fastStart: 'in-memory',
      firstTimestampBehavior: 'offset',
    });

    let videoEncoder: VideoEncoder;
    try {
      videoEncoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: (e) => console.error('VideoEncoder runtime error:', e),
      });

      videoEncoder.configure(chosenEncoderConfig);
    } catch (e) {
      console.warn('VideoEncoder configuration failed, falling back:', e);
      return this.exportFallback(config, world, canvas, ctx, onProgress);
    }

    const startTime = performance.now();
    let maxParticlesSeen = 0;
    let dramaticFrameDataUrl: string | undefined;

    // Queue limit backpressure: 10 frames on 4K, 30 frames on 1080p
    const maxQueueSize = width >= 2160 ? 10 : 30;

    // 2. Render Video Frame by Frame
    for (let frame = 0; frame < totalFrames; frame++) {
      if (this.cancelled) {
        videoEncoder.close();
        throw new Error('Export cancelled');
      }

      // If mobile user switched tabs, pause export safely and resume when visible
      if (typeof document !== 'undefined' && document.hidden) {
        onProgress({
          frame,
          totalFrames,
          percent: Math.round((frame / totalFrames) * 85),
          stage: 'video',
          etaSeconds: 0,
          pausedMessage: 'export paused while backgrounded (switch back to this tab to resume)',
          codecChosen: chosenCodecLabel,
        });
        while (typeof document !== 'undefined' && document.hidden && !this.cancelled) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }

      if (mode.step) mode.step(world, dt, modeSettings);
      world.step(dt);
      if (!world.isFinished && mode.isFinished(world, finishSettings)) {
        world.isFinished = true;
      }
      renderer.render(ctx, world, visuals, overlays, width, height, true);

      if (world.particles.length >= maxParticlesSeen) {
        maxParticlesSeen = world.particles.length;
        dramaticFrameDataUrl = canvas.toDataURL('image/png');
      }

      const timestampMicros = Math.round((frame * 1000000) / fps);
      const videoFrame = new VideoFrame(canvas, {
        timestamp: timestampMicros,
        duration: Math.round(1000000 / fps),
      });

      // Keyframe every 2 seconds
      const isKeyFrame = frame % (fps * 2) === 0;
      videoEncoder.encode(videoFrame, { keyFrame: isKeyFrame });

      // Immediate frame closure to prevent memory leaks
      videoFrame.close();

      // Backpressure handling: pause if queue is saturated
      while (videoEncoder.encodeQueueSize > maxQueueSize) {
        await new Promise((resolve) => setTimeout(resolve, 12));
      }

      if (frame % 15 === 0 || frame === totalFrames - 1) {
        const elapsed = (performance.now() - startTime) / 1000;
        const fpsAvg = frame / Math.max(0.01, elapsed);
        const eta = Math.max(0, (totalFrames - frame) / Math.max(0.1, fpsAvg));

        onProgress({
          frame,
          totalFrames,
          percent: Math.round((frame / totalFrames) * 85),
          stage: 'video',
          etaSeconds: Math.round(eta),
          previewDataUrl: frame % 30 === 0 ? canvas.toDataURL('image/jpeg', 0.5) : undefined,
          codecChosen: chosenCodecLabel,
        });
      }
    }

    await videoEncoder.flush();
    videoEncoder.close();

    // 3. Audio Encoding (AAC 48kHz Stereo, 192kbps)
    onProgress({
      frame: totalFrames,
      totalFrames,
      percent: 88,
      stage: 'audio',
      etaSeconds: 3,
      codecChosen: chosenCodecLabel,
    });

    try {
      const eventsLog = world.eventBus.getEventLog();
      const audioBuffer = await renderOfflineAudio(eventsLog || [], duration, audioSettings, customNotes);

      const audioEncoder = new AudioEncoder({
        output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
        error: (e) => console.error('AudioEncoder error:', e),
      });

      audioEncoder.configure({
        codec: 'mp4a.40.2',
        sampleRate: 48000,
        numberOfChannels: 2,
        bitrate: 192000, // 192 kbps AAC-LC standard
      });

      // Exact length match: duration * 48000 samples
      const totalRequiredSamples = Math.round(duration * 48000);
      const left = audioBuffer.getChannelData(0);
      const right = audioBuffer.getChannelData(1);
      const samplesPerChunk = 2048;

      for (let offset = 0; offset < totalRequiredSamples; offset += samplesPerChunk) {
        const chunkSamples = Math.min(samplesPerChunk, totalRequiredSamples - offset);
        const interleaved = new Float32Array(chunkSamples * 2);

        for (let s = 0; s < chunkSamples; s++) {
          const sampleIdx = offset + s;
          interleaved[s * 2] = sampleIdx < left.length ? left[sampleIdx] : 0;
          interleaved[s * 2 + 1] = sampleIdx < right.length ? right[sampleIdx] : 0;
        }

        const timestampMicros = Math.round((offset * 1000000) / 48000);
        const audioData = new AudioData({
          format: 'f32',
          sampleRate: 48000,
          numberOfFrames: chunkSamples,
          numberOfChannels: 2,
          timestamp: timestampMicros,
          data: interleaved,
        });

        audioEncoder.encode(audioData);
        audioData.close();
      }

      await audioEncoder.flush();
      audioEncoder.close();
    } catch (audioErr) {
      console.warn('Audio rendering/encoding notice (continuing video finalization):', audioErr);
    }

    // 4. Finalize MP4
    onProgress({
      frame: totalFrames,
      totalFrames,
      percent: 98,
      stage: 'muxing',
      etaSeconds: 1,
      codecChosen: chosenCodecLabel,
    });

    muxer.finalize();

    const videoBlob = new Blob([muxerTarget.buffer], { type: 'video/mp4' });
    console.log(`🎬 4K MP4 generated successfully! Size: ${(videoBlob.size / (1024 * 1024)).toFixed(2)} MB`);

    // If File System Access fileHandle was selected, stream the finished MP4 blob directly to disk and cleanly close it!
    if (fileHandle && typeof fileHandle.createWritable === 'function') {
      try {
        const stream = await fileHandle.createWritable();
        await stream.write(videoBlob);
        await stream.close();
        console.log('💾 FileSystemWritableFileStream cleanly closed & committed to disk!');
      } catch (streamErr) {
        console.warn('Direct fileHandle write failed, fallback in-memory blob available:', streamErr);
      }
    }

    let thumbnailBlob: Blob | undefined;
    if (dramaticFrameDataUrl) {
      const res = await fetch(dramaticFrameDataUrl);
      thumbnailBlob = await res.blob();
    }

    const filename = `bounceforge_${modeId}_${seed}_${width}x${height}_${fps}fps.mp4`;

    onProgress({
      frame: totalFrames,
      totalFrames,
      percent: 100,
      stage: 'complete',
      etaSeconds: 0,
      codecChosen: chosenCodecLabel,
    });

    return { blob: videoBlob, thumbnailBlob, filename, codecLabel: chosenCodecLabel };
  }

  private async exportFallback(
    config: ExportConfig,
    world: any,
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    onProgress: (p: ExportProgress) => void
  ): Promise<{ blob: Blob; thumbnailBlob?: Blob; filename: string; codecLabel: string }> {
    const { width, height, fps, seed, modeId, modeSettings, visuals, overlays, duration } = config;
    const mode = getModeById(modeId);
    const renderer = new WorldRenderer();
    const dt = 1 / fps;
    const totalFrames = Math.ceil(duration * fps);

    // Pick best supported MIME type
    let mimeType = 'video/webm';
    let fileExt = 'webm';
    let codecLabel = 'quick record mode (webm fallback)';

    if (typeof MediaRecorder !== 'undefined') {
      if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
        mimeType = 'video/mp4;codecs=avc1';
        fileExt = 'mp4';
        codecLabel = 'quick record mode (h.264 mp4)';
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
        fileExt = 'mp4';
        codecLabel = 'quick record mode (mp4)';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        mimeType = 'video/webm;codecs=vp9';
        fileExt = 'webm';
        codecLabel = 'quick record mode (vp9 webm)';
      }
    }

    const stream = canvas.captureStream(fps);
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: width >= 1440 ? 16000000 : 8000000,
    });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    recorder.start(500);

    let dramaticFrameDataUrl: string | undefined;

    // Run realtime render loop
    const startTime = performance.now();
    for (let frame = 0; frame < totalFrames; frame++) {
      if (this.cancelled) {
        recorder.stop();
        throw new Error('Export cancelled');
      }

      if (mode.step) mode.step(world, dt, modeSettings);
      world.step(dt);
      renderer.render(ctx, world, visuals, overlays, width, height, true);

      if (frame === Math.floor(totalFrames / 2)) {
        dramaticFrameDataUrl = canvas.toDataURL('image/png');
      }

      if (frame % fps === 0 || frame === totalFrames - 1) {
        const pct = Math.round((frame / totalFrames) * 95);
        const elapsed = (performance.now() - startTime) / 1000;
        const eta = Math.max(0, duration - elapsed);
        onProgress({
          frame,
          totalFrames,
          percent: pct,
          stage: 'video',
          etaSeconds: Math.round(eta),
          codecChosen: codecLabel,
          isQuickRecord: true,
          previewDataUrl: canvas.toDataURL('image/jpeg', 0.4),
        });
      }

      // Realtime frame pacing
      await new Promise((resolve) => setTimeout(resolve, Math.max(1, (1000 / fps) * 0.75)));
    }

    return new Promise((resolve) => {
      recorder.onstop = async () => {
        const videoBlob = new Blob(chunks, { type: mimeType });
        let thumbnailBlob: Blob | undefined;
        if (dramaticFrameDataUrl) {
          try {
            const res = await fetch(dramaticFrameDataUrl);
            thumbnailBlob = await res.blob();
          } catch {}
        }

        onProgress({
          frame: totalFrames,
          totalFrames,
          percent: 100,
          stage: 'complete',
          etaSeconds: 0,
          codecChosen: codecLabel,
          isQuickRecord: true,
        });

        resolve({
          blob: videoBlob,
          thumbnailBlob,
          filename: `bounceforge_${modeId}_${seed}_${width}x${height}_${fps}fps.${fileExt}`,
          codecLabel,
        });
      };

      recorder.stop();
    });
  }
}
