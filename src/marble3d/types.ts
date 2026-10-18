export type TunedObjectType =
  | 'glass_tube'
  | 'metal_tack'
  | 'rainbow_xylophone'
  | 'drum'
  | 'dark_tube'
  | 'wire_rail'
  | 'kalimba_tine'
  | 'music_box_comb'
  | 'hand_bell'
  | 'wood_block'
  | 'steel_pan'
  | 'crystal_glass'
  | 'glass_bottle'
  | 'wind_chime'
  | 'piano_staircase'
  | 'marimba_bar'
  | 'final_catcher';

export type PathStyle =
  | 'zigzag'
  | 'scurve'
  | 'spiral'
  | 'wide_swings'
  | 'tight_cascade'
  | 'bounce_heavy'
  | 'roll_heavy';

export type MarbleStyle =
  | 'glass_swirl'
  | 'crystal'
  | 'chrome'
  | 'pearl'
  | 'frosted'
  | 'neon_core'
  | 'cats_eye';

export type MarbleSize = 'small' | 'medium' | 'large';

export type ThemePack =
  | 'pastel_dream'
  | 'candy_shop'
  | 'glass_lab'
  | 'metal_workshop'
  | 'night_neon'
  | 'nature_garden'
  | 'space_toys'
  | 'winter_crystal'
  | 'festive';

export type WallTexture =
  | 'matte_plaster'
  | 'soft_paper'
  | 'fine_stucco'
  | 'satin_paint'
  | 'light_wood'
  | 'frosted_acrylic'
  | 'soft_fabric';

export type WallBackground =
  | 'pastel_peach'
  | 'pastel_mint'
  | 'pastel_lavender'
  | 'pastel_sky'
  | 'cream'
  | 'blush'
  | 'sand'
  | 'soft_grey'
  | 'matte_plaster'
  | 'soft_paper'
  | 'fine_stucco'
  | 'satin_paint'
  | 'light_wood'
  | 'frosted_acrylic'
  | 'soft_fabric'
  | 'neon_grid'
  | 'starfield'
  | 'amber_wood'
  | 'red_gold'
  | 'deep_teal'
  | 'lilac'
  | 'mint'
  | 'candy_pink'
  | 'night_blue';

export type LightingStyle =
  | 'soft_studio'
  | 'warm_morning'
  | 'cool_daylight'
  | 'golden_hour'
  | 'colourful_bounce';

export type CameraStyle =
  | 'top_down_follow'
  | 'tilted_follow'
  | 'orbit_follow'
  | 'macro_close'
  | 'wide_reveal';

export type CatcherType = 'glass_cup' | 'bowl' | 'spiral_funnel' | 'soft_cushion';

export interface MelodyNote {
  time: number; // in seconds from start
  duration: number; // in seconds
  midi: number; // MIDI note number e.g. 60 = C4
  freq: number; // frequency in Hz
  pitchName: string; // e.g. "C4", "D#4"
  velocity: number; // 0 to 1
  lane: number; // 0 = melody, 1 = bass, 2 = chords
}

export interface ActConfig {
  actIndex: number;
  family: TunedObjectType;
  colorAccent: string;
  pathShape: PathStyle;
  startTime: number;
  endTime: number;
}

export interface MarbleMelodyConfig {
  melodyId: string;
  customMidiUrl?: string;
  customMidiName?: string;
  userRightsConfirmed?: boolean;
  tempoMultiplier: number; // 0.5 to 2.0
  transposeSemitones: number; // -12 to +12
  trimStartSeconds: number;
  trimEndSeconds: number;
  targetDuration: number;

  actCount: number;
  acts: ActConfig[];

  pathStyle: PathStyle;
  density: number; // objects per second multiplier (0.5 to 1.5)
  wallWidth: number; // width in 3D units

  marbleCount: 1 | 2 | 3;
  marbleStyle: MarbleStyle;
  marbleSize: MarbleSize;
  swirlColor: string;

  themePack: ThemePack;
  wallBackground: WallBackground;
  lightingStyle: LightingStyle;
  cameraStyle: CameraStyle;

  decorEnabled: boolean;
  decorDensity: number; // 0 to 1

  handleText: string;
  seed: number;

  locks: {
    melody?: boolean;
    acts?: boolean;
    pathStyle?: boolean;
    marble?: boolean;
    theme?: boolean;
    background?: boolean;
    lighting?: boolean;
    decor?: boolean;
  };
}

export interface MarblePathPoint {
  time: number;
  x: number;
  y: number; // downward vertical
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  state: 'arc' | 'roll' | 'hit' | 'freefall' | 'catcher';
  hitObjectId?: string;
}

export interface TunedObjectInstance {
  id: string;
  type: TunedObjectType;
  x: number;
  y: number;
  z: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  pinX: number;
  pinY: number;
  pinZ: number;
  note: MelodyNote;
  color: string;
  hitTime: number;
  lane: number;
  family: string;
  pitchRatio: number; // relative to base pitch for water/length scaling
}

export interface DecorInstance {
  id: string;
  type: 'mascot_dome' | 'toy_door' | 'potted_plant' | 'tiny_shelf' | 'toy_car' | 'origami_swan' | 'planet_rings' | 'candy_lozenge';
  x: number;
  y: number;
  z: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scale: number;
}

export interface EmbossedHandleInstance {
  id: string;
  text: string;
  x: number;
  y: number;
  z: number;
}

export interface MarbleRunLane {
  laneIndex: number;
  marbleColor: string;
  marbleRadius: number;
  points: MarblePathPoint[];
  hits: {
    objectId: string;
    time: number;
    note: MelodyNote;
  }[];
}

export interface MarbleMelodyRun {
  seed: number;
  duration: number;
  config: MarbleMelodyConfig;
  lanes: MarbleRunLane[];
  objects: TunedObjectInstance[];
  catcher: {
    type: CatcherType;
    x: number;
    y: number;
    z: number;
    catchTime: number;
  };
  decor: DecorInstance[];
  embossedHandles: EmbossedHandleInstance[];
  nearMissTease?: {
    time: number;
    x: number;
    y: number;
    z: number;
    skimmingObjectId: string;
  };
}

export interface AutoViralTitles {
  onScreenHook: string;
  hookAlternatives: {
    hook: string;
    recommended?: boolean;
    formula: string;
  }[];
  tiktokCaption: string;
  tiktokHashtags: string[];
  youtubeTitle: string;
  reelsCaption: string;
  reelsHashtags: string[];
  pinnedComment: string;
}

export interface MelodyCopyrightInfo {
  melodyId: string;
  name: string;
  composer: string;
  deathYearOrOrigin: string;
  source: 'original score notes' | 'original composition';
  publicDomain: boolean;
  legalNotice: string;
}

