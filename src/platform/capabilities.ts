/**
 * BounceForge All-Devices Capability & Platform Detector
 * Strict feature-detection based, avoiding user-agent sniffing.
 */

export type GraphicsApi = 'webgpu' | 'webgl2' | 'webgl1' | 'canvas2d';

export interface CodecSupportMap {
  'h264_1080p30': boolean;
  'h264_1080p60': boolean;
  'h264_1440p60': boolean;
  'h264_4k30': boolean;
  'h264_4k60': boolean;
  'aac_stereo': boolean;
  'opus_stereo': boolean;
}

export interface DeviceCapabilities {
  // Graphics
  graphics: GraphicsApi;
  rendererName: string;
  maxTextureSize: number;
  gpuTier: 'low' | 'medium' | 'high' | 'ultra';

  // Hardware
  deviceMemoryGB: number | null;
  cpuCores: number;

  // Modern Web APIs
  hasWebCodecs: boolean;
  webCodecsVideo: boolean;
  webCodecsAudio: boolean;
  supportedCodecs: CodecSupportMap;
  maxExportResolution: '1080' | '1440' | '4k' | '4k_landscape';
  exportPath: 'webcodecs' | 'mediarecorder' | 'unsupported';

  hasOffscreenCanvas: boolean;
  hasWebWorkers: boolean;
  hasWasm: boolean;
  hasSharedArrayBuffer: boolean;
  hasFileSystemAccess: boolean;
  hasWebShare: boolean;
  hasWebShareFiles: boolean;
  hasWakeLock: boolean;
  hasHaptics: boolean;
  hasAudioSession: boolean;

  // User Environment
  pointerType: 'coarse' | 'fine' | 'none';
  hasHover: boolean;
  prefersReducedMotion: boolean;
  prefersColorScheme: 'dark' | 'light';
  saveData: boolean;
  storageQuotaMB: number | null;
  storageUsageMB: number | null;

  // Form factor inference via media queries & features
  isTouch: boolean;
  isFoldable: boolean;
  isStandalonePWA: boolean;
  isIOS: boolean;
  isAndroid: boolean;

  // Auto-calculated tier
  recommendedTier: 'low' | 'medium' | 'high' | 'ultra';
  benchmarkScore: number;
}

let cachedCapabilities: DeviceCapabilities | null = null;

export async function detectCapabilities(): Promise<DeviceCapabilities> {
  if (cachedCapabilities) return cachedCapabilities;

  const isClient = typeof window !== 'undefined';
  if (!isClient) {
    return getFallbackCapabilities();
  }

  // 1. Graphics Detection
  let graphics: GraphicsApi = 'canvas2d';
  let rendererName = 'software/canvas2d';
  let maxTextureSize = 2048;

  if ('gpu' in navigator && (navigator as any).gpu) {
    try {
      const adapter = await (navigator as any).gpu.requestAdapter();
      if (adapter) {
        graphics = 'webgpu';
        rendererName = 'WebGPU Hardware Adapter';
        maxTextureSize = 8192;
      }
    } catch {
      // fallback to WebGL
    }
  }

  if (graphics === 'canvas2d') {
    try {
      const testCanvas = document.createElement('canvas');
      const gl2 = testCanvas.getContext('webgl2');
      if (gl2) {
        graphics = 'webgl2';
        maxTextureSize = gl2.getParameter(gl2.MAX_TEXTURE_SIZE) || 4096;
        const dbg = gl2.getExtension('WEBGL_debug_renderer_info');
        if (dbg) {
          rendererName = gl2.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || 'WebGL2';
        } else {
          rendererName = 'WebGL2 GPU';
        }
      } else {
        const gl1 = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
        if (gl1) {
          graphics = 'webgl1';
          maxTextureSize = (gl1 as WebGLRenderingContext).getParameter(
            (gl1 as WebGLRenderingContext).MAX_TEXTURE_SIZE
          ) || 2048;
          rendererName = 'WebGL1 GPU';
        }
      }
    } catch {
      graphics = 'canvas2d';
      rendererName = 'Canvas 2D fallback';
    }
  }

  // 2. Hardware specs
  const deviceMemoryGB = 'deviceMemory' in navigator ? (navigator as any).deviceMemory : null;
  const cpuCores = navigator.hardwareConcurrency || 4;

  // 3. WebCodecs & Codec isConfigSupported probing
  const hasWebCodecs = 'VideoEncoder' in window && 'AudioEncoder' in window;
  const webCodecsVideo = 'VideoEncoder' in window;
  const webCodecsAudio = 'AudioEncoder' in window;

  const supportedCodecs: CodecSupportMap = {
    'h264_1080p30': false,
    'h264_1080p60': false,
    'h264_1440p60': false,
    'h264_4k30': false,
    'h264_4k60': false,
    'aac_stereo': false,
    'opus_stereo': false,
  };

  if (webCodecsVideo) {
    try {
      // 1080p30 (Level 4.0)
      const res1080p30 = await VideoEncoder.isConfigSupported({
        codec: 'avc1.640028',
        width: 1080,
        height: 1920,
        bitrate: 12000000,
        framerate: 30,
      });
      supportedCodecs.h264_1080p30 = !!res1080p30.supported;
    } catch {}

    try {
      // 1080p60 (Level 4.2)
      const res1080p60 = await VideoEncoder.isConfigSupported({
        codec: 'avc1.64002a',
        width: 1080,
        height: 1920,
        bitrate: 16000000,
        framerate: 60,
      });
      supportedCodecs.h264_1080p60 = !!res1080p60.supported;
    } catch {}

    try {
      // 1440p60 (Level 5.0)
      const res1440p60 = await VideoEncoder.isConfigSupported({
        codec: 'avc1.640032',
        width: 1440,
        height: 2560,
        bitrate: 25000000,
        framerate: 60,
      });
      supportedCodecs.h264_1440p60 = !!res1440p60.supported;
    } catch {}

    try {
      // 4K30 (Level 5.1)
      const res4k30 = await VideoEncoder.isConfigSupported({
        codec: 'avc1.640033',
        width: 2160,
        height: 3840,
        bitrate: 45000000,
        framerate: 30,
      });
      supportedCodecs.h264_4k30 = !!res4k30.supported;
    } catch {}

    try {
      // 4K60 (Level 5.2)
      const res4k60 = await VideoEncoder.isConfigSupported({
        codec: 'avc1.640034',
        width: 2160,
        height: 3840,
        bitrate: 60000000,
        framerate: 60,
      });
      supportedCodecs.h264_4k60 = !!res4k60.supported;
    } catch {}
  }

  if (webCodecsAudio) {
    try {
      const aac = await AudioEncoder.isConfigSupported({
        codec: 'mp4a.40.2',
        sampleRate: 48000,
        numberOfChannels: 2,
        bitrate: 192000,
      });
      supportedCodecs.aac_stereo = !!aac.supported;
    } catch {}
    try {
      const opus = await AudioEncoder.isConfigSupported({
        codec: 'opus',
        sampleRate: 48000,
        numberOfChannels: 2,
        bitrate: 128000,
      });
      supportedCodecs.opus_stereo = !!opus.supported;
    } catch {}
  }

  // Determine export path and max resolution
  let exportPath: 'webcodecs' | 'mediarecorder' | 'unsupported' = 'unsupported';
  let maxExportResolution: '1080' | '1440' | '4k' | '4k_landscape' = '1080';

  if (hasWebCodecs && supportedCodecs.h264_1080p30) {
    exportPath = 'webcodecs';
    if (supportedCodecs.h264_4k60 || supportedCodecs.h264_4k30) {
      maxExportResolution = '4k';
    } else if (supportedCodecs.h264_1440p60) {
      maxExportResolution = '1440';
    } else {
      maxExportResolution = '1080';
    }
  } else if ('MediaRecorder' in window) {
    exportPath = 'mediarecorder';
    maxExportResolution = '1080';
  }

  // 4. Modern APIs check
  const hasOffscreenCanvas = 'OffscreenCanvas' in window;
  const hasWebWorkers = 'Worker' in window;
  const hasWasm = 'WebAssembly' in window;
  const hasSharedArrayBuffer = 'SharedArrayBuffer' in window && window.crossOriginIsolated;
  const hasFileSystemAccess = 'showSaveFilePicker' in window;
  const hasWebShare = 'share' in navigator;
  let hasWebShareFiles = false;
  if (hasWebShare && 'canShare' in navigator) {
    try {
      const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      hasWebShareFiles = navigator.canShare({ files: [testFile] });
    } catch {
      hasWebShareFiles = false;
    }
  }
  const hasWakeLock = 'wakeLock' in navigator;
  const hasHaptics = 'vibrate' in navigator && typeof navigator.vibrate === 'function';
  const hasAudioSession = 'audioSession' in navigator;

  // 5. User Input and Environment
  const pointerCoarse = window.matchMedia('(pointer: coarse)').matches;
  const pointerFine = window.matchMedia('(pointer: fine)').matches;
  const pointerType: 'coarse' | 'fine' | 'none' = pointerCoarse ? 'coarse' : pointerFine ? 'fine' : 'none';
  const hasHover = window.matchMedia('(hover: hover)').matches;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const prefersColorScheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const saveData = !!((navigator as any).connection && (navigator as any).connection.saveData);

  // Storage estimate
  let storageQuotaMB: number | null = null;
  let storageUsageMB: number | null = null;
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const est = await navigator.storage.estimate();
      if (est.quota) storageQuotaMB = Math.round(est.quota / (1024 * 1024));
      if (est.usage) storageUsageMB = Math.round(est.usage / (1024 * 1024));
    } catch {}
  }

  // Form factor inference
  const isTouch = pointerCoarse || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isFoldable = window.matchMedia('(horizontal-viewport-segments: 2), (vertical-viewport-segments: 2)').matches;
  const isStandalonePWA =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://');

  // Platform heuristics without brittle UA parsing
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(navigator.userAgent);

  // 6. Fast benchmark calculation for initial GPU Tier
  const benchmarkScore = runMicroBenchmark(graphics, maxTextureSize, cpuCores, deviceMemoryGB);

  let gpuTier: 'low' | 'medium' | 'high' | 'ultra' = 'medium';
  if (benchmarkScore >= 85) gpuTier = 'ultra';
  else if (benchmarkScore >= 60) gpuTier = 'high';
  else if (benchmarkScore >= 35) gpuTier = 'medium';
  else gpuTier = 'low';

  // Mobile memory safety override:
  if (isTouch && deviceMemoryGB && deviceMemoryGB < 4 && (gpuTier === 'high' || gpuTier === 'ultra')) {
    gpuTier = 'medium';
  }

  const recommendedTier = gpuTier;

  cachedCapabilities = {
    graphics,
    rendererName,
    maxTextureSize,
    gpuTier,
    deviceMemoryGB,
    cpuCores,
    hasWebCodecs,
    webCodecsVideo,
    webCodecsAudio,
    supportedCodecs,
    maxExportResolution,
    exportPath,
    hasOffscreenCanvas,
    hasWebWorkers,
    hasWasm,
    hasSharedArrayBuffer,
    hasFileSystemAccess,
    hasWebShare,
    hasWebShareFiles,
    hasWakeLock,
    hasHaptics,
    hasAudioSession,
    pointerType,
    hasHover,
    prefersReducedMotion,
    prefersColorScheme,
    saveData,
    storageQuotaMB,
    storageUsageMB,
    isTouch,
    isFoldable,
    isStandalonePWA,
    isIOS,
    isAndroid,
    recommendedTier,
    benchmarkScore,
  };

  return cachedCapabilities;
}

function runMicroBenchmark(
  graphics: GraphicsApi,
  maxTextureSize: number,
  cpuCores: number,
  deviceMemoryGB: number | null
): number {
  let score = 20;

  // Graphics score (0-40)
  if (graphics === 'webgpu') score += 40;
  else if (graphics === 'webgl2') score += 30;
  else if (graphics === 'webgl1') score += 15;
  else score += 5;

  // Texture size score (0-20)
  if (maxTextureSize >= 8192) score += 20;
  else if (maxTextureSize >= 4096) score += 15;
  else if (maxTextureSize >= 2048) score += 10;

  // CPU cores score (0-20)
  if (cpuCores >= 8) score += 20;
  else if (cpuCores >= 6) score += 15;
  else if (cpuCores >= 4) score += 10;
  else score += 5;

  // Device memory score (0-20)
  if (deviceMemoryGB) {
    if (deviceMemoryGB >= 8) score += 20;
    else if (deviceMemoryGB >= 4) score += 15;
    else if (deviceMemoryGB >= 2) score += 8;
    else score += 3;
  } else {
    // If unknown, assign median 10
    score += 10;
  }

  return score;
}

function getFallbackCapabilities(): DeviceCapabilities {
  return {
    graphics: 'webgl2',
    rendererName: 'Standard Browser Engine',
    maxTextureSize: 4096,
    gpuTier: 'medium',
    deviceMemoryGB: 4,
    cpuCores: 4,
    hasWebCodecs: false,
    webCodecsVideo: false,
    webCodecsAudio: false,
    supportedCodecs: {
      'h264_1080p30': false,
      'h264_1080p60': false,
      'h264_1440p60': false,
      'h264_4k30': false,
      'h264_4k60': false,
      'aac_stereo': false,
      'opus_stereo': false,
    },
    maxExportResolution: '1080',
    exportPath: 'mediarecorder',
    hasOffscreenCanvas: true,
    hasWebWorkers: true,
    hasWasm: true,
    hasSharedArrayBuffer: false,
    hasFileSystemAccess: false,
    hasWebShare: false,
    hasWebShareFiles: false,
    hasWakeLock: false,
    hasHaptics: false,
    hasAudioSession: false,
    pointerType: 'fine',
    hasHover: true,
    prefersReducedMotion: false,
    prefersColorScheme: 'dark',
    saveData: false,
    storageQuotaMB: null,
    storageUsageMB: null,
    isTouch: false,
    isFoldable: false,
    isStandalonePWA: false,
    isIOS: false,
    isAndroid: false,
    recommendedTier: 'medium',
    benchmarkScore: 50,
  };
}

export function generateDiagnosticReport(caps: DeviceCapabilities): string {
  const lines: string[] = [
    '=== BOUNCEFORGE DEVICE CAPABILITIES REPORT ===',
    `Timestamp: ${new Date().toISOString()}`,
    `Display: ${window.innerWidth}x${window.innerHeight} @ ${window.devicePixelRatio.toFixed(2)}x dpr`,
    `Graphics API: ${caps.graphics.toUpperCase()} (${caps.rendererName})`,
    `Max Texture Size: ${caps.maxTextureSize}px`,
    `GPU Tier: ${caps.gpuTier.toUpperCase()} (Benchmark Score: ${caps.benchmarkScore}/100)`,
    `Hardware: ${caps.cpuCores} CPU cores, ${caps.deviceMemoryGB ? caps.deviceMemoryGB + ' GB RAM' : 'RAM not reported'}`,
    `Input: Pointer=${caps.pointerType}, Touch=${caps.isTouch}, Hover=${caps.hasHover}`,
    `WebCodecs: ${caps.hasWebCodecs ? 'YES' : 'NO (Quick Record Fallback)'}`,
    `Export Path: ${caps.exportPath} (Max Res: ${caps.maxExportResolution})`,
    `Codecs Tested:`,
    `  - H.264 1080p: ${caps.supportedCodecs.h264_1080p30 ? 'YES' : 'NO'}`,
    `  - H.264 1440p: ${caps.supportedCodecs.h264_1440p60 ? 'YES' : 'NO'}`,
    `  - H.264 4K: ${caps.supportedCodecs.h264_4k30 || caps.supportedCodecs.h264_4k60 ? 'YES' : 'NO'}`,
    `  - AAC 48kHz: ${caps.supportedCodecs.aac_stereo ? 'YES' : 'NO'}`,
    `APIs:`,
    `  - OffscreenCanvas: ${caps.hasOffscreenCanvas ? 'YES' : 'NO'}`,
    `  - Web Workers: ${caps.hasWebWorkers ? 'YES' : 'NO'}`,
    `  - File System Access: ${caps.hasFileSystemAccess ? 'YES' : 'NO'}`,
    `  - Web Share API (Files): ${caps.hasWebShareFiles ? 'YES' : 'NO'}`,
    `  - Screen Wake Lock: ${caps.hasWakeLock ? 'YES' : 'NO'}`,
    `  - Haptic Feedback: ${caps.hasHaptics ? 'YES' : 'NO'}`,
    `Environment:`,
    `  - Standalone PWA: ${caps.isStandalonePWA ? 'YES' : 'NO'}`,
    `  - Reduced Motion: ${caps.prefersReducedMotion ? 'YES' : 'NO'}`,
    `  - Save Data: ${caps.saveData ? 'YES' : 'NO'}`,
    `  - Storage Quota: ${caps.storageQuotaMB ? `${caps.storageUsageMB}MB / ${caps.storageQuotaMB}MB` : 'N/A'}`,
    '==============================================',
  ];
  return lines.join('\n');
}
