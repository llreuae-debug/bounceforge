import type { LibraryInstrument, Mood } from './library/songs';

/** One note of the soundtrack (seconds). lane 0 = melody (the line impacts play in Note Mode). */
export interface TrackNote {
  t: number;
  d: number;
  midi: number;
  vel: number;
  lane: number;
  isDrum?: boolean;
}

export type SectionKind = 'intro' | 'build' | 'drop';

export interface TrackCredit {
  id: string;
  title: string;
  composer: string;
  composerDeathYear: number | null;
  status: 'Public Domain' | 'Original';
  sequencedBy: string;
  soundfont: string;
  basis?: string;
}

/**
 * Everything the Drop Studio needs from a song, whatever its source
 * (built-in library, uploaded MIDI, uploaded audio). Times are in reel seconds.
 */
export interface StudioTrack {
  id: string;
  title: string;
  source: 'library' | 'upload-midi' | 'upload-audio';
  /** Only built-in library tracks are copyright safe; uploads never are */
  copyrightSafe: boolean;
  credit?: TrackCredit;
  mood: Mood;
  bpm: number;
  beatsPerBar: number;
  duration: number;
  /** Beat times (sorted) and whether each is a bar downbeat */
  beats: number[];
  downbeats: boolean[];
  /** Relative loudness per beat, 0..1 (drives energy peaks and Auto Mix sections) */
  beatEnergy: number[];
  notes: TrackNote[];
  sections: { t: number; kind: SectionKind }[];
  instrument: LibraryInstrument;
  /** Decoded audio for uploaded mp3/wav (played as the soundtrack) */
  audio?: AudioBuffer | null;
  /** Where in the recording the reel starts (seconds) */
  audioOffset?: number;
  /** Downsampled mono peaks for the waveform timeline */
  waveform?: Float32Array;
}

/** Splits a reel into intro / build / drop from per-beat energy (used by Auto Mix). */
export function detectSections(beats: number[], downbeats: boolean[], energy: number[], duration: number): { t: number; kind: SectionKind }[] {
  if (!beats.length) return [{ t: 0, kind: 'intro' }];
  const barStarts = beats.map((t, i) => ({ t, i })).filter((b) => downbeats[b.i]);
  const snap = (t: number) => {
    let best = barStarts[0]?.t ?? 0;
    for (const b of barStarts) if (Math.abs(b.t - t) < Math.abs(best - t)) best = b.t;
    return best;
  };
  // Running energy: the drop starts where the smoothed energy first reaches its top quartile after 40% of the reel
  const smooth = energy.map((_, i) => {
    let s = 0;
    let n = 0;
    for (let k = Math.max(0, i - 4); k <= Math.min(energy.length - 1, i + 4); k++, n++) s += energy[k];
    return s / n;
  });
  const sorted = [...smooth].sort((a, b) => a - b);
  const q75 = sorted[Math.floor(sorted.length * 0.75)] ?? 0;
  let dropAt = duration * 0.6;
  for (let i = 0; i < beats.length; i++) {
    if (beats[i] >= duration * 0.4 && beats[i] <= duration * 0.8 && smooth[i] >= q75) {
      dropAt = beats[i];
      break;
    }
  }
  const buildAt = snap(Math.min(duration * 0.3, dropAt * 0.5));
  const drop = snap(dropAt);
  return [
    { t: 0, kind: 'intro' },
    { t: Math.max(buildAt, 0.01), kind: 'build' },
    { t: Math.max(drop, buildAt + 2), kind: 'drop' },
  ];
}
