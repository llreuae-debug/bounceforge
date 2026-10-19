/**
 * Tiny score notation used to sequence the built-in library by hand from public-domain scores.
 *
 *   "E5:.5 D#5:.5 | A4:1 r:.5 [C4,E4,G4]:2"
 *
 * - NOTE:duration, duration in beats (decimal or fraction like 2/3). Omitted = previous duration.
 * - r = rest, [a,b,c] = notes struck together, | = bar line (ignored, for readability).
 */

export interface ScoreNote {
  /** Onset in beats from the start of the phrase */
  beat: number;
  beats: number;
  midi: number;
}

const SEMI: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function noteToMidi(name: string): number {
  const m = name.match(/^([A-G])(#|b)?(-?\d)$/);
  if (!m) throw new Error(`Bad note "${name}"`);
  return (parseInt(m[3], 10) + 1) * 12 + SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

function parseDuration(s: string): number {
  if (s.includes('/')) {
    const [a, b] = s.split('/');
    return parseFloat(a || '1') / parseFloat(b);
  }
  return parseFloat(s);
}

export function parseScore(src: string): { notes: ScoreNote[]; length: number } {
  const notes: ScoreNote[] = [];
  let beat = 0;
  let dur = 1;
  for (const raw of src.split(/\s+/)) {
    const tok = raw.trim();
    if (!tok || tok === '|') continue;
    const [head, d] = tok.split(':');
    if (d !== undefined) dur = parseDuration(d);
    if (!(dur > 0)) throw new Error(`Bad duration in "${tok}"`);
    if (head !== 'r') {
      const names = head.startsWith('[') ? head.slice(1, -1).split(',') : [head];
      for (const n of names) notes.push({ beat, beats: dur, midi: noteToMidi(n) });
    }
    beat += dur;
  }
  return { notes, length: beat };
}

// ---------- Chord accompaniment ----------

const QUALITY: Record<string, number[]> = {
  '': [0, 4, 7],
  m: [0, 3, 7],
  '7': [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  dim: [0, 3, 6],
  dim7: [0, 3, 6, 9],
  sus4: [0, 5, 7],
  sus2: [0, 2, 7],
  aug: [0, 4, 8],
  '6': [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  add9: [0, 4, 7, 14],
};

export type AccStyle = 'root' | 'block' | 'waltz' | 'arp' | 'alberti' | 'rag' | 'pulse';

/** Parses "Am:3 E7:3 r:3" into chord spans (beats) and voices them in a simple, period-neutral way. */
export function chordsToScore(seq: string, style: AccStyle, beatsPerBar: number): { notes: ScoreNote[]; length: number } {
  const notes: ScoreNote[] = [];
  let beat = 0;
  let dur = beatsPerBar;
  for (const raw of seq.split(/\s+/)) {
    const tok = raw.trim();
    if (!tok || tok === '|') continue;
    const [head, d] = tok.split(':');
    if (d !== undefined) dur = parseDuration(d);
    if (head !== 'r') {
      const m = head.match(/^([A-G])(#|b)?([a-z0-9]*)(?:\/([A-G])(#|b)?)?$/);
      if (!m || !(m[3] in QUALITY)) throw new Error(`Bad chord "${head}"`);
      const rootPc = SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
      const bassPc = m[4] ? SEMI[m[4]] + (m[5] === '#' ? 1 : m[5] === 'b' ? -1 : 0) : rootPc;
      const bass = 36 + ((bassPc + 12) % 12); // C2..B2
      const root3 = 48 + ((rootPc + 12) % 12); // C3..B3
      const tones = QUALITY[m[3]].map((i) => root3 + i).map((n) => (n > 64 ? n - 12 : n));
      voice(notes, style, beat, dur, bass, tones);
    }
    beat += dur;
  }
  return { notes, length: beat };
}

function voice(out: ScoreNote[], style: AccStyle, at: number, dur: number, bass: number, tones: number[]): void {
  const push = (b: number, l: number, midi: number) => out.push({ beat: at + b, beats: l, midi });
  switch (style) {
    case 'root':
      push(0, dur, bass);
      break;
    case 'block':
      push(0, dur, bass);
      for (const t of tones) push(0, dur, t);
      break;
    case 'waltz':
      push(0, 1, bass);
      for (let b = 1; b < dur; b++) for (const t of tones.slice(0, 3)) push(b, 0.9, t);
      break;
    case 'rag':
      for (let b = 0; b < dur; b++) {
        if (b % 2 === 0) push(b, 0.9, b % 4 === 0 ? bass : bass + 7 > 47 ? bass - 5 : bass + 7);
        else for (const t of tones.slice(0, 3)) push(b, 0.8, t);
      }
      break;
    case 'pulse':
      for (let b = 0; b < dur; b++) push(b, 0.9, bass);
      break;
    case 'arp': {
      const seq = [bass, ...tones, tones[1] ?? tones[0]];
      for (let i = 0; i < dur * 2; i++) push(i / 2, 0.5, seq[i % seq.length]);
      break;
    }
    case 'alberti': {
      const [lo, mid, hi] = [tones[0], tones[1] ?? tones[0], tones[2] ?? tones[1] ?? tones[0]];
      const seq = [lo, hi, mid, hi];
      push(0, dur, bass);
      for (let i = 0; i < dur * 2; i++) push(i / 2, 0.5, seq[i % 4]);
      break;
    }
  }
}

/** Helper: repeat a broken chord (e.g. triplet arpeggios) n times. */
export function arp(names: string[], times: number, each: string): string {
  const one = names.map((n, i) => (i === 0 ? `${n}:${each}` : n)).join(' ');
  return Array.from({ length: times }, () => one).join(' ');
}
