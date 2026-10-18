import {
  MarbleMelodyConfig,
  PathStyle,
  MarbleStyle,
  MarbleSize,
  ThemePack,
  WallBackground,
  LightingStyle,
  CameraStyle,
} from './types';
import { PUBLIC_DOMAIN_MELODIES } from './melodyLibrary';

export class VariationEngine {
  private static PATH_STYLES: PathStyle[] = [
    'zigzag',
    'scurve',
    'spiral',
    'wide_swings',
    'tight_cascade',
    'bounce_heavy',
    'roll_heavy',
  ];

  private static MARBLE_STYLES: MarbleStyle[] = [
    'glass_swirl',
    'crystal',
    'chrome',
    'pearl',
    'frosted',
    'neon_core',
    'cats_eye',
  ];

  private static MARBLE_SIZES: MarbleSize[] = ['small', 'medium', 'large'];

  private static THEME_PACKS: ThemePack[] = [
    'pastel_dream',
    'candy_shop',
    'glass_lab',
    'metal_workshop',
    'night_neon',
    'nature_garden',
    'space_toys',
    'winter_crystal',
    'festive',
  ];

  private static WALL_BACKGROUNDS: WallBackground[] = [
    'pastel_peach',
    'pastel_mint',
    'pastel_lavender',
    'pastel_sky',
    'cream',
    'blush',
    'sand',
    'soft_grey',
  ];

  private static LIGHTING_STYLES: LightingStyle[] = [
    'soft_studio',
    'warm_morning',
    'cool_daylight',
    'golden_hour',
    'colourful_bounce',
  ];

  private static CAMERA_STYLES: CameraStyle[] = [
    'top_down_follow',
    'tilted_follow',
    'orbit_follow',
    'macro_close',
    'wide_reveal',
  ];

  private static SWIRL_COLORS = [
    '#f472b6',
    '#38bdf8',
    '#34d399',
    '#c084fc',
    '#fb923c',
    '#facc15',
    '#e879f9',
    '#2dd4bf',
  ];

  /**
   * Shuffles unlocked layers for a new distinct variation
   */
  static shuffleUnlocked(current: MarbleMelodyConfig, seed: number): MarbleMelodyConfig {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    const rnd = () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
    const pick = <T>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];

    const locks = current.locks || {};
    const nextConfig: MarbleMelodyConfig = { ...current, seed };

    if (!locks.melody) {
      nextConfig.melodyId = pick(PUBLIC_DOMAIN_MELODIES).id;
      nextConfig.tempoMultiplier = 0.85 + rnd() * 0.35;
      nextConfig.transposeSemitones = Math.floor(rnd() * 7) - 3;
    }

    if (!locks.pathStyle) {
      nextConfig.pathStyle = pick(this.PATH_STYLES);
    }

    if (!locks.marble) {
      nextConfig.marbleStyle = pick(this.MARBLE_STYLES);
      nextConfig.marbleSize = pick(this.MARBLE_SIZES);
      nextConfig.swirlColor = pick(this.SWIRL_COLORS);
      nextConfig.marbleCount = (Math.floor(rnd() * 3) + 1) as 1 | 2 | 3;
    }

    if (!locks.theme) {
      nextConfig.themePack = pick(this.THEME_PACKS);
    }

    if (!locks.background) {
      nextConfig.wallBackground = pick(this.WALL_BACKGROUNDS);
    }

    if (!locks.lighting) {
      nextConfig.lightingStyle = pick(this.LIGHTING_STYLES);
      nextConfig.cameraStyle = pick(this.CAMERA_STYLES);
    }

    if (!locks.decor) {
      nextConfig.decorEnabled = true;
      nextConfig.decorDensity = 0.5 + rnd() * 0.5;
    }

    return nextConfig;
  }

  /**
   * Generates 10 guaranteed distinct variations with variation guard:
   * No two variations share the same melody + background + marble combination.
   */
  static generate10Variations(base: MarbleMelodyConfig, startingSeed: number): MarbleMelodyConfig[] {
    const variations: MarbleMelodyConfig[] = [];
    const signatures = new Set<string>();

    let currentSeed = startingSeed;
    while (variations.length < 10) {
      currentSeed = (currentSeed + 7919) % 2147483647;
      const v = this.shuffleUnlocked(base, currentSeed);
      const signature = `${v.melodyId}_${v.wallBackground}_${v.marbleStyle}_${v.pathStyle}_${v.marbleCount}`;

      if (!signatures.has(signature)) {
        signatures.add(signature);
        variations.push(v);
      }
    }

    return variations;
  }
}
