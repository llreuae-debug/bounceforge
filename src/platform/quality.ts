/**
 * BounceForge Quality Tier & Adaptive Performance Engine
 * Guarantees smooth playback across budget mobile to flagship desktop hardware.
 * Physics simulation is always identical; only rendering details scale.
 */

export type QualityTier = 'low' | 'medium' | 'high' | 'ultra';
export type QualityMode = 'auto' | QualityTier;

export interface QualityProfile {
  tier: QualityTier;
  pixelRatioScale: number; // multiplier against window.devicePixelRatio
  maxPixelRatio: number;
  targetFps: number;
  maxBalls: number;
  maxParticles: number;
  bloomEnabled: boolean;
  bloomIntensityScale: number;
  trailLengthScale: number;
  chromaticFlashEnabled: boolean;
  screenShakeScale: number;
  bgParticlesEnabled: boolean;
  maxAudioVoices: number;
  maxExportResolution: '1080' | '1440' | '4k';
}

export const QUALITY_PROFILES: Record<QualityTier, QualityProfile> = {
  low: {
    tier: 'low',
    pixelRatioScale: 0.75,
    maxPixelRatio: 1.0,
    targetFps: 30,
    maxBalls: 500,
    maxParticles: 2000,
    bloomEnabled: false,
    bloomIntensityScale: 0.0,
    trailLengthScale: 0.5,
    chromaticFlashEnabled: false,
    screenShakeScale: 0.4,
    bgParticlesEnabled: false,
    maxAudioVoices: 32,
    maxExportResolution: '1080',
  },
  medium: {
    tier: 'medium',
    pixelRatioScale: 1.0,
    maxPixelRatio: 1.5,
    targetFps: 60,
    maxBalls: 2000,
    maxParticles: 10000,
    bloomEnabled: true,
    bloomIntensityScale: 0.8,
    trailLengthScale: 0.8,
    chromaticFlashEnabled: true,
    screenShakeScale: 0.8,
    bgParticlesEnabled: true,
    maxAudioVoices: 64,
    maxExportResolution: '1440',
  },
  high: {
    tier: 'high',
    pixelRatioScale: 1.0,
    maxPixelRatio: 2.0,
    targetFps: 60,
    maxBalls: 5000,
    maxParticles: 25000,
    bloomEnabled: true,
    bloomIntensityScale: 1.0,
    trailLengthScale: 1.0,
    chromaticFlashEnabled: true,
    screenShakeScale: 1.0,
    bgParticlesEnabled: true,
    maxAudioVoices: 96,
    maxExportResolution: '4k',
  },
  ultra: {
    tier: 'ultra',
    pixelRatioScale: 1.0,
    maxPixelRatio: 3.0,
    targetFps: 120,
    maxBalls: 10000,
    maxParticles: 50000,
    bloomEnabled: true,
    bloomIntensityScale: 1.25,
    trailLengthScale: 1.2,
    chromaticFlashEnabled: true,
    screenShakeScale: 1.0,
    bgParticlesEnabled: true,
    maxAudioVoices: 128,
    maxExportResolution: '4k',
  },
};

export class AdaptiveQualityManager {
  private currentTier: QualityTier = 'medium';
  private mode: QualityMode = 'auto';
  private frameTimes: number[] = [];
  private lastAdjustmentTime: number = performance.now();
  private lowFpsStartTime: number | null = null;
  private steadyDropStartTime: number | null = null;
  private previousAverageFps: number = 60;
  private onTierChangeCallbacks: Array<(tier: QualityTier, isAuto: boolean, reason?: string) => void> = [];

  constructor(initialTier: QualityTier = 'medium') {
    this.currentTier = initialTier;
  }

  public setMode(mode: QualityMode, detectedTier: QualityTier): void {
    this.mode = mode;
    if (mode === 'auto') {
      this.currentTier = detectedTier;
      this.notify(this.currentTier, true, 'auto detected');
    } else {
      this.currentTier = mode;
      this.notify(this.currentTier, false, 'user override');
    }
  }

  public getTier(): QualityTier {
    return this.currentTier;
  }

  public getProfile(): QualityProfile {
    return QUALITY_PROFILES[this.currentTier];
  }

  public onTierChange(cb: (tier: QualityTier, isAuto: boolean, reason?: string) => void): () => void {
    this.onTierChangeCallbacks.push(cb);
    return () => {
      this.onTierChangeCallbacks = this.onTierChangeCallbacks.filter((c) => c !== cb);
    };
  }

  private notify(tier: QualityTier, isAuto: boolean, reason?: string): void {
    for (const cb of this.onTierChangeCallbacks) {
      cb(tier, isAuto, reason);
    }
  }

  /**
   * Called every frame from requestAnimationFrame with delta in milliseconds.
   */
  public recordFrame(deltaMs: number): void {
    if (this.mode !== 'auto') return;

    this.frameTimes.push(deltaMs);
    if (this.frameTimes.length > 60) this.frameTimes.shift();

    const now = performance.now();
    // Only analyze every 500ms
    if (now - this.lastAdjustmentTime < 500) return;

    const avgDelta = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    const currentFps = 1000 / Math.max(1, avgDelta);

    const targetFps = QUALITY_PROFILES[this.currentTier].targetFps;
    const thresholdFps = targetFps * 0.72; // below 72% of target for 2s triggers downscale

    // Check for drop
    if (currentFps < thresholdFps) {
      if (!this.lowFpsStartTime) {
        this.lowFpsStartTime = now;
      } else if (now - this.lowFpsStartTime >= 2000) {
        // Dropping FPS for 2 seconds straight!
        this.downscaleQuality(now, 'frame drop detected');
      }
    } else {
      this.lowFpsStartTime = null;
    }

    // Check for thermal throttle (steady drop over 30s)
    if (currentFps < this.previousAverageFps - 8) {
      if (!this.steadyDropStartTime) {
        this.steadyDropStartTime = now;
      } else if (now - this.steadyDropStartTime >= 30000) {
        this.downscaleQuality(now, 'cooling down ur phone, quality lowered');
        this.steadyDropStartTime = null;
      }
    } else {
      this.steadyDropStartTime = null;
    }

    // Check for upscale (stable above 95% target for 10s)
    if (currentFps >= targetFps * 0.95 && now - this.lastAdjustmentTime >= 10000) {
      this.upscaleQuality(now);
    }

    this.previousAverageFps = currentFps;
  }

  private downscaleQuality(now: number, reason: string): void {
    const tiers: QualityTier[] = ['ultra', 'high', 'medium', 'low'];
    const idx = tiers.indexOf(this.currentTier);
    if (idx < tiers.length - 1) {
      this.currentTier = tiers[idx + 1];
      this.lastAdjustmentTime = now;
      this.lowFpsStartTime = null;
      this.notify(this.currentTier, true, reason);
    }
  }

  private upscaleQuality(now: number): void {
    const tiers: QualityTier[] = ['low', 'medium', 'high', 'ultra'];
    const idx = tiers.indexOf(this.currentTier);
    if (idx < tiers.length - 1) {
      this.currentTier = tiers[idx + 1];
      this.lastAdjustmentTime = now;
      this.notify(this.currentTier, true, 'performance stable');
    }
  }
}
