import { arp, type AccStyle } from './notation';

/**
 * The built-in MIDI Library.
 *
 * COPYRIGHT RULES (enforced by scripts/testDropStudio.ts):
 * - Only public-domain compositions (composer died 100+ years ago, or a traditional tune first
 *   published 100+ years ago) or ORIGINAL BounceForge melodies.
 * - Every piece below was newly sequenced by hand, note by note, from the original public-domain
 *   score (melody + a plain period-neutral accompaniment). Nothing is copied from MIDI files,
 *   modern arrangements, film/game versions or recordings.
 * - Titles use only the classical / traditional name.
 * - Sounds come from BounceForge's own WebAudio synth (no samples).
 * Credits for every song live in credits.json (same ids).
 */

export type Mood = 'Calm' | 'Epic' | 'Sad' | 'Happy' | 'Festive' | 'Dark';
export type LibraryInstrument = 'piano' | 'marimba' | 'musicBox' | 'glassBells' | 'synthPluck' | 'harp' | 'eightBit';

export interface SongDef {
  id: string;
  title: string;
  mood: Mood;
  /** Beats per minute (beat = the notation unit, see beatsPerBar) */
  bpm: number;
  beatsPerBar: number;
  /** Played once before the looping body (e.g. a pickup bar) */
  intro?: string;
  /** Main theme, looped to fill the reel. Durations in beats. */
  melody: string;
  /** Accompaniment as chords ("Am:3 E:3"), voiced with `accStyle`, looped with the melody */
  chords?: string;
  accStyle?: AccStyle;
  /** Accompaniment written out note by note (used instead of chords) */
  acc?: string;
  /** Tempo ramp across the reel (e.g. Mountain King speeding up) */
  accel?: [number, number];
  instrument: LibraryInstrument;
}

// ---------------------------------------------------------------------------------------------
// PUBLIC DOMAIN (29)
// ---------------------------------------------------------------------------------------------

const moonlightArps = [
  arp(['G#3', 'C#4', 'E4'], 4, '1/3'),
  arp(['G#3', 'C#4', 'E4'], 4, '1/3'),
  `${arp(['A3', 'C#4', 'E4'], 2, '1/3')} ${arp(['A3', 'D4', 'F#4'], 2, '1/3')}`,
  `G#3:1/3 C4 F#4 G#3 C#4 E4 G#3 C#4 D#4 F#3 C4 D#4`,
  arp(['G#3', 'C#4', 'E4'], 4, '1/3'),
  arp(['G#3', 'C#4', 'E4'], 4, '1/3'),
].join(' | ');

const preludeBars: string[][] = [
  ['C4', 'E4', 'G4', 'C5', 'E5'],
  ['C4', 'D4', 'A4', 'D5', 'F5'],
  ['B3', 'D4', 'G4', 'D5', 'F5'],
  ['C4', 'E4', 'G4', 'C5', 'E5'],
  ['C4', 'E4', 'A4', 'E5', 'A5'],
  ['C4', 'D4', 'F#4', 'A4', 'D5'],
  ['B3', 'D4', 'G4', 'D5', 'G5'],
  ['B3', 'C4', 'E4', 'G4', 'C5'],
  ['A3', 'C4', 'E4', 'G4', 'C5'],
  ['D3', 'A3', 'D4', 'F#4', 'C5'],
  ['G3', 'B3', 'D4', 'G4', 'B4'],
  ['G3', 'Bb3', 'E4', 'G4', 'C#5'],
];
// Each bar: the 5-note shape broken as 1 2 3 4 5 3 4 5, played twice (sixteenths)
const prelude = preludeBars
  .map(([a, b, c, d, e]) => {
    const half = `${a}:.25 ${b} ${c} ${d} ${e} ${c} ${d} ${e}`;
    return `${half} ${half}`;
  })
  .join(' | ');

export const PUBLIC_DOMAIN_SONGS: SongDef[] = [
  {
    id: 'fur_elise',
    title: 'Für Elise',
    mood: 'Calm',
    bpm: 138,
    beatsPerBar: 3,
    intro: 'r:2 E5:.5 D#5:.5',
    melody:
      'E5:.5 D#5 E5 B4 D5 C5 | A4:1 r:.5 C4 E4 A4 | B4:1 r:.5 E4 G#4 B4 | C5:1 r:.5 E4 E5 D#5 | ' +
      'E5:.5 D#5 E5 B4 D5 C5 | A4:1 r:.5 C4 E4 A4 | B4:1 r:.5 E4 C5 B4 | A4:1 r:1 E5:.5 D#5:.5',
    chords: 'r:3 Am:3 E:3 Am:3 r:3 Am:3 E:3 Am:3',
    accStyle: 'root',
    instrument: 'piano',
  },
  {
    id: 'moonlight_sonata',
    title: 'Moonlight Sonata (1st movement)',
    mood: 'Sad',
    bpm: 100,
    beatsPerBar: 4,
    melody: `${moonlightArps}`,
    acc: '[C#2,C#3]:4 | [B1,B2]:4 | [A1,A2]:2 [F#1,F#2]:2 | [G#1,G#2]:4 | [C#2,C#3]:4 | [C#2,C#3]:4',
    instrument: 'piano',
  },
  {
    id: 'ode_to_joy',
    title: 'Ode to Joy',
    mood: 'Happy',
    bpm: 118,
    beatsPerBar: 4,
    melody:
      'E4:1 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | E4:1.5 D4:.5 D4:2 | ' +
      'E4:1 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | D4:1.5 C4:.5 C4:2',
    chords: 'C:4 G:4 C:4 G:4 C:4 G:4 C:4 G:2 C:2',
    accStyle: 'block',
    instrument: 'piano',
  },
  {
    id: 'canon_in_d',
    title: 'Canon in D',
    mood: 'Calm',
    bpm: 72,
    beatsPerBar: 4,
    melody:
      'F#5:2 E5 | D5 C#5 | B4 A4 | B4 C#5 | ' +
      'D4:1 F#4 A4 G4 | F#4 D4 F#4 E4 | D4 B3 D4 A4 | G4 B4 A4 G4',
    chords: 'D:2 A:2 Bm:2 F#m:2 G:2 D:2 G:2 A:2 D:2 A:2 Bm:2 F#m:2 G:2 D:2 G:2 A:2',
    accStyle: 'root',
    instrument: 'harp',
  },
  {
    id: 'mountain_king',
    title: 'In the Hall of the Mountain King',
    mood: 'Dark',
    bpm: 112,
    beatsPerBar: 4,
    melody:
      'B3:.5 C#4 D4 E4 F#4 D4 F#4:1 | F4:.5 C#4 F4:1 E4:.5 C4 E4:1 | B3:.5 C#4 D4 E4 F#4 D4 F#4 B4 | A4:.5 F#4 D4 F#4 A4:2 | ' +
      'F#4:.5 G#4 A4 B4 C#5 A4 C#5:1 | C5:.5 G#4 C5:1 B4:.5 G4 B4:1 | F#4:.5 G#4 A4 B4 C#5 A4 C#5 F#5 | E5:.5 C#5 A4 C#5 E5:2',
    chords: 'Bm:4 F#:4 Bm:4 F#:4 F#m:4 C#:4 F#m:4 C#:4',
    accStyle: 'pulse',
    accel: [112, 176],
    instrument: 'marimba',
  },
  {
    id: 'morning_mood',
    title: 'Morning Mood',
    mood: 'Calm',
    bpm: 58,
    beatsPerBar: 2,
    melody:
      'B5:2/3 G#5:1/3 F#5:2/3 E5:1/3 | F#5:2/3 G#5:1/3 B5:2/3 G#5:1/3 | F#5:2/3 E5:1/3 F#5:2/3 G#5:1/3 | F#5:2/3 G#5:1/3 B5:2/3 G#5:1/3 | ' +
      'B5:2/3 C#6:1/3 G#5:2/3 C#6:1/3 | B5:2/3 G#5:1/3 F#5:2/3 E5:1/3 | F#5:2 | E5:2',
    chords: 'E:2 E:2 E:2 E:2 A:2 E:2 B:2 E:2',
    accStyle: 'root',
    instrument: 'harp',
  },
  {
    id: 'flight_bumblebee',
    title: 'Flight of the Bumblebee',
    mood: 'Epic',
    bpm: 132,
    beatsPerBar: 4,
    melody:
      'E5:.25 D#5 D5 C#5 D5 C#5 C5 B4 C5 B4 A#4 A4 G#4 G4 F#4 F4 | E4:.25 F4 E4 D#4 E4 F4 F#4 G4 G#4 A4 A#4 B4 C5 C#5 D5 D#5 | ' +
      'E5:.25 D#5 D5 C#5 C5 F5 E5 D#5 E5 D#5 D5 C#5 C5 C#5 D5 D#5 | E5:.25 D#5 D5 C#5 D5 C#5 C5 B4 A4:2',
    chords: 'Am:4 E:4 Am:4 E:2 Am:2',
    accStyle: 'pulse',
    instrument: 'synthPluck',
  },
  {
    id: 'rondo_alla_turca',
    title: 'Rondo alla Turca',
    mood: 'Happy',
    bpm: 120,
    beatsPerBar: 2,
    melody:
      'B4:.25 A4 G#4 A4 C5:1 | D5:.25 C5 B4 C5 E5:1 | F5:.25 E5 D#5 E5 B5 A5 G#5 A5 | B5:.25 A5 G#5 A5 C6:1 | ' +
      'A5:.5 C6 B5 A5 | G5 A5 B5 A5 | G5 A5 B5 A5 | G5 F#5 E5:1',
    chords: 'Am:2 Am:2 Am:2 Am:2 Am:2 E:2 Am:2 E:2',
    accStyle: 'alberti',
    instrument: 'piano',
  },
  {
    id: 'eine_kleine_nachtmusik',
    title: 'Eine kleine Nachtmusik',
    mood: 'Happy',
    bpm: 132,
    beatsPerBar: 4,
    melody:
      'G4:1 r:.5 D4:.5 G4:1 r:.5 D4:.5 | G4:.5 D4 G4 B4 D5:1 r:1 | C5:1 r:.5 A4:.5 C5:1 r:.5 A4:.5 | C5:.5 A4 F#4 A4 D4:1 r:1',
    chords: 'G:4 G:4 D7:4 D7:4',
    accStyle: 'pulse',
    instrument: 'harp',
  },
  {
    id: 'gymnopedie_1',
    title: 'Gymnopédie No. 1',
    mood: 'Calm',
    bpm: 72,
    beatsPerBar: 3,
    melody:
      'r:3 | r:3 | r:3 | r:3 | r:1 F#5:1 A5:1 | G5:1 F#5:1 C#5:1 | B4:1 C#5:1 D5:1 | A4:3 | F#4:3 | F#4:3 | F#4:3 | F#4:3',
    acc:
      'G2:1 [B3,D4,F#4]:2 | D2:1 [A3,C#4,F#4]:2 | G2:1 [B3,D4,F#4]:2 | D2:1 [A3,C#4,F#4]:2 | ' +
      'G2:1 [B3,D4,F#4]:2 | D2:1 [A3,C#4,F#4]:2 | G2:1 [B3,D4,F#4]:2 | D2:1 [A3,C#4,F#4]:2 | ' +
      'G2:1 [B3,D4,F#4]:2 | D2:1 [A3,C#4,F#4]:2 | G2:1 [B3,D4,F#4]:2 | D2:1 [A3,C#4,F#4]:2',
    instrument: 'piano',
  },
  {
    id: 'clair_de_lune',
    title: 'Clair de Lune',
    mood: 'Calm',
    bpm: 56,
    beatsPerBar: 3,
    melody:
      'r:1 [F5,Ab5]:2 | [F5,Ab5]:1 [Eb5,F5]:1/3 [F5,Ab5]:1/3 [Eb5,F5]:1/3 [Db5,F5]:1 | [Db5,Eb5]:1/3 [Db5,F5]:1/3 [Db5,Eb5]:1/3 [C5,Eb5]:1 [C5,Db5]:1/3 [C5,Eb5]:1/3 [C5,Db5]:1/3 | ' +
      '[Bb4,Db5]:2 [Bb4,C5]:1 | [Ab4,C5]:3 | [Gb4,Bb4]:3 | [F4,Ab4]:3',
    chords: 'Db:3 Db:3 Ebm7:3 Ab7:3 Db:3 Gb:3 Db:3',
    accStyle: 'root',
    instrument: 'piano',
  },
  {
    id: 'nocturne_op9_2',
    title: 'Nocturne Op. 9 No. 2',
    mood: 'Calm',
    bpm: 132,
    beatsPerBar: 12,
    intro: 'r:11 Bb4:1',
    melody:
      'G5:4 F5:1 G5:1 F5:3 Eb5:2 Bb4:1 | G5:2 C5:1 C6:2 G5:1 Bb5:3 Ab5:2 G5:1 | F5:3 G5:2 D5:1 Eb5:3 C5:3 | ' +
      'Bb4:1 D6:1 C6:1 Bb5:1 Ab5:1 G5:1 Ab5:1 C5:1 D5:1 Eb5:2 Bb4:1',
    chords: 'Eb:6 Bb7:6 Eb:6 Ab:6 Bb7:6 Eb:6 Ab:3 Bb7:3 Eb:6',
    accStyle: 'waltz',
    instrument: 'piano',
  },
  {
    id: 'swan_lake',
    title: 'Swan Lake (Scene theme)',
    mood: 'Sad',
    bpm: 76,
    beatsPerBar: 4,
    melody:
      'F#4:2 B3:.5 C#4 D4 E4 | F#4:1.5 D4:.5 F#4:1.5 D4:.5 | F#4:1.5 B3:.5 D4 B3 G3 D4 | B3:4 | ' +
      'C#4:2 B3:.5 C#4 D4 E4 | F#4:1.5 D4:.5 F#4:1.5 D4:.5 | F#4:1.5 B3:.5 D4 B3 G3 D4 | B3:4',
    chords: 'Bm:4 Bm:4 G:4 Bm:4 F#:4 Bm:4 G:4 Bm:4',
    accStyle: 'arp',
    instrument: 'harp',
  },
  {
    id: 'sugar_plum_fairy',
    title: 'Dance of the Sugar Plum Fairy',
    mood: 'Calm',
    bpm: 72,
    beatsPerBar: 2,
    melody:
      'B4:.25 G4 B4 A#4 F#4 A#4 A4:.5 | G#4:.25 G#4 G#4 G4 F#4 E4:.5 r:.25 | ' +
      'B4:.25 G4 B4 A#4 F#4 A#4 A4:.5 | E5:.25 D#5 D5 C#5 C5 B4:.5 r:.25',
    chords: 'Em:2 B7:2 Em:2 B7:1 Em:1',
    accStyle: 'pulse',
    instrument: 'glassBells',
  },
  {
    id: 'the_entertainer',
    title: 'The Entertainer',
    mood: 'Happy',
    bpm: 92,
    beatsPerBar: 2,
    intro: 'r:1.5 D4:.25 D#4:.25',
    melody:
      'E4:.25 C5:.5 E4:.25 C5:.5 E4:.25 C5:.25 | C5:1.25 C5:.25 D5:.25 D#5:.25 | E5:.25 C5:.25 D5:.25 E5:.5 B4:.25 D5:.5 | C5:1.5 D4:.25 D#4:.25 | ' +
      'E4:.25 C5:.5 E4:.25 C5:.5 E4:.25 C5:.25 | C5:1 A4:.25 G4:.25 F#4:.25 A4:.25 | C5:.25 E5:.5 D5:.25 C5:.25 A4:.25 D5:.5 | D5:1.5 D4:.25 D#4:.25',
    chords: 'C:2 C:2 C:2 G7:1 C:1 C:2 C:2 D7:2 G7:2',
    accStyle: 'rag',
    instrument: 'piano',
  },
  {
    id: 'maple_leaf_rag',
    title: 'Maple Leaf Rag',
    mood: 'Happy',
    bpm: 96,
    beatsPerBar: 2,
    melody:
      'r:.25 Ab4:.25 Eb5:.25 Ab5:.25 r:.25 C6:.25 Eb5:.5 | r:.25 Ab4:.25 Eb5:.25 Ab5:.25 r:.25 C6:.25 Eb5:.5 | ' +
      'G5:.25 Eb5:.25 Bb4:.25 Eb5:.25 G5:.25 Eb5:.25 Db5:.5 | C5:.25 Ab4:.25 Eb5:.25 Ab4:.25 Ab5:1',
    chords: 'Ab:2 Ab:2 Eb7:2 Ab:2',
    accStyle: 'rag',
    instrument: 'piano',
  },
  {
    id: 'william_tell_finale',
    title: 'William Tell Overture (Finale)',
    mood: 'Epic',
    bpm: 144,
    beatsPerBar: 2,
    melody:
      'E5:.25 E5 E5:.5 E5:.25 E5 E5:.5 | E5:.25 E5 A5:.5 B5:.5 C#6:.5 | E5:.25 E5 E5:.5 E5:.25 E5 E5:.5 | E5:.25 E5 A5:.5 C#6:.5 B5:.5 | ' +
      'E5:.25 E5 E5:.5 E5:.25 E5 E5:.5 | E5:.25 E5 A5:.5 B5:.5 C#6:.5 | A5:.5 C#6:.5 E6:.5 C#6:.5 | B5:.5 G#5:.5 E5:1',
    chords: 'A:2 A:2 A:2 E:2 A:2 A:2 A:2 E:1 A:1',
    accStyle: 'pulse',
    instrument: 'synthPluck',
  },
  {
    id: 'habanera',
    title: 'Habanera (Carmen)',
    mood: 'Dark',
    bpm: 72,
    beatsPerBar: 2,
    melody:
      'D5:.75 C#5:.25 C5:.5 C5:.5 | B4:.75 Bb4:.25 A4:1 | A4:.75 G4:.25 F4:.5 F4:.5 | E4:.75 Eb4:.25 D4:1 | ' +
      'D5:.75 C#5:.25 C5:.5 C5:.5 | B4:.75 Bb4:.25 A4:1 | G4:.5 A4:.5 G4:.5 F4:.5 | E4:.5 F4:.5 D4:1',
    acc:
      'D3:.75 A3:.25 F3:.5 A3:.5 | D3:.75 A3:.25 F3:.5 A3:.5 | D3:.75 A3:.25 F3:.5 A3:.5 | D3:.75 A3:.25 F3:.5 A3:.5 | ' +
      'D3:.75 A3:.25 F3:.5 A3:.5 | D3:.75 A3:.25 F3:.5 A3:.5 | A2:.75 E3:.25 C#3:.5 E3:.5 | D3:.75 A3:.25 F3:.5 A3:.5',
    instrument: 'marimba',
  },
  {
    id: 'blue_danube',
    title: 'The Blue Danube',
    mood: 'Calm',
    bpm: 160,
    beatsPerBar: 3,
    melody:
      'D4:1 D4 F#4 | A4:3 | r:1 A5 A5 | r:1 F#5 F#5 | D4:1 D4 F#4 | A4:3 | r:1 A5 A5 | r:1 G5 G5 | ' +
      'C#4:1 C#4 E4 | B4:3 | r:1 B5 B5 | r:1 G5 G5 | C#4:1 C#4 E4 | B4:3 | r:1 B5 B5 | r:1 F#5 F#5 | D4:1 D4 F#4 | A4:1 D5:2',
    chords: 'D:3 D:3 D:3 D:3 D:3 D:3 D:3 D:3 A7:3 A7:3 A7:3 A7:3 A7:3 A7:3 A7:3 A7:3 D:3 D:3',
    accStyle: 'waltz',
    instrument: 'harp',
  },
  {
    id: 'vivaldi_spring',
    title: 'Spring (The Four Seasons)',
    mood: 'Happy',
    bpm: 104,
    beatsPerBar: 4,
    intro: 'r:3.5 E5:.5',
    melody:
      'G#5:.5 G#5 G#5 F#5:.25 E5 B5:1.5 B5:.25 A5 | G#5:.5 G#5 G#5 F#5:.25 E5 B5:1.5 B5:.25 A5 | ' +
      'G#5:.5 A5:.25 B5 A5:.5 G#5 F#5:1 D#5:.5 B4:.5 | G#5:.5 G#5 G#5 F#5:.25 E5 E5:1.5 E5:.5',
    chords: 'E:4 E:4 E:2 B:2 E:4',
    accStyle: 'pulse',
    instrument: 'harp',
  },
  {
    id: 'toccata_fugue_d_minor',
    title: 'Toccata and Fugue in D minor',
    mood: 'Dark',
    bpm: 60,
    beatsPerBar: 4,
    melody:
      'A5:.125 G5 A5:2.75 r:.5 G5:.125 F5 E5 D5 C#5:1 D5:1.5 r:1 | ' +
      'A4:.125 G4 A4:2.75 r:.5 E4:.5 F4:.5 C#4:1 D4:1.5 r:1 | ' +
      'A3:.125 G3 A3:2.75 r:.5 G3:.125 F3 E3 D3 C#3:1 D3:3.5',
    acc: 'r:8 r:8 r:4 [D2,D3]:4',
    instrument: 'synthPluck',
  },
  {
    id: 'air_on_g_string',
    title: 'Air on the G String',
    mood: 'Calm',
    bpm: 54,
    beatsPerBar: 4,
    melody:
      'F#5:4 | F#5:1.5 B5:.5 G5:.25 E5 D5 C#5 D5:1 | D5:1.5 G5:.5 E5:.25 C#5 B4 A4 B4:1 | A4:4',
    acc:
      'D3:.5 D2 C#3 C#2 B2 B1 A2 A1 | G2:.5 G1 F#2 F#1 E2 E1 D2 D1 | G2:.5 G1 E2 E1 A2 A1 G2 G1 | F#2:.5 F#1 D2 D1 A2 A1 A2 A1',
    instrument: 'harp',
  },
  {
    id: 'prelude_in_c',
    title: 'Prelude in C',
    mood: 'Calm',
    bpm: 66,
    beatsPerBar: 4,
    melody: prelude,
    instrument: 'harp',
  },
  {
    id: 'greensleeves',
    title: 'Greensleeves',
    mood: 'Sad',
    bpm: 150,
    beatsPerBar: 6,
    intro: 'r:5 A4:1',
    melody:
      'C5:2 D5:1 E5:1.5 F5:.5 E5:1 | D5:2 B4:1 G4:1.5 A4:.5 B4:1 | C5:2 A4:1 A4:1.5 G#4:.5 A4:1 | B4:2 G#4:1 E4:2 A4:1 | ' +
      'C5:2 D5:1 E5:1.5 F5:.5 E5:1 | D5:2 B4:1 G4:1.5 A4:.5 B4:1 | C5:1.5 B4:.5 A4:1 G#4:1.5 F#4:.5 G#4:1 | A4:5 A4:1',
    chords: 'Am:6 G:6 Am:6 E:6 Am:6 G:6 Am:3 E:3 Am:6',
    accStyle: 'root',
    instrument: 'harp',
  },
  {
    id: 'twinkle_twinkle',
    title: 'Twinkle Twinkle Little Star',
    mood: 'Calm',
    bpm: 100,
    beatsPerBar: 4,
    melody:
      'C4:1 C4 G4 G4 | A4 A4 G4:2 | F4:1 F4 E4 E4 | D4 D4 C4:2 | G4:1 G4 F4 F4 | E4 E4 D4:2 | ' +
      'G4:1 G4 F4 F4 | E4 E4 D4:2 | C4:1 C4 G4 G4 | A4 A4 G4:2 | F4:1 F4 E4 E4 | D4 D4 C4:2',
    chords: 'C:4 F:2 C:2 F:2 C:2 G:2 C:2 C:2 F:2 C:2 G:2 C:2 F:2 C:2 G:2 C:4 F:2 C:2 F:2 C:2 G:2 C:2',
    accStyle: 'root',
    instrument: 'musicBox',
  },
  {
    id: 'jingle_bells',
    title: 'Jingle Bells',
    mood: 'Festive',
    bpm: 132,
    beatsPerBar: 4,
    melody:
      'E4:1 E4 E4:2 | E4:1 E4 E4:2 | E4:1 G4 C4:1.5 D4:.5 | E4:4 | F4:1 F4 F4:1.5 F4:.5 | F4:1 E4 E4 E4:.5 E4:.5 | ' +
      'E4:1 D4 D4 E4 | D4:2 G4:2 | E4:1 E4 E4:2 | E4:1 E4 E4:2 | E4:1 G4 C4:1.5 D4:.5 | E4:4 | ' +
      'F4:1 F4 F4:1.5 F4:.5 | F4:1 E4 E4 E4:.5 E4:.5 | G4:1 G4 F4 D4 | C4:4',
    chords: 'C:4 C:4 C:4 C:4 F:4 C:4 D7:4 G7:4 C:4 C:4 C:4 C:4 F:4 C:4 G7:4 C:4',
    accStyle: 'rag',
    instrument: 'glassBells',
  },
  {
    id: 'silent_night',
    title: 'Silent Night',
    mood: 'Festive',
    bpm: 84,
    beatsPerBar: 3,
    melody:
      'G4:1.5 A4:.5 G4:1 | E4:3 | G4:1.5 A4:.5 G4:1 | E4:3 | D5:2 D5:1 | B4:3 | C5:2 C5:1 | G4:3 | ' +
      'A4:2 A4:1 | C5:1.5 B4:.5 A4:1 | G4:1.5 A4:.5 G4:1 | E4:3 | A4:2 A4:1 | C5:1.5 B4:.5 A4:1 | G4:1.5 A4:.5 G4:1 | E4:3 | ' +
      'D5:2 D5:1 | F5:1.5 D5:.5 B4:1 | C5:3 | E5:3 | C5:1 G4:1 E4:1 | G4:1.5 F4:.5 D4:1 | C4:3 | r:3',
    chords: 'C:3 C:3 C:3 C:3 G:3 G:3 C:3 C:3 F:3 F:3 C:3 C:3 F:3 F:3 C:3 C:3 G:3 G7:3 C:3 C:3 C:3 G7:3 C:3 C:3',
    accStyle: 'waltz',
    instrument: 'glassBells',
  },
  {
    id: 'amazing_grace',
    title: 'Amazing Grace',
    mood: 'Calm',
    bpm: 76,
    beatsPerBar: 3,
    intro: 'r:2 D4:1',
    melody:
      'G4:2 B4:.5 G4:.5 | B4:2 A4:1 | G4:2 E4:1 | D4:2 D4:1 | G4:2 B4:.5 G4:.5 | B4:2 A4:1 | D5:3 | D5:2 B4:1 | ' +
      'D5:1.5 B4:.5 D5:.5 B4:.5 | G4:2 D4:1 | E4:1.5 G4:.5 G4:.5 E4:.5 | D4:2 D4:1 | G4:2 B4:.5 G4:.5 | B4:2 A4:1 | G4:2 D4:1',
    chords: 'G:3 G:3 C:3 G:3 G:3 D:3 D:3 D7:3 G:3 G:3 C:3 G:3 G:3 D7:3 G:3',
    accStyle: 'waltz',
    instrument: 'harp',
  },
  {
    id: 'auld_lang_syne',
    title: 'Auld Lang Syne',
    mood: 'Festive',
    bpm: 84,
    beatsPerBar: 4,
    intro: 'r:3 D4:1',
    melody:
      'G4:1.5 G4:.5 G4:1 B4:1 | A4:1.5 G4:.5 A4:1 B4:.5 A4:.5 | G4:1.5 G4:.5 B4:1 D5:1 | E5:3 E5:1 | ' +
      'D5:1.5 B4:.5 B4:1 G4:1 | A4:1.5 G4:.5 A4:1 B4:.5 A4:.5 | G4:1.5 E4:.5 E4:1 D4:1 | G4:3 D4:1',
    chords: 'G:4 D:4 G:4 C:4 G:4 D:4 Em:2 C:2 G:4',
    accStyle: 'block',
    instrument: 'piano',
  },
];

// ---------------------------------------------------------------------------------------------
// ORIGINAL BOUNCEFORGE MELODIES (12) — composed in-house, fully owned
// ---------------------------------------------------------------------------------------------

export const ORIGINAL_SONGS: SongDef[] = [
  {
    id: 'bf_lofi_chill',
    title: 'Lo-fi Chill',
    mood: 'Calm',
    bpm: 78,
    beatsPerBar: 4,
    melody: 'A4:1 C5:.5 E5:1.5 D5:1 | r:.5 C5:.5 A4:1 G4:2 | E4:1 G4:.5 C5:1.5 B4:1 | r:1 A4:.5 G4:.5 E4:2',
    chords: 'Dm7:4 G7:4 Cmaj7:4 Am7:4',
    accStyle: 'block',
    instrument: 'piano',
  },
  {
    id: 'bf_sad_piano',
    title: 'Sad Piano',
    mood: 'Sad',
    bpm: 66,
    beatsPerBar: 4,
    melody: 'E5:2 D5:1 C5:1 | C5:2 B4:1 A4:1 | G4:2 A4:1 C5:1 | B4:3 r:1 | A4:2 B4:1 C5:1 | D5:2 C5:1 B4:1 | A4:2 G4:1 E4:1 | A4:4',
    chords: 'Am:4 F:4 C:4 G:4 Am:4 F:4 Dm:2 E:2 Am:4',
    accStyle: 'arp',
    instrument: 'piano',
  },
  {
    id: 'bf_epic_build',
    title: 'Epic Build-Up',
    mood: 'Epic',
    bpm: 124,
    beatsPerBar: 4,
    melody:
      'A4:.5 A4 C5 E5 A5:1 G5:1 | F5:.5 F5 A5 C6 F5:1 E5:1 | C5:.5 C5 E5 G5 C6:1 B5:1 | G4:.5 B4 D5 G5 B5:2 | ' +
      'A5:.5 E5 A5 C6 E6:1 D6:1 | C6:.5 A5 F5 A5 C6:1 B5:1 | C6:.5 G5 E5 G5 C6:1 D6:1 | E6:2 B5:2',
    chords: 'Am:4 F:4 C:4 G:4 Am:4 F:4 C:4 E:4',
    accStyle: 'pulse',
    accel: [120, 140],
    instrument: 'synthPluck',
  },
  {
    id: 'bf_satisfying_marimba',
    title: 'Satisfying Marimba',
    mood: 'Happy',
    bpm: 108,
    beatsPerBar: 4,
    melody:
      'C5:.5 E5 G5 E5 C6:1 G5:1 | B4:.5 D5 G5 D5 B5:1 G5:1 | A4:.5 C5 E5 C5 A5:1 E5:1 | F4:.5 A4 C5 A4 F5:2',
    chords: 'C:4 G:4 Am:4 F:4',
    accStyle: 'root',
    instrument: 'marimba',
  },
  {
    id: 'bf_music_box_lullaby',
    title: 'Music Box Lullaby',
    mood: 'Calm',
    bpm: 84,
    beatsPerBar: 3,
    melody: 'G5:1 E5:1 C5:1 | D5:1.5 E5:.5 F5:1 | E5:1 C5:1 A4:1 | G4:3 | A4:1 C5:1 F5:1 | E5:1.5 D5:.5 C5:1 | D5:1 B4:1 G4:1 | C5:3',
    chords: 'C:3 G:3 Am:3 C:3 F:3 C:3 G:3 C:3',
    accStyle: 'waltz',
    instrument: 'musicBox',
  },
  {
    id: 'bf_dark_bass_loop',
    title: 'Dark Bass Loop',
    mood: 'Dark',
    bpm: 96,
    beatsPerBar: 4,
    melody: 'D4:.5 r:.5 D4:.5 F4:.5 E4:.5 r:.5 C4:1 | D4:.5 r:.5 D4:.5 F4:.5 G4:.5 F4:.5 E4:1 | D4:.5 r:.5 A4:.5 G4:.5 F4:.5 E4:.5 C4:1 | D4:2 r:2',
    acc: 'D2:.5 D2 D2 D2 Bb1 Bb1 C2 C2 | D2:.5 D2 D2 D2 Bb1 Bb1 A1 A1 | D2:.5 D2 D2 D2 Bb1 Bb1 C2 C2 | D2:.5 D2 D2 D2 A1:2',
    instrument: 'synthPluck',
  },
  {
    id: 'bf_8bit_chiptune',
    title: '8-bit Chiptune',
    mood: 'Happy',
    bpm: 150,
    beatsPerBar: 4,
    melody:
      'C5:.5 E5 G5 C6 B5 G5 E5 D5 | F5:.5 A5 C6 A5 G5:1 E5:1 | D5:.5 F5 A5 D6 C6 A5 F5 E5 | G5:.5 G5 A5 B5 C6:2',
    chords: 'C:4 F:2 C:2 Dm:4 G:2 C:2',
    accStyle: 'pulse',
    instrument: 'eightBit',
  },
  {
    id: 'bf_ambient_pads',
    title: 'Ambient Pads',
    mood: 'Calm',
    bpm: 60,
    beatsPerBar: 4,
    melody: 'E5:3 D5:1 | B4:4 | C5:3 G4:1 | A4:4',
    chords: 'Cmaj7:4 G:4 Am7:4 Fmaj7:4',
    accStyle: 'block',
    instrument: 'glassBells',
  },
  {
    id: 'bf_happy_pop_hook',
    title: 'Happy Pop Hook',
    mood: 'Happy',
    bpm: 116,
    beatsPerBar: 4,
    melody: 'G4:.5 C5 C5 D5 E5:1 C5:1 | F5:.5 E5 D5 C5 D5:2 | A4:.5 D5 D5 E5 F5:1 D5:1 | G5:.5 F5 E5 D5 C5:2',
    chords: 'C:4 G:4 Dm:4 G:2 C:2',
    accStyle: 'rag',
    instrument: 'marimba',
  },
  {
    id: 'bf_cinematic_drop',
    title: 'Cinematic Drop',
    mood: 'Epic',
    bpm: 88,
    beatsPerBar: 4,
    melody: 'D4:2 F4:2 | A4:2 C5:2 | Bb4:2 A4:1 G4:1 | A4:4 | D5:1 D5:.5 D5:.5 F5:1 E5:1 | D5:1 C5:1 A4:2 | Bb4:1 C5:1 D5:1 E5:1 | D5:4',
    chords: 'Dm:4 F:4 Bb:4 A:4 Dm:4 F:4 Gm:2 A:2 Dm:4',
    accStyle: 'pulse',
    instrument: 'synthPluck',
  },
  {
    id: 'bf_festive_bells',
    title: 'Festive Bells',
    mood: 'Festive',
    bpm: 126,
    beatsPerBar: 4,
    melody: 'G5:.5 E5 G5 C6 B5:1 G5:1 | A5:.5 F5 A5 D6 C6:2 | G5:.5 E5 C5 E5 D5:1 G5:1 | F5:.5 D5 B4 D5 C5:2',
    chords: 'C:4 F:4 C:4 G:2 C:2',
    accStyle: 'rag',
    instrument: 'glassBells',
  },
  {
    id: 'bf_hypnotic_arp',
    title: 'Hypnotic Arp',
    mood: 'Dark',
    bpm: 122,
    beatsPerBar: 4,
    melody:
      'A4:.25 C5 E5 A5 E5 C5 A4 E4 A4 C5 E5 A5 E5 C5 A4 E4 | F4:.25 A4 C5 F5 C5 A4 F4 C4 F4 A4 C5 F5 C5 A4 F4 C4 | ' +
      'C5:.25 E5 G5 C6 G5 E5 C5 G4 C5 E5 G5 C6 G5 E5 C5 G4 | G4:.25 B4 D5 G5 D5 B4 G4 D4 E4 G#4 B4 E5 B4 G#4 E4 B3',
    chords: 'Am:4 F:4 C:4 G:2 E:2',
    accStyle: 'pulse',
    instrument: 'synthPluck',
  },
];

export const LIBRARY_SONGS: SongDef[] = [...PUBLIC_DOMAIN_SONGS, ...ORIGINAL_SONGS];

export function findSong(id: string): SongDef | undefined {
  return LIBRARY_SONGS.find((s) => s.id === id);
}
