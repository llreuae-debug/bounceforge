import { SoundSynthesizer } from '../audio/synth';
import { SoundfontSampleManager } from '../audio/soundfont';
import { Mulberry32 } from '../engine/prng';
import type { InstrumentType } from '../audio/types';
import { midiToFreq } from '../audio/melodies';
import { peakLimit } from '../midi/reelAudio';
import type { LibraryInstrument } from './library/songs';
import type { Scene } from './scene';
import type { Impacts, SyncMode } from './sync';
import type { StudioTrack } from './track';

export const INSTRUMENTS: { id: LibraryInstrument; name: string }[] = [
  { id: 'piano', name: 'Piano' },
  { id: 'marimba', name: 'Marimba' },
  { id: 'musicBox', name: 'Music Box' },
  { id: 'glassBells', name: 'Glass Bells' },
  { id: 'synthPluck', name: 'Synth Pluck' },
  { id: 'harp', name: 'Harp' },
  { id: 'eightBit', name: '8-bit' },
];

const VOICE: Record<LibraryInstrument, { lead: InstrumentType; acc: InstrumentType }> = {
  piano: { lead: 'grandPiano', acc: 'grandPiano' },
  marimba: { lead: 'marimba', acc: 'marimba' },
  musicBox: { lead: 'musicBox', acc: 'celesta' },
  glassBells: { lead: 'bellGlock', acc: 'vibraphone' },
  synthPluck: { lead: 'kalimba', acc: 'softPad' },
  harp: { lead: 'pluckHarp', acc: 'pluckHarp' },
  eightBit: { lead: 'chiptunePulse', acc: 'square8bit' },
};

export interface DropMix {
  master: number;
  music: number;
  impacts: number;
  muted: boolean;
  reverb: boolean;
  echo: boolean;
}

/** Reverb and echo are off by default (they are opt-in effects). */
export const DEFAULT_MIX: DropMix = { master: 0.9, music: 0.8, impacts: 0.75, muted: false, reverb: false, echo: false };

/** Effect limits: reverb wet ≤ 15%, decay ≤ 1.2s, echo feedback ≤ 25%. */
export const FX = { reverbWet: 0.15, reverbDecay: 1.2, echoFeedback: 0.25, echoWet: 0.15, echoTime: 0.28 };
/** Every note is gated: fully silent (below -40dB) within this long after its note-off. */
export const NOTE_RELEASE = 1.2;

/** One scheduled sound. Everything the reel plays is precomputed, so preview and export match. */
export interface AudioEvent {
  t: number;
  kind: 'note' | 'impact';
  midi: number;
  dur: number;
  vel: number;
  lead: boolean;
  tier: number;
  pan: number;
}

/**
 * Note Mode: impacts play the melody (each impact = the next note), accompaniment keeps time.
 * Other modes: the full MIDI plays as backing and impacts add tiered hit sounds.
 * Uploaded audio: the recording is the music, impacts add hit sounds.
 */
export function buildAudioEvents(track: StudioTrack, imp: Impacts, mode: SyncMode, scene: Scene | null): AudioEvent[] {
  const ev: AudioEvent[] = [];
  const panOf = new Map<number, number>();
  const sources = scene?.parts ? scene.parts.map((p) => p.scene) : scene ? [scene] : [];
  for (const s of sources) for (let h = 0; h < s.hitT.length; h++) if (s.hitImpact[h] >= 0 && !panOf.has(s.hitImpact[h])) panOf.set(s.hitImpact[h], Math.max(-0.6, Math.min(0.6, (s.hitX[h] - 540) / 900)));

  const noteMode = mode === 'note' && imp.melody.length > 0;
  for (const n of track.notes) {
    if (noteMode && n.lane === 0) continue;
    // Bass (below G3) stays mono/centre; other accompaniment sits slightly left of the lead
    ev.push({ t: n.t, kind: 'note', midi: n.midi, dur: n.d, vel: n.vel, lead: n.lane === 0, tier: 0, pan: n.lane === 0 || n.midi < 55 || n.isDrum ? 0 : -0.15 });
  }
  for (let k = 0; k < imp.t.length; k++) {
    const t = imp.t[k];
    const pan = panOf.get(k) ?? 0;
    if (noteMode && imp.noteFrom[k] >= 0) {
      for (let i = imp.noteFrom[k]; i < imp.noteTo[k]; i++) {
        const n = imp.melody[i];
        ev.push({ t, kind: 'note', midi: n.midi, dur: n.d, vel: Math.min(1, n.vel + (imp.tier[k] === 1 ? 0.1 : 0)), lead: true, tier: imp.tier[k], pan });
      }
      // (The note itself is the impact sound: no second, layered trigger)
    } else {
      ev.push({ t, kind: 'impact', midi: imp.tier[k] === 1 ? 36 : 84, dur: 0.25, vel: imp.tier[k] === 1 ? 0.9 : imp.tier[k] === 2 ? 0.6 : 0.35, lead: false, tier: imp.tier[k], pan });
    }
  }
  ev.sort((a, b) => a.t - b.t);
  return ev;
}

interface Buses {
  master: GainNode;
  music: GainNode;
  impacts: GainNode;
  reverbSend: GainNode;
  echoSend: GainNode;
}

function impulse(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  // Deterministic noise with an exponential decay reaching -60dB at `seconds` (RT60)
  let seed = 12345;
  const k = Math.log(1000) / len;
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      d[i] = ((seed / 0x7fffffff) * 2 - 1) * Math.exp(-k * i) * 0.35;
    }
  }
  return buf;
}

/**
 * Master chain (built once per AudioContext — regenerating never stacks effects):
 * HPF 80Hz → -3dB @300Hz → +2dB @3kHz → +2dB air shelf @10kHz → [live: compressor 3:1 → limiter]
 * Offline renders stop after the EQ (linear, so chunks can be summed); compression, loudness and
 * the -1.5dBFS (≤ -1 dBTP) limiter then run on the whole mix.
 */
function createBuses(ctx: BaseAudioContext, mix: DropMix, live = true): Buses {
  const master = ctx.createGain();
  const hpf = ctx.createBiquadFilter();
  hpf.type = 'highpass';
  hpf.frequency.value = 80;
  hpf.Q.value = 0.707;
  const mud = ctx.createBiquadFilter();
  mud.type = 'peaking';
  mud.frequency.value = 300;
  mud.Q.value = 1;
  mud.gain.value = -3;
  const presence = ctx.createBiquadFilter();
  presence.type = 'peaking';
  presence.frequency.value = 3000;
  presence.Q.value = 1;
  presence.gain.value = 2;
  const air = ctx.createBiquadFilter();
  air.type = 'highshelf';
  air.frequency.value = 10000;
  air.gain.value = 2;
  master.connect(hpf);
  hpf.connect(mud);
  mud.connect(presence);
  presence.connect(air);
  if (live) {
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 6;
    comp.ratio.value = 3;
    comp.attack.value = 0.01;
    comp.release.value = 0.15;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -2;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.08;
    air.connect(comp);
    comp.connect(limiter);
    limiter.connect(ctx.destination);
  } else {
    air.connect(ctx.destination);
  }
  const music = ctx.createGain();
  const impacts = ctx.createGain();
  music.connect(master);
  impacts.connect(master);
  const reverb = ctx.createConvolver();
  reverb.normalize = false;
  reverb.buffer = impulse(ctx, FX.reverbDecay);
  const reverbSend = ctx.createGain();
  reverbSend.connect(reverb);
  reverb.connect(master);
  const delay = ctx.createDelay(1);
  delay.delayTime.value = FX.echoTime;
  const fb = ctx.createGain();
  fb.gain.value = FX.echoFeedback;
  delay.connect(fb);
  fb.connect(delay);
  const echoSend = ctx.createGain();
  echoSend.connect(delay);
  delay.connect(master);
  music.connect(reverbSend);
  impacts.connect(reverbSend);
  music.connect(echoSend);
  const b = { master, music, impacts, reverbSend, echoSend };
  applyMix(b, mix);
  // Sampled piano/marimba/music box banks: generated once per context, always from the same seed
  seeded(20261020, () => SoundfontSampleManager.warmUp(ctx));
  return b;
}

function applyMix(b: Buses, mix: DropMix): void {
  b.master.gain.value = mix.muted ? 0 : mix.master;
  b.music.gain.value = mix.music;
  b.impacts.gain.value = mix.impacts;
  b.reverbSend.gain.value = mix.reverb ? FX.reverbWet : 0;
  b.echoSend.gain.value = mix.echo ? FX.echoWet : 0;
}

/**
 * The shared synth uses Math.random for hammer/click noise and noise bursts. Drop Studio runs it
 * under a seed derived from each event, so every play and every export sounds bit-identical.
 */
function seeded<T>(seed: number, fn: () => T): T {
  const orig = Math.random;
  const prng = new Mulberry32(seed >>> 0);
  Math.random = () => prng.next();
  try {
    return fn();
  } finally {
    Math.random = orig;
  }
}

function eventSeed(e: AudioEvent): number {
  return (Math.round(e.t * 48000) * 31 + e.midi * 977 + (e.kind === 'note' ? 1 : 7) * 104729 + e.tier) | 0;
}

/** Per-note gate: whatever the voice's own envelope does, it is silent NOTE_RELEASE after note-off. */
function gate(ctx: BaseAudioContext, dest: AudioNode, when: number, off: number): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(1, when);
  g.gain.setValueAtTime(1, off + NOTE_RELEASE * 0.5);
  g.gain.linearRampToValueAtTime(0, off + NOTE_RELEASE);
  g.connect(dest);
  return g;
}

/** How long one event sounds (for the active-voice counter). */
export function eventSpan(e: AudioEvent): number {
  return (e.kind === 'note' ? Math.min(2.5, Math.max(0.1, e.dur)) : e.tier === 1 ? 0.6 : 0.2) + NOTE_RELEASE;
}

function play(ctx: BaseAudioContext, music: AudioNode, impacts: AudioNode, e: AudioEvent, when: number, instrument: LibraryInstrument): void {
  seeded(eventSeed(e), () => playUnseeded(ctx, music, impacts, e, when, instrument));
}

function playUnseeded(ctx: BaseAudioContext, music: AudioNode, impacts: AudioNode, e: AudioEvent, when: number, instrument: LibraryInstrument): void {
  if (e.kind === 'note') {
    const v = VOICE[instrument];
    const dur = Math.min(2.5, Math.max(0.1, e.dur));
    SoundSynthesizer.playNote(ctx, gate(ctx, music, when, when + dur), midiToFreq(e.midi), when, dur, e.lead ? v.lead : v.acc, e.vel * (e.lead ? 0.8 : 0.42), e.pan);
    return;
  }
  if (e.tier === 1) {
    const g = gate(ctx, impacts, when, when + 0.6);
    // Sub kept modest and centred: it carries little perceived loudness but most of the peak level
    SoundSynthesizer.playNote(ctx, g, 65, when, 0.28, 'subBass808', e.vel * 0.32, 0);
    SoundSynthesizer.playSfx(ctx, g, 'thud', when, e.vel * 0.35);
    SoundSynthesizer.playNote(ctx, g, midiToFreq(84), when, 0.6, 'bellGlock', 0.28, e.pan);
  } else if (e.tier === 2) {
    SoundSynthesizer.playNote(ctx, gate(ctx, impacts, when, when + 0.18), midiToFreq(e.midi), when, 0.18, 'glass', e.vel * 0.5, e.pan);
  } else {
    SoundSynthesizer.playNote(ctx, gate(ctx, impacts, when, when + 0.1), midiToFreq(e.midi + 7), when, 0.1, 'glass', e.vel * 0.35, e.pan);
  }
}

export interface PlayerSource {
  events: AudioEvent[];
  instrument: LibraryInstrument;
  duration: number;
  /** Uploaded recording (plays as the music) */
  audio?: AudioBuffer | null;
  /** Offset into the recording where the reel starts */
  audioOffset?: number;
}

/**
 * Live preview: the AudioContext clock is the master clock. Visuals read time() every frame,
 * sounds are scheduled 250ms ahead, so drops and sounds can't drift apart.
 */
export class DropPlayer {
  private ctx: AudioContext | null = null;
  private buses: Buses | null = null;
  private src: PlayerSource | null = null;
  private mix: DropMix = { ...DEFAULT_MIX };
  private startCtx = 0;
  private origin = 0;
  private pausedAt = 0;
  private cursor = 0;
  private timer: number | null = null;
  private music: GainNode | null = null;
  private impactsNode: GainNode | null = null;
  private recording: AudioBufferSourceNode | null = null;
  playing = false;
  loop = true;
  onEnded?: () => void;

  private ensure(): AudioContext {
    if (!this.ctx) {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AC({ latencyHint: 'interactive' }) as AudioContext;
      this.buses = createBuses(this.ctx, this.mix);
    }
    return this.ctx;
  }

  setMix(mix: DropMix): void {
    this.mix = { ...mix };
    if (this.buses) applyMix(this.buses, mix);
  }

  /** Swap in new events (after regenerate) without stopping playback. */
  setSource(src: PlayerSource): void {
    const t = this.time();
    this.src = src;
    if (this.playing) this.restart(t);
    else this.pausedAt = Math.min(this.pausedAt, src.duration);
  }

  /** Debug: sounds currently ringing (started, and not yet past their gated release). */
  activeVoices(): number {
    if (!this.playing || !this.src) return 0;
    const now = this.time();
    let n = 0;
    for (let i = Math.max(0, this.cursor - 400); i < this.cursor && i < this.src.events.length; i++) {
      const e = this.src.events[i];
      if (e.t <= now && now < e.t + eventSpan(e)) n++;
    }
    return n;
  }

  time(): number {
    if (!this.playing || !this.ctx) return this.pausedAt;
    return Math.min(this.src?.duration ?? 0, this.ctx.currentTime - this.startCtx + this.origin);
  }

  async play(from?: number): Promise<void> {
    if (!this.src) return;
    const ctx = this.ensure();
    await ctx.resume();
    this.restart(from ?? (this.pausedAt >= this.src.duration - 0.01 ? 0 : this.pausedAt));
  }

  pause(): void {
    this.pausedAt = this.time();
    this.halt();
  }

  seek(t: number): void {
    const was = this.playing;
    this.pausedAt = Math.max(0, Math.min(t, this.src?.duration ?? 0));
    if (was) this.restart(this.pausedAt);
  }

  stop(): void {
    this.halt();
    this.pausedAt = 0;
  }

  dispose(): void {
    this.halt();
    void this.ctx?.close();
    this.ctx = null;
    this.buses = null;
  }

  private halt(): void {
    this.playing = false;
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    const ctx = this.ctx;
    // Fade out everything already scheduled for this run
    for (const g of [this.music, this.impactsNode]) {
      if (g && ctx) {
        g.gain.setTargetAtTime(0, ctx.currentTime, 0.015);
        const gg = g;
        window.setTimeout(() => gg.disconnect(), 200);
      }
    }
    this.music = null;
    this.impactsNode = null;
    try {
      this.recording?.stop();
    } catch {
      /* already stopped */
    }
    this.recording = null;
  }

  private restart(from: number): void {
    this.halt();
    const ctx = this.ensure();
    const b = this.buses!;
    this.music = ctx.createGain();
    this.music.connect(b.music);
    this.impactsNode = ctx.createGain();
    this.impactsNode.connect(b.impacts);
    this.origin = from;
    this.startCtx = ctx.currentTime + 0.06;
    this.playing = true;
    const src = this.src!;
    this.cursor = lowerBound(src.events, from);
    if (src.audio) {
      const node = ctx.createBufferSource();
      node.buffer = src.audio;
      node.connect(this.music);
      node.start(this.startCtx, (src.audioOffset ?? 0) + from, Math.max(0, src.duration - from));
      this.recording = node;
    }
    this.pump();
    this.timer = window.setInterval(() => this.pump(), 25);
  }

  private pump(): void {
    if (!this.playing || !this.ctx || !this.src) return;
    const now = this.time();
    if (now >= this.src.duration - 0.005) {
      if (this.loop) this.restart(0);
      else {
        this.pause();
        this.pausedAt = this.src.duration;
        this.onEnded?.();
      }
      return;
    }
    const until = now + 0.25;
    const ev = this.src.events;
    while (this.cursor < ev.length && ev[this.cursor].t < until) {
      const e = ev[this.cursor++];
      if (e.t < now - 0.02) continue;
      play(this.ctx, this.music!, this.impactsNode!, e, this.startCtx + (e.t - this.origin), this.src.instrument);
    }
  }
}

function lowerBound(ev: AudioEvent[], t: number): number {
  let lo = 0;
  let hi = ev.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (ev[mid].t < t - 1e-6) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Export: the same events rendered sample-accurately at 48kHz stereo, loudness-normalised and
 * peak-limited. The reel is rendered in parallel 8s chunks (each with only its own notes, plus a
 * reverb/echo tail) and overlap-added — identical to one long render because the offline mix is
 * linear, but several times faster (offline contexts pay for every scheduled node every block).
 */
export async function renderDropAudio(src: PlayerSource, mix: DropMix): Promise<AudioBuffer> {
  const sr = 48000;
  const total = Math.ceil(src.duration * sr);
  const CHUNK = 8;
  const TAIL = 3.5;
  const jobs: Promise<{ at: number; buf: AudioBuffer }>[] = [];
  for (let start = 0; start < src.duration; start += CHUNK) {
    const end = Math.min(src.duration, start + CHUNK);
    const len = Math.ceil((Math.min(src.duration, end + TAIL) - start) * sr);
    const ctx = new OfflineAudioContext(2, Math.max(1, len), sr);
    const b = createBuses(ctx, { ...mix, muted: false }, false);
    if (src.audio) {
      const node = ctx.createBufferSource();
      node.buffer = src.audio;
      node.connect(b.music);
      node.start(0, (src.audioOffset ?? 0) + start, end - start);
    }
    for (const e of src.events) if (e.t >= start && e.t < end) play(ctx, b.music, b.impacts, e, e.t - start, src.instrument);
    jobs.push(ctx.startRendering().then((buf) => ({ at: Math.round(start * sr), buf })));
  }
  const parts = await Promise.all(jobs);
  const out = new AudioBuffer({ numberOfChannels: 2, length: total, sampleRate: sr });
  for (let c = 0; c < 2; c++) {
    const dst = out.getChannelData(c);
    for (const p of parts) {
      const srcData = p.buf.getChannelData(c);
      const n = Math.min(srcData.length, total - p.at);
      for (let i = 0; i < n; i++) dst[p.at + i] += srcData[i];
    }
  }
  // Normalise → limit, repeated: the limiter shaves transient peaks (bells, thuds), which lowers
  // loudness, so re-measure until the mix settles near -14 LUFS with a -1.5 dBFS ceiling
  normalizeLoudness(out, -18);
  compress(out, -20, 3, 0.01, 0.15);
  for (let pass = 0; pass < 6; pass++) {
    const g = normalizeLoudness(out, -14);
    softKnee(out, 0.5);
    // 5ms look-ahead, 30ms release: catches mallet/bell attacks without pumping the sustain
    peakLimit(out, -1.5, 0, 0.005, 0.03);
    if (Math.abs(g) < 0.4) break;
  }
  if (mix.muted) for (let c = 0; c < out.numberOfChannels; c++) out.getChannelData(c).fill(0);
  return out;
}

/** Short preview of a library song (Library tab play buttons). */
export async function previewNotes(player: DropPlayer, track: StudioTrack): Promise<void> {
  // Start at the first note (skip a pickup rest) so the preview sounds immediately
  const first = track.notes.length ? Math.min(...track.notes.map((n) => n.t)) : 0;
  const end = first + 12;
  player.setSource({
    events: track.notes
      .filter((n) => n.t >= first && n.t < end)
      .map((n) => ({ t: n.t - first, kind: 'note' as const, midi: n.midi, dur: n.d, vel: n.vel, lead: n.lane === 0, tier: 0, pan: n.lane === 0 || n.midi < 55 ? 0 : -0.15 })),
    instrument: track.instrument,
    duration: Math.min(track.duration - first, 12),
  });
  player.loop = false;
  await player.play(0);
}

/**
 * Gated loudness normalisation (EBU R128-style 400ms blocks, -70 LUFS absolute and -10 LU relative
 * gates, simple high-shelf weighting) toward the -14 LUFS social-video target, max +12 dB.
 */
export function normalizeLoudness(buf: AudioBuffer, targetLufs: number): number {
  const sr = buf.sampleRate;
  const block = Math.round(sr * 0.4);
  const hop = Math.round(sr * 0.1);
  const chans = Array.from({ length: buf.numberOfChannels }, (_, c) => buf.getChannelData(c));
  // Pre-filter: first-order high shelf approximation of the K-weighting (+4dB above ~1.5kHz) and a 60Hz high-pass
  const weighted = chans.map((d) => {
    const o = new Float32Array(d.length);
    let hpX = 0;
    let hpY = 0;
    let lp = 0;
    const aHp = Math.exp((-2 * Math.PI * 60) / sr);
    const aLp = Math.exp((-2 * Math.PI * 1500) / sr);
    for (let i = 0; i < d.length; i++) {
      hpY = aHp * (hpY + d[i] - hpX);
      hpX = d[i];
      lp = aLp * lp + (1 - aLp) * hpY;
      o[i] = hpY + 0.58 * (hpY - lp);
    }
    return o;
  });
  const ms: number[] = [];
  for (let s = 0; s + block <= buf.length; s += hop) {
    let sum = 0;
    for (const w of weighted) for (let i = s; i < s + block; i++) sum += w[i] * w[i];
    ms.push(sum / block);
  }
  const lufs = (m: number) => -0.691 + 10 * Math.log10(Math.max(1e-12, m));
  const abs = ms.filter((m) => lufs(m) > -70);
  if (!abs.length) return 0;
  const rel = lufs(abs.reduce((a, b) => a + b, 0) / abs.length) - 10;
  const gated = abs.filter((m) => lufs(m) > rel);
  const loud = lufs(gated.reduce((a, b) => a + b, 0) / gated.length);
  const gainDb = Math.max(-12, Math.min(12, targetLufs - loud));
  const g = Math.pow(10, gainDb / 20);
  for (const d of chans) for (let i = 0; i < d.length; i++) d[i] *= g;
  return gainDb;
}

/** Gentle soft-knee saturation above `knee` (linear below it): shaves transient peaks by a few dB. */
export function softKnee(buf: AudioBuffer, knee: number): void {
  const room = 1 - knee;
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < d.length; i++) {
      const x = d[i];
      const a = x < 0 ? -x : x;
      if (a <= knee) continue;
      const y = knee + room * Math.tanh((a - knee) / room);
      d[i] = x < 0 ? -y : y;
    }
  }
}

/** Feed-forward compressor (stereo-linked), same settings as the live master compressor. */
export function compress(buf: AudioBuffer, thresholdDb: number, ratio: number, attack: number, release: number): void {
  const sr = buf.sampleRate;
  const chans = Array.from({ length: buf.numberOfChannels }, (_, c) => buf.getChannelData(c));
  const aA = Math.exp(-1 / (attack * sr));
  const aR = Math.exp(-1 / (release * sr));
  let env = 0;
  for (let i = 0; i < buf.length; i++) {
    let p = 0;
    for (const d of chans) p = Math.max(p, d[i] * d[i]);
    env = p > env ? aA * env + (1 - aA) * p : aR * env + (1 - aR) * p;
    const db = 10 * Math.log10(env + 1e-12);
    if (db > thresholdDb) {
      const g = Math.pow(10, (thresholdDb + (db - thresholdDb) / ratio - db) / 20);
      for (const d of chans) d[i] *= g;
    }
  }
}
