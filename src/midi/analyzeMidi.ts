import { Midi } from './toneMidi';
import type { AnalyzedNote, BeatMarker, MidiAnalysis, MidiTrackInfo, MusicalRole, SectionMarker } from './types';
import { drumRole, synthForProgram } from './instrumentMap';

export class MidiParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MidiParseError';
  }
}

const MAX_BEATS = 20000;

/** Parse raw .mid bytes. Throws MidiParseError with a user-facing message for bad files. */
export function parseMidiBytes(bytes: ArrayBuffer | Uint8Array): Midi {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (view.byteLength < 14) {
    throw new MidiParseError('This file is too small to be a MIDI file.');
  }
  const header = String.fromCharCode(view[0], view[1], view[2], view[3]);
  if (header !== 'MThd') {
    throw new MidiParseError('This is not a MIDI file (the “MThd” header is missing). Choose a .mid or .midi file.');
  }
  // Walk the chunks: a declared length past the end of the file means it was cut off
  let offset = 0;
  while (offset + 8 <= view.byteLength) {
    const len = ((view[offset + 4] << 24) | (view[offset + 5] << 16) | (view[offset + 6] << 8) | view[offset + 7]) >>> 0;
    if (offset + 8 + len > view.byteLength) {
      throw new MidiParseError('This MIDI file is incomplete: it ends in the middle of a track. Try downloading or exporting it again.');
    }
    offset += 8 + len;
  }
  try {
    return new Midi(view);
  } catch (e: any) {
    throw new MidiParseError(`The MIDI file is damaged or uses an unsupported format (${e?.message || 'parse error'}).`);
  }
}

export function analyzeMidi(bytes: ArrayBuffer | Uint8Array, fileName: string = 'track.mid'): MidiAnalysis {
  const midi = parseMidiBytes(bytes);
  return analyzeParsedMidi(midi, fileName);
}

export function analyzeParsedMidi(midi: Midi, fileName: string): MidiAnalysis {
  const warnings: string[] = [];
  const header = midi.header;
  const ppq = header.ppq || 480;

  // ---- Tempo & time signature maps (seconds) ----
  let tempoChanges = header.tempos.map((t) => ({ time: header.ticksToSeconds(t.ticks), bpm: t.bpm }));
  if (!tempoChanges.length) {
    tempoChanges = [{ time: 0, bpm: 120 }];
    warnings.push('No tempo is set in this file, so 120 BPM is assumed.');
  }
  const sigEvents = header.timeSignatures.length
    ? header.timeSignatures.map((s) => ({ ticks: s.ticks, signature: [s.timeSignature[0], s.timeSignature[1]] as [number, number] }))
    : [{ ticks: 0, signature: [4, 4] as [number, number] }];
  const timeSignatureChanges = sigEvents.map((s) => ({ time: header.ticksToSeconds(s.ticks), signature: s.signature }));
  if (tempoChanges.length > 1) {
    warnings.push(`Tempo changes ${tempoChanges.length - 1} time${tempoChanges.length > 2 ? 's' : ''}; beats follow the tempo map.`);
  }

  // ---- Tracks ----
  const tracks: MidiTrackInfo[] = midi.tracks.map((track, index) => {
    const isDrum = track.instrument.percussion || track.channel === 9;
    const program = track.instrument.number ?? 0;
    const instrumentName = isDrum ? 'drum kit' : track.instrument.name || 'unknown';
    const choice = isDrum ? { synth: 'snareRimshot' as const, family: 'drums' } : synthForProgram(program, instrumentName);
    const pitches = track.notes.map((n) => n.midi);
    return {
      index,
      name: track.name || (isDrum ? 'Drums' : `Track ${index + 1}`),
      channel: track.channel,
      program: isDrum ? -1 : program,
      instrumentName,
      family: choice.family,
      isDrum,
      noteCount: track.notes.length,
      lowestMidi: pitches.length ? Math.min(...pitches) : 0,
      highestMidi: pitches.length ? Math.max(...pitches) : 0,
      synth: choice.synth,
      fallbackNote: track.notes.length ? (choice as any).fallbackNote : undefined,
    };
  });
  for (const t of tracks) {
    if (t.fallbackNote) warnings.push(`${t.name}: ${t.fallbackNote}`);
  }

  // ---- Notes ----
  const raw = midi.tracks.flatMap((track, trackIndex) =>
    track.notes
      .filter((n) => n.velocity > 0 && Number.isFinite(n.time))
      .map((n) => ({
        time: Math.max(0, n.time),
        duration: Math.max(0.03, Math.min(1.5, n.duration || 0.4)),
        midi: n.midi,
        velocity: Math.max(0.05, Math.min(1, n.velocity)),
        trackIndex,
        isDrum: tracks[trackIndex].isDrum,
      }))
  );
  raw.sort((a, b) => a.time - b.time || a.midi - b.midi);

  const lastEnd = raw.reduce((m, n) => Math.max(m, n.time + n.duration), 0);
  const duration = Math.max(midi.duration || 0, lastEnd, raw.length ? 0 : 8);

  if (!raw.length) {
    warnings.push('This MIDI has no notes (it is silent). The animation will follow the tempo grid only.');
  }

  // ---- Beat grid (in ticks, so tempo changes are exact) ----
  const beats: BeatMarker[] = [];
  const durationTicks = header.secondsToTicks(duration);
  for (let si = 0; si < sigEvents.length && beats.length < MAX_BEATS; si++) {
    const sig = sigEvents[si];
    const nextTicks = si + 1 < sigEvents.length ? sigEvents[si + 1].ticks : durationTicks + 1;
    const [num, den] = sig.signature;
    const beatTicks = ppq * (4 / den);
    let barOffset = beats.length ? beats[beats.length - 1].bar + 1 : 0;
    for (let k = 0, tick = sig.ticks; tick < nextTicks && beats.length < MAX_BEATS; k++, tick += beatTicks) {
      const time = header.ticksToSeconds(tick);
      if (time > duration + 0.01) break;
      const beatInBar = k % num;
      beats.push({
        time,
        bar: barOffset + Math.floor(k / num),
        beatInBar,
        isDownbeat: beatInBar === 0,
        bpm: tempoAt(tempoChanges, time),
      });
    }
  }

  // ---- Per-note features ----
  const notes: AnalyzedNote[] = raw.map((n) => ({
    ...n,
    role: noteRole(n.midi, n.isDrum),
    accent: 1,
    isSustained: false,
    inRun: false,
    onBeat: false,
    onDownbeat: false,
  }));

  // Accent: velocity relative to the average of notes within +/-1s (sliding window)
  let lo = 0;
  let hi = 0;
  let sum = 0;
  for (let i = 0; i < notes.length; i++) {
    const t = notes[i].time;
    while (hi < notes.length && notes[hi].time <= t + 1) sum += notes[hi++].velocity;
    while (lo < hi && notes[lo].time < t - 1) sum -= notes[lo++].velocity;
    const avg = sum / Math.max(1, hi - lo);
    notes[i].accent = notes[i].velocity / Math.max(0.05, avg);
  }

  // Beat alignment, sustain
  let bIdx = 0;
  for (const n of notes) {
    while (bIdx + 1 < beats.length && beats[bIdx + 1].time <= n.time) bIdx++;
    const cands = [beats[bIdx], beats[bIdx + 1]].filter(Boolean) as BeatMarker[];
    const beatLen = 60 / (cands[0]?.bpm || tempoChanges[0].bpm);
    const tol = Math.min(0.045, beatLen * 0.08);
    const near = cands.find((b) => Math.abs(b.time - n.time) <= tol);
    n.onBeat = !!near;
    n.onDownbeat = !!near?.isDownbeat;
    n.isSustained = !n.isDrum && n.duration >= Math.max(0.9, beatLen * 1.5);
  }

  // Fast runs: >= 4 consecutive onsets (chords merged) less than 130ms apart, per track
  const byTrack = new Map<number, AnalyzedNote[]>();
  for (const n of notes) {
    if (n.isDrum) continue;
    if (!byTrack.has(n.trackIndex)) byTrack.set(n.trackIndex, []);
    byTrack.get(n.trackIndex)!.push(n);
  }
  for (const list of byTrack.values()) {
    const onsets: AnalyzedNote[][] = [];
    for (const n of list) {
      const last = onsets[onsets.length - 1];
      if (last && n.time - last[0].time < 0.02) last.push(n);
      else onsets.push([n]);
    }
    let runStart = 0;
    for (let i = 1; i <= onsets.length; i++) {
      const continues = i < onsets.length && onsets[i][0].time - onsets[i - 1][0].time < 0.13;
      if (!continues) {
        if (i - runStart >= 4) for (let k = runStart; k < i; k++) onsets[k].forEach((n) => (n.inRun = true));
        runStart = i;
      }
    }
  }

  // ---- Phrases: split on rests longer than ~1.5 beats ----
  const phrases: { start: number; end: number }[] = [];
  let pStart = notes.length ? notes[0].time : 0;
  let pEnd = pStart;
  for (const n of notes) {
    const gapLimit = Math.max(1.0, (60 / tempoAt(tempoChanges, n.time)) * 1.5);
    if (n.time - pEnd > gapLimit) {
      phrases.push({ start: pStart, end: pEnd });
      pStart = n.time;
    }
    pEnd = Math.max(pEnd, n.time + n.duration);
  }
  if (notes.length) phrases.push({ start: pStart, end: pEnd });

  // ---- Sections: density / register / tempo changes, at least 4s apart ----
  const sections = detectSections(notes, beats, tempoChanges, duration, phrases);

  const pitchList = notes.filter((n) => !n.isDrum).map((n) => n.midi);
  const avgVel = notes.length ? notes.reduce((s, n) => s + n.velocity, 0) / notes.length : 0;
  const density = notes.length / Math.max(1, duration);
  if (density > 25) {
    warnings.push(`Very dense MIDI (${density.toFixed(0)} notes per second): drops are thinned so the animation stays readable.`);
  }

  return {
    name: midi.name || fileName.replace(/\.(mid|midi)$/i, ''),
    fileName,
    duration,
    bpm: tempoChanges[0].bpm,
    tempoChanges,
    timeSignature: sigEvents[0].signature,
    timeSignatureChanges,
    ppq,
    tracks,
    notes,
    beats,
    phrases,
    sections,
    hasPercussion: tracks.some((t) => t.isDrum && t.noteCount > 0),
    noteRange: pitchList.length ? [Math.min(...pitchList), Math.max(...pitchList)] : [60, 60],
    averageVelocity: avgVel,
    warnings,
  };
}

export function tempoAt(tempos: { time: number; bpm: number }[], time: number): number {
  let bpm = tempos[0]?.bpm || 120;
  for (const t of tempos) {
    if (t.time <= time + 1e-6) bpm = t.bpm;
    else break;
  }
  return bpm;
}

function noteRole(midi: number, isDrum: boolean): MusicalRole {
  if (isDrum) {
    const r = drumRole(midi);
    return r === 'perc' ? 'mid' : r;
  }
  if (midi < 48) return 'low';
  if (midi > 72) return 'high';
  return 'mid';
}

function detectSections(
  notes: AnalyzedNote[],
  beats: BeatMarker[],
  tempos: { time: number; bpm: number }[],
  duration: number,
  phrases: { start: number; end: number }[]
): SectionMarker[] {
  // Windows of 2 bars when we have a beat grid, else 4s
  const windowStarts: number[] = [];
  const downbeats = beats.filter((b) => b.isDownbeat);
  if (downbeats.length >= 3) {
    for (let i = 0; i < downbeats.length; i += 2) windowStarts.push(downbeats[i].time);
  } else {
    for (let t = 0; t < duration; t += 4) windowStarts.push(t);
  }
  const stats = windowStarts.map((start, i) => {
    const end = windowStarts[i + 1] ?? duration;
    const inWin = notes.filter((n) => n.time >= start && n.time < end);
    const len = Math.max(0.5, end - start);
    const melodic = inWin.filter((n) => !n.isDrum);
    return {
      start,
      density: inWin.length / len,
      meanPitch: melodic.length ? melodic.reduce((s, n) => s + n.midi, 0) / melodic.length : NaN,
    };
  });

  const sections: SectionMarker[] = [{ time: 0, density: stats[0]?.density ?? 0, reason: 'start' }];
  const minGap = 4;
  for (let i = 1; i < stats.length; i++) {
    const prev = stats[i - 1];
    const cur = stats[i];
    const last = sections[sections.length - 1];
    if (cur.start - last.time < minGap) continue;
    const ratio = (cur.density + 0.5) / (prev.density + 0.5);
    if (ratio > 1.6 || ratio < 1 / 1.6) {
      sections.push({ time: cur.start, density: cur.density, reason: 'density' });
    } else if (Number.isFinite(cur.meanPitch) && Number.isFinite(prev.meanPitch) && Math.abs(cur.meanPitch - prev.meanPitch) > 7) {
      sections.push({ time: cur.start, density: cur.density, reason: 'register' });
    }
  }
  for (const t of tempos.slice(1)) {
    if (sections.every((s) => Math.abs(s.time - t.time) >= minGap)) {
      sections.push({ time: t.time, density: 0, reason: 'tempo' });
    }
  }
  // Sparse fallback: long phrases still get a fresh look every ~8 bars / 16s
  if (sections.length < 2 && duration > 16) {
    for (const p of phrases.slice(1)) {
      if (sections.every((s) => Math.abs(s.time - p.start) >= minGap)) {
        sections.push({ time: p.start, density: 0, reason: 'phrase' });
      }
    }
  }
  return sections.sort((a, b) => a.time - b.time);
}
