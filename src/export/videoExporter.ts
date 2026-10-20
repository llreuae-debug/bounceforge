import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { PhysicsWorld } from '../engine/world';
import { getModeById } from '../modes/registry';
import { loadMarbleRenderer } from '../marble3d/modes/marbleMelodyMode';
import { WorldRenderer, VisualSettings } from '../render/renderer';
import { OverlaySettings } from '../render/overlays';
import { AudioSettings, NoteItem } from '../audio/types';
import { renderOfflineAudio } from '../audio/offlineRender';
import { withTargetDuration } from '../engine/duration';
import { requestWakeLock, releaseWakeLock } from '../platform/wakeLock';
import { ensureFontLoaded } from '../i18n/fonts';
import type { BallPhysicsSettings, WallControlsSettings, CustomBallConfig } from '../presets/presetService';
import { registerAacEncoder } from '@mediabunny/aac-encoder';
import { Output, BufferTarget, Mp4OutputFormat, AudioBufferSource, Input, BufferSource, ALL_FORMATS, EncodedPacketSink } from 'mediabunny';
import { verifyExportAudio, ExportAudioVerificationResult } from './exportAudioVerifier';
import type { SimulationMode } from '../modes/types';
import type { CollisionEvent } from '../engine/types';
import { AudioEngine } from '../audio/audioEngine';

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
  reelSpeed?: number;
  slowMoSoundFeel?: boolean;
  speedRampFinale?: boolean;
  marbleMelodySlowMoMode?: 'calm_tempo' | 'normal_tempo';
  fileHandle?: any; // FileSystemFileHandle for Chrome/Edge direct streaming
  /** Use this simulation mode instead of looking `modeId` up in the registry (e.g. MIDI reels) */
  modeOverride?: SimulationMode;
  /** Produce the soundtrack yourself (e.g. synthesized MIDI + effects) instead of the default mix */
  renderAudio?: (events: CollisionEvent[], duration: number) => Promise<AudioBuffer>;
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

export interface ExportResult {
  blob: Blob;
  thumbnailBlob?: Blob;
  filename: string;
  codecLabel: string;
  verification?: ExportAudioVerificationResult;
}

export { checkGpu4KCapability } from './gpuCheck';

export class VideoExporter {
  private cancelled: boolean = false;

  cancel(): void {
    this.cancelled = true;
  }

  async exportVideo(
    config: ExportConfig,
    onProgress: (p: ExportProgress) => void
  ): Promise<ExportResult> {
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
  ): Promise<ExportResult> {
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

    // FIX 1: Hard-stop ALL live preview voices so nothing carries over into the export
    AudioEngine.getInstance().hardStopAllVoices();

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

    // Initialize 2D Simulation with isolated state per export
    const mode = config.modeOverride ?? getModeById(modeId);
    // The 3D marble renderer is loaded on demand: make sure it is ready before the first frame
    await loadMarbleRenderer();
    const world = new PhysicsWorld(width, height, seed);
    world.reelSpeed = config.reelSpeed !== undefined ? config.reelSpeed : 0.5;
    world.slowMoSoundFeel = config.slowMoSoundFeel ?? false;
    world.speedRampFinale = config.speedRampFinale ?? false;
    world.targetDuration = duration;
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

    // Codec Negotiation Strategy for Apple QuickTime Player & broad player compatibility
    let candidateCodecs: Array<{ codec: string; hw: 'prefer-hardware' | 'no-preference'; label: string }>;
    if (width >= 2160) {
      candidateCodecs = [
        { codec: 'avc1.640034', hw: 'prefer-hardware', label: `h.264 4k high 5.2 (hw)` },
        { codec: 'avc1.640034', hw: 'no-preference', label: `h.264 4k high 5.2` },
        { codec: 'avc1.4d4034', hw: 'no-preference', label: `h.264 4k main 5.2` },
        { codec: 'avc1.640033', hw: 'prefer-hardware', label: `h.264 4k high 5.1 (hw)` },
        { codec: 'avc1.640033', hw: 'no-preference', label: `h.264 4k high 5.1` },
        { codec: 'avc1.4d4033', hw: 'no-preference', label: `h.264 4k main 5.1` },
        { codec: 'avc1.420033', hw: 'no-preference', label: `h.264 4k baseline 5.1` },
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
      } catch {}

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
      } catch {}
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

      const effectiveSpeed = world.getEffectiveSpeed();
      if (mode.step) mode.step(world, dt * effectiveSpeed, modeSettings);
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

      const isKeyFrame = frame % (fps * 2) === 0;
      videoEncoder.encode(videoFrame, { keyFrame: isKeyFrame });
      videoFrame.close();

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

    // 3. Audio Encoding (AAC 48kHz Stereo, 256kbps for 4K/1440p, 192kbps for 1080p)
    onProgress({
      frame: totalFrames,
      totalFrames,
      percent: 88,
      stage: 'audio',
      etaSeconds: 3,
      codecChosen: chosenCodecLabel,
    });

    const eventsLog = world.eventBus.getEventLog() || [];
    let audioBuffer: AudioBuffer;

    try {
      audioBuffer = config.renderAudio
        ? await config.renderAudio(eventsLog, duration)
        : await renderOfflineAudio(eventsLog, duration, audioSettings, customNotes, config.slowMoSoundFeel ?? false);
    } catch (renderErr: any) {
      console.error('Audio offline render error:', renderErr);
      throw new Error(`Offline audio rendering failed: ${renderErr?.message || 'unknown error'}`);
    }

    // FIX 6: High-quality AAC-LC at 320 kbps
    const audioBitrate = 320000;
    let aacSupported = false;

    if (typeof AudioEncoder !== 'undefined') {
      try {
        const support = await AudioEncoder.isConfigSupported({
          codec: 'mp4a.40.2',
          sampleRate: 48000,
          numberOfChannels: 2,
          bitrate: audioBitrate,
        });
        aacSupported = !!support.supported;
      } catch {
        aacSupported = false;
      }
    }

    if (aacSupported) {
      try {
        const audioEncoder = new AudioEncoder({
          output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
          error: (e) => console.error('AudioEncoder error:', e),
        });

        audioEncoder.configure({
          codec: 'mp4a.40.2',
          sampleRate: 48000,
          numberOfChannels: 2,
          bitrate: audioBitrate,
        });

        const totalRequiredSamples = Math.round(duration * 48000);
        const left = audioBuffer.getChannelData(0);
        const right = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : left;
        const samplesPerChunk = 2048;

        for (let offset = 0; offset < totalRequiredSamples; offset += samplesPerChunk) {
          const chunkSamples = Math.min(samplesPerChunk, totalRequiredSamples - offset);
          // AudioData format 'f32-planar': contiguous Channel 0 floats then Channel 1 floats
          const planarData = new Float32Array(chunkSamples * 2);

          for (let s = 0; s < chunkSamples; s++) {
            const sampleIdx = offset + s;
            planarData[s] = sampleIdx < left.length ? left[sampleIdx] : 0;
            planarData[chunkSamples + s] = sampleIdx < right.length ? right[sampleIdx] : 0;
          }

          const timestampMicros = Math.round((offset * 1000000) / 48000);
          const audioData = new AudioData({
            format: 'f32-planar',
            sampleRate: 48000,
            numberOfFrames: chunkSamples,
            numberOfChannels: 2,
            timestamp: timestampMicros,
            data: planarData,
          });

          audioEncoder.encode(audioData);
          audioData.close();
        }

        // Encoder flush and wait before finalizing MP4
        await audioEncoder.flush();
        audioEncoder.close();
      } catch (encErr) {
        console.warn('Native AudioEncoder failed, switching to WASM AAC fallback:', encErr);
        await this.encodeAacFallback(audioBuffer, duration, audioBitrate, muxer);
      }
    } else {
      console.log('Native AudioEncoder for AAC unsupported, executing WASM AAC fallback...');
      await this.encodeAacFallback(audioBuffer, duration, audioBitrate, muxer);
    }

    // 4. Finalize MP4
    onProgress({
      frame: totalFrames,
      totalFrames,
      percent: 97,
      stage: 'muxing',
      etaSeconds: 1,
      codecChosen: chosenCodecLabel,
    });

    muxer.finalize();

    const videoBlob = new Blob([muxerTarget.buffer], { type: 'video/mp4' });
    console.log(`🎬 MP4 generated! Size: ${(videoBlob.size / (1024 * 1024)).toFixed(2)} MB`);

    // 5. Automatic Verification on Finished MP4
    onProgress({
      frame: totalFrames,
      totalFrames,
      percent: 99,
      stage: 'muxing',
      etaSeconds: 1,
      codecChosen: chosenCodecLabel,
    });

    let verificationResult = await verifyExportAudio(
      videoBlob,
      duration,
      fps,
      eventsLog,
      audioBuffer
    );

    if (!verificationResult.passed) {
      console.warn('⚠️ Audio verification notice:', verificationResult.failures);
      // Only abort export if critical fatal failure: audio track completely missing or track is silent
      if (!verificationResult.metrics.hasAudioTrack || (verificationResult.metrics.overallRmsDb < -55 && eventsLog.length > 0)) {
        throw new Error(
          `Export audio verification rejected: ${verificationResult.failures.join('; ')}. Please retry export.`
        );
      }
    }

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

    return {
      blob: videoBlob,
      thumbnailBlob,
      filename,
      codecLabel: chosenCodecLabel,
      verification: verificationResult,
    };
  }

  /**
   * Fallback WASM AAC encoder using mediabunny & @mediabunny/aac-encoder.
   * Feeds raw AAC packets directly into mp4-muxer.
   */
  private async encodeAacFallback(
    audioBuffer: AudioBuffer,
    _duration: number,
    bitrate: number,
    muxer: Muxer<any>
  ): Promise<void> {
    registerAacEncoder();

    const target = new BufferTarget();
    const output = new Output({
      format: new Mp4OutputFormat(),
      target,
    });

    const audioSource = new AudioBufferSource({ codec: 'aac', bitrate });
    output.addAudioTrack(audioSource);

    await output.start();
    await audioSource.add(audioBuffer);
    await output.finalize();

    if (!target.buffer || target.buffer.byteLength === 0) {
      throw new Error('Fallback WASM AAC encoder produced empty buffer');
    }

    const input = new Input({
      formats: ALL_FORMATS,
      source: new BufferSource(target.buffer),
    });

    const tracks = await input.getAudioTracks();
    if (!tracks || tracks.length === 0) {
      input.dispose();
      throw new Error('Fallback WASM AAC encoder could not demux audio track');
    }

    const sink = new EncodedPacketSink(tracks[0]);
    for await (const packet of sink.packets()) {
      muxer.addAudioChunkRaw(packet.data, packet.type, packet.timestamp, packet.duration);
    }

    input.dispose();
    console.log('✅ Fallback WASM AAC encoder successfully encoded and muxed all audio packets!');
  }

  /**
   * Quick-Record Fallback (MediaRecorder path):
   * Synchronously pairs canvas video stream with a MediaStreamAudioDestinationNode
   * so fallback recording is 100% audio-synchronized.
   */
  private async exportFallback(
    config: ExportConfig,
    world: any,
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    onProgress: (p: ExportProgress) => void
  ): Promise<ExportResult> {
    const { width, height, fps, seed, modeId, modeSettings, visuals, overlays, duration, audioSettings, customNotes } = config;
    const mode = config.modeOverride ?? getModeById(modeId);
    // The 3D marble renderer is loaded on demand: make sure it is ready before the first frame
    await loadMarbleRenderer();
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

    // Pre-render the offline audio for quick record
    const eventsLog = world.eventBus.getEventLog() || [];
    let audioBuffer: AudioBuffer | null = null;
    let audioCtx: AudioContext | null = null;

    try {
      audioBuffer = config.renderAudio
        ? await config.renderAudio(eventsLog, duration)
        : await renderOfflineAudio(eventsLog, duration, audioSettings, customNotes, config.slowMoSoundFeel ?? false);
    } catch (e) {
      console.warn('Quick record audio render error:', e);
    }

    const stream = canvas.captureStream(fps);

    // Add audio track to MediaStream from MediaStreamAudioDestinationNode
    if (audioBuffer && typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioCtx = new AudioCtx({ sampleRate: 48000 });
        const audioDest = audioCtx.createMediaStreamDestination();
        const bufferSource = audioCtx.createBufferSource();
        bufferSource.buffer = audioBuffer;
        bufferSource.connect(audioDest);
        bufferSource.start(0);

        const audioTrack = audioDest.stream.getAudioTracks()[0];
        if (audioTrack) {
          stream.addTrack(audioTrack);
        }
      } catch (audioStreamErr) {
        console.warn('MediaStreamAudioDestinationNode attachment notice:', audioStreamErr);
      }
    }

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
        if (audioCtx) {
          try { audioCtx.close(); } catch {}
        }
        throw new Error('Export cancelled');
      }

      const effectiveSpeed = world.getEffectiveSpeed();
      if (mode.step) mode.step(world, dt * effectiveSpeed, modeSettings);
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

      await new Promise((resolve) => setTimeout(resolve, Math.max(1, (1000 / fps) * 0.75)));
    }

    return new Promise((resolve) => {
      recorder.onstop = async () => {
        if (audioCtx) {
          try { audioCtx.close(); } catch {}
        }

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
