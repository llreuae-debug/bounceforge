import { NoteItem } from './types';
import { PUBLIC_DOMAIN_MELODIES } from '../marble3d/melodyLibrary';

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

const NATURAL_SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// Accepts sharps and flats, including enharmonics like B#3 (= C4) and Cb4 (= B3)
export function noteNameToMidi(name: string): number {
  const match = name.match(/^([A-G])(#|b)?(-?\d+)$/);
  if (!match) return 60;
  const accidental = match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0;
  const octave = parseInt(match[3], 10);
  return (octave + 1) * 12 + NATURAL_SEMITONES[match[1]] + accidental;
}

export function createNote(name: string, duration: number = 0.5): NoteItem {
  const midi = noteNameToMidi(name);
  return {
    note: name,
    midi,
    freq: midiToFreq(midi),
    duration,
  };
}

export interface Melody {
  id: string;
  name: string;
  composer: string;
  notes: NoteItem[];
}

export const BUILTIN_MELODIES: Melody[] = [
  {
    id: 'fur_elise',
    name: 'Für Elise',
    composer: 'Ludwig van Beethoven',
    notes: [
      'E5', 'D#5', 'E5', 'D#5', 'E5', 'B4', 'D5', 'C5', 'A4',
      'C4', 'E4', 'A4', 'B4',
      'E4', 'G#4', 'B4', 'C5',
      'E4', 'E5', 'D#5', 'E5', 'D#5', 'E5', 'B4', 'D5', 'C5', 'A4',
      'C4', 'E4', 'A4', 'B4',
      'E4', 'C5', 'B4', 'A4'
    ].map(n => createNote(n)),
  },
  {
    id: 'canon_in_d',
    name: 'Canon in D',
    composer: 'Johann Pachelbel',
    notes: [
      'F#5', 'E5', 'D5', 'C#5', 'B4', 'A4', 'B4', 'C#5',
      'D5', 'F#5', 'A5', 'G5', 'F#5', 'D5', 'F#5', 'E5',
      'D5', 'C#5', 'B4', 'A4', 'G4', 'F#4', 'G4', 'E4',
      'D4', 'F#4', 'A4', 'D5', 'C#5', 'B4', 'C#5', 'D5'
    ].map(n => createNote(n)),
  },
  {
    id: 'ode_to_joy',
    name: 'Ode to Joy',
    composer: 'Ludwig van Beethoven',
    notes: [
      'E4', 'E4', 'F4', 'G4', 'G4', 'F4', 'E4', 'D4',
      'C4', 'C4', 'D4', 'E4', 'E4', 'D4', 'D4',
      'E4', 'E4', 'F4', 'G4', 'G4', 'F4', 'E4', 'D4',
      'C4', 'C4', 'D4', 'E4', 'D4', 'C4', 'C4',
      'D4', 'D4', 'E4', 'C4', 'D4', 'E4', 'F4', 'E4', 'C4',
      'D4', 'E4', 'F4', 'E4', 'D4', 'C4', 'D4', 'G3'
    ].map(n => createNote(n)),
  },
  {
    id: 'gymnopedie_1',
    name: 'Gymnopédie No. 1',
    composer: 'Erik Satie',
    notes: [
      'F#5', 'A5', 'G5', 'F#5', 'C#5', 'B4', 'C#5', 'D5', 'A4',
      'F#5', 'A5', 'G5', 'F#5', 'C#5', 'B4', 'C#5', 'D5', 'E5',
      'F#5', 'A5', 'G5', 'F#5', 'C#5', 'B4', 'D5', 'C#5', 'B4'
    ].map(n => createNote(n, 0.8)),
  },
  {
    id: 'moonlight_sonata',
    name: 'Moonlight Sonata (Mvt 1)',
    composer: 'Ludwig van Beethoven',
    notes: [
      'G#3', 'C#4', 'E4', 'G#3', 'C#4', 'E4', 'G#3', 'C#4', 'E4', 'G#3', 'C#4', 'E4',
      'A3', 'C#4', 'E4', 'A3', 'C#4', 'E4', 'A3', 'D4', 'F#4', 'A3', 'D4', 'F#4',
      'G#3', 'C#4', 'E4', 'G#3', 'B#3', 'D#4', 'G#3', 'C#4', 'E4', 'G#3', 'C#4', 'E4',
      'G#4', 'G#4', 'G#4', 'A4', 'G#4', 'F#4', 'E4', 'D#4'
    ].map(n => createNote(n)),
  },
  {
    id: 'clair_de_lune',
    name: 'Clair de Lune',
    composer: 'Claude Debussy',
    notes: [
      'F5', 'Eb5', 'Db5', 'C5', 'Bb4', 'Ab4', 'F4', 'Ab4', 'Db5',
      'F5', 'Eb5', 'Db5', 'C5', 'Bb4', 'C5', 'Db5', 'Eb5', 'Ab4',
      'Db5', 'F5', 'Ab5', 'Gb5', 'F5', 'Eb5', 'Db5'
    ].map(n => createNote(n, 0.7)),
  },
  {
    id: 'greensleeves',
    name: 'Greensleeves',
    composer: 'Traditional',
    notes: [
      'A4', 'C5', 'D5', 'E5', 'F5', 'E5', 'D5', 'B4', 'G4', 'A4', 'B4', 'C5', 'A4', 'A4', 'G#4', 'A4', 'B4', 'G#4', 'E4',
      'A4', 'C5', 'D5', 'E5', 'F5', 'E5', 'D5', 'B4', 'G4', 'A4', 'B4', 'C5', 'B4', 'A4', 'G#4', 'F#4', 'G#4', 'A4'
    ].map(n => createNote(n)),
  },
  {
    id: 'turkish_march',
    name: 'Turkish March',
    composer: 'W. A. Mozart',
    notes: [
      'B4', 'A4', 'G#4', 'A4', 'C5',
      'D5', 'C5', 'B4', 'C5', 'E5',
      'F5', 'E5', 'D#5', 'E5', 'B5', 'A5', 'G#5', 'A5', 'B5', 'A5', 'G#5', 'A5', 'C6',
      'A5', 'C6', 'B5', 'A5', 'G#5', 'A5', 'B5', 'E5'
    ].map(n => createNote(n)),
  },
  {
    id: 'mountain_king',
    name: 'In the Hall of the Mountain King',
    composer: 'Edvard Grieg',
    notes: [
      'B3', 'C#4', 'D4', 'E4', 'F#4', 'D4', 'F#4',
      'F4', 'C#4', 'F4', 'E4', 'C4', 'E4',
      'B3', 'C#4', 'D4', 'E4', 'F#4', 'D4', 'F#4',
      'B4', 'A4', 'F#4', 'D4', 'F#4', 'A4', 'B4'
    ].map(n => createNote(n)),
  },
  {
    id: 'the_entertainer',
    name: 'The Entertainer',
    composer: 'Scott Joplin',
    notes: [
      'D4', 'D#4', 'E4', 'C5', 'E4', 'C5', 'E4', 'C5',
      'C5', 'D5', 'D#5', 'E5', 'C5', 'D5', 'E5',
      'B4', 'D5', 'C5',
      'D4', 'D#4', 'E4', 'C5', 'E4', 'C5', 'E4', 'C5',
      'A4', 'G4', 'F#4', 'A4', 'C5', 'E5', 'D5', 'C5', 'A4', 'D5'
    ].map(n => createNote(n)),
  },
  {
    id: 'swan_lake',
    name: 'Swan Lake Theme',
    composer: 'Pyotr Ilyich Tchaikovsky',
    notes: [
      'B4', 'E5', 'F#5', 'G5', 'A5', 'B5', 'G5', 'E5',
      'F#5', 'G5', 'F#5', 'D#5', 'E5', 'B4',
      'B4', 'E5', 'F#5', 'G5', 'A5', 'B5', 'C6', 'B5', 'A5', 'G5', 'F#5', 'E5'
    ].map(n => createNote(n)),
  },
  // 10 Original Catchy EDM / Ambient Melodies
  {
    id: 'cyber_pulse',
    name: 'Cyber Pulse',
    composer: 'BounceForge Original',
    notes: [
      'C4', 'G4', 'C5', 'Eb5', 'G5', 'Eb5', 'C5', 'G4',
      'Bb3', 'F4', 'Bb4', 'D5', 'F5', 'D5', 'Bb4', 'F4',
      'Ab3', 'Eb4', 'Ab4', 'C5', 'Eb5', 'C5', 'Ab4', 'Eb4',
      'G3', 'D4', 'G4', 'B4', 'D5', 'B4', 'G4', 'D4'
    ].map(n => createNote(n)),
  },
  {
    id: 'neon_dream',
    name: 'Neon Dream',
    composer: 'BounceForge Original',
    notes: [
      'E4', 'G#4', 'B4', 'E5', 'D#5', 'B4', 'G#4', 'E4',
      'C#4', 'E4', 'G#4', 'C#5', 'B4', 'G#4', 'E4', 'C#4',
      'A3', 'C#4', 'E4', 'A4', 'G#4', 'E4', 'C#4', 'A3',
      'B3', 'D#4', 'F#4', 'B4', 'C#5', 'D#5', 'E5', 'F#5'
    ].map(n => createNote(n)),
  },
  {
    id: 'quantum_cascade',
    name: 'Quantum Cascade',
    composer: 'BounceForge Original',
    notes: [
      'D4', 'A4', 'F5', 'E5', 'D5', 'C5', 'A4', 'G4',
      'Bb4', 'D5', 'F5', 'G5', 'A5', 'F5', 'D5', 'Bb4',
      'C4', 'G4', 'E5', 'D5', 'C5', 'B4', 'G4', 'E4',
      'A3', 'E4', 'C5', 'B4', 'A4', 'G4', 'A4', 'C5'
    ].map(n => createNote(n)),
  },
  {
    id: 'midnight_city',
    name: 'Midnight City Skyline',
    composer: 'BounceForge Original',
    notes: [
      'F4', 'C5', 'A5', 'F5', 'G5', 'E5', 'C5', 'G4',
      'D4', 'A4', 'F5', 'D5', 'E5', 'C5', 'G4', 'E4',
      'Bb3', 'F4', 'D5', 'Bb4', 'C4', 'G4', 'E5', 'C5',
      'D4', 'F4', 'A4', 'C5', 'E5', 'D5', 'A4', 'F4'
    ].map(n => createNote(n)),
  },
  {
    id: 'stellar_drift',
    name: 'Stellar Drift',
    composer: 'BounceForge Original',
    notes: [
      'G4', 'B4', 'D5', 'F#5', 'G5', 'F#5', 'D5', 'B4',
      'E4', 'G4', 'B4', 'D5', 'E5', 'D5', 'B4', 'G4',
      'C4', 'E4', 'G4', 'B4', 'C5', 'B4', 'G4', 'E4',
      'D4', 'F#4', 'A4', 'C5', 'D5', 'E5', 'F#5', 'A5'
    ].map(n => createNote(n)),
  },
  {
    id: 'crystal_rain',
    name: 'Crystal Rain',
    composer: 'BounceForge Original',
    notes: [
      'A4', 'C5', 'E5', 'A5', 'B5', 'G#5', 'E5', 'B4',
      'F4', 'A4', 'C5', 'F5', 'G5', 'E5', 'C5', 'G4',
      'D4', 'F4', 'A4', 'D5', 'E4', 'G#4', 'B4', 'E5',
      'A3', 'E4', 'A4', 'C5', 'E5', 'C5', 'A4', 'E4'
    ].map(n => createNote(n)),
  },
  {
    id: 'solar_flare',
    name: 'Solar Flare',
    composer: 'BounceForge Original',
    notes: [
      'E4', 'B4', 'E5', 'G5', 'F#5', 'D5', 'B4', 'G4',
      'A4', 'E5', 'A5', 'C6', 'B5', 'G5', 'E5', 'C5',
      'D4', 'A4', 'D5', 'F#5', 'E5', 'C5', 'A4', 'F#4',
      'B3', 'F#4', 'B4', 'D#5', 'F#5', 'D#5', 'B4', 'F#4'
    ].map(n => createNote(n)),
  },
  {
    id: 'hyperspace',
    name: 'Hyperspace Jump',
    composer: 'BounceForge Original',
    notes: [
      'C4', 'Eb4', 'G4', 'C5', 'Eb5', 'G5', 'Bb5', 'G5',
      'Ab4', 'C5', 'Eb5', 'Ab5', 'G5', 'Eb5', 'C5', 'Ab4',
      'F4', 'Ab4', 'C5', 'F5', 'Eb5', 'C5', 'Ab4', 'F4',
      'G4', 'B4', 'D5', 'G5', 'F5', 'D5', 'B4', 'G4'
    ].map(n => createNote(n)),
  },
  {
    id: 'echo_chamber',
    name: 'Echo Chamber',
    composer: 'BounceForge Original',
    notes: [
      'B3', 'F#4', 'B4', 'D5', 'F#5', 'D5', 'B4', 'F#4',
      'G3', 'D4', 'G4', 'B4', 'D5', 'B4', 'G4', 'D4',
      'A3', 'E4', 'A4', 'C#5', 'E5', 'C#5', 'A4', 'E4',
      'F#3', 'C#4', 'F#4', 'A#4', 'C#5', 'A#4', 'F#4', 'C#4'
    ].map(n => createNote(n)),
  },
  {
    id: 'golden_hourglass',
    name: 'Golden Hourglass',
    composer: 'BounceForge Original',
    notes: [
      'D4', 'F#4', 'A4', 'D5', 'C#5', 'A4', 'F#4', 'D4',
      'G4', 'B4', 'D5', 'G5', 'F#5', 'D5', 'B4', 'G4',
      'E4', 'G4', 'B4', 'E5', 'D5', 'B4', 'G4', 'E4',
      'A3', 'E4', 'G4', 'A4', 'C#5', 'E5', 'G5', 'A5'
    ].map(n => createNote(n)),
  },
  // Favorite Celebrations, Soundtracks & Viral Anthems
  {
    id: 'happy_birthday',
    name: 'Happy Birthday to You',
    composer: 'Patty & Mildred Hill',
    notes: [
      'G4', 'G4', 'A4', 'G4', 'C5', 'B4',
      'G4', 'G4', 'A4', 'G4', 'D5', 'C5',
      'G4', 'G4', 'G5', 'E5', 'C5', 'B4', 'A4',
      'F5', 'F5', 'E5', 'C5', 'D5', 'C5',
    ].map(n => createNote(n, 0.45)),
  },
  {
    id: 'bella_ciao',
    name: 'Bella Ciao (Italian folk song)',
    composer: 'Traditional Italian folk song',
    notes: [
      'E4', 'A4', 'B4', 'C5', 'A4',
      'E4', 'A4', 'B4', 'C5', 'A4',
      'E4', 'A4', 'B4', 'C5', 'B4', 'A4', 'C5', 'B4', 'A4', 'E5',
      'E5', 'E5', 'D5', 'E5', 'F5', 'F5',
      'E5', 'D5', 'F5', 'E5',
      'E5', 'D5', 'C5', 'B4', 'E5', 'B4', 'C5', 'A4',
    ].map(n => createNote(n, 0.32)),
  },
  {
    id: 'jingle_bells',
    name: 'Jingle Bells',
    composer: 'James Lord Pierpont',
    notes: [
      'E5', 'E5', 'E5', 'E5', 'E5', 'E5', 'E5', 'G5', 'C5', 'D5', 'E5',
      'F5', 'F5', 'F5', 'F5', 'F5', 'E5', 'E5', 'E5', 'E5', 'D5', 'D5', 'E5', 'D5', 'G5',
      'E5', 'E5', 'E5', 'E5', 'E5', 'E5', 'E5', 'G5', 'C5', 'D5', 'E5',
      'F5', 'F5', 'F5', 'F5', 'F5', 'E5', 'E5', 'E5', 'G5', 'G5', 'F5', 'D5', 'C5',
    ].map(n => createNote(n, 0.3)),
  },
  {
    id: 'we_wish_you_merry_christmas',
    name: 'We Wish You a Merry Christmas',
    composer: 'English Traditional',
    notes: [
      'D4', 'G4', 'G4', 'A4', 'G4', 'F#4', 'E4', 'E4',
      'E4', 'A4', 'A4', 'B4', 'A4', 'G4', 'F#4', 'D4',
      'D4', 'B4', 'B4', 'C5', 'B4', 'A4', 'G4', 'E4',
      'D4', 'D4', 'E4', 'A4', 'F#4', 'G4',
    ].map(n => createNote(n, 0.35)),
  },
  {
    id: 'twinkle_twinkle',
    name: 'Twinkle Twinkle Little Star',
    composer: 'Traditional',
    notes: [
      'C4', 'C4', 'G4', 'G4', 'A4', 'A4', 'G4',
      'F4', 'F4', 'E4', 'E4', 'D4', 'D4', 'C4',
      'G4', 'G4', 'F4', 'F4', 'E4', 'E4', 'D4',
      'G4', 'G4', 'F4', 'F4', 'E4', 'E4', 'D4',
      'C4', 'C4', 'G4', 'G4', 'A4', 'A4', 'G4',
      'F4', 'F4', 'E4', 'E4', 'D4', 'D4', 'C4',
    ].map(n => createNote(n, 0.4)),
  },
];

const libraryMelodyCache = new Map<string, Melody>();

/**
 * Looks up a melody by id in the 2D bounce list first, then in the full song library
 * (the one the Music picker uses). Library songs play their lead line, one note per bounce.
 */
export function findMelodyById(id: string | undefined): Melody | undefined {
  if (!id) return undefined;
  const builtin = BUILTIN_MELODIES.find((m) => m.id === id);
  if (builtin) return builtin;

  const cached = libraryMelodyCache.get(id);
  if (cached) return cached;
  const def = PUBLIC_DOMAIN_MELODIES.find((m) => m.id === id);
  if (!def) return undefined;

  const melody: Melody = {
    id: def.id,
    name: def.name,
    composer: def.composer,
    notes: def.notes
      .filter((n) => (n.lane ?? 0) === 0)
      .sort((a, b) => a.time - b.time)
      .map((n) => ({
        note: n.pitchName,
        midi: n.midi,
        freq: n.freq,
        duration: Math.max(0.25, Math.min(0.9, n.duration)),
      })),
  };
  libraryMelodyCache.set(id, melody);
  return melody;
}

/** The Music picker stores its choice in modeSettings.melodyId; prefer it when it names a real song. */
export function resolveSelectedMelodyId(
  selectedMelodyId: string,
  modeSettings?: Record<string, any>
): string {
  const picked = modeSettings?.melodyId;
  return typeof picked === 'string' && findMelodyById(picked) ? picked : selectedMelodyId;
}
