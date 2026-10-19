export type TemplateCategory =
  | 'marble_music'
  | 'satisfying_escape'
  | 'battles'
  | 'asmr_glass'
  | 'squeaky_fun'
  | 'calm_relaxing';

export interface CategoryInfo {
  id: TemplateCategory;
  name: string;
  iconName: string;
  description: string;
}

export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'marble_music',
    name: 'Marble Music',
    iconName: 'Music',
    description: 'Tuned 3D runs playing real classical & viral melodies',
  },
  {
    id: 'satisfying_escape',
    name: 'Satisfying Escape',
    iconName: 'Sparkles',
    description: 'Suspenseful near-misses, ticking countdowns & breaks',
  },
  {
    id: 'battles',
    name: 'Battles & Races',
    iconName: 'Swords',
    description: 'Name battles, color duels and multi-ball tournaments',
  },
  {
    id: 'asmr_glass',
    name: 'ASMR Glass & Crystal',
    iconName: 'Gem',
    description: 'High-frequency crystal chimes and textured fractures',
  },
  {
    id: 'squeaky_fun',
    name: 'Squeaky & Fun',
    iconName: 'Smile',
    description: 'Bouncy rubber, pachinko cascades and bubble bursts',
  },
  {
    id: 'calm_relaxing',
    name: 'Calm & Relaxing',
    iconName: 'Moon',
    description: 'Hypnotic pendulum waves, sunsets and infinite loops',
  },
];

export interface CuratedTemplate {
  id: string;
  modeId: string;
  name: string;
  category: TemplateCategory;
  isTopPick: boolean;
  badge?: 'HOT' | 'NEW';
  durationSeconds: number;
  previewHue: string; // for canvas thumbnail rendering
  previewGradient: string;
  description: string;
  hook: string;
  presetSettings?: Record<string, any>;
  variants: {
    calm: Record<string, any>;
    viral: Record<string, any>;
    wild: Record<string, any>;
  };
}

export const CURATED_TEMPLATES: CuratedTemplate[] = [
  // 1. TOP PICK #1: Pastel Toybox Run (Marble Music)
  {
    id: 'top_pastel_toybox',
    modeId: 'marble_melody_3d',
    name: 'Pastel Toybox Run',
    category: 'marble_music',
    isTopPick: true,
    badge: 'HOT',
    durationSeconds: 50,
    previewHue: '#FF8FB8',
    previewGradient: 'from-pink-500/25 via-rose-500/15 to-transparent',
    description: 'Frosted pastel cups, chrome tacks and rainbow chime bars',
    hook: 'The most satisfying pastel marble run 🌸✨',
    presetSettings: {
      melodyId: 'toybox_run',
      wallBackground: 'pastel_peach_blush',
      marbleStyle: 'swirl_glass',
      themePack: 'pastel_dream',
    },
    variants: {
      calm: { reelSpeed: 0.5, density: 0.8 },
      viral: { reelSpeed: 0.5, density: 1.0 },
      wild: { reelSpeed: 1.0, density: 1.4 },
    },
  },

  // 2. TOP PICK #2: Moonlight Sonata Run (Marble Music)
  {
    id: 'top_moonlight_sonata',
    modeId: 'marble_melody_3d',
    name: 'Moonlight Sonata Run',
    category: 'marble_music',
    isTopPick: true,
    badge: 'HOT',
    durationSeconds: 60,
    previewHue: '#38bdf8',
    previewGradient: 'from-blue-600/25 via-cyan-500/15 to-transparent',
    description: 'Obsidian wall, neon keys and echoing nocturnal chimes',
    hook: 'Wait till the marble hits the crescendo chord... 🌙🎹',
    presetSettings: {
      melodyId: 'moonlight_sonata',
      wallBackground: 'nocturnal_obsidian',
      marbleStyle: 'crystal',
      themePack: 'neon_night',
    },
    variants: {
      calm: { reelSpeed: 0.5, density: 0.9 },
      viral: { reelSpeed: 0.5, density: 1.1 },
      wild: { reelSpeed: 1.0, density: 1.5 },
    },
  },

  // 3. TOP PICK #3: Countdown Escape 60s (Satisfying Escape)
  {
    id: 'top_countdown_escape',
    modeId: 'countdown_escape',
    name: 'Countdown Escape 60s',
    category: 'satisfying_escape',
    isTopPick: true,
    badge: 'HOT',
    durationSeconds: 60,
    previewHue: '#f43f5e',
    previewGradient: 'from-rose-500/25 via-red-500/15 to-transparent',
    description: 'Will the neon marble escape before the timer hits 00:00?',
    hook: 'Can it escape in under 60 seconds?! ⏱️🚨',
    presetSettings: {
      targetDuration: 60,
      reelSpeed: 0.5,
    },
    variants: {
      calm: { speed: 1.0, gapWidthDeg: 35 },
      viral: { speed: 1.3, gapWidthDeg: 28 },
      wild: { speed: 1.8, gapWidthDeg: 20 },
    },
  },

  // 4. TOP PICK #4: Grow Till It Cracks (Satisfying Escape)
  {
    id: 'top_grow_cracks',
    modeId: 'grow_till_it_cracks',
    name: 'Grow Till It Cracks',
    category: 'satisfying_escape',
    isTopPick: true,
    badge: 'HOT',
    durationSeconds: 60,
    previewHue: '#CCFF00',
    previewGradient: 'from-lime-500/25 via-emerald-500/15 to-transparent',
    description: 'Every single bounce expands the sphere until the container shatters',
    hook: 'Watch it expand until the glass explodes! 💥🟢',
    presetSettings: {
      growthRate: 1.02,
      targetDuration: 60,
    },
    variants: {
      calm: { growthRate: 1.015, reelSpeed: 0.5 },
      viral: { growthRate: 1.025, reelSpeed: 0.5 },
      wild: { growthRate: 1.04, reelSpeed: 1.0 },
    },
  },

  // 5. TOP PICK #5: Name Battle Royale (Battles)
  {
    id: 'top_name_battle',
    modeId: 'name_battle',
    name: 'Name Battle Royale',
    category: 'battles',
    isTopPick: true,
    badge: 'HOT',
    durationSeconds: 60,
    previewHue: '#eab308',
    previewGradient: 'from-amber-500/25 via-orange-500/15 to-transparent',
    description: '4 viral names battle for ultimate territory dominance',
    hook: 'Comment your name for the next battle! 🏆⚡',
    presetSettings: {
      targetDuration: 60,
    },
    variants: {
      calm: { ballCount: 4, bounceBoostRate: 1.0 },
      viral: { ballCount: 6, bounceBoostRate: 1.2 },
      wild: { ballCount: 12, bounceBoostRate: 1.5 },
    },
  },

  // 6. TOP PICK #6: Pick Ur Color Duel (Battles)
  {
    id: 'top_pick_color',
    modeId: 'pick_ur_color',
    name: 'Pick Ur Color Duel',
    category: 'battles',
    isTopPick: true,
    badge: 'HOT',
    durationSeconds: 45,
    previewHue: '#06b6d4',
    previewGradient: 'from-cyan-500/25 via-blue-500/15 to-transparent',
    description: 'Choose Cyan, Rose, Lime or Violet before the drop',
    hook: 'Pick your color BEFORE it drops! Which side won?! 🗳️🔥',
    presetSettings: {
      targetDuration: 45,
    },
    variants: {
      calm: { teamCount: 2, speed: 1.0 },
      viral: { teamCount: 4, speed: 1.2 },
      wild: { teamCount: 4, speed: 1.6 },
    },
  },

  // 7. TOP PICK #7: Crystal Chimes ASMR (ASMR Glass)
  {
    id: 'top_crystal_chimes',
    modeId: 'marble_xylophone_rain',
    name: 'Crystal Chimes ASMR',
    category: 'asmr_glass',
    isTopPick: true,
    badge: 'HOT',
    durationSeconds: 45,
    previewHue: '#a855f7',
    previewGradient: 'from-purple-500/25 via-violet-500/15 to-transparent',
    description: 'Resonant glass crystal bars with soothing harmonic delays',
    hook: 'Headphones on for pure crystal ASMR tingles 🎧💎',
    presetSettings: {
      targetDuration: 45,
      soundTexture: 'crystal',
    },
    variants: {
      calm: { noteDensity: 0.8, reelSpeed: 0.5 },
      viral: { noteDensity: 1.0, reelSpeed: 0.5 },
      wild: { noteDensity: 1.4, reelSpeed: 1.0 },
    },
  },

  // 8. TOP PICK #8: Xylophone Rain (ASMR Glass)
  {
    id: 'top_xylophone_rain',
    modeId: 'marble_xylophone_rain',
    name: 'Xylophone Rain Cascade',
    category: 'asmr_glass',
    isTopPick: true,
    badge: 'HOT',
    durationSeconds: 60,
    previewHue: '#10b981',
    previewGradient: 'from-emerald-500/25 via-teal-500/15 to-transparent',
    description: 'Melodic rain of bouncy spheres trickling down wooden and steel bars',
    hook: 'The sound of raindrops played on wooden bars 🪵🌧️',
    presetSettings: {
      targetDuration: 60,
      soundTexture: 'wood',
    },
    variants: {
      calm: { rainIntensity: 0.7, reelSpeed: 0.5 },
      viral: { rainIntensity: 1.0, reelSpeed: 0.5 },
      wild: { rainIntensity: 1.5, reelSpeed: 1.0 },
    },
  },

  // 9. TOP PICK #9: Bubble Pop Chain (Squeaky & Fun)
  {
    id: 'top_bubble_pop',
    modeId: 'bubble_pop_chain',
    name: 'Bubble Pop Chain',
    category: 'squeaky_fun',
    isTopPick: true,
    badge: 'HOT',
    durationSeconds: 30,
    previewHue: '#f472b6',
    previewGradient: 'from-pink-400/25 via-rose-400/15 to-transparent',
    description: 'Satisfying rubber pop audio chain reactions in zero-g container',
    hook: 'Oddly satisfying bubble pops that never end 🫧🎈',
    presetSettings: {
      targetDuration: 30,
    },
    variants: {
      calm: { bubbleDensity: 0.8, reelSpeed: 0.5 },
      viral: { bubbleDensity: 1.0, reelSpeed: 0.5 },
      wild: { bubbleDensity: 1.5, reelSpeed: 1.0 },
    },
  },

  // 10. TOP PICK #10: Plinko Cascade (Squeaky & Fun)
  {
    id: 'top_plinko_cascade',
    modeId: 'plinkoCascade',
    name: 'Plinko Pachinko Cascade',
    category: 'squeaky_fun',
    isTopPick: true,
    badge: 'HOT',
    durationSeconds: 45,
    previewHue: '#3b82f6',
    previewGradient: 'from-blue-500/25 via-indigo-500/15 to-transparent',
    description: 'Pins and bell collisions leading to high-stakes multiplier cups',
    hook: 'Will it hit the 1,000,000x multiplier cup?! 🎯💰',
    presetSettings: {
      targetDuration: 45,
    },
    variants: {
      calm: { pinSpacing: 1.2, reelSpeed: 0.5 },
      viral: { pinSpacing: 1.0, reelSpeed: 0.5 },
      wild: { pinSpacing: 0.8, reelSpeed: 1.0 },
    },
  },

  // 11. TOP PICK #11: Day to Night Sunset (Calm & Relaxing)
  {
    id: 'top_day_to_night',
    modeId: 'dayToNight',
    name: 'Day to Night Sunset',
    category: 'calm_relaxing',
    isTopPick: true,
    badge: 'HOT',
    durationSeconds: 60,
    previewHue: '#fb923c',
    previewGradient: 'from-orange-500/25 via-purple-600/15 to-transparent',
    description: 'Warm golden hour shifting slowly into deep nocturnal starlight',
    hook: 'Watch the sunset turn into a galaxy of stars 🌅🌌',
    presetSettings: {
      targetDuration: 60,
      reelSpeed: 0.5,
    },
    variants: {
      calm: { transitionSpeed: 0.8, reelSpeed: 0.5 },
      viral: { transitionSpeed: 1.0, reelSpeed: 0.5 },
      wild: { transitionSpeed: 1.3, reelSpeed: 1.0 },
    },
  },

  // 12. TOP PICK #12: Perfect Infinite Loop (Calm & Relaxing)
  {
    id: 'top_perfect_loop',
    modeId: 'perfectLoop',
    name: 'Perfect Infinite Loop',
    category: 'calm_relaxing',
    isTopPick: true,
    badge: 'HOT',
    durationSeconds: 30,
    previewHue: '#00F0FF',
    previewGradient: 'from-cyan-400/25 via-emerald-400/15 to-transparent',
    description: 'Seamless loop engineered so start and end frames lock identically',
    hook: 'Try finding where this video loops! 🔁🌀',
    presetSettings: {
      targetDuration: 30,
    },
    variants: {
      calm: { symmetry: 4, reelSpeed: 0.5 },
      viral: { symmetry: 6, reelSpeed: 0.5 },
      wild: { symmetry: 8, reelSpeed: 1.0 },
    },
  },

  // ADDITIONAL CURATED CATEGORY ITEMS
  // Marble Music: Canon in D
  {
    id: 'cur_canon_in_d',
    modeId: 'marble_melody_3d',
    name: 'Canon in D Chimes',
    category: 'marble_music',
    isTopPick: false,
    badge: 'NEW',
    durationSeconds: 60,
    previewHue: '#a78bfa',
    previewGradient: 'from-purple-500/20 to-transparent',
    description: 'Pachelbel’s Canon on tuned frosted glass and wire rails',
    hook: 'Canon in D played by bouncy marbles ✨🎶',
    presetSettings: { melodyId: 'canon_in_d', themePack: 'pastel_dream' },
    variants: {
      calm: { reelSpeed: 0.5 },
      viral: { reelSpeed: 0.5 },
      wild: { reelSpeed: 1.0 },
    },
  },

  // Satisfying Escape: Near Miss Hell
  {
    id: 'cur_near_miss',
    modeId: 'nearMissHell',
    name: 'Near Miss Hell',
    category: 'satisfying_escape',
    isTopPick: false,
    badge: 'NEW',
    durationSeconds: 45,
    previewHue: '#ef4444',
    previewGradient: 'from-red-500/20 to-transparent',
    description: 'Insanely narrow gaps where every bounce is 1mm from disaster',
    hook: 'My anxiety during the last 5 seconds 😭💔',
    presetSettings: { targetDuration: 45 },
    variants: {
      calm: { margin: 1.5, reelSpeed: 0.5 },
      viral: { margin: 1.0, reelSpeed: 0.5 },
      wild: { margin: 0.6, reelSpeed: 1.0 },
    },
  },

  // Satisfying Escape: Sequence Break
  {
    id: 'cur_sequence_break',
    modeId: 'sequenceBreak',
    name: 'Sequence Break',
    category: 'satisfying_escape',
    isTopPick: false,
    durationSeconds: 30,
    previewHue: '#f59e0b',
    previewGradient: 'from-amber-500/20 to-transparent',
    description: 'Numbered target tiles broken in exact ascending numerical order',
    hook: 'Wait for tile 99 to shatter! 🎯⚡',
    presetSettings: { targetDuration: 30 },
    variants: {
      calm: { tileCount: 10, reelSpeed: 0.5 },
      viral: { tileCount: 15, reelSpeed: 0.5 },
      wild: { tileCount: 25, reelSpeed: 1.0 },
    },
  },

  // Battles: Elimination Wheel
  {
    id: 'cur_elimination_wheel',
    modeId: 'eliminationWheel',
    name: 'Elimination Wheel',
    category: 'battles',
    isTopPick: false,
    badge: 'NEW',
    durationSeconds: 60,
    previewHue: '#ec4899',
    previewGradient: 'from-pink-500/20 to-transparent',
    description: 'Spinning wheel knocks out one colored ball every rotation',
    hook: 'Last color standing wins the jackpot! 🎡👑',
    presetSettings: { targetDuration: 60 },
    variants: {
      calm: { rotationSpeed: 0.8, reelSpeed: 0.5 },
      viral: { rotationSpeed: 1.2, reelSpeed: 0.5 },
      wild: { rotationSpeed: 1.6, reelSpeed: 1.0 },
    },
  },

  // ASMR Glass: Soap Cube Cut
  {
    id: 'cur_soap_cube',
    modeId: 'soapCubeCut',
    name: 'Soap Cube Slice ASMR',
    category: 'asmr_glass',
    isTopPick: false,
    durationSeconds: 30,
    previewHue: '#06b6d4',
    previewGradient: 'from-cyan-500/20 to-transparent',
    description: 'Crisp grid knife slices through pastel cubes with clicky ASMR',
    hook: 'The crisp crunch of slicing soap cubes 🧼✨',
    presetSettings: { targetDuration: 30 },
    variants: {
      calm: { sliceSpeed: 0.8, reelSpeed: 0.5 },
      viral: { sliceSpeed: 1.0, reelSpeed: 0.5 },
      wild: { sliceSpeed: 1.4, reelSpeed: 1.0 },
    },
  },

  // Squeaky & Fun: Super Bouncy Castle
  {
    id: 'cur_classic_bouncy',
    modeId: 'classic',
    name: 'Super Bouncy Castle',
    category: 'squeaky_fun',
    isTopPick: false,
    durationSeconds: 30,
    previewHue: '#84cc16',
    previewGradient: 'from-lime-500/20 to-transparent',
    description: 'Super-elastic rubber ball ricocheting at dizzying acceleration',
    hook: 'Sound on for the most elastic bounce physics 🔊🏓',
    presetSettings: { targetDuration: 30, ringCount: 22, gapSizeDeg: 26 },
    variants: {
      calm: { restitution: 0.98, reelSpeed: 0.5, ringCount: 22 },
      viral: { restitution: 1.01, reelSpeed: 0.5, ringCount: 24 },
      wild: { restitution: 1.05, reelSpeed: 1.0, ringCount: 28 },
    },
  },

  // Calm & Relaxing: Harmonic Pendulum Wave
  {
    id: 'cur_pendulum_wave',
    modeId: 'pendulumWave',
    name: 'Harmonic Pendulum Wave',
    category: 'calm_relaxing',
    isTopPick: false,
    durationSeconds: 45,
    previewHue: '#6366f1',
    previewGradient: 'from-indigo-500/20 to-transparent',
    description: '24 uncoupled pendulums weaving undulating sine-wave choreographies',
    hook: 'When physics becomes pure visual poetry 🌊✨',
    presetSettings: { targetDuration: 45 },
    variants: {
      calm: { bobCount: 16, reelSpeed: 0.5 },
      viral: { bobCount: 24, reelSpeed: 0.5 },
      wild: { bobCount: 32, reelSpeed: 1.0 },
    },
  },

  // Calm & Relaxing: Sub-Bass Ambient Chill
  {
    id: 'cur_bass_drop',
    modeId: 'bassDropEscape',
    name: 'Sub-Bass Ambient Chill',
    category: 'calm_relaxing',
    isTopPick: false,
    badge: 'NEW',
    durationSeconds: 60,
    previewHue: '#3b82f6',
    previewGradient: 'from-blue-600/20 to-transparent',
    description: 'Deep 40Hz resonant bass frequencies soothing each bounce',
    hook: 'Put headphones on and feel the sub-bass vibration 🎧🔊',
    presetSettings: { targetDuration: 60, reelSpeed: 0.5 },
    variants: {
      calm: { subIntensity: 0.8, reelSpeed: 0.5 },
      viral: { subIntensity: 1.0, reelSpeed: 0.5 },
      wild: { subIntensity: 1.4, reelSpeed: 1.0 },
    },
  },
];
