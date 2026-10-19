import { getModeById } from './registry';
import { VisualSettings } from '../render/renderer';
import { OverlaySettings, DEFAULT_OVERLAYS } from '../render/overlays';
import { AudioSettings } from '../audio/types';
import { AsmrMixSettings } from '../audio/asmrEngine';

export interface ModeDefaults {
  seed: number;
  modeSettings: Record<string, any>;
  visuals: VisualSettings;
  overlays: OverlaySettings;
  audioSettings: AudioSettings;
  asmrSettings: AsmrMixSettings;
  playbackSpeed: number;
}

export const BASE_VISUAL_DEFAULTS: VisualSettings = {
  themeId: 'neon_night',
  bloomEnabled: true,
  bloomIntensity: 1.25,
  ballGlowEnabled: true,
  ballGlowIntensity: 1.0,
  wallGlowEnabled: true,
  wallGlowIntensity: 1.0,
  rainbowWallsMode: 'off',
  trailEnabled: true,
  trailLength: 18,
  trailFade: 0.65,
  trailHueShift: false,
  reactiveBgEnabled: true,
  reactiveBgIntensity: 0.5,
  screenShakeIntensity: 0.6,
  slowMotionEnd: true,
  chromaticFlash: true,
  ringColorMode: 'theme',
};

export const BASE_AUDIO_DEFAULTS: AudioSettings = {
  masterVolume: 0.85,
  instrument: 'grandPiano',
  sfxVolume: 0.75,
  droneVolume: 0,
  reverbAmount: 0,
  reverbEnabled: false,
  delayAmount: 0,
  delayEnabled: false,
  sustainPedal: false,
  pitchByVelocity: false,
  volumeByImpulse: true,
  selectedMelodyId: 'fur_elise',
};

export const BASE_ASMR_DEFAULTS: AsmrMixSettings = {
  masterVolume: 0.85,
  musicVolume: 0.75,
  impactVolume: 0.9,
  destructionVolume: 0.85,
  textureVolume: 0.7,
  backingVolume: 0.5,
  binauralAsmr: true,
  asmrMode: false,
  headphonesMode: true,
  asmrIntensity: 'balanced',
};

/**
 * ONE SOURCE OF TRUTH:
 * Reads the manifest defaults for any 2D mode, combining mode default settings with
 * default physics, rings, visuals, theme, audio, camera, overlays, and seed.
 */
export function getDefaults(modeId: string): ModeDefaults {
  const mode = getModeById(modeId);
  return {
    seed: 1337,
    modeSettings: JSON.parse(JSON.stringify(mode.defaultSettings)),
    visuals: { ...BASE_VISUAL_DEFAULTS },
    overlays: JSON.parse(JSON.stringify(DEFAULT_OVERLAYS)),
    audioSettings: { ...BASE_AUDIO_DEFAULTS },
    asmrSettings: { ...BASE_ASMR_DEFAULTS },
    playbackSpeed: 1.0,
  };
}

/**
 * Checks if current state equals the mode defaults
 */
export function isModeAtDefault(
  modeId: string,
  current: {
    seed: number;
    modeSettings: Record<string, any>;
    visuals: VisualSettings;
    overlays: OverlaySettings;
    audioSettings: AudioSettings;
  }
): boolean {
  const defaults = getDefaults(modeId);

  if (current.seed !== defaults.seed) return false;

  // Check mode settings
  for (const [key, val] of Object.entries(defaults.modeSettings)) {
    if (current.modeSettings[key] !== val) return false;
  }

  // Check key visuals
  for (const [key, val] of Object.entries(defaults.visuals)) {
    if ((current.visuals as any)[key] !== val) return false;
  }

  // Check audio
  if (
    current.audioSettings.instrument !== defaults.audioSettings.instrument ||
    current.audioSettings.masterVolume !== defaults.audioSettings.masterVolume ||
    current.audioSettings.sfxVolume !== defaults.audioSettings.sfxVolume
  ) {
    return false;
  }

  // Check overlays
  if (
    current.overlays.showTitle !== defaults.overlays.showTitle ||
    current.overlays.titleText !== defaults.overlays.titleText ||
    current.overlays.showCounter !== defaults.overlays.showCounter ||
    current.overlays.counterType !== defaults.overlays.counterType ||
    current.overlays.showWatermark !== defaults.overlays.showWatermark ||
    current.overlays.safeZonePlatform !== defaults.overlays.safeZonePlatform
  ) {
    return false;
  }

  return true;
}
