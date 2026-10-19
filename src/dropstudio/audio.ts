import { SoundSynthesizer } from '../audio/synth';
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

export const DEFAULT_MIX: DropMix = { master: 0.9, music: 0.8, impacts: 0.75, muted: false, reverb: true, echo: false };

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
    ev.push({ t: n.t, kind: 'note', midi: n.midi, dur: n.d, vel: n.vel, lead: n.lane === 0, tier: 0, pan: n.lane === 0 ? 0 : -0.15 });
  }
  for (let k = 0; k < imp.t.length; k++) {
    const t = imp.t[k];
    const pan = panOf.get(k) ?? 0;
    if (noteMode && imp.noteFrom[k] >= 0) {
      for (let i = imp.noteFrom[k]; i < imp.noteTo[k]; i++) {
        const n = imp.melody[i];
        ev.push({ t, kind: 'note', midi: n.midi, dur: n.d, vel: Math.min(1, n.vel + (imp.tier[k] === 1 ? 0.1 : 0)), lead: true, tier: imp.tier[k], pan });
      }
      if (imp.tier[k] === 1) ev.push({ t, kind: 'impact', midi: 36, dur: 0.3, vel: 0.55, lead: false, tier: 1, pan });
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
  // Deterministic noise so offline renders are repeatable
  let seed = 12345;
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      d[i] = ((seed / 0x7fffffff) * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
  }
  return buf;
}

function createBuses(ctx: BaseAudioContext, mix: DropMix): Buses {
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -8;
  limiter.knee.value = 6;
  limiter.ratio.value = 10;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.2;
  limiter.connect(ctx.destination);
  const master = ctx.createGain();
  master.connect(limiter);
  const music = ctx.createGain();
  const impacts = ctx.createGain();
  music.connect(master);
  impacts.connect(master);
  const reverb = ctx.createConvolver();
  reverb.buffer = impulse(ctx, 2.2);
  const reverbSend = ctx.createGain();
  reverbSend.connect(reverb);
  reverb.connect(master);
  const delay = ctx.createDelay(1);
  delay.delayTime.value = 0.28;
  const fb = ctx.createGain();
  fb.gain.value = 0.32;
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
  return b;
}

function applyMix(b: Buses, mix: DropMix): void {
  b.master.gain.value = mix.muted ? 0 : mix.master;
  b.music.gain.value = mix.music;
  b.impacts.gain.value = mix.impacts;
  b.reverbSend.gain.value = mix.reverb ? 0.28 : 0;
  b.echoSend.gain.value = mix.echo ? 0.3 : 0;
}

function play(ctx: BaseAudioContext, music: AudioNode, impacts: AudioNode, e: AudioEvent, when: number, instrument: LibraryInstrument): void {
  if (e.kind === 'note') {
    const v = VOICE[instrument];
    SoundSynthesizer.playNote(ctx, music, midiToFreq(e.midi), when, Math.min(2.5, Math.max(0.1, e.dur)), e.lead ? v.lead : v.acc, e.vel * (e.lead ? 0.8 : 0.42), e.pan);
    return;
  }
  if (e.tier === 1) {
    SoundSynthesizer.playNote(ctx, impacts, 55, when, 0.32, 'subBass808', e.vel * 0.75, 0);
    SoundSynthesizer.playSfx(ctx, impacts, 'thud', when, e.vel * 0.45);
    SoundSynthesizer.playNote(ctx, impacts, midiToFreq(84), when, 0.6, 'bellGlock', 0.28, e.pan);
  } else if (e.tier === 2) {
    SoundSynthesizer.playNote(ctx, impacts, midiToFreq(e.midi), when, 0.18, 'glass', e.vel * 0.5, e.pan);
  } else {
    SoundSynthesizer.playNote(ctx, impacts, midiToFreq(e.midi + 7), when, 0.1, 'glass', e.vel * 0.35, e.pan);
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

/** Export: the same events rendered sample-accurately at 48kHz stereo, peak-limited. */
export async function renderDropAudio(src: PlayerSource, mix: DropMix): Promise<AudioBuffer> {
  const sr = 48000;
  const ctx = new OfflineAudioContext(2, Math.ceil(src.duration * sr), sr);
  const b = createBuses(ctx, { ...mix, muted: false });
  if (src.audio) {
    const node = ctx.createBufferSource();
    node.buffer = src.audio;
    node.connect(b.music);
    node.start(0, src.audioOffset ?? 0, src.duration);
  }
  for (const e of src.events) if (e.t < src.duration) play(ctx, b.music, b.impacts, e, e.t, src.instrument);
  const out = await ctx.startRendering();
  peakLimit(out);
  if (mix.muted) for (let c = 0; c < out.numberOfChannels; c++) out.getChannelData(c).fill(0);
  return out;
}

/** Short preview of a library song (Library tab play buttons). */
export async function previewNotes(player: DropPlayer, track: StudioTrack): Promise<void> {
  player.setSource({
    events: track.notes.map((n) => ({ t: n.t, kind: 'note', midi: n.midi, dur: n.d, vel: n.vel, lead: n.lane === 0, tier: 0, pan: 0 })),
    instrument: track.instrument,
    duration: Math.min(track.duration, 12),
  });
  player.loop = false;
  await player.play(0);
}
