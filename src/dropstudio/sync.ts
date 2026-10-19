import type { StudioTrack, TrackNote } from './track';

export type DropFrequency = 'beat' | '2beats' | 'bar' | '2bars' | 'major';
export type SyncMode = 'note' | 'beat' | 'major' | 'veryslow';

export interface SyncSettings {
  mode: SyncMode;
  frequency: DropFrequency;
  /** Tier 3 micro-bounces on off-beats */
  offbeats: boolean;
  /** Shift every impact against the music, -200..200 ms */
  offsetMs: number;
  /** 0.25..1 — lower = floatier, slower falls (timing stays locked) */
  slowMo: number;
  /** Hold the ball for 0, 2 or 3 frames on each Tier 1 impact */
  freezeFrames: 0 | 2 | 3;
  /** User-edited beat grid (replaces the detected beats when set) */
  beatOverride?: number[] | null;
}

export const DEFAULT_SYNC: SyncSettings = {
  mode: 'beat',
  frequency: 'bar',
  offbeats: false,
  offsetMs: 0,
  slowMo: 0.4,
  freezeFrames: 0,
  beatOverride: null,
};

export function defaultSyncFor(track: StudioTrack): SyncSettings {
  const calm = track.mood === 'Calm' || track.mood === 'Sad';
  return { ...DEFAULT_SYNC, mode: calm && track.notes.length ? 'veryslow' : 'beat' };
}

/**
 * Impacts: the exact times the animation must hit, sorted. Tier 1 = major drop (bar downbeats and
 * energy peaks), 2 = beat, 3 = off-beat / passing note. In Note Mode each impact plays the melody
 * notes noteFrom..noteTo-1 of `melody`.
 */
export interface Impacts {
  t: Float64Array;
  tier: Uint8Array;
  noteFrom: Int32Array;
  noteTo: Int32Array;
  /** lane-0 notes sorted by time (what Note Mode plays) */
  melody: TrackNote[];
  /** The beat grid actually used (after user edits) */
  beats: number[];
  downbeats: boolean[];
}

const FRAME = 1 / 60;

/** Beat grid after user edits: edited beats keep the bar phase of the nearest original beat. */
export function effectiveBeats(track: StudioTrack, s: SyncSettings): { beats: number[]; downbeats: boolean[]; energy: number[] } {
  if (!s.beatOverride) return { beats: track.beats, downbeats: track.downbeats, energy: track.beatEnergy };
  const beats = [...s.beatOverride].filter((t) => t >= 0 && t < track.duration).sort((a, b) => a - b);
  const nearest = (t: number) => {
    let lo = 0;
    let hi = track.beats.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (track.beats[mid] < t) lo = mid + 1;
      else hi = mid;
    }
    if (lo > 0 && Math.abs(track.beats[lo - 1] - t) < Math.abs(track.beats[lo] - t)) lo--;
    return lo;
  };
  return {
    beats,
    downbeats: beats.map((t) => track.downbeats[nearest(t)] ?? false),
    energy: beats.map((t) => track.beatEnergy[nearest(t)] ?? 0.5),
  };
}

function tier1Beats(beats: number[], downbeats: boolean[], energy: number[], freq: DropFrequency): Set<number> {
  const out = new Set<number>();
  let bar = -1;
  let beatInBar = 0;
  for (let i = 0; i < beats.length; i++) {
    if (downbeats[i]) {
      bar++;
      beatInBar = 0;
    } else beatInBar++;
    switch (freq) {
      case 'beat':
        out.add(i);
        break;
      case '2beats':
        if (beatInBar % 2 === 0) out.add(i);
        break;
      case 'bar':
        if (downbeats[i]) out.add(i);
        break;
      case '2bars':
        if (downbeats[i] && bar % 2 === 0) out.add(i);
        break;
      case 'major':
        break;
    }
  }
  // Energy peaks: loudest local maxima become major drops too (and are all of them in "major" mode)
  const sorted = [...energy].sort((a, b) => b - a);
  const thresh = sorted[Math.floor(sorted.length * (freq === 'major' ? 0.12 : 0.05))] ?? 1;
  let lastPeak = -Infinity;
  for (let i = 0; i < beats.length; i++) {
    const e = energy[i];
    if (e >= thresh && e >= (energy[i - 1] ?? 0) && e >= (energy[i + 1] ?? 0) && beats[i] - lastPeak > 2.5) {
      out.add(i);
      lastPeak = beats[i];
    }
  }
  if (freq === 'major') {
    // Always open on a major drop, and never leave more than 4 bars without one
    for (let i = 0; i < beats.length; i++) if (downbeats[i]) { out.add(i); break; }
    const t1 = [...out].sort((a, b) => a - b);
    let last = beats[t1[0]] ?? 0;
    const barLen = estimateBar(beats, downbeats);
    for (let i = 0; i < beats.length; i++) {
      if (out.has(i)) last = beats[i];
      else if (downbeats[i] && beats[i] - last > barLen * 4 - 0.05) {
        out.add(i);
        last = beats[i];
      }
    }
  }
  return out;
}

function estimateBar(beats: number[], downbeats: boolean[]): number {
  const d = beats.filter((_, i) => downbeats[i]);
  return d.length > 1 ? (d[d.length - 1] - d[0]) / (d.length - 1) : 2;
}

export function computeImpacts(track: StudioTrack, s: SyncSettings): Impacts {
  const { beats, downbeats, energy } = effectiveBeats(track, s);
  const melody = track.notes.filter((n) => n.lane === 0 && !n.isDrum).sort((a, b) => a.t - b.t);
  const t1 = tier1Beats(beats, downbeats, energy, s.mode === 'major' ? 'major' : s.frequency);
  const raw: { t: number; tier: number; from: number; to: number }[] = [];

  const beatTier = (t: number): number => {
    // Nearest beat within 40ms decides the tier
    let lo = 0;
    let hi = beats.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (beats[mid] < t) lo = mid + 1;
      else hi = mid;
    }
    for (const i of [lo - 1, lo]) {
      if (i >= 0 && i < beats.length && Math.abs(beats[i] - t) < 0.04) return t1.has(i) ? 1 : 2;
    }
    return 3;
  };

  const useNotes = (s.mode === 'note' || s.mode === 'veryslow') && melody.length > 0;
  if (useNotes) {
    // Unique melody onsets (chords / doubled notes within 30ms are one impact)
    let i = 0;
    while (i < melody.length) {
      let j = i + 1;
      while (j < melody.length && melody[j].t - melody[i].t < 0.03) j++;
      raw.push({ t: melody[i].t, tier: beatTier(melody[i].t), from: i, to: j });
      i = j;
    }
    // Tier 1 beats without a melody note still get their major drop
    for (const bi of t1) if (!raw.some((r) => Math.abs(r.t - beats[bi]) < 0.04)) raw.push({ t: beats[bi], tier: 1, from: -1, to: -1 });
    raw.sort((a, b) => a.t - b.t);
    if (s.mode === 'veryslow') {
      // Fast runs collapse into one slow, readable drop (the group's first note); major drops always survive
      const minGap = 0.42 + (1 - s.slowMo) * 0.25;
      const kept: typeof raw = [];
      for (const r of raw) {
        const prev = kept[kept.length - 1];
        if (!prev || r.t - prev.t >= minGap) kept.push(r);
        else if (r.tier === 1 && prev.tier !== 1 && r.t - (kept[kept.length - 2]?.t ?? -Infinity) >= minGap * 0.6) kept[kept.length - 1] = r;
        else if (prev.from >= 0 && r.from >= 0) prev.to = r.to;
      }
      raw.length = 0;
      raw.push(...kept);
    }
  } else if (s.mode === 'major') {
    for (const bi of [...t1].sort((a, b) => a - b)) raw.push({ t: beats[bi], tier: 1, from: -1, to: -1 });
  } else {
    // Beat mode: major drops per Drop Frequency, small bounces on the other beats
    for (let i = 0; i < beats.length; i++) {
      if (s.frequency === 'major' && !t1.has(i)) continue;
      raw.push({ t: beats[i], tier: t1.has(i) ? 1 : 2, from: -1, to: -1 });
    }
  }

  if (s.offbeats && s.mode !== 'major') {
    for (let i = 0; i + 1 < beats.length; i++) {
      const mid = (beats[i] + beats[i + 1]) / 2;
      if (!raw.some((r) => Math.abs(r.t - mid) < 0.06)) raw.push({ t: mid, tier: 3, from: -1, to: -1 });
    }
    raw.sort((a, b) => a.t - b.t);
  }

  // Offset, keep inside the reel, and merge anything closer than one frame (keep the stronger tier)
  const off = s.offsetMs / 1000;
  const out: typeof raw = [];
  for (const r of raw) {
    const t = r.t + off;
    if (t < 0.12 || t > track.duration - 0.05) continue;
    const prev = out[out.length - 1];
    if (prev && t - prev.t < FRAME * 1.5) {
      if (r.tier < prev.tier) prev.tier = r.tier;
      if (r.from >= 0) {
        if (prev.from < 0) prev.from = r.from;
        prev.to = Math.max(prev.to, r.to);
      }
      continue;
    }
    out.push({ ...r, t });
  }

  return {
    t: Float64Array.from(out.map((r) => r.t)),
    tier: Uint8Array.from(out.map((r) => r.tier)),
    noteFrom: Int32Array.from(out.map((r) => r.from)),
    noteTo: Int32Array.from(out.map((r) => r.to)),
    melody,
    beats,
    downbeats,
  };
}
