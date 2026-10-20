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

type Family = 'piano' | 'marimba' | 'musicBox';

export class SoundfontSampleManager {
  /** One buffer per (family, root note), generated on first use */
  private static banks = new WeakMap<BaseAudioContext, Map<string, AudioBuffer>>();

  // Root note frequencies across multiple octaves (C2, C3, C4, C5, C6, C7)
  private static readonly ROOT_PITCHES = [65.41, 130.81, 261.63, 523.25, 1046.5, 2093.0];
  private static readonly FAMILIES: Family[] = ['piano', 'marimba', 'musicBox'];

  /**
   * Pre-generates and caches every acoustic multisample on the given AudioContext (synchronous,
   * in a fixed order: offline renders and seeded callers rely on that)
   */
  static warmUp(ctx: BaseAudioContext): void {
    if (!ctx) return;
    for (const fam of this.FAMILIES) for (let i = 0; i < this.ROOT_PITCHES.length; i++) this.buffer(ctx, fam, i);
  }

  /** Same as warmUp, one sample per idle slice so the page never blocks */
  static warmUpIncrementally(ctx: BaseAudioContext): void {
    if (!ctx) return;
    const jobs: [Family, number][] = [];
    for (const fam of this.FAMILIES) for (let i = 0; i < this.ROOT_PITCHES.length; i++) jobs.push([fam, i]);
    const ric = typeof window !== 'undefined' ? (window as any).requestIdleCallback : undefined;
    const next = () => {
      const job = jobs.shift();
      if (!job) return;
      this.buffer(ctx, job[0], job[1]);
      if (ric) ric(next, { timeout: 2000 });
      else setTimeout(next, 30);
    };
    if (ric) ric(next, { timeout: 2000 });
    else setTimeout(next, 30);
  }

  static getSample(
    ctx: BaseAudioContext,
    instrument: SampledInstrument,
    freq: number
  ): { buffer: AudioBuffer; playbackRate: number } {
    const fam: Family = instrument === 'marimba' || instrument === 'xylophone' ? 'marimba' : instrument === 'musicBox' ? 'musicBox' : 'piano';
    // Find the closest root pitch
    let best = 0;
    let minDiff = Infinity;
    for (let i = 0; i < this.ROOT_PITCHES.length; i++) {
      const diff = Math.abs(Math.log2(freq / this.ROOT_PITCHES[i]));
      if (diff < minDiff) {
        minDiff = diff;
        best = i;
      }
    }
    const rootFreq = this.ROOT_PITCHES[best];
    const playbackRate = Math.max(0.25, Math.min(4.0, freq / rootFreq));
    return { buffer: this.buffer(ctx, fam, best), playbackRate };
  }

  private static buffer(ctx: BaseAudioContext, fam: Family, i: number): AudioBuffer {
    let bank = this.banks.get(ctx);
    if (!bank) {
      bank = new Map();
      this.banks.set(ctx, bank);
    }
    const key = `${fam}:${i}`;
    let buf = bank.get(key);
    if (!buf) {
      const f0 = this.ROOT_PITCHES[i];
      buf =
        fam === 'piano'
          ? this.createAcousticPianoBuffer(ctx, f0)
          : fam === 'marimba'
            ? this.createAcousticMarimbaBuffer(ctx, f0)
            : this.createAcousticMusicBoxBuffer(ctx, f0);
      bank.set(key, buf);
    }
    return buf;
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

    // Each partial has a constant frequency and decay rate, so it is advanced per sample with a
    // phasor rotation and a decay multiplier (same waveform, ~10x cheaper than sin/exp per sample)
    const parts = harmonics
      .map((h) => ({ h, fk: h.num * f0 * Math.sqrt(1 + B * h.num * h.num) }))
      .filter((p) => p.fk <= sampleRate * 0.48)
      .map(({ h, fk }) => {
        const w1 = (pi2 * fk) / sampleRate;
        const w2 = (pi2 * (fk + 0.35)) / sampleRate;
        return { amp: h.amp, c1: Math.cos(w1), s1: Math.sin(w1), c2: Math.cos(w2), s2: Math.sin(w2), dec: Math.exp(-h.decayRate / sampleRate), x1: 1, y1: 0, x2: 1, y2: 0, env: 1 };
      });

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

      // String stiffness: fk = k * f0 * sqrt(1 + B * k^2); slight unison detune (3 strings per note)
      for (let k = 0; k < parts.length; k++) {
        const p = parts[k];
        const tone1 = p.y1; // sin(2π fk t)
        const tone2 = p.y2; // sin(2π (fk + 0.35) t)
        const a = p.amp * p.env;
        sampleL += a * (0.6 * tone1 + 0.4 * tone2);
        sampleR += a * (0.4 * tone1 + 0.6 * tone2);
        // advance phasors and envelope by one sample
        const x1 = p.x1 * p.c1 - p.y1 * p.s1;
        p.y1 = p.y1 * p.c1 + p.x1 * p.s1;
        p.x1 = x1;
        const x2 = p.x2 * p.c2 - p.y2 * p.s2;
        p.y2 = p.y2 * p.c2 + p.x2 * p.s2;
        p.x2 = x2;
        p.env *= p.dec;
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
