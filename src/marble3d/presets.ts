import { MarbleMelodyConfig } from './types';

export interface MarbleMelodyPresetDefinition {
  id: string;
  name: string;
  description: string;
  melodyId: string;
  baseSeed: number;
  variants: {
    chill: Partial<MarbleMelodyConfig>;
    viral: Partial<MarbleMelodyConfig>;
    insane: Partial<MarbleMelodyConfig>;
  };
}

export const MARBLE_MELODY_PRESETS: MarbleMelodyPresetDefinition[] = [
  // 1. Pastel Glass Run
  {
    id: 'pastel_glass_run',
    name: 'Pastel Glass Run',
    description: 'Translucent pastel glass tubes with pure ringing tones and smooth descent.',
    melodyId: 'ode_to_joy',
    baseSeed: 10421,
    variants: {
      chill: {
        tempoMultiplier: 0.85,
        pathStyle: 'scurve',
        wallBackground: 'pastel_peach',
        lightingStyle: 'soft_studio',
        marbleCount: 1,
        marbleStyle: 'glass_swirl',
        themePack: 'pastel_dream',
        targetDuration: 62,
      },
      viral: {
        tempoMultiplier: 1.0,
        pathStyle: 'zigzag',
        wallBackground: 'pastel_peach',
        lightingStyle: 'soft_studio',
        marbleCount: 1,
        marbleStyle: 'glass_swirl',
        themePack: 'pastel_dream',
        targetDuration: 56, // Finale lands at 55.5s - 56s
      },
      insane: {
        tempoMultiplier: 1.25,
        pathStyle: 'wide_swings',
        wallBackground: 'pastel_lavender',
        lightingStyle: 'colourful_bounce',
        marbleCount: 2,
        marbleStyle: 'crystal',
        themePack: 'glass_lab',
        targetDuration: 45,
      },
    },
  },

  // 2. Candy Xylophone Cascade
  {
    id: 'candy_xylophone_cascade',
    name: 'Candy Xylophone Cascade',
    description: 'Curved rainbow xylophone arcs playing joyous glissando runs among candy decor.',
    melodyId: 'twinkle_star',
    baseSeed: 20934,
    variants: {
      chill: {
        tempoMultiplier: 0.9,
        pathStyle: 'scurve',
        wallBackground: 'cream',
        lightingStyle: 'warm_morning',
        marbleCount: 1,
        marbleStyle: 'glass_swirl',
        themePack: 'candy_shop',
        targetDuration: 64,
      },
      viral: {
        tempoMultiplier: 1.0,
        pathStyle: 'zigzag',
        wallBackground: 'cream',
        lightingStyle: 'warm_morning',
        marbleCount: 1,
        marbleStyle: 'pearl',
        themePack: 'candy_shop',
        targetDuration: 57, // Finale lands at 57s
      },
      insane: {
        tempoMultiplier: 1.3,
        pathStyle: 'tight_cascade',
        wallBackground: 'blush',
        lightingStyle: 'colourful_bounce',
        marbleCount: 2,
        marbleStyle: 'glass_swirl',
        themePack: 'candy_shop',
        targetDuration: 44,
      },
    },
  },

  // 3. Metal Tack Rain
  {
    id: 'metal_tack_rain',
    name: 'Metal Tack Rain',
    description: 'Chrome discs on steel pins delivering rapid, crisp metallic tinks.',
    melodyId: 'fur_elise',
    baseSeed: 31852,
    variants: {
      chill: {
        tempoMultiplier: 0.85,
        pathStyle: 'scurve',
        wallBackground: 'soft_grey',
        lightingStyle: 'cool_daylight',
        marbleCount: 1,
        marbleStyle: 'chrome',
        themePack: 'metal_workshop',
        targetDuration: 68,
      },
      viral: {
        tempoMultiplier: 1.0,
        pathStyle: 'zigzag',
        wallBackground: 'soft_grey',
        lightingStyle: 'cool_daylight',
        marbleCount: 1,
        marbleStyle: 'chrome',
        themePack: 'metal_workshop',
        targetDuration: 58, // Finale lands at 58s
      },
      insane: {
        tempoMultiplier: 1.25,
        pathStyle: 'bounce_heavy',
        wallBackground: 'sand',
        lightingStyle: 'golden_hour',
        marbleCount: 2,
        marbleStyle: 'chrome',
        themePack: 'metal_workshop',
        targetDuration: 46,
      },
    },
  },

  // 4. Drum Line Drop
  {
    id: 'drum_line_drop',
    name: 'Drum Line Drop',
    description: 'Rhythmic acoustic drums and toms creating deep resonant skin ripples.',
    melodyId: 'minuet_in_g',
    baseSeed: 42109,
    variants: {
      chill: {
        tempoMultiplier: 0.88,
        pathStyle: 'scurve',
        wallBackground: 'sand',
        lightingStyle: 'warm_morning',
        marbleCount: 1,
        marbleStyle: 'glass_swirl',
        themePack: 'nature_garden',
        targetDuration: 63,
      },
      viral: {
        tempoMultiplier: 1.0,
        pathStyle: 'bounce_heavy',
        wallBackground: 'sand',
        lightingStyle: 'warm_morning',
        marbleCount: 1,
        marbleStyle: 'glass_swirl',
        themePack: 'nature_garden',
        targetDuration: 55, // Finale lands at 55s
      },
      insane: {
        tempoMultiplier: 1.3,
        pathStyle: 'wide_swings',
        wallBackground: 'pastel_peach',
        lightingStyle: 'golden_hour',
        marbleCount: 2,
        marbleStyle: 'neon_core',
        themePack: 'candy_shop',
        targetDuration: 42,
      },
    },
  },

  // 5. Crystal Glasses Waltz
  {
    id: 'crystal_glasses_waltz',
    name: 'Crystal Glasses Waltz',
    description: 'Stemware glasses tuned with water heights performing a delicate classical waltz.',
    melodyId: 'canon_in_d',
    baseSeed: 53281,
    variants: {
      chill: {
        tempoMultiplier: 0.85,
        pathStyle: 'scurve',
        wallBackground: 'pastel_sky',
        lightingStyle: 'cool_daylight',
        marbleCount: 1,
        marbleStyle: 'crystal',
        themePack: 'glass_lab',
        targetDuration: 67,
      },
      viral: {
        tempoMultiplier: 1.0,
        pathStyle: 'scurve',
        wallBackground: 'pastel_sky',
        lightingStyle: 'soft_studio',
        marbleCount: 1,
        marbleStyle: 'crystal',
        themePack: 'glass_lab',
        targetDuration: 58, // Finale lands at 57s-58s
      },
      insane: {
        tempoMultiplier: 1.25,
        pathStyle: 'zigzag',
        wallBackground: 'pastel_mint',
        lightingStyle: 'colourful_bounce',
        marbleCount: 2,
        marbleStyle: 'crystal',
        themePack: 'glass_lab',
        targetDuration: 46,
      },
    },
  },

  // 6. Kalimba Lullaby
  {
    id: 'kalimba_lullaby',
    name: 'Kalimba Lullaby',
    description: 'Warm soothing kalimba tines on walnut blocks playing gentle sleep songs.',
    melodyId: 'brahms_lullaby',
    baseSeed: 64719,
    variants: {
      chill: {
        tempoMultiplier: 0.88,
        pathStyle: 'scurve',
        wallBackground: 'pastel_lavender',
        lightingStyle: 'warm_morning',
        marbleCount: 1,
        marbleStyle: 'pearl',
        themePack: 'pastel_dream',
        targetDuration: 65,
      },
      viral: {
        tempoMultiplier: 1.0,
        pathStyle: 'scurve',
        wallBackground: 'pastel_lavender',
        lightingStyle: 'warm_morning',
        marbleCount: 1,
        marbleStyle: 'pearl',
        themePack: 'pastel_dream',
        targetDuration: 57, // Finale lands at 57s
      },
      insane: {
        tempoMultiplier: 1.2,
        pathStyle: 'zigzag',
        wallBackground: 'blush',
        lightingStyle: 'golden_hour',
        marbleCount: 2,
        marbleStyle: 'glass_swirl',
        themePack: 'pastel_dream',
        targetDuration: 47,
      },
    },
  },

  // 7. Music Box Spiral
  {
    id: 'music_box_spiral',
    name: 'Music Box Spiral',
    description: 'A tight spiral descent plucking an antique music-box steel comb.',
    melodyId: 'gymnopedie_1',
    baseSeed: 75924,
    variants: {
      chill: {
        tempoMultiplier: 0.85,
        pathStyle: 'spiral',
        wallBackground: 'cream',
        lightingStyle: 'soft_studio',
        marbleCount: 1,
        marbleStyle: 'glass_swirl',
        themePack: 'winter_crystal',
        targetDuration: 67,
      },
      viral: {
        tempoMultiplier: 1.0,
        pathStyle: 'spiral',
        wallBackground: 'cream',
        lightingStyle: 'soft_studio',
        marbleCount: 1,
        marbleStyle: 'glass_swirl',
        themePack: 'winter_crystal',
        targetDuration: 59, // Finale lands at 57s-59s
      },
      insane: {
        tempoMultiplier: 1.25,
        pathStyle: 'spiral',
        wallBackground: 'soft_grey',
        lightingStyle: 'colourful_bounce',
        marbleCount: 2,
        marbleStyle: 'chrome',
        themePack: 'metal_workshop',
        targetDuration: 47,
      },
    },
  },

  // 8. Marimba Garden
  {
    id: 'marimba_garden',
    name: 'Marimba Garden',
    description: 'Rosewood marimba bars mounted on felt among potted succulents and toy shelves.',
    melodyId: 'morning_mood',
    baseSeed: 86142,
    variants: {
      chill: {
        tempoMultiplier: 0.9,
        pathStyle: 'scurve',
        wallBackground: 'pastel_mint',
        lightingStyle: 'warm_morning',
        marbleCount: 1,
        marbleStyle: 'glass_swirl',
        themePack: 'nature_garden',
        targetDuration: 62,
      },
      viral: {
        tempoMultiplier: 1.0,
        pathStyle: 'zigzag',
        wallBackground: 'pastel_mint',
        lightingStyle: 'warm_morning',
        marbleCount: 1,
        marbleStyle: 'glass_swirl',
        themePack: 'nature_garden',
        targetDuration: 56, // Finale lands at 56s
      },
      insane: {
        tempoMultiplier: 1.3,
        pathStyle: 'bounce_heavy',
        wallBackground: 'sand',
        lightingStyle: 'golden_hour',
        marbleCount: 2,
        marbleStyle: 'pearl',
        themePack: 'nature_garden',
        targetDuration: 43,
      },
    },
  },

  // 9. Night Neon Chimes
  {
    id: 'night_neon_chimes',
    name: 'Night Neon Chimes',
    description: 'Luminous neon core marble bouncing off matte dark resonator tubes with gold accents.',
    melodyId: 'greensleeves',
    baseSeed: 97365,
    variants: {
      chill: {
        tempoMultiplier: 0.85,
        pathStyle: 'scurve',
        wallBackground: 'soft_grey',
        lightingStyle: 'colourful_bounce',
        marbleCount: 1,
        marbleStyle: 'neon_core',
        themePack: 'night_neon',
        targetDuration: 68,
      },
      viral: {
        tempoMultiplier: 1.0,
        pathStyle: 'zigzag',
        wallBackground: 'soft_grey',
        lightingStyle: 'colourful_bounce',
        marbleCount: 1,
        marbleStyle: 'neon_core',
        themePack: 'night_neon',
        targetDuration: 58, // Finale lands at 58s
      },
      insane: {
        tempoMultiplier: 1.25,
        pathStyle: 'wide_swings',
        wallBackground: 'pastel_lavender',
        lightingStyle: 'colourful_bounce',
        marbleCount: 2,
        marbleStyle: 'neon_core',
        themePack: 'night_neon',
        targetDuration: 46,
      },
    },
  },

  // 10. Winter Crystal Bells
  {
    id: 'winter_crystal_bells',
    name: 'Winter Crystal Bells',
    description: 'Frosted glass spheres striking polished winter crystal bells in a shimmering mist.',
    melodyId: 'clair_de_lune',
    baseSeed: 10842,
    variants: {
      chill: {
        tempoMultiplier: 0.85,
        pathStyle: 'scurve',
        wallBackground: 'pastel_sky',
        lightingStyle: 'cool_daylight',
        marbleCount: 1,
        marbleStyle: 'frosted',
        themePack: 'winter_crystal',
        targetDuration: 67,
      },
      viral: {
        tempoMultiplier: 1.0,
        pathStyle: 'scurve',
        wallBackground: 'pastel_sky',
        lightingStyle: 'cool_daylight',
        marbleCount: 1,
        marbleStyle: 'frosted',
        themePack: 'winter_crystal',
        targetDuration: 57, // Finale lands at 57.5s
      },
      insane: {
        tempoMultiplier: 1.25,
        pathStyle: 'zigzag',
        wallBackground: 'pastel_lavender',
        lightingStyle: 'colourful_bounce',
        marbleCount: 2,
        marbleStyle: 'crystal',
        themePack: 'winter_crystal',
        targetDuration: 46,
      },
    },
  },

  // 11. Space Toy Run
  {
    id: 'space_toy_run',
    name: 'Space Toy Run',
    description: 'Futuristic tubes and ringed toy planets with wide ballistic gravity swings.',
    melodyId: 'vivaldi_spring',
    baseSeed: 11953,
    variants: {
      chill: {
        tempoMultiplier: 0.88,
        pathStyle: 'wide_swings',
        wallBackground: 'pastel_lavender',
        lightingStyle: 'colourful_bounce',
        marbleCount: 1,
        marbleStyle: 'cats_eye',
        themePack: 'space_toys',
        targetDuration: 66,
      },
      viral: {
        tempoMultiplier: 1.0,
        pathStyle: 'wide_swings',
        wallBackground: 'pastel_lavender',
        lightingStyle: 'colourful_bounce',
        marbleCount: 1,
        marbleStyle: 'cats_eye',
        themePack: 'space_toys',
        targetDuration: 58, // Finale lands at 58s
      },
      insane: {
        tempoMultiplier: 1.25,
        pathStyle: 'wide_swings',
        wallBackground: 'soft_grey',
        lightingStyle: 'colourful_bounce',
        marbleCount: 2,
        marbleStyle: 'neon_core',
        themePack: 'space_toys',
        targetDuration: 46,
      },
    },
  },

  // 12. Three-Marble Orchestra
  {
    id: 'three_marble_orchestra',
    name: 'Three-Marble Orchestra',
    description: '3 marbles rolling simultaneously: Melody, Bass, and Chords on 3 synchronized lanes.',
    melodyId: 'ode_to_joy',
    baseSeed: 12064,
    variants: {
      chill: {
        tempoMultiplier: 0.85,
        pathStyle: 'scurve',
        wallBackground: 'cream',
        lightingStyle: 'soft_studio',
        marbleCount: 3,
        marbleStyle: 'glass_swirl',
        themePack: 'pastel_dream',
        targetDuration: 66,
      },
      viral: {
        tempoMultiplier: 1.0,
        pathStyle: 'zigzag',
        wallBackground: 'cream',
        lightingStyle: 'soft_studio',
        marbleCount: 3,
        marbleStyle: 'glass_swirl',
        themePack: 'pastel_dream',
        targetDuration: 56, // Finale lands at 55.5s - 56s
      },
      insane: {
        tempoMultiplier: 1.25,
        pathStyle: 'wide_swings',
        wallBackground: 'pastel_lavender',
        lightingStyle: 'colourful_bounce',
        marbleCount: 3,
        marbleStyle: 'neon_core',
        themePack: 'candy_shop',
        targetDuration: 45,
      },
    },
  },
];

// Default configuration for initial mode selection
export const DEFAULT_MARBLE_MELODY_CONFIG: MarbleMelodyConfig = {
  melodyId: 'ode_to_joy',
  tempoMultiplier: 1.0,
  transposeSemitones: 0,
  trimStartSeconds: 0,
  trimEndSeconds: 60,
  targetDuration: 56,
  actCount: 5,
  acts: [],
  pathStyle: 'zigzag',
  density: 1.0,
  wallWidth: 8.0,
  marbleCount: 1,
  marbleStyle: 'glass_swirl',
  marbleSize: 'medium',
  swirlColor: '#f472b6',
  themePack: 'pastel_dream',
  wallBackground: 'pastel_peach',
  lightingStyle: 'soft_studio',
  cameraStyle: 'top_down_follow',
  decorEnabled: true,
  decorDensity: 0.8,
  handleText: '@BounceForge',
  seed: 10421,
  locks: {},
};
