import { NoteItem } from './types';
import { midiToFreq } from './melodies';

export type ScaleName =
  | 'major'
  | 'minor'
  | 'pentatonic'
  | 'dorian'
  | 'lydian'
  | 'hijaz'
  | 'japaneseInSen';

export type MusicMood = 'dreamy' | 'hype' | 'dark' | 'lofi' | 'epic';

export type BackingGenre =
  | 'none'
  | 'lofi'
  | 'phonk'
  | 'ambient'
  | 'synthwave'
  | 'orchestral'
  | 'dnb'
  | 'house';

export const SCALES: Record<ScaleName, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  pentatonic: [0, 2, 4, 7, 9],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  hijaz: [0, 1, 4, 5, 7, 8, 10],
  japaneseInSen: [0, 1, 5, 7, 10],
};

export class GenerativeMusicEngine {
  /**
   * Generates a copyright-safe procedural melody based on musical parameters
   */
  static generateMelody(
    rootNote: string = 'C',
    rootOctave: number = 4,
    scale: ScaleName = 'pentatonic',
    mood: MusicMood = 'dreamy',
    length: number = 32
  ): NoteItem[] {
    const semitones = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const rootIndex = Math.max(0, semitones.indexOf(rootNote));
    const baseMidi = (rootOctave + 1) * 12 + rootIndex;
    const intervals = SCALES[scale];

    const notes: NoteItem[] = [];
    let currentDegree = 0;

    for (let i = 0; i < length; i++) {
      // Step movement or consonant leap based on mood
      let step = 0;
      if (mood === 'dreamy' || mood === 'lofi') {
        step = Math.floor(Math.random() * 3) - 1; // gentle step
      } else if (mood === 'hype' || mood === 'epic') {
        step = Math.floor(Math.random() * 5) - 2; // wider intervals
      } else {
        step = Math.floor(Math.random() * 3) - 1;
      }

      currentDegree = Math.max(0, Math.min(intervals.length * 2 - 1, currentDegree + step));
      const octaveOffset = Math.floor(currentDegree / intervals.length);
      const degreeInScale = currentDegree % intervals.length;
      const midi = baseMidi + octaveOffset * 12 + intervals[degreeInScale];

      const noteName = semitones[midi % 12] + Math.floor(midi / 12 - 1);
      notes.push({
        note: noteName,
        midi,
        freq: midiToFreq(midi),
        duration: mood === 'dreamy' ? 0.8 : 0.45,
      });
    }

    return notes;
  }

  /**
   * Synthesized Backing Track Looper (Lofi, Phonk, Ambient, Synthwave)
   */
  static startBackingTrack(
    ctx: AudioContext,
    destination: AudioNode,
    genre: BackingGenre,
    bpm: number = 120
  ): { stop: () => void; triggerSidechain: () => void } {
    if (genre === 'none') {
      return { stop: () => {}, triggerSidechain: () => {} };
    }

    const duckGain = ctx.createGain();
    duckGain.gain.setValueAtTime(0.5, ctx.currentTime);
    duckGain.connect(destination);

    // Continuous rhythmic tick
    const beatInterval = 60 / bpm;
    let isRunning = true;
    let step = 0;

    const timer = setInterval(() => {
      if (!isRunning) return;
      const t = ctx.currentTime;

      // Kick on 1 & 3
      if (step % 2 === 0) {
        const kick = ctx.createOscillator();
        const kickGain = ctx.createGain();
        kick.frequency.setValueAtTime(genre === 'phonk' ? 140 : 90, t);
        kick.frequency.exponentialRampToValueAtTime(35, t + 0.12);
        kickGain.gain.setValueAtTime(0.6, t);
        kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        kick.connect(kickGain);
        kickGain.connect(duckGain);
        kick.start(t);
        kick.stop(t + 0.12);
      }

      // Snare on 2 & 4
      if (step % 2 === 1) {
        const noise = ctx.createBufferSource();
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        noise.buffer = buf;

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.35, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

        noise.connect(noiseGain);
        noiseGain.connect(duckGain);
        noise.start(t);
      }

      step = (step + 1) % 4;
    }, beatInterval * 1000);

    return {
      stop: () => {
        isRunning = false;
        clearInterval(timer);
      },
      triggerSidechain: () => {
        // Auto-duck under bounce notes
        const t = ctx.currentTime;
        duckGain.gain.cancelScheduledValues(t);
        duckGain.gain.setValueAtTime(0.15, t); // duck down
        duckGain.gain.linearRampToValueAtTime(0.5, t + 0.35); // restore
      },
    };
  }
}
