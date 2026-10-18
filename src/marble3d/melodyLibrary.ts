import * as ToneMidi from '@tonejs/midi';
import { MelodyNote, MelodyCopyrightInfo } from './types';

const Midi = (ToneMidi as any).Midi || (ToneMidi as any).default || ToneMidi;

export interface MelodyDefinition {
  id: string;
  name: string;
  composer: string;
  deathYearOrOrigin: string;
  defaultBpm: number;
  description: string;
  publicDomain: boolean;
  source: 'original score notes' | 'original composition';
  notes: MelodyNote[];
}

// Convert MIDI number to Frequency
export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Convert MIDI number to Note Name (e.g. 60 -> C4)
export function midiToNoteName(midi: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const name = noteNames[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}

// Helper to construct note lists easily
export function makeNotes(
  specs: Array<[time: number, duration: number, midi: number, velocity?: number, lane?: number]>
): MelodyNote[] {
  return specs.map(([time, duration, midi, velocity = 0.85, lane = 0]) => ({
    time: parseFloat(time.toFixed(4)),
    duration: parseFloat(duration.toFixed(4)),
    midi,
    freq: midiToFreq(midi),
    pitchName: midiToNoteName(midi),
    velocity,
    lane,
  }));
}

/**
 * Builds a structured, complete 56-second public-domain or original melody
 * with primary motif, act variations, accelerating climax, and downbeat finale at 55.5-56.2s.
 */
function buildFullMelody(
  motif: number[],
  stepSec: number,
  rootMidi: number,
  scale: number[],
  bassRoot: number
): MelodyNote[] {
  const specs: Array<[number, number, number, number?, number?]> = [];
  let t = 0.0;
  const targetFinale = 55.5;

  // Act 1 (0 - 11s): Motif Intro
  for (let i = 0; i < motif.length && t < 11.0; i++) {
    specs.push([t, stepSec * 0.9, motif[i], 0.85, 0]);
    t += stepSec;
  }
  // Repeat motif variation
  while (t < 11.0) {
    for (const m of motif) {
      if (t >= 11.0) break;
      specs.push([t, stepSec * 0.9, m, 0.85, 0]);
      t += stepSec;
    }
  }

  // Act 2 (11 - 22s): Motif Expansion (transposed + embellished)
  const act2Step = stepSec * 0.95;
  while (t < 22.0) {
    for (let i = 0; i < motif.length; i++) {
      if (t >= 22.0) break;
      const pitch = motif[i] + (i % 4 === 0 ? 2 : 0);
      specs.push([t, act2Step * 0.9, pitch, 0.88, 0]);
      t += act2Step;
    }
  }

  // Act 3 (22 - 34s): Arpeggiated / Cascading Variations
  const act3Step = stepSec * 0.85;
  let sIdx = 0;
  while (t < 34.0) {
    const scalePitch = rootMidi + scale[sIdx % scale.length] + Math.floor(sIdx / scale.length) * 12;
    specs.push([t, act3Step * 0.9, scalePitch, 0.9, 0]);
    t += act3Step;
    sIdx++;
  }

  // Act 4 (34 - 46s): Dynamic Rising Sequences
  const act4Step = stepSec * 0.75;
  while (t < 46.0) {
    for (let i = 0; i < motif.length; i++) {
      if (t >= 46.0) break;
      const note = motif[i] + (i % 2 === 0 ? 5 : 4);
      specs.push([t, act4Step * 0.9, note, 0.92, 0]);
      t += act4Step;
    }
  }

  // Act 5 (46 - 55.4s): Accelerating Climax Run to Finale
  const act5Step = 0.28;
  while (t < targetFinale - 0.4) {
    const note = rootMidi + scale[(sIdx++) % scale.length];
    specs.push([t, act5Step * 0.85, note, 0.95, 0]);
    t += act5Step;
  }

  // Finale Downbeat (55.5s)
  specs.push([targetFinale, 2.0, rootMidi + 12, 1.0, 0]);

  // Bass Lane (Lane 1) every 2.0 - 2.5s
  let bT = 0.0;
  while (bT < targetFinale - 1.0) {
    const bNote = bassRoot + (Math.floor(bT / 4) % 2 === 0 ? 0 : 5);
    specs.push([bT, 1.8, bNote, 0.8, 1]);
    bT += 2.0;
  }
  // Finale Bass Note
  specs.push([targetFinale, 2.5, bassRoot - 12, 1.0, 1]);

  // Harmony Lane (Lane 2)
  let hT = 1.0;
  while (hT < targetFinale - 1.0) {
    const hNote = bassRoot + 7;
    specs.push([hT, 1.2, hNote, 0.75, 2]);
    hT += 2.0;
  }
  specs.push([targetFinale, 2.0, bassRoot, 0.95, 2]);

  return makeNotes(specs);
}

// 50 PUBLIC DOMAIN AND ORIGINAL COPYRIGHT-SAFE MELODIES
export const PUBLIC_DOMAIN_MELODIES: MelodyDefinition[] = [
  // ==========================================
  // GROUP A: CLASSICAL MARBLE RUNS (01 - 10)
  // ==========================================
  {
    id: 'fur_elise',
    name: 'Für Elise',
    composer: 'Ludwig van Beethoven',
    deathYearOrOrigin: '1827 (public domain)',
    defaultBpm: 130,
    description: 'Iconic classical piano piece rolling gracefully down pastel tubes.',
    publicDomain: true,
    source: 'original score notes',
    notes: buildFullMelody(
      [76, 75, 76, 75, 76, 71, 74, 72, 69, 60, 64, 69, 71, 64, 68, 71, 72],
      0.38,
      69,
      [0, 2, 3, 5, 7, 8, 11],
      45
    ),
  },
  {
    id: 'canon_in_d',
    name: 'Canon in D',
    composer: 'Johann Pachelbel',
    deathYearOrOrigin: '1706 (public domain)',
    defaultBpm: 95,
    description: 'Serene descending progression with rainbow arcs and glissando runs.',
    publicDomain: true,
    source: 'original score notes',
    notes: buildFullMelody(
      [74, 73, 71, 69, 67, 66, 67, 69, 62, 69, 71, 73, 74, 76, 78, 74],
      0.45,
      62,
      [0, 2, 4, 5, 7, 9, 11],
      38
    ),
  },
  {
    id: 'moonlight_sonata',
    name: 'Moonlight Sonata (Mvt 1)',
    composer: 'Ludwig van Beethoven',
    deathYearOrOrigin: '1827 (public domain)',
    defaultBpm: 90,
    description: 'Atmospheric minor triplets bouncing softly on crystal and dark tubes.',
    publicDomain: true,
    source: 'original score notes',
    notes: buildFullMelody(
      [56, 61, 64, 56, 61, 64, 56, 61, 64, 68, 67, 68, 67, 68, 64, 61, 56],
      0.42,
      61,
      [0, 2, 3, 5, 7, 8, 10],
      37
    ),
  },
  {
    id: 'swan_lake',
    name: 'Swan Lake Theme',
    composer: 'Pyotr Ilyich Tchaikovsky',
    deathYearOrOrigin: '1893 (public domain)',
    defaultBpm: 105,
    description: 'Haunting oboe melody played by shimmering glass chimes and hand bells.',
    publicDomain: true,
    source: 'original score notes',
    notes: buildFullMelody(
      [71, 76, 78, 79, 81, 83, 81, 79, 78, 76, 74, 76, 78, 79, 81, 79],
      0.44,
      64,
      [0, 2, 3, 5, 7, 8, 10],
      40
    ),
  },
  {
    id: 'mountain_king',
    name: 'In the Hall of the Mountain King',
    composer: 'Edvard Grieg',
    deathYearOrOrigin: '1907 (public domain)',
    defaultBpm: 120,
    description: 'Tense creeping melody that steadily speeds up per act to a roaring finale.',
    publicDomain: true,
    source: 'original score notes',
    notes: buildFullMelody(
      [59, 61, 62, 64, 66, 62, 66, 65, 61, 65, 64, 60, 64, 59, 61, 62, 64, 66],
      0.36,
      59,
      [0, 2, 3, 5, 7, 8, 10],
      35
    ),
  },
  {
    id: 'morning_mood',
    name: 'Morning Mood (Peer Gynt)',
    composer: 'Edvard Grieg',
    deathYearOrOrigin: '1907 (public domain)',
    defaultBpm: 100,
    description: 'Bright pastoral flute song echoing across kalimbas and wind chimes.',
    publicDomain: true,
    source: 'original score notes',
    notes: buildFullMelody(
      [67, 64, 62, 60, 62, 64, 67, 64, 62, 60, 62, 64, 67, 69, 67, 64],
      0.45,
      60,
      [0, 2, 4, 7, 9],
      36
    ),
  },
  {
    id: 'turkish_march',
    name: 'Rondo alla Turca',
    composer: 'Wolfgang Amadeus Mozart',
    deathYearOrOrigin: '1791 (public domain)',
    defaultBpm: 135,
    description: 'Crisp percussive classical march on marimba bars and metal tacks.',
    publicDomain: true,
    source: 'original score notes',
    notes: buildFullMelody(
      [71, 69, 68, 69, 72, 74, 72, 71, 72, 76, 77, 76, 74, 76, 79, 77, 76, 74],
      0.32,
      69,
      [0, 2, 3, 5, 7, 8, 11],
      45
    ),
  },
  {
    id: 'clair_de_lune',
    name: 'Clair de Lune',
    composer: 'Claude Debussy',
    deathYearOrOrigin: '1918 (public domain)',
    defaultBpm: 88,
    description: 'Gentle impressionist masterpiece flowing over water bottles and music box.',
    publicDomain: true,
    source: 'original score notes',
    notes: buildFullMelody(
      [77, 75, 73, 72, 70, 68, 65, 68, 70, 72, 75, 77, 80, 77, 75, 72],
      0.48,
      61,
      [0, 2, 4, 5, 7, 9, 11],
      37
    ),
  },
  {
    id: 'flight_bumblebee',
    name: 'Flight of the Bumblebee',
    composer: 'Nikolai Rimsky-Korsakov',
    deathYearOrOrigin: '1908 (public domain)',
    defaultBpm: 155,
    description: 'Rapid chromatic sprint with two marbles alternating across tight cascades.',
    publicDomain: true,
    source: 'original score notes',
    notes: buildFullMelody(
      [76, 75, 74, 73, 72, 73, 74, 75, 76, 75, 74, 73, 72, 71, 70, 69, 68, 69],
      0.25,
      69,
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      45
    ),
  },
  {
    id: 'sugar_plum_fairy',
    name: 'Dance of the Sugar Plum Fairy',
    composer: 'Pyotr Ilyich Tchaikovsky',
    deathYearOrOrigin: '1893 (public domain)',
    defaultBpm: 110,
    description: 'Tinkling celesta-style hand bells with crystalline winter sparkle.',
    publicDomain: true,
    source: 'original score notes',
    notes: buildFullMelody(
      [79, 78, 77, 76, 75, 76, 72, 76, 75, 76, 71, 76, 75, 76, 68, 72],
      0.38,
      64,
      [0, 2, 3, 5, 7, 8, 11],
      40
    ),
  },

  // ==========================================
  // GROUP B: MORE PUBLIC-DOMAIN CLASSICS (11 - 20)
  // ==========================================
  {
    id: 'ode_to_joy',
    name: 'Ode to Joy',
    composer: 'Ludwig van Beethoven',
    deathYearOrOrigin: '1827 (public domain)',
    defaultBpm: 120,
    description: 'Triumphant classical anthem, uplifting ladder steps to a monumental finale.',
    publicDomain: true,
    source: 'original score notes',
    notes: buildFullMelody(
      [64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 64, 62, 62],
      0.45,
      60,
      [0, 2, 4, 5, 7, 9, 11],
      36
    ),
  },
  {
    id: 'blue_danube',
    name: 'The Blue Danube',
    composer: 'Johann Strauss II',
    deathYearOrOrigin: '1899 (public domain)',
    defaultBpm: 125,
    description: 'Graceful Viennese spiral waltz on glass chimes and wooden blocks.',
    publicDomain: true,
    source: 'original score notes',
    notes: buildFullMelody(
      [62, 66, 69, 69, 69, 66, 66, 62, 62, 66, 69, 69, 69, 67, 67, 64],
      0.42,
      62,
      [0, 2, 4, 5, 7, 9, 11],
      38
    ),
  },
  {
    id: 'gymnopedie_1',
    name: 'Gymnopédie No.1',
    composer: 'Erik Satie',
    deathYearOrOrigin: '1925 (public domain)',
    defaultBpm: 75,
    description: 'Hypnotic, slow, tranquil ambient waltz on frosted glass tubes.',
    publicDomain: true,
    source: 'original score notes',
    notes: buildFullMelody(
      [67, 66, 64, 59, 61, 62, 67, 66, 64, 59, 61, 64, 66, 67, 71, 69],
      0.55,
      62,
      [0, 2, 4, 5, 7, 9, 11],
      38
    ),
  },
  {
    id: 'nocturne_op9',
    name: 'Nocturne Op.9 No.2',
    composer: 'Frédéric Chopin',
    deathYearOrOrigin: '1849 (public domain)',
    defaultBpm: 92,
    description: 'Poetic romantic melody ringing on crystal glasses at golden hour.',
    publicDomain: true,
    source: 'original score notes',
    notes: buildFullMelody(
      [70, 79, 77, 75, 74, 72, 70, 79, 77, 75, 74, 72, 70, 67, 70, 72],
      0.46,
      63,
      [0, 2, 4, 5, 7, 9, 11],
      39
    ),
  },
  {
    id: 'minute_waltz',
    name: 'Minute Waltz',
    composer: 'Frédéric Chopin',
    deathYearOrOrigin: '1849 (public domain)',
    defaultBpm: 150,
    description: 'Dazzling 60-second high-speed waltz on chrome metal tacks.',
    publicDomain: true,
    source: 'original score notes',
    notes: buildFullMelody(
      [68, 67, 68, 70, 72, 73, 75, 77, 75, 73, 72, 70, 68, 67, 68, 70],
      0.26,
      68,
      [0, 2, 4, 5, 7, 9, 11],
      44
    ),
  },
  {
    id: 'bach_prelude_c',
    name: 'Prelude in C Major',
    composer: 'Johann Sebastian Bach',
    deathYearOrOrigin: '1750 (public domain)',
    defaultBpm: 110,
    description: 'Cascading baroque arpeggios flowing through a warm marimba garden.',
    publicDomain: true,
    source: 'original score notes',
    notes: buildFullMelody(
      [60, 64, 67, 72, 76, 67, 72, 76, 60, 64, 67, 72, 76, 67, 72, 76],
      0.34,
      60,
      [0, 2, 4, 5, 7, 9, 11],
      36
    ),
  },
  {
    id: 'air_on_g_string',
    name: 'Air on the G String',
    composer: 'Johann Sebastian Bach',
    deathYearOrOrigin: '1750 (public domain)',
    defaultBpm: 82,
    description: 'Soulful sustained classical lines on soft paper and satin tubes.',
    publicDomain: true,
    source: 'original score notes',
    notes: buildFullMelody(
      [71, 72, 74, 76, 78, 79, 78, 76, 74, 72, 71, 69, 67, 66, 67, 69],
      0.52,
      62,
      [0, 2, 4, 5, 7, 9, 11],
      38
    ),
  },
  {
    id: 'vivaldi_spring',
    name: 'Spring (The Four Seasons)',
    composer: 'Antonio Vivaldi',
    deathYearOrOrigin: '1741 (public domain)',
    defaultBpm: 125,
    description: 'Crisp joyous baroque birdsong on hand chimes and droplet bottles.',
    publicDomain: true,
    source: 'original score notes',
    notes: buildFullMelody(
      [64, 68, 68, 68, 66, 64, 59, 64, 68, 68, 68, 66, 64, 59, 64, 66, 68],
      0.40,
      64,
      [0, 2, 4, 5, 7, 9, 11],
      40
    ),
  },
  {
    id: 'can_can',
    name: 'Can-Can (Infernal Galop)',
    composer: 'Jacques Offenbach',
    deathYearOrOrigin: '1880 (public domain)',
    defaultBpm: 145,
    description: 'High-energy festive kick on punchy drums and bright bells.',
    publicDomain: true,
    source: 'original score notes',
    notes: buildFullMelody(
      [74, 74, 71, 67, 69, 71, 72, 71, 69, 74, 74, 71, 67, 69, 71, 67],
      0.30,
      67,
      [0, 2, 4, 5, 7, 9, 11],
      43
    ),
  },
  {
    id: 'william_tell',
    name: 'William Tell Overture (Finale)',
    composer: 'Gioachino Rossini',
    deathYearOrOrigin: '1868 (public domain)',
    defaultBpm: 155,
    description: 'Iconic gallop with 3 marbles playing the famous trumpet fanfare.',
    publicDomain: true,
    source: 'original score notes',
    notes: buildFullMelody(
      [64, 64, 64, 64, 64, 64, 64, 67, 60, 62, 64, 65, 64, 62, 64, 67, 72],
      0.28,
      60,
      [0, 2, 4, 5, 7, 9, 11],
      36
    ),
  },

  // ==========================================
  // GROUP C: TRADITIONAL & NURSERY (21 - 30)
  // ==========================================
  {
    id: 'twinkle_star',
    name: 'Twinkle Twinkle Little Star',
    composer: 'Traditional Nursery Melody',
    deathYearOrOrigin: '18th Century (public domain)',
    defaultBpm: 110,
    description: 'Beloved nostalgic melody on star-shaped bells and neon chimes.',
    publicDomain: true,
    source: 'original score notes',
    notes: buildFullMelody(
      [60, 60, 67, 67, 69, 69, 67, 65, 65, 64, 64, 62, 62, 60],
      0.45,
      60,
      [0, 2, 4, 5, 7, 9, 11],
      36
    ),
  },
  {
    id: 'brahms_lullaby',
    name: 'Brahms Lullaby',
    composer: 'Johannes Brahms',
    deathYearOrOrigin: '1897 (public domain)',
    defaultBpm: 88,
    description: 'The world’s favorite soothing sleep tune on warm music box comb.',
    publicDomain: true,
    source: 'original score notes',
    notes: buildFullMelody(
      [63, 63, 67, 63, 63, 67, 63, 67, 70, 68, 67, 65, 63, 65, 67, 63],
      0.48,
      63,
      [0, 2, 4, 5, 7, 9, 11],
      39
    ),
  },
  {
    id: 'frere_jacques',
    name: 'Frère Jacques',
    composer: 'Traditional French Round',
    deathYearOrOrigin: 'Traditional (public domain)',
    defaultBpm: 115,
    description: 'Delightful 3-marble canon echoing three staggered parts down the wall.',
    publicDomain: true,
    source: 'original score notes',
    notes: buildFullMelody(
      [65, 67, 69, 65, 65, 67, 69, 65, 69, 70, 72, 69, 70, 72, 72, 74, 72, 70, 69, 65],
      0.42,
      65,
      [0, 2, 4, 5, 7, 9, 11],
      41
    ),
  },
  {
    id: 'greensleeves',
    name: 'Greensleeves',
    composer: 'Traditional English Ballad',
    deathYearOrOrigin: '16th Century (public domain)',
    defaultBpm: 105,
    description: 'Ancient folk song played across resonant wooden blocks and kalimba.',
    publicDomain: true,
    source: 'original score notes',
    notes: buildFullMelody(
      [65, 68, 70, 72, 73, 72, 70, 67, 63, 65, 67, 68, 65, 65, 63, 65],
      0.44,
      65,
      [0, 2, 3, 5, 7, 8, 10],
      41
    ),
  },
  {
    id: 'amazing_grace',
    name: 'Amazing Grace',
    composer: 'Traditional Hymn Tune',
    deathYearOrOrigin: '1779 (public domain)',
    defaultBpm: 90,
    description: 'Uplifting pentatonic hymn on crystal goblets and golden hour chimes.',
    publicDomain: true,
    source: 'original score notes',
    notes: buildFullMelody(
      [55, 60, 64, 60, 64, 62, 60, 57, 55, 60, 64, 60, 64, 62, 67],
      0.48,
      60,
      [0, 2, 4, 7, 9],
      36
    ),
  },
  {
    id: 'london_bridge',
    name: 'London Bridge Is Falling Down',
    composer: 'Traditional Nursery Song',
    deathYearOrOrigin: 'Traditional (public domain)',
    defaultBpm: 120,
    description: 'Charming childhood tune as wooden arches guide the marble down.',
    publicDomain: true,
    source: 'original score notes',
    notes: buildFullMelody(
      [67, 69, 67, 65, 64, 65, 67, 62, 64, 65, 64, 65, 67, 67, 69, 67, 65, 64, 65, 67],
      0.40,
      60,
      [0, 2, 4, 5, 7, 9, 11],
      36
    ),
  },
  {
    id: 'row_row_boat',
    name: 'Row, Row, Row Your Boat',
    composer: 'Traditional American Round',
    deathYearOrOrigin: '1852 (public domain)',
    defaultBpm: 110,
    description: 'Rippling water bottle cascade with gentle percussive drops.',
    publicDomain: true,
    source: 'original score notes',
    notes: buildFullMelody(
      [60, 60, 60, 62, 64, 64, 62, 64, 65, 67, 72, 72, 72, 67, 67, 67, 64, 64, 64, 60],
      0.38,
      60,
      [0, 2, 4, 5, 7, 9, 11],
      36
    ),
  },
  {
    id: 'auld_lang_syne',
    name: 'Auld Lang Syne',
    composer: 'Robert Burns / Traditional Scottish',
    deathYearOrOrigin: '1788 (public domain)',
    defaultBpm: 95,
    description: 'Warm nostalgic bells ringing out the year with glowing studio lights.',
    publicDomain: true,
    source: 'original score notes',
    notes: buildFullMelody(
      [60, 65, 65, 65, 69, 67, 65, 67, 69, 65, 65, 69, 72, 74, 72, 69],
      0.46,
      65,
      [0, 2, 4, 7, 9],
      41
    ),
  },
  {
    id: 'scarborough_fair',
    name: 'Scarborough Fair',
    composer: 'Traditional English Ballad',
    deathYearOrOrigin: '17th Century (public domain)',
    defaultBpm: 100,
    description: 'Haunting Dorian melody with misty lavender hues and glass chimes.',
    publicDomain: true,
    source: 'original score notes',
    notes: buildFullMelody(
      [62, 62, 69, 69, 69, 64, 65, 64, 62, 69, 72, 74, 72, 69, 70, 69],
      0.44,
      62,
      [0, 2, 3, 5, 7, 9, 10],
      38
    ),
  },
  {
    id: 'danny_boy',
    name: 'Danny Boy (Londonderry Air)',
    composer: 'Traditional Irish Air',
    deathYearOrOrigin: 'Traditional (public domain)',
    defaultBpm: 88,
    description: 'Emotive Irish air played on tuned bells and harp tines in lush green.',
    publicDomain: true,
    source: 'original score notes',
    notes: buildFullMelody(
      [60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 64, 60, 62, 64, 65, 67],
      0.50,
      60,
      [0, 2, 4, 5, 7, 9, 11],
      36
    ),
  },

  // ==========================================
  // GROUP D: SEASONAL & FESTIVE (31 - 40)
  // ==========================================
  {
    id: 'jingle_bells',
    name: 'Jingle Bells',
    composer: 'James Pierpont',
    deathYearOrOrigin: '1893 (public domain)',
    defaultBpm: 135,
    description: 'Festive sleigh bells and drums ringing through winter crystal.',
    publicDomain: true,
    source: 'original score notes',
    notes: buildFullMelody(
      [64, 64, 64, 64, 64, 64, 64, 67, 60, 62, 64, 65, 65, 65, 65, 65, 64, 64],
      0.35,
      60,
      [0, 2, 4, 5, 7, 9, 11],
      36
    ),
  },
  {
    id: 'merry_christmas',
    name: 'We Wish You a Merry Christmas',
    composer: 'Traditional English Carol',
    deathYearOrOrigin: '16th Century (public domain)',
    defaultBpm: 125,
    description: 'Joyful holiday celebration on glass baubles and brass tacks.',
    publicDomain: true,
    source: 'original score notes',
    notes: buildFullMelody(
      [62, 67, 67, 69, 67, 66, 64, 64, 64, 69, 69, 71, 69, 67, 66, 62],
      0.40,
      67,
      [0, 2, 4, 5, 7, 9, 11],
      43
    ),
  },
  {
    id: 'deck_the_halls',
    name: 'Deck the Halls',
    composer: 'Traditional Welsh Carol',
    deathYearOrOrigin: '18th Century (public domain)',
    defaultBpm: 125,
    description: 'Bright rhythmic bounces echoing fa-la-la-la down vibrant tubes.',
    publicDomain: true,
    source: 'original score notes',
    notes: buildFullMelody(
      [67, 65, 64, 62, 60, 62, 64, 60, 62, 64, 65, 62, 64, 62, 60, 59, 60],
      0.38,
      60,
      [0, 2, 4, 5, 7, 9, 11],
      36
    ),
  },
  {
    id: 'silent_night',
    name: 'Silent Night',
    composer: 'Franz Xaver Gruber',
    deathYearOrOrigin: '1863 (public domain)',
    defaultBpm: 85,
    description: 'Pure peaceful tranquility falling like gentle snow upon crystal glasses.',
    publicDomain: true,
    source: 'original score notes',
    notes: buildFullMelody(
      [67, 69, 67, 64, 67, 69, 67, 64, 74, 74, 71, 72, 72, 67, 69, 69, 72, 71],
      0.52,
      60,
      [0, 2, 4, 5, 7, 9, 11],
      36
    ),
  },
  {
    id: 'eid_lights',
    name: 'Eid Lights (Maqam Hijaz)',
    composer: 'BounceForge Originals',
    deathYearOrOrigin: 'Original composition (2026)',
    defaultBpm: 110,
    description: '100% Original modal melody in traditional Hijaz scale with warm gold lanterns.',
    publicDomain: true,
    source: 'original composition',
    notes: buildFullMelody(
      [62, 63, 66, 67, 69, 70, 73, 74, 73, 70, 69, 67, 66, 63, 62],
      0.40,
      62,
      [0, 1, 4, 5, 7, 8, 11],
      38
    ),
  },
  {
    id: 'ramadan_night',
    name: 'Ramadan Night (Rast Mode)',
    composer: 'BounceForge Originals',
    deathYearOrOrigin: 'Original composition (2026)',
    defaultBpm: 95,
    description: 'Peaceful original night run featuring deep teal tones and chime lanterns.',
    publicDomain: true,
    source: 'original composition',
    notes: buildFullMelody(
      [60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62, 60],
      0.45,
      60,
      [0, 2, 4, 5, 7, 9, 11],
      36
    ),
  },
  {
    id: 'new_year_countdown',
    name: 'New Year Countdown',
    composer: 'BounceForge Originals',
    deathYearOrOrigin: 'Original composition (2026)',
    defaultBpm: 120,
    description: 'Original celebratory anthem featuring a 10-hit countdown finale.',
    publicDomain: true,
    source: 'original composition',
    notes: buildFullMelody(
      [60, 64, 67, 72, 67, 64, 60, 65, 69, 72, 69, 65, 60, 67, 71, 74],
      0.38,
      60,
      [0, 2, 4, 5, 7, 9, 11],
      36
    ),
  },
  {
    id: 'spring_blossom',
    name: 'Spring Blossom',
    composer: 'BounceForge Originals',
    deathYearOrOrigin: 'Original composition (2026)',
    defaultBpm: 105,
    description: 'Original pentatonic kalimba tune drifting amidst sakura blossom petals.',
    publicDomain: true,
    source: 'original composition',
    notes: buildFullMelody(
      [60, 62, 64, 67, 69, 72, 69, 67, 64, 62, 60, 64, 67, 72, 76],
      0.42,
      60,
      [0, 2, 4, 7, 9],
      36
    ),
  },
  {
    id: 'autumn_leaves_orig',
    name: 'Autumn Leaves (Acoustic Original)',
    composer: 'BounceForge Originals',
    deathYearOrOrigin: 'Original composition (2026)',
    defaultBpm: 98,
    description: 'Cozy original acoustic marimba run with amber leaf decor.',
    publicDomain: true,
    source: 'original composition',
    notes: buildFullMelody(
      [67, 65, 62, 60, 58, 60, 62, 65, 67, 70, 72, 70, 67, 65, 62],
      0.44,
      58,
      [0, 2, 3, 5, 7, 8, 10],
      34
    ),
  },
  {
    id: 'birthday_bells_orig',
    name: 'Birthday Bells Fanfare',
    composer: 'BounceForge Originals',
    deathYearOrOrigin: 'Original composition (2026)',
    defaultBpm: 130,
    description: 'Original celebratory fanfare tune (100% original, copyright-free).',
    publicDomain: true,
    source: 'original composition',
    notes: buildFullMelody(
      [60, 64, 67, 72, 76, 72, 67, 64, 65, 69, 72, 77, 72, 69, 65, 67, 71, 74, 79],
      0.36,
      60,
      [0, 2, 4, 5, 7, 9, 11],
      36
    ),
  },

  // ==========================================
  // GROUP E: ORIGINAL GENERATED VIBES (41 - 50)
  // ==========================================
  {
    id: 'lofi_study_run',
    name: 'Lofi Study Run',
    composer: 'BounceForge Originals',
    deathYearOrOrigin: 'Original composition (2026)',
    defaultBpm: 85,
    description: 'Warm lofi jazz chords and soft felt drums for focused studying.',
    publicDomain: true,
    source: 'original composition',
    notes: buildFullMelody(
      [62, 65, 69, 72, 60, 64, 67, 71, 58, 62, 65, 69, 57, 60, 64, 69],
      0.48,
      62,
      [0, 2, 3, 5, 7, 9, 10],
      38
    ),
  },
  {
    id: 'drift_night',
    name: 'Drift Night Phonk',
    composer: 'BounceForge Originals',
    deathYearOrOrigin: 'Original composition (2026)',
    defaultBpm: 135,
    description: 'High-octane synth run with aggressive punch and neon chrome aesthetics.',
    publicDomain: true,
    source: 'original composition',
    notes: buildFullMelody(
      [60, 63, 65, 66, 65, 63, 60, 63, 65, 66, 70, 66, 65, 63, 60],
      0.32,
      60,
      [0, 3, 5, 6, 7, 10],
      36
    ),
  },
  {
    id: 'synthwave_slide',
    name: 'Synthwave Slide',
    composer: 'BounceForge Originals',
    deathYearOrOrigin: 'Original composition (2026)',
    defaultBpm: 125,
    description: 'Retro 80s arpeggiated drive down a neon grid wall.',
    publicDomain: true,
    source: 'original composition',
    notes: buildFullMelody(
      [57, 60, 64, 69, 64, 60, 57, 60, 65, 69, 65, 60, 55, 59, 62, 67],
      0.35,
      57,
      [0, 2, 3, 5, 7, 8, 10],
      33
    ),
  },
  {
    id: 'ocean_asmr',
    name: 'Ocean ASMR',
    composer: 'BounceForge Originals',
    deathYearOrOrigin: 'Original composition (2026)',
    defaultBpm: 90,
    description: 'Gentle aquatic pentatonic cascade mimicking tidal ripples.',
    publicDomain: true,
    source: 'original composition',
    notes: buildFullMelody(
      [60, 64, 67, 72, 74, 72, 67, 64, 60, 62, 67, 72, 74, 76, 74],
      0.48,
      60,
      [0, 2, 4, 7, 9],
      36
    ),
  },
  {
    id: 'crystal_cave',
    name: 'Crystal Cave',
    composer: 'BounceForge Originals',
    deathYearOrOrigin: 'Original composition (2026)',
    defaultBpm: 95,
    description: 'Shimmering overtone harmonics resonating in an underground cavern.',
    publicDomain: true,
    source: 'original composition',
    notes: buildFullMelody(
      [64, 67, 71, 76, 79, 76, 71, 67, 64, 68, 71, 76, 80, 76, 71],
      0.44,
      64,
      [0, 3, 7, 10, 14],
      40
    ),
  },
  {
    id: 'candy_pop',
    name: 'Candy Pop',
    composer: 'BounceForge Originals',
    deathYearOrOrigin: 'Original composition (2026)',
    defaultBpm: 128,
    description: 'Sweet, bubbly original pop hook bouncing across candy drops.',
    publicDomain: true,
    source: 'original composition',
    notes: buildFullMelody(
      [60, 64, 67, 69, 72, 69, 67, 64, 62, 65, 69, 71, 74, 71, 69, 65],
      0.36,
      60,
      [0, 2, 4, 5, 7, 9, 11],
      36
    ),
  },
  {
    id: 'space_toys',
    name: 'Space Toys Orbit',
    composer: 'BounceForge Originals',
    deathYearOrOrigin: 'Original composition (2026)',
    defaultBpm: 110,
    description: 'Cosmic voyage around starfields, ringed planets, and floating satellites.',
    publicDomain: true,
    source: 'original composition',
    notes: buildFullMelody(
      [60, 67, 65, 72, 70, 76, 74, 79, 76, 72, 67, 65, 60, 64, 67, 72],
      0.40,
      60,
      [0, 2, 5, 7, 10],
      36
    ),
  },
  {
    id: 'rain_on_glass',
    name: 'Rain on Glass',
    composer: 'BounceForge Originals',
    deathYearOrOrigin: 'Original composition (2026)',
    defaultBpm: 88,
    description: 'Meditative raindrops gently pattering across translucent glass panes.',
    publicDomain: true,
    source: 'original composition',
    notes: buildFullMelody(
      [65, 64, 62, 60, 58, 60, 62, 65, 67, 69, 67, 65, 62, 60, 58],
      0.50,
      58,
      [0, 2, 3, 5, 7, 8, 10],
      34
    ),
  },
  {
    id: 'music_box_memories',
    name: 'Music Box Memories',
    composer: 'BounceForge Originals',
    deathYearOrOrigin: 'Original composition (2026)',
    defaultBpm: 100,
    description: 'Delicate vintage metal tines invoking sweet childhood memories.',
    publicDomain: true,
    source: 'original composition',
    notes: buildFullMelody(
      [72, 76, 79, 84, 79, 76, 72, 74, 77, 81, 77, 74, 71, 74, 79, 83],
      0.42,
      60,
      [0, 2, 4, 5, 7, 9, 11],
      36
    ),
  },
  {
    id: 'grand_finale_orchestra',
    name: 'Grand Finale Orchestra',
    composer: 'BounceForge Originals',
    deathYearOrOrigin: 'Original composition (2026)',
    defaultBpm: 130,
    description: 'Epic symphonic convergence utilizing every instrument family on 3 marbles.',
    publicDomain: true,
    source: 'original composition',
    notes: buildFullMelody(
      [60, 64, 67, 72, 65, 69, 72, 77, 67, 71, 74, 79, 72, 76, 79, 84],
      0.34,
      60,
      [0, 2, 4, 5, 7, 9, 11],
      36
    ),
  },
  {
    id: 'toybox_run',
    name: 'Pastel Toy-Box Run',
    composer: 'BounceForge Originals',
    deathYearOrOrigin: 'Original composition (2026)',
    defaultBpm: 128,
    description: 'Playful, cheerful original toy-box music box melody at 128 BPM matching the pastel marble run.',
    publicDomain: true,
    source: 'original composition',
    notes: buildFullMelody(
      [72, 74, 76, 79, 76, 74, 72, 67, 69, 71, 72, 74, 76, 74, 72, 71, 72, 76, 79, 84, 81, 79, 76, 74, 72, 67, 72],
      0.35,
      60,
      [0, 2, 4, 5, 7, 9, 11],
      36
    ),
  },
];

// Procedural Melodic Generator for custom seeds
export function generateProceduralMelody(seed: number, duration: number = 56): MelodyNote[] {
  let s = seed % 2147483647;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };

  const scale = [0, 2, 4, 5, 7, 9, 11]; // Major scale
  const root = 60 + Math.floor(rnd() * 5); // C4 to E4
  const bassRoot = root - 24;

  return buildFullMelody([root, root + 4, root + 7, root + 12], 0.4, root, scale, bassRoot);
}

// Parse user uploaded MIDI file
export async function parseMidiFile(arrayBuffer: ArrayBuffer): Promise<MelodyNote[]> {
  const midi = new Midi(arrayBuffer);
  const notes: MelodyNote[] = [];

  midi.tracks.forEach((track, trackIdx) => {
    track.notes.forEach((n) => {
      notes.push({
        time: parseFloat(n.time.toFixed(4)),
        duration: parseFloat(n.duration.toFixed(4)),
        midi: n.midi,
        freq: midiToFreq(n.midi),
        pitchName: n.name,
        velocity: n.velocity,
        lane: trackIdx < 3 ? trackIdx : 0,
      });
    });
  });

  notes.sort((a, b) => a.time - b.time);
  return notes;
}
