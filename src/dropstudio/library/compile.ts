import { chordsToScore, parseScore, type ScoreNote } from './notation';
import type { SongDef } from './songs';
import { findSong } from './songs';
import credits from './credits.json';
import { detectSections, type StudioTrack, type TrackCredit, type TrackNote } from '../track';

export const REEL_SECONDS = 60;

interface Lane {
  notes: ScoreNote[];
  length: number;
}

function lanesOf(song: SongDef): { body: Lane[]; intro: Lane[] } {
  const body: Lane[] = [parseScore(song.melody)];
  if (song.acc) body.push(parseScore(song.acc));
  else if (song.chords) body.push(chordsToScore(song.chords, song.accStyle ?? 'root', song.beatsPerBar));
  const intro: Lane[] = song.intro ? [parseScore(song.intro)] : [];
  return { body, intro };
}

/** Length checks used by the library test: every lane must fill whole bars and match the melody. */
export function songLaneLengths(song: SongDef): { melody: number; acc: number | null; intro: number } {
  const { body, intro } = lanesOf(song);
  return { melody: body[0].length, acc: body[1]?.length ?? null, intro: intro[0]?.length ?? 0 };
}

/**
 * Beat -> seconds map with an optional linear tempo ramp (bpm changes per beat across the reel).
 */
function makeClock(song: SongDef, totalBeats: number) {
  const [b0, b1] = song.accel ?? [song.bpm, song.bpm];
  const n = Math.ceil(totalBeats) + 2;
  const at = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) {
    const bpm = b0 + (b1 - b0) * Math.min(1, i / Math.max(1, totalBeats));
    at[i + 1] = at[i] + 60 / bpm;
  }
  return (beat: number) => {
    const i = Math.min(n - 1, Math.max(0, Math.floor(beat)));
    return at[i] + (at[i + 1] - at[i]) * (beat - i);
  };
}

/** Turns a library song into a 60s reel soundtrack: the theme loops to fill the reel, ending on a bar line. */
export function compileSong(song: SongDef, reelSeconds = REEL_SECONDS): StudioTrack {
  const { body, intro } = lanesOf(song);
  const introBeats = intro[0]?.length ?? 0;
  const bodyBeats = body[0].length;
  const avgBpm = song.accel ? (song.accel[0] + song.accel[1]) / 2 : song.bpm;
  // Enough repeats to reach the reel length, rounded up to whole bars
  const beatsNeeded = Math.ceil(((reelSeconds * avgBpm) / 60 - introBeats) / song.beatsPerBar) * song.beatsPerBar + introBeats;
  const clock = makeClock(song, beatsNeeded);

  const notes: TrackNote[] = [];
  const emit = (n: ScoreNote, offset: number, lane: number) => {
    const b = n.beat + offset;
    if (b >= beatsNeeded - 1e-6) return;
    const t = clock(b);
    if (t >= reelSeconds) return;
    const end = Math.min(clock(b + n.beats), reelSeconds);
    notes.push({ t, d: Math.max(0.05, end - t), midi: n.midi, vel: lane === 0 ? 0.85 : 0.55, lane });
  };
  for (const n of intro[0]?.notes ?? []) emit(n, 0, 0);
  for (let lane = 0; lane < body.length; lane++) {
    const L = body[lane];
    for (let off = introBeats; off < beatsNeeded; off += L.length) for (const n of L.notes) emit(n, off, lane);
  }
  notes.sort((a, b) => a.t - b.t || a.lane - b.lane || a.midi - b.midi);

  const beats: number[] = [];
  const downbeats: boolean[] = [];
  for (let b = 0; b < beatsNeeded; b++) {
    const t = clock(b);
    if (t >= reelSeconds - 1e-6) break;
    beats.push(t);
    downbeats.push(b % song.beatsPerBar === 0);
  }
  const beatEnergy = energyPerBeat(beats, notes, reelSeconds);
  const credit = (credits as TrackCredit[]).find((c) => c.id === song.id);

  return {
    id: song.id,
    title: song.title,
    source: 'library',
    copyrightSafe: !!credit,
    credit,
    mood: song.mood,
    bpm: avgBpm,
    beatsPerBar: song.beatsPerBar,
    duration: reelSeconds,
    beats,
    downbeats,
    beatEnergy,
    notes,
    sections: detectSections(beats, downbeats, beatEnergy, reelSeconds),
    instrument: song.instrument,
  };
}

/** Note density x velocity per beat, normalised to 0..1. */
export function energyPerBeat(beats: number[], notes: { t: number; vel: number; isDrum?: boolean }[], duration: number): number[] {
  const e = new Array(beats.length).fill(0);
  let j = 0;
  for (let i = 0; i < beats.length; i++) {
    const end = i + 1 < beats.length ? beats[i + 1] : duration;
    while (j < notes.length && notes[j].t < beats[i]) j++;
    let k = j;
    while (k < notes.length && notes[k].t < end) {
      e[i] += notes[k].vel * (notes[k].isDrum ? 0.6 : 1);
      k++;
    }
  }
  const max = Math.max(1e-6, ...e);
  return e.map((v) => v / max);
}

const cache = new Map<string, StudioTrack>();
export function libraryTrack(id: string): StudioTrack {
  const hit = cache.get(id);
  if (hit) return hit;
  const song = findSong(id);
  if (!song) throw new Error(`Unknown library song ${id}`);
  const t = compileSong(song);
  cache.set(id, t);
  return t;
}
