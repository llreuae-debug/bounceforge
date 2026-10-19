import type { AnalyzedNote, DropAction, DropKind, MidiAnalysis, PlannedNote, ReelOptions, ReelPlan, TransitionAction } from './types';
import { DEFAULT_TOGGLES } from './types';

const KIND_PRIORITY: Record<DropKind, number> = {
  heavy: 5,
  accent: 4,
  pulse: 3.8,
  roll: 3.5,
  cascade: 2.5,
  light: 2,
};

export function defaultReelOptions(analysis: MidiAnalysis): ReelOptions {
  return {
    sectionStart: 0,
    sectionEnd: analysis.duration,
    targetDuration: 60,
    fitMode: 'loop',
    enabledTracks: analysis.tracks.filter((t) => t.noteCount > 0).map((t) => t.index),
    instrumentOverrides: {},
    toggles: { ...DEFAULT_TOGGLES },
    sensitivity: 0.6,
    timingOffsetMs: 0,
    seed: 1337,
  };
}

/**
 * Turns an analysed MIDI + user options into the reel timeline:
 * the notes to play, the beat grid, and every ball drop (timed to the moment it HITS).
 */
export function buildReelPlan(analysis: MidiAnalysis, opts: ReelOptions): ReelPlan {
  const warnings: string[] = [];
  const start = clamp(opts.sectionStart, 0, Math.max(0, analysis.duration - 0.5));
  const end = clamp(opts.sectionEnd, start + 0.5, analysis.duration);
  const sectionLen = end - start;
  const target = Math.max(5, opts.targetDuration);
  const enabled = new Set(opts.enabledTracks);

  // ---- Fit the section to the reel length ----
  let duration = target;
  let repeats = 1;
  if (sectionLen < target - 0.05) {
    if (opts.fitMode === 'shorten') {
      duration = Math.max(5, sectionLen);
      warnings.push(`The reel is shortened to ${duration.toFixed(1)}s to match the music.`);
    } else {
      repeats = Math.ceil(target / sectionLen);
    }
  }

  const sectionNotes = analysis.notes.filter((n) => n.time >= start && n.time < end && enabled.has(n.trackIndex));

  const notes: PlannedNote[] = [];
  const analyzed: AnalyzedNote[] = [];
  for (let k = 0; k < repeats; k++) {
    const offset = k * sectionLen - start;
    // "Extend" varies the repeats (octave lift on odd passes, slightly softer on later ones)
    const lift = opts.fitMode === 'extend' && k % 2 === 1 ? 12 : 0;
    const soften = opts.fitMode === 'extend' && k >= 2 ? 0.88 : 1;
    for (const n of sectionNotes) {
      const t = n.time + offset;
      if (t >= duration) break;
      const midi = !n.isDrum && n.role !== 'low' ? Math.min(108, n.midi + lift) : n.midi;
      const velocity = n.velocity * soften;
      const dur = Math.min(n.duration, duration - t);
      notes.push({ time: t, duration: dur, midi, velocity, trackIndex: n.trackIndex, isDrum: n.isDrum });
      analyzed.push({ ...n, time: t, duration: dur, midi, velocity });
    }
  }
  if (opts.fitMode === 'extend' && repeats > 1) {
    warnings.push(`The ${sectionLen.toFixed(1)}s section is extended to ${duration}s with varied repeats.`);
  } else if (repeats > 1) {
    warnings.push(`The ${sectionLen.toFixed(1)}s section loops ${repeats} times to fill ${duration}s.`);
  }

  // ---- Beat grid in reel time ----
  const sectionBeats = analysis.beats.filter((b) => b.time >= start && b.time < end);
  const beats: { time: number; isDownbeat: boolean }[] = [];
  for (let k = 0; k < repeats; k++) {
    for (const b of sectionBeats) {
      const t = b.time - start + k * sectionLen;
      if (t >= duration) break;
      beats.push({ time: t, isDownbeat: b.isDownbeat });
    }
  }

  // ---- Map music to drops ----
  const tg = opts.toggles;
  const sens = clamp(opts.sensitivity, 0, 1);
  const cands: Omit<DropAction, 'id'>[] = [];
  for (const n of analyzed) {
    const kind = classify(n, tg, sens);
    if (!kind) continue;
    cands.push({
      time: n.time,
      kind,
      midi: n.midi,
      velocity: tg.velocity ? n.velocity : 0.7,
      duration: n.duration,
    });
  }

  // Strong beats release a major drop when nothing else lands there
  if (tg.beats) {
    for (const b of beats) {
      if (!b.isDownbeat && sens < 0.75) continue;
      const covered = cands.some((c) => (c.kind === 'heavy' || c.kind === 'accent' || c.kind === 'pulse') && Math.abs(c.time - b.time) < 0.06);
      if (!covered) {
        cands.push({ time: b.time, kind: 'pulse', midi: analysisRoot(analysis), velocity: b.isDownbeat ? 0.85 : 0.6, duration: 0.3 });
      }
    }
  }

  let drops = thin(cands, sens);

  // Sparse music: keep something happening on the beat in long empty stretches
  const fillers: Omit<DropAction, 'id'>[] = [];
  const sortedTimes = [0, ...drops.map((d) => d.time), duration];
  for (let i = 1; i < sortedTimes.length; i++) {
    const a = sortedTimes[i - 1];
    const b = sortedTimes[i];
    if (b - a <= 3) continue;
    const inGap = beats.filter((bt) => bt.time > a + 0.4 && bt.time < b - 0.4);
    const grid = inGap.length ? inGap : evenGrid(a, b, 60 / analysis.bpm);
    grid.forEach((bt, idx) => {
      if (idx % 2 === 0 || (bt as any).isDownbeat) {
        fillers.push({ time: bt.time, kind: 'pulse', midi: analysisRoot(analysis), velocity: 0.55, duration: 0.3 });
      }
    });
  }
  if (fillers.length) drops = thin([...drops, ...fillers], sens);

  const offset = opts.timingOffsetMs / 1000;
  const finalDrops: DropAction[] = drops
    .map((d) => ({ ...d, time: d.time + offset }))
    .filter((d) => d.time >= 0.15 && d.time < duration - 0.05)
    .sort((a, b) => a.time - b.time)
    .map((d, i) => ({ ...d, id: i + 1 }));

  // ---- Transitions (palette / obstacle / camera changes) ----
  const transitions: TransitionAction[] = [];
  if (tg.transitions) {
    let palette = 0;
    for (let k = 0; k < repeats; k++) {
      for (const s of analysis.sections) {
        const t = s.time - start + k * sectionLen;
        if (s.time < start || s.time >= end || t >= duration) continue;
        if (t < 0.5 && k === 0) continue;
        transitions.push({ time: t, paletteIndex: ++palette, reason: s.reason });
      }
      if (k > 0) transitions.push({ time: k * sectionLen, paletteIndex: ++palette, reason: 'phrase' });
    }
    transitions.sort((a, b) => a.time - b.time);
  }

  const trackSynths: ReelPlan['trackSynths'] = {};
  for (const t of analysis.tracks) trackSynths[t.index] = opts.instrumentOverrides[t.index] || t.synth;

  if (!notes.length) warnings.push('No notes in the selected section or tracks; drops follow the beat grid.');

  return {
    duration,
    sourceStart: start,
    notes,
    beats,
    drops: finalDrops,
    transitions,
    rootMidi: analysisRoot(analysis),
    trackSynths,
    warnings,
  };
}

function classify(n: AnalyzedNote, tg: ReelOptions['toggles'], sens: number): DropKind | null {
  if (n.isDrum) {
    if (n.role === 'kick') return tg.kicks ? 'heavy' : null;
    if (n.role === 'snare') return tg.snares ? 'accent' : null;
    if (n.role === 'cymbal') return tg.snares ? 'accent' : null;
    if (n.role === 'tom') return tg.snares && sens >= 0.4 ? 'accent' : null;
    if (n.role === 'hat') return tg.highNotes && sens >= 0.7 ? 'light' : null;
    return tg.highNotes && sens >= 0.5 ? 'light' : null;
  }
  // No percussion: infer from pitch, rhythm and velocity
  if (tg.kicks && n.role === 'low' && (n.onBeat || n.accent > 1.15)) return 'heavy';
  if (tg.snares && n.accent >= 1.25 && !n.onDownbeat && n.velocity >= 0.45) return 'accent';
  if (tg.sustained && n.isSustained) return 'roll';
  if (tg.runs && n.inRun) return 'cascade';
  if (tg.highNotes && n.role === 'high' && sens >= 0.3) return 'light';
  if (tg.highNotes && n.role === 'mid' && sens >= 0.55 && (n.onBeat || n.accent > 1.05)) return 'light';
  if (tg.kicks && n.role === 'low' && sens >= 0.6) return 'heavy';
  return null;
}

/** Merge near-simultaneous drops and cap drops per second (dense MIDI stays readable). */
function thin(cands: Omit<DropAction, 'id'>[], sens: number): Omit<DropAction, 'id'>[] {
  const sorted = [...cands].sort((a, b) => a.time - b.time);
  const merged: Omit<DropAction, 'id'>[] = [];
  for (const c of sorted) {
    const last = merged[merged.length - 1];
    if (last && c.time - last.time < 0.045) {
      if (score(c) > score(last)) merged[merged.length - 1] = c;
      continue;
    }
    merged.push(c);
  }
  // At most (2 + 10*sensitivity) drops per second, enforced in half-second bins
  const perBin = Math.max(1, Math.floor((2 + sens * 10) / 2));
  const kept: Omit<DropAction, 'id'>[] = [];
  const byPriority = [...merged].sort((a, b) => score(b) - score(a));
  const binCounts = new Map<number, number>();
  for (const c of byPriority) {
    const bin = Math.floor(c.time * 2);
    if ((binCounts.get(bin) ?? 0) >= perBin) continue;
    if (c.kind === 'heavy' && kept.some((k) => k.kind === 'heavy' && Math.abs(k.time - c.time) < 0.18)) continue;
    kept.push(c);
    binCounts.set(bin, (binCounts.get(bin) ?? 0) + 1);
  }
  return kept.sort((a, b) => a.time - b.time);
}

function score(d: Omit<DropAction, 'id'>): number {
  return KIND_PRIORITY[d.kind] + d.velocity;
}

function evenGrid(a: number, b: number, step: number): { time: number }[] {
  const out: { time: number }[] = [];
  for (let t = a + step; t < b - 0.4; t += step) out.push({ time: t });
  return out;
}

/** Most common pitch class among melodic notes, placed in octave 3 (drone / pulse pitch). */
export function analysisRoot(analysis: MidiAnalysis): number {
  const counts = new Array(12).fill(0);
  for (const n of analysis.notes) if (!n.isDrum) counts[n.midi % 12] += n.duration;
  const pc = counts.indexOf(Math.max(...counts));
  return 48 + (pc < 0 ? 0 : pc);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
