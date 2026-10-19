import type { InstrumentType } from '../audio/types';

/**
 * General MIDI program (0-127) -> BounceForge synth.
 * There are no sampled soundfonts in the app, so every GM instrument is played by one of
 * the procedural synths. Families with a close match map directly; the rest use a
 * fallback that the UI reports to the user.
 */
const FAMILY_SYNTHS: { range: [number, number]; family: string; synth: InstrumentType; approximate?: boolean }[] = [
  { range: [0, 7], family: 'piano', synth: 'grandPiano' },
  { range: [8, 8], family: 'chromatic percussion', synth: 'celesta' },
  { range: [9, 9], family: 'chromatic percussion', synth: 'bellGlock' },
  { range: [10, 10], family: 'chromatic percussion', synth: 'musicBox' },
  { range: [11, 11], family: 'chromatic percussion', synth: 'vibraphone' },
  { range: [12, 13], family: 'chromatic percussion', synth: 'marimba' },
  { range: [14, 14], family: 'chromatic percussion', synth: 'bellGlock' },
  { range: [15, 15], family: 'chromatic percussion', synth: 'kalimba' },
  { range: [16, 23], family: 'organ', synth: 'softPad', approximate: true },
  { range: [24, 31], family: 'guitar', synth: 'guitar' },
  { range: [32, 39], family: 'bass', synth: 'subBass808' },
  { range: [40, 47], family: 'strings', synth: 'softPad', approximate: true },
  { range: [48, 55], family: 'ensemble', synth: 'softPad', approximate: true },
  { range: [56, 63], family: 'brass', synth: 'trumpet' },
  { range: [64, 71], family: 'reed', synth: 'saxophone' },
  { range: [72, 79], family: 'pipe', synth: 'glass', approximate: true },
  { range: [80, 87], family: 'synth lead', synth: 'synthLead' },
  { range: [88, 95], family: 'synth pad', synth: 'softPad' },
  { range: [96, 103], family: 'synth effects', synth: 'synth', approximate: true },
  { range: [104, 104], family: 'ethnic', synth: 'japaneseKoto' },
  { range: [105, 106], family: 'ethnic', synth: 'japaneseKoto' },
  { range: [107, 107], family: 'ethnic', synth: 'japaneseKoto' },
  { range: [108, 108], family: 'ethnic', synth: 'kalimba' },
  { range: [109, 111], family: 'ethnic', synth: 'saxophone', approximate: true },
  { range: [112, 112], family: 'percussive', synth: 'bellGlock' },
  { range: [113, 113], family: 'percussive', synth: 'woodblock' },
  { range: [114, 114], family: 'percussive', synth: 'steelDrum' },
  { range: [115, 115], family: 'percussive', synth: 'woodblock' },
  { range: [116, 119], family: 'percussive', synth: 'snareRimshot', approximate: true },
  { range: [120, 127], family: 'sound effects', synth: 'grandPiano', approximate: true },
];

export interface SynthChoice {
  synth: InstrumentType;
  family: string;
  /** User-facing note when the sound is a stand-in */
  fallbackNote?: string;
}

export function synthForProgram(program: number, instrumentName: string): SynthChoice {
  if (program < 0 || program > 127 || !Number.isFinite(program)) {
    return { synth: 'grandPiano', family: 'unknown', fallbackNote: 'No instrument set in the file; playing with piano.' };
  }
  const entry = FAMILY_SYNTHS.find((f) => program >= f.range[0] && program <= f.range[1]);
  if (!entry) {
    return { synth: 'grandPiano', family: 'unknown', fallbackNote: `Instrument ${program} is not available; playing with piano.` };
  }
  return {
    synth: entry.synth,
    family: entry.family,
    fallbackNote: entry.approximate
      ? `“${instrumentName || entry.family}” has no matching sound here; using the ${SYNTH_LABELS[entry.synth]} synth instead.`
      : undefined,
  };
}

export const SYNTH_LABELS: Partial<Record<InstrumentType, string>> = {
  grandPiano: 'piano',
  celesta: 'celesta',
  bellGlock: 'glockenspiel',
  musicBox: 'music box',
  vibraphone: 'vibraphone',
  marimba: 'marimba',
  kalimba: 'kalimba',
  softPad: 'soft pad',
  guitar: 'guitar',
  subBass808: '808 bass',
  trumpet: 'trumpet',
  saxophone: 'saxophone',
  glass: 'glass',
  synthLead: 'synth lead',
  synth: 'synth',
  japaneseKoto: 'koto',
  woodblock: 'woodblock',
  steelDrum: 'steel drum',
  snareRimshot: 'rimshot',
  pluckHarp: 'harp',
  xylophone: 'xylophone',
};

/** Synths offered as per-track overrides in the UI */
export const OVERRIDE_SYNTHS: InstrumentType[] = [
  'grandPiano', 'musicBox', 'marimba', 'vibraphone', 'celesta', 'bellGlock', 'kalimba',
  'pluckHarp', 'guitar', 'softPad', 'synthLead', 'subBass808', 'trumpet', 'saxophone',
  'steelDrum', 'glass',
];

/** General MIDI percussion key map (channel 10) -> drum role */
export type DrumRole = 'kick' | 'snare' | 'hat' | 'tom' | 'cymbal' | 'perc';

export function drumRole(midi: number): DrumRole {
  if (midi === 35 || midi === 36) return 'kick';
  if (midi === 37 || midi === 38 || midi === 39 || midi === 40) return 'snare';
  if (midi === 42 || midi === 44 || midi === 46) return 'hat';
  if ([41, 43, 45, 47, 48, 50].includes(midi)) return 'tom';
  if ([49, 51, 52, 53, 55, 57, 59].includes(midi)) return 'cymbal';
  return 'perc';
}
