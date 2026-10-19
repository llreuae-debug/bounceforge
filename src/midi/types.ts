import type { InstrumentType } from '../audio/types';

/** One note from the MIDI file, in seconds (tempo map already applied). */
export interface MidiNoteEvent {
  time: number;
  duration: number;
  midi: number;
  velocity: number; // 0..1
  trackIndex: number;
  isDrum: boolean;
}

export interface MidiTrackInfo {
  index: number;
  name: string;
  channel: number;
  /** General MIDI program number (0-127), -1 when the track has no program change */
  program: number;
  instrumentName: string;
  family: string;
  isDrum: boolean;
  noteCount: number;
  lowestMidi: number;
  highestMidi: number;
  /** Synth instrument used to play this track (GM programs are approximated) */
  synth: InstrumentType;
  /** Set when the GM instrument has no close synth and a fallback sound is used */
  fallbackNote?: string;
}

export interface BeatMarker {
  time: number;
  bar: number;
  beatInBar: number;
  isDownbeat: boolean;
  bpm: number;
}

export type MusicalRole = 'kick' | 'snare' | 'hat' | 'tom' | 'cymbal' | 'low' | 'high' | 'mid';

export interface AnalyzedNote extends MidiNoteEvent {
  role: MusicalRole;
  /** Velocity relative to nearby notes (1 = average, >1.25 = accent) */
  accent: number;
  isSustained: boolean;
  inRun: boolean;
  onBeat: boolean;
  onDownbeat: boolean;
}

export interface SectionMarker {
  time: number;
  /** Notes per second in the section that starts here */
  density: number;
  reason: 'start' | 'density' | 'register' | 'tempo' | 'phrase';
}

export interface MidiAnalysis {
  name: string;
  fileName: string;
  duration: number;
  /** Tempo at time 0 */
  bpm: number;
  tempoChanges: { time: number; bpm: number }[];
  timeSignature: [number, number];
  timeSignatureChanges: { time: number; signature: [number, number] }[];
  ppq: number;
  tracks: MidiTrackInfo[];
  notes: AnalyzedNote[];
  beats: BeatMarker[];
  phrases: { start: number; end: number }[];
  sections: SectionMarker[];
  hasPercussion: boolean;
  noteRange: [number, number];
  averageVelocity: number;
  warnings: string[];
}

/** Behaviours the user can switch on/off (Screen 2 / timeline). */
export interface SyncToggles {
  beats: boolean;
  kicks: boolean;
  snares: boolean;
  highNotes: boolean;
  sustained: boolean;
  runs: boolean;
  transitions: boolean;
  velocity: boolean;
}

export type FitMode = 'loop' | 'extend' | 'shorten';

export interface ReelOptions {
  sectionStart: number;
  sectionEnd: number;
  targetDuration: number;
  fitMode: FitMode;
  /** Tracks that play and drive the animation */
  enabledTracks: number[];
  /** Per-track synth override chosen by the user */
  instrumentOverrides: Record<number, InstrumentType>;
  toggles: SyncToggles;
  /** 0..1: how many musical events become drops */
  sensitivity: number;
  /** Shift every drop by this many ms (custom mode) */
  timingOffsetMs: number;
  seed: number;
}

export type DropKind = 'heavy' | 'accent' | 'light' | 'roll' | 'cascade' | 'pulse';

/** A planned ball drop. `time` is when the ball HITS its target, so impacts land on the music. */
export interface DropAction {
  id: number;
  time: number;
  kind: DropKind;
  midi: number;
  velocity: number;
  duration: number;
  /** Disabled in custom mode by the user */
  muted?: boolean;
  /** Custom-mode retime (seconds) */
  nudge?: number;
}

export interface TransitionAction {
  time: number;
  paletteIndex: number;
  reason: SectionMarker['reason'];
}

export interface PlannedNote {
  time: number;
  duration: number;
  midi: number;
  velocity: number;
  trackIndex: number;
  isDrum: boolean;
}

export interface ReelPlan {
  duration: number;
  /** Where the reel starts inside the original MIDI */
  sourceStart: number;
  notes: PlannedNote[];
  beats: { time: number; isDownbeat: boolean }[];
  drops: DropAction[];
  transitions: TransitionAction[];
  rootMidi: number;
  trackSynths: Record<number, InstrumentType>;
  warnings: string[];
}

/** Physics / look settings (custom mode). */
export interface ReelPhysicsSettings {
  gravity: number; // multiplier
  bounce: number; // restitution
  ballScale: number;
  simSpeed: number; // physics speed multiplier
  pegs: boolean;
  ramps: boolean;
  spinner: boolean;
  funnel: boolean;
  trails: boolean;
  particles: boolean;
  cameraMotion: boolean;
}

export interface ReelMix {
  master: number;
  music: number;
  drops: number;
  collisions: number;
  ambient: number;
  muted: boolean;
  bassImpacts: boolean;
}

export const DEFAULT_TOGGLES: SyncToggles = {
  beats: true,
  kicks: true,
  snares: true,
  highNotes: true,
  sustained: true,
  runs: true,
  transitions: true,
  velocity: true,
};

export const DEFAULT_PHYSICS: ReelPhysicsSettings = {
  gravity: 1,
  bounce: 0.72,
  ballScale: 1,
  simSpeed: 1,
  pegs: true,
  ramps: true,
  spinner: true,
  funnel: true,
  trails: true,
  particles: true,
  cameraMotion: true,
};

export const DEFAULT_MIX: ReelMix = {
  master: 0.9,
  music: 0.8,
  drops: 0.5,
  collisions: 0.6,
  ambient: 0.25,
  muted: false,
  bassImpacts: true,
};
