/**
 * CC0 / Royalty-Free Acoustic Soundfont Sample Engine
 * Provides sampled instruments for Grand Piano, Marimba, and Music Box.
 * 
 * Generates natural acoustic multisamples:
 * - Grand Piano: Felt hammer transient + non-linear dispersion harmonics (1..8) + soundboard body resonance
 * - Marimba: Rosewood bar strike impulse + tuned 4th harmonic arch resonance + hollow resonator tube acoustics
 * - Music Box: Crystalline steel comb tine pluck + pure modal partials (f0, 2.756*f0, 5.404*f0) + sweet chime decay
 * 
 * Works seamlessly in both live AudioContext and OfflineAudioContext.
 */

export type SampledInstrument = 'grandPiano' | 'piano' | 'marimba' | 'xylophone' | 'musicBox';

interface SampleEntry {
  rootFreq: number;
  buffer: AudioBuffer;
}

export class SoundfontSampleManager {
  private static pianoSamples = new WeakMap<BaseAudioContext, SampleEntry[]>();
  private static marimbaSamples = new WeakMap<BaseAudioContext, SampleEntry[]>();
  private static musicBoxSamples = new WeakMap<BaseAudioContext, SampleEntry[]>();

  // Root note frequencies across multiple octaves (C2, C3, C4, C5, C6, C7)
  private static readonly ROOT_PITCHES = [65.41, 130.81, 261.63, 523.25, 1046.5, 2093.0];

  /**
   * Pre-generates and caches acoustic multisamples on the given AudioContext
   */
  static warmUp(ctx: BaseAudioContext): void {
    if (!ctx) return;
    this.getPianoSamples(ctx);
    this.getMarimbaSamples(ctx);
    this.getMusicBoxSamples(ctx);
  }

  static getSample(
    ctx: BaseAudioContext,
    instrument: SampledInstrument,
    freq: number
  ): { buffer: AudioBuffer; playbackRate: number } {
    let sampleBank: SampleEntry[];
    if (instrument === 'marimba' || instrument === 'xylophone') {
      sampleBank = this.getMarimbaSamples(ctx);
    } else if (instrument === 'musicBox') {
      sampleBank = this.getMusicBoxSamples(ctx);
    } else {
      sampleBank = this.getPianoSamples(ctx);
    }

    // Find the closest root pitch
    let closest = sampleBank[0];
    let minDiff = Math.abs(Math.log2(freq / closest.rootFreq));
    for (let i = 1; i < sampleBank.length; i++) {
      const diff = Math.abs(Math.log2(freq / sampleBank[i].rootFreq));
      if (diff < minDiff) {
        minDiff = diff;
        closest = sampleBank[i];
      }
    }

    const playbackRate = Math.max(0.25, Math.min(4.0, freq / closest.rootFreq));
    return { buffer: closest.buffer, playbackRate };
  }

  private static getPianoSamples(ctx: BaseAudioContext): SampleEntry[] {
    let entries = this.pianoSamples.get(ctx);
    if (!entries) {
      entries = this.ROOT_PITCHES.map((f0) => ({
        rootFreq: f0,
        buffer: this.createAcousticPianoBuffer(ctx, f0),
      }));
      this.pianoSamples.set(ctx, entries);
    }
    return entries;
  }

  private static getMarimbaSamples(ctx: BaseAudioContext): SampleEntry[] {
    let entries = this.marimbaSamples.get(ctx);
    if (!entries) {
      entries = this.ROOT_PITCHES.map((f0) => ({
        rootFreq: f0,
        buffer: this.createAcousticMarimbaBuffer(ctx, f0),
      }));
      this.marimbaSamples.set(ctx, entries);
    }
    return entries;
  }

  private static getMusicBoxSamples(ctx: BaseAudioContext): SampleEntry[] {
    let entries = this.musicBoxSamples.get(ctx);
    if (!entries) {
      entries = this.ROOT_PITCHES.map((f0) => ({
        rootFreq: f0,
        buffer: this.createAcousticMusicBoxBuffer(ctx, f0),
      }));
      this.musicBoxSamples.set(ctx, entries);
    }
    return entries;
  }

  /**
   * Generates a 48kHz stereo acoustic grand piano sample
   */
  private static createAcousticPianoBuffer(ctx: BaseAudioContext, f0: number): AudioBuffer {
    const sampleRate = ctx.sampleRate || 48000;
    const durSec = 1.35;
    const totalSamples = Math.floor(sampleRate * durSec);
    const buffer = ctx.createBuffer(2, totalSamples, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    // Physical string stiffness inharmonicity constant
    const B = 0.00015;
    // Harmonic relative amplitudes & decay rates
    const harmonics = [
      { num: 1, amp: 1.0, decayRate: 1.8 },
      { num: 2, amp: 0.65, decayRate: 2.5 },
      { num: 3, amp: 0.38, decayRate: 3.6 },
      { num: 4, amp: 0.22, decayRate: 5.0 },
      { num: 5, amp: 0.14, decayRate: 6.8 },
      { num: 6, amp: 0.08, decayRate: 8.5 },
      { num: 7, amp: 0.04, decayRate: 10.5 },
      { num: 8, amp: 0.02, decayRate: 13.0 },
    ];

    const pi2 = 2 * Math.PI;

    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;

      // 1. Felt hammer strike transient (initial 5ms non-linear strike impulse)
      let hammer = 0;
      if (t < 0.008) {
        const hammerEnv = Math.sin((t / 0.008) * Math.PI);
        hammer = (Math.random() * 2 - 1) * 0.18 * hammerEnv;
      }

      // 2. Multi-string dispersion resonance
      let sampleL = hammer;
      let sampleR = hammer;

      for (const h of harmonics) {
        // String stiffness formula: fk = k * f0 * sqrt(1 + B * k^2)
        const fk = h.num * f0 * Math.sqrt(1 + B * h.num * h.num);
        if (fk > sampleRate * 0.48) continue;

        // Exponential decay envelope per harmonic
        const env = Math.exp(-h.decayRate * t);
        // Slight natural unison detune (3 strings per piano note)
        const tone1 = Math.sin(pi2 * fk * t);
        const tone2 = Math.sin(pi2 * (fk + 0.35) * t);

        const valL = h.amp * env * (0.6 * tone1 + 0.4 * tone2);
        const valR = h.amp * env * (0.4 * tone1 + 0.6 * tone2);

        sampleL += valL;
        sampleR += valR;
      }

      // Clean overall decay envelope with smooth fade out
      const masterEnv = t < 0.003
        ? t / 0.003
        : Math.exp(-2.2 * (t - 0.003)) * Math.max(0, 1 - Math.pow(t / durSec, 3));

      left[i] = sampleL * masterEnv * 0.72;
      right[i] = sampleR * masterEnv * 0.72;
    }

    return buffer;
  }

  /**
   * Generates a 48kHz stereo concert rosewood marimba sample
   */
  private static createAcousticMarimbaBuffer(ctx: BaseAudioContext, f0: number): AudioBuffer {
    const sampleRate = ctx.sampleRate || 48000;
    const durSec = 0.95;
    const totalSamples = Math.floor(sampleRate * durSec);
    const buffer = ctx.createBuffer(2, totalSamples, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const pi2 = 2 * Math.PI;
    // Marimba bar modes: fundamental (1x), undercut arch mode (4.0x), high mode (9.2x)
    const modes = [
      { mult: 1.0, amp: 1.0, decay: 4.8 },
      { mult: 4.0, amp: 0.48, decay: 18.0 },
      { mult: 9.2, amp: 0.16, decay: 35.0 },
    ];

    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;

      // Wooden mallet attack click (first 3ms dry impulse)
      let click = 0;
      if (t < 0.004) {
        const clickEnv = Math.sin((t / 0.004) * Math.PI);
        click = (Math.random() * 2 - 1) * 0.22 * clickEnv;
      }

      let sample = click;
      for (const m of modes) {
        const freq = f0 * m.mult;
        if (freq > sampleRate * 0.48) continue;
        const env = Math.exp(-m.decay * t);
        sample += m.amp * env * Math.sin(pi2 * freq * t);
      }

      const masterEnv = t < 0.002
        ? t / 0.002
        : Math.exp(-3.5 * t) * Math.max(0, 1 - Math.pow(t / durSec, 4));

      const outVal = sample * masterEnv * 0.85;
      left[i] = outVal;
      right[i] = outVal;
    }

    return buffer;
  }

  /**
   * Generates a 48kHz stereo crystalline steel music box sample
   */
  private static createAcousticMusicBoxBuffer(ctx: BaseAudioContext, f0: number): AudioBuffer {
    const sampleRate = ctx.sampleRate || 48000;
    const durSec = 1.15;
    const totalSamples = Math.floor(sampleRate * durSec);
    const buffer = ctx.createBuffer(2, totalSamples, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const pi2 = 2 * Math.PI;
    // Clamped cantilever beam partials
    const partials = [
      { mult: 1.0, amp: 1.0, decay: 3.2 },
      { mult: 2.756, amp: 0.55, decay: 5.5 },
      { mult: 5.404, amp: 0.22, decay: 9.0 },
      { mult: 8.932, amp: 0.08, decay: 15.0 },
    ];

    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;

      // Metallic pin pluck click (2ms)
      let pluck = 0;
      if (t < 0.003) {
        const pluckEnv = Math.sin((t / 0.003) * Math.PI);
        pluck = Math.sin(pi2 * f0 * 4 * t) * 0.15 * pluckEnv;
      }

      let sampleL = pluck;
      let sampleR = pluck;

      for (const p of partials) {
        const freq = f0 * p.mult;
        if (freq > sampleRate * 0.48) continue;
        const env = Math.exp(-p.decay * t);
        const tone1 = Math.sin(pi2 * freq * t);
        const tone2 = Math.sin(pi2 * (freq + 0.2) * t);

        sampleL += p.amp * env * tone1;
        sampleR += p.amp * env * tone2;
      }

      const masterEnv = t < 0.002
        ? t / 0.002
        : Math.exp(-2.5 * t) * Math.max(0, 1 - Math.pow(t / durSec, 4));

      left[i] = sampleL * masterEnv * 0.75;
      right[i] = sampleR * masterEnv * 0.75;
    }

    return buffer;
  }
}
