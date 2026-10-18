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
  | 'squeaky_duck'
  | 'spring_smiley'
  | 'unbranded_phone'
  | 'unbranded_speaker'
  | 'brass_horn'
  | 'desk_bell'
  | 'cymbal_drum'
  | 'split_piano_key'
  | 'prop_star'
  | 'prop_heart'
  | 'prop_cloud'
  | 'prop_snowflake'
  | 'prop_leaf'
  | 'final_catcher';

export type ReelFormatId =
  | 'f1_guess_tune'
  | 'f2_guess_all'
  | 'f3_which_sounds_better'
  | 'f4_themed_props'
  | 'f5_night_beats'
  | 'f6_squeaky_orchestra'
  | 'f7_gadget_tones'
  | 'f8_brass_band'
  | 'f9_glass_crystal'
  | 'f10_nature_walls'
  | 'f11_split_screen'
  | 'f12_interior_scene';

export type EmbossFontStyle = 'script' | 'bold_cartoon' | 'clean_sans' | 'bold_italic_serif';
export type EmbossMode = 'embossed' | 'debossed';
export type EmbossColorMode = 'same_as_wall' | 'slightly_lighter' | 'slightly_darker' | 'colored' | 'rainbow_gradient';

export interface EmbossedTextConfig {
  enabled?: boolean;
  titleText: string;
  reminders: string[]; // e.g. ["like & follow", "subscribe", "part 2?"]
  handleRepeats: number; // 2 to 4
  fontStyle: EmbossFontStyle;
  embossMode: EmbossMode;
  depth: number; // 0.02 to 0.1
  colorMode: EmbossColorMode;
  customColor?: string;
  revealAnswerText?: string;
  revealAnswerTime?: number;
}

export interface SignatureMarbleConfig {
  coreColor: string;
  stripeColor: string;
  glossiness: number; // 0 to 1
}

export interface ChannelStyleConfig {
  channelName: string;
  handle: string;
  signatureMarble: SignatureMarbleConfig;
  defaultWallPalette: string;
  defaultTexturedWall: string;
  wallTextFont: EmbossFontStyle;
  embossStyle: EmbossMode;
  handlePlacement: 'repeats' | 'top_left' | 'center_path';
  favoriteFormats: ReelFormatId[];
  profileCovers: Array<{
    id: string;
    title: string;
    presetName: string;
    formatId: ReelFormatId;
    viewsLabel: string;
    timestamp: number;
    accentColor: string;
  }>;
}

export interface EmbossedWallTextInstance {
  id: string;
  text: string;
  type: 'title' | 'reminder' | 'handle' | 'act_number' | 'reveal_answer' | 'versus_label';
  fontStyle: EmbossFontStyle;
  embossMode: EmbossMode;
  x: number;
  y: number;
  z: number;
  scale: number;
  color?: string;
  rainbowGradient?: boolean;
  revealAtTime?: number;
}

export type HeroMaterial =
  | 'clear_crystal'
  | 'cut_diamond'
  | 'frosted_glass'
  | 'stained_glass'
  | 'liquid_filled_glass'
  | 'soap_bubble'
  | 'sea_glass'
  | 'neon_glass_tube'
  | 'opal'
  | 'amethyst_geode'
  | 'obsidian'
  | 'marble_stone'
  | 'porcelain_gold'
  | 'chrome_mirror'
  | 'brushed_gold'
  | 'copper_patina'
  | 'liquid_mercury'
  | 'jelly_gummy'
  | 'hard_candy'
  | 'velvet_felt'
  | 'lacquered_wood'
  | 'holographic_foil'
  | 'latex_balloon'
  | 'ice';

export type HeroMarble =
  | 'clear_diamond'
  | 'swirl_glass'
  | 'pearl'
  | 'opal'
  | 'moonstone'
  | 'chrome_mirror'
  | 'liquid_mercury'
  | 'gold'
  | 'ruby_glass'
  | 'emerald_glass'
  | 'amethyst'
  | 'jade'
  | 'amber_honey'
  | 'ice_snowglobe'
  | 'bubble'
  | 'neon_core'
  | 'galaxy'
  | 'gummy'
  | 'candy_swirl'
  | 'ember';

export interface World10Layers {
  wallSurface: string; // 1. wall surface (material + texture + color)
  objectMaterial: HeroMaterial; // 2. object material (from 24 hero materials)
  marbleType: HeroMarble; // 3. marble type (from 20 hero marbles)
  lightingRig: string; // 4. lighting rig (e.g. soft_morning, moonbeam, torch_flicker...)
  colorGrade: string; // 5. color grade / palette
  hitEffect: string; // 6. hit effect (per material)
  ambientParticles: string; // 7. ambient particles
  cameraLanguage: string; // 8. camera language (follow style, tilt, DOF)
  finaleEvent: string; // 9. finale event
  ambientSoundBed: string; // 10. ambient sound bed
}

export type PresetMood = 'calm' | 'epic' | 'cute' | 'festive' | 'night';
export type MaterialCategory = 'glass' | 'crystal' | 'metal' | 'ice' | 'jelly' | 'stone' | 'neon' | 'candy';

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
  | 'cats_eye'
  | HeroMarble;

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
  | 'pastel_peach_gradient'
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
  reelSpeed?: number; // 0.25, 0.5, 0.75, 1.0, 1.25. DEFAULT = 0.5
  slowMoMode?: 'calm_tempo' | 'normal_tempo'; // Choice A ('calm_tempo') or Choice B ('normal_tempo'). DEFAULT = 'calm_tempo'

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
  customWallColor?: string;
  customWallImage?: string;
  customWallImageRepeatY?: number;
  customWallImageRepeatX?: number;
  lightingStyle: LightingStyle;
  cameraStyle: CameraStyle;

  decorEnabled: boolean;
  decorDensity: number; // 0 to 1

  handleText: string;
  showHandleText?: boolean;
  showBackgroundText?: boolean;
  seed: number;
  world?: World10Layers;
  reelFormat?: ReelFormatId;
  embossedText?: EmbossedTextConfig;
  signatureMarble?: SignatureMarbleConfig;
  channelStyle?: Partial<ChannelStyleConfig>;

  locks: {
    melody?: boolean;
    acts?: boolean;
    pathStyle?: boolean;
    marble?: boolean;
    theme?: boolean;
    background?: boolean;
    lighting?: boolean;
    decor?: boolean;
    embossedText?: boolean;
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
  material?: HeroMaterial;
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
  squishAmount?: number; // for squeaky toys
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
  embossedWallTexts?: EmbossedWallTextInstance[];
  activeFormat?: ReelFormatId;
  splitScreenConfig?: {
    enabled: boolean;
    splitRatio: number; // e.g. 0.45 top / 0.55 bottom
    show3DPiano: boolean;
  };
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

