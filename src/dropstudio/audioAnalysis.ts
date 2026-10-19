/**
 * Beat analysis for uploaded recordings (runs in a Web Worker on 22.05kHz mono):
 * spectral-flux onsets → autocorrelation tempo → dynamic-programming beat tracking → downbeat phase.
 */

export interface AudioAnalysis {
  duration: number;
  bpm: number;
  beats: number[];
  downbeats: boolean[];
  beatEnergy: number[];
  /** 1200 peak values (0..1) for the waveform timeline */
  waveform: number[];
  analysisMs: number;
}

const N = 1024;
const HOP = 256;

function fftMag(re: Float32Array, im: Float32Array, cos: Float32Array, sin: Float32Array, rev: Uint16Array, out: Float32Array): void {
  // In-place iterative radix-2 FFT
  for (let i = 0; i < N; i++) {
    const j = rev[i];
    if (j > i) {
      const tr = re[i];
      re[i] = re[j];
      re[j] = tr;
      const ti = im[i];
      im[i] = im[j];
      im[j] = ti;
    }
  }
  for (let size = 2; size <= N; size <<= 1) {
    const half = size >> 1;
    const step = N / size;
    for (let start = 0; start < N; start += size) {
      for (let k = 0; k < half; k++) {
        const c = cos[k * step];
        const s = sin[k * step];
        const a = start + k;
        const b = a + half;
        const xr = re[b] * c + im[b] * s;
        const xi = im[b] * c - re[b] * s;
        re[b] = re[a] - xr;
        im[b] = im[a] - xi;
        re[a] += xr;
        im[a] += xi;
      }
    }
  }
  for (let k = 0; k < N / 2; k++) out[k] = Math.log1p(10 * Math.hypot(re[k], im[k]));
}

export function analyzeAudioPCM(pcm: Float32Array, sr: number): AudioAnalysis {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const duration = pcm.length / sr;
  const frames = Math.max(1, Math.floor((pcm.length - N) / HOP) + 1);
  const fps = sr / HOP;

  const cos = new Float32Array(N / 2);
  const sin = new Float32Array(N / 2);
  for (let k = 0; k < N / 2; k++) {
    cos[k] = Math.cos((2 * Math.PI * k) / N);
    sin[k] = Math.sin((2 * Math.PI * k) / N);
  }
  const rev = new Uint16Array(N);
  const bits = Math.log2(N);
  for (let i = 0; i < N; i++) {
    let r = 0;
    for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b);
    rev[i] = r;
  }
  const win = new Float32Array(N);
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1));

  const re = new Float32Array(N);
  const im = new Float32Array(N);
  let prev = new Float32Array(N / 2);
  let mag = new Float32Array(N / 2);
  const flux = new Float32Array(frames);
  const rms = new Float32Array(frames);
  const lowBins = Math.ceil((150 / sr) * N);
  const bass = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    const off = f * HOP;
    let e = 0;
    for (let i = 0; i < N; i++) {
      const v = pcm[off + i] || 0;
      re[i] = v * win[i];
      im[i] = 0;
      e += v * v;
    }
    rms[f] = Math.sqrt(e / N);
    fftMag(re, im, cos, sin, rev, mag);
    let s = 0;
    let lb = 0;
    for (let k = 1; k < N / 2; k++) {
      const d = mag[k] - prev[k];
      if (d > 0) {
        s += d;
        if (k <= lowBins) lb += d;
      }
    }
    flux[f] = s;
    bass[f] = lb;
    const tmp = prev;
    prev = mag;
    mag = tmp;
  }

  // Onset envelope: subtract a local mean, half-wave rectify, normalise
  const env = new Float32Array(frames);
  const w = Math.round(fps * 0.25);
  let acc = 0;
  for (let f = 0; f < frames; f++) {
    acc += flux[f];
    if (f > 2 * w) acc -= flux[f - 2 * w - 1];
    const mean = acc / Math.min(f + 1, 2 * w + 1);
    env[f] = Math.max(0, flux[Math.max(0, f - w)] - mean);
  }
  // (shift back the half-window delay)
  const onset = new Float32Array(frames);
  for (let f = 0; f < frames; f++) onset[f] = env[Math.min(frames - 1, f + w)];
  let maxE = 1e-9;
  for (let f = 0; f < frames; f++) maxE = Math.max(maxE, onset[f]);
  for (let f = 0; f < frames; f++) onset[f] /= maxE;

  // Tempo: autocorrelation over 60..200 BPM with a mild preference around 120
  const minLag = Math.floor((60 / 200) * fps);
  const maxLag = Math.ceil((60 / 60) * fps);
  let bestLag = Math.round((60 / 120) * fps);
  let bestScore = -Infinity;
  const ac = new Float32Array(maxLag + 2);
  for (let lag = minLag; lag <= maxLag + 1; lag++) {
    let s = 0;
    for (let f = lag; f < frames; f++) s += onset[f] * onset[f - lag];
    ac[lag] = s;
  }
  for (let lag = minLag; lag <= maxLag; lag++) {
    const bpm = (60 * fps) / lag;
    const pref = Math.exp(-0.5 * Math.pow(Math.log2(bpm / 120) / 0.9, 2));
    const score = (ac[lag] + 0.5 * (ac[lag * 2] ?? 0)) * pref;
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }
  // Parabolic refinement
  const a = ac[bestLag - 1] ?? ac[bestLag];
  const b = ac[bestLag];
  const c = ac[bestLag + 1] ?? ac[bestLag];
  const denom = a - 2 * b + c;
  const lag = bestLag + (denom !== 0 ? (0.5 * (a - c)) / denom : 0);
  const period = lag; // frames per beat
  const bpm = (60 * fps) / period;

  // Dynamic-programming beat tracker (Ellis 2007)
  const score = new Float32Array(frames);
  const back = new Int32Array(frames).fill(-1);
  const alpha = 400;
  for (let f = 0; f < frames; f++) {
    let best = 0;
    let arg = -1;
    const lo = Math.max(0, Math.floor(f - 2 * period));
    const hi = Math.floor(f - period / 2);
    for (let p = lo; p <= hi; p++) {
      const x = Math.log((f - p) / period);
      const v = score[p] - alpha * x * x;
      if (v > best || arg < 0) {
        best = v;
        arg = p;
      }
    }
    score[f] = onset[f] + (arg >= 0 ? Math.max(0, best) : 0);
    back[f] = arg;
  }
  let end = 0;
  for (let f = Math.max(0, frames - Math.ceil(period)); f < frames; f++) if (score[f] > score[end]) end = f;
  const beatFrames: number[] = [];
  for (let f = end; f >= 0; f = back[f]) {
    beatFrames.push(f);
    if (back[f] < 0) break;
  }
  beatFrames.reverse();
  // Extend the grid to the start/end so the reel always has beats
  while (beatFrames.length && beatFrames[0] - period > 0) beatFrames.unshift(Math.round(beatFrames[0] - period));
  while (beatFrames.length && beatFrames[beatFrames.length - 1] + period < frames) beatFrames.push(Math.round(beatFrames[beatFrames.length - 1] + period));
  const beats = beatFrames.map((f) => (f * HOP + N / 2) / sr).filter((t) => t >= 0 && t < duration);

  // Downbeat phase (4/4): the beat position whose onsets carry the most bass
  const strength = beats.map((t) => {
    const f = Math.min(frames - 1, Math.round(((t * sr - N / 2) / HOP)));
    return bass[f] + 0.5 * onset[f];
  });
  let phase = 0;
  let phaseBest = -1;
  for (let p = 0; p < 4; p++) {
    let s = 0;
    for (let i = p; i < strength.length; i += 4) s += strength[i];
    if (s > phaseBest) {
      phaseBest = s;
      phase = p;
    }
  }
  const downbeats = beats.map((_, i) => i % 4 === phase);

  // Energy per beat (RMS over the beat)
  const beatEnergy = beats.map((t, i) => {
    const f0 = Math.max(0, Math.floor((t * sr) / HOP));
    const f1 = Math.min(frames, Math.floor(((beats[i + 1] ?? duration) * sr) / HOP));
    let s = 0;
    for (let f = f0; f < f1; f++) s += rms[f];
    return f1 > f0 ? s / (f1 - f0) : 0;
  });
  const maxB = Math.max(1e-9, ...beatEnergy);

  // Waveform peaks
  const bins = 1200;
  const waveform: number[] = new Array(bins).fill(0);
  const per = Math.max(1, Math.floor(pcm.length / bins));
  let peakMax = 1e-9;
  for (let i = 0; i < bins; i++) {
    let m = 0;
    for (let j = i * per; j < Math.min(pcm.length, (i + 1) * per); j += 4) m = Math.max(m, Math.abs(pcm[j]));
    waveform[i] = m;
    peakMax = Math.max(peakMax, m);
  }

  return {
    duration,
    bpm,
    beats,
    downbeats,
    beatEnergy: beatEnergy.map((e) => e / maxB),
    waveform: waveform.map((v) => v / peakMax),
    analysisMs: (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0,
  };
}
