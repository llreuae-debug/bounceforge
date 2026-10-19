import { SoundSynthesizer } from '../audio/synth';
import { midiToFreq } from '../audio/melodies';
import type { CollisionEvent } from '../engine/types';
import type { InstrumentType } from '../audio/types';
import { drumRole } from './instrumentMap';
import type { PlannedNote, ReelMix, ReelPlan } from './types';

/**
 * Audio for MIDI reels: the synthesized MIDI soundtrack plus sound effects driven by real
 * physics events, mixed on four buses (music, drops, collisions, ambient) into a master
 * limiter. The same rules run live (preview) and offline (export), so they sound the same.
 */

export type SfxKind = 'release' | 'pad' | 'bass' | 'tick' | 'clink' | 'roll' | 'whoosh';
export type SfxBus = 'drops' | 'collisions' | 'ambient';

export interface ReelSfx {
  time: number;
  kind: SfxKind;
  bus: SfxBus;
  midi: number;
  volume: number;
  pan: number;
  /** id of the physics event that caused it */
  eventId: number;
}

interface BallInfo {
  radius: number;
  midi: number;
  kind: string;
  padHit: boolean;
}

/**
 * Turns physics events into sound effects. Stateful (cooldowns), feed events in time order.
 * - Each sound comes from one real event and plays at that event's time.
 * - Per-ball cooldown (70ms), max 10 collision sounds per 100ms, soft contacts are dropped
 *   or become quiet rolling sounds, volume is normalised from the impact strength.
 */
export class SfxRules {
  private balls = new Map<number, BallInfo>();
  private lastByBall = new Map<number, number>();
  private lastRollByBall = new Map<number, number>();
  private recent: number[] = [];
  private latest = -Infinity;

  constructor(private bassImpacts: boolean = true) {}

  setBassImpacts(on: boolean): void {
    this.bassImpacts = on;
  }

  reset(): void {
    this.balls.clear();
    this.lastByBall.clear();
    this.lastRollByBall.clear();
    this.recent = [];
    this.latest = -Infinity;
  }

  process(ev: CollisionEvent): ReelSfx[] {
    const t = ev.time;
    if (t < this.latest - 0.25) this.reset();
    this.latest = Math.max(this.latest, t);
    const pan = clampPan(((ev.position?.x ?? 540) - 540) / 540);
    const out: ReelSfx[] = [];

    if (ev.extra?.midiReel === 'release') {
      this.balls.set(ev.ballId, { radius: ev.extra.radius ?? 14, midi: ev.extra.midi ?? 72, kind: ev.extra.kind ?? 'light', padHit: false });
      out.push({ time: t, kind: 'release', bus: 'drops', midi: 96, volume: 0.25 + Math.min(1, ev.impulse / 100) * 0.35, pan, eventId: ev.id });
      return out;
    }
    if (ev.extra?.midiReel === 'transition') {
      out.push({ time: t, kind: 'whoosh', bus: 'ambient', midi: 60, volume: 0.6, pan: 0, eventId: ev.id });
      return out;
    }
    if (!['wall', 'bumper', 'ball', 'ring', 'peg'].includes(ev.type)) return out;

    const info = this.balls.get(ev.ballId) ?? { radius: 14, midi: 72, kind: 'light', padHit: false };
    const impulse = ev.impulse || 0;
    const y = ev.position?.y ?? 0;

    // Soft contact on a ramp = rolling, throttled, quiet
    if (impulse < 120) {
      if (ev.type === 'wall' && y > 1250 && y < 1480) {
        const lastRoll = this.lastRollByBall.get(ev.ballId) ?? -1;
        if (t - lastRoll >= 0.15) {
          this.lastRollByBall.set(ev.ballId, t);
          out.push({ time: t, kind: 'roll', bus: 'collisions', midi: 40, volume: 0.15 + (impulse / 120) * 0.15, pan, eventId: ev.id });
        }
      }
      return out;
    }

    const last = this.lastByBall.get(ev.ballId) ?? -1;
    if (t - last < 0.07) return out;
    while (this.recent.length && this.recent[0] < t - 0.1) this.recent.shift();
    if (this.recent.length >= 10) return out;
    this.lastByBall.set(ev.ballId, t);
    this.recent.push(t);

    const strength = Math.min(1, (impulse - 120) / 1400);
    const volume = 0.25 + strength * 0.6;
    const isPad = ev.type === 'wall' && Math.abs(y - 640) < 40;

    if (isPad && !info.padHit) {
      // The musical impact: a chime at the drop's own note (+ bass thump on heavy drops)
      info.padHit = true;
      this.balls.set(ev.ballId, info);
      out.push({ time: t, kind: 'pad', bus: 'collisions', midi: info.midi, volume: Math.min(1, volume + 0.15), pan, eventId: ev.id });
      if (this.bassImpacts && (info.kind === 'heavy' || info.kind === 'pulse')) {
        out.push({ time: t, kind: 'bass', bus: 'collisions', midi: 33, volume: 0.5 + strength * 0.4, pan: 0, eventId: ev.id });
      }
    } else if (ev.type === 'ball') {
      out.push({ time: t, kind: 'clink', bus: 'collisions', midi: 88, volume: volume * 0.7, pan, eventId: ev.id });
    } else {
      // Glass ticks: smaller marbles ring higher
      const pitch = Math.round(100 - Math.min(30, info.radius) * 0.9);
      out.push({ time: t, kind: 'tick', bus: 'collisions', midi: pitch, volume: volume * 0.8, pan, eventId: ev.id });
    }
    return out;
  }
}

/** Schedule one sound effect on a bus. */
export function playSfx(ctx: BaseAudioContext, bus: AudioNode, s: ReelSfx, when: number): void {
  const freq = midiToFreq(s.midi);
  switch (s.kind) {
    case 'release':
      withPan(ctx, bus, s.pan, when, (dest) => SoundSynthesizer.playSfx(ctx, dest, 'pop', when, s.volume * 0.5));
      break;
    case 'pad':
      SoundSynthesizer.playNote(ctx, bus, midiToFreq(clampMidi(s.midi + 12)), when, 0.7, 'bellGlock', s.volume * 0.55, s.pan);
      break;
    case 'bass':
      SoundSynthesizer.playNote(ctx, bus, freq, when, 0.35, 'subBass808', s.volume * 0.7, 0);
      break;
    case 'tick':
      SoundSynthesizer.playNote(ctx, bus, freq, when, 0.18, 'glass', s.volume * 0.45, s.pan);
      break;
    case 'clink':
      SoundSynthesizer.playNote(ctx, bus, freq, when, 0.12, 'celesta', s.volume * 0.35, s.pan);
      break;
    case 'roll':
      withPan(ctx, bus, s.pan, when, (dest) => SoundSynthesizer.playSfx(ctx, dest, 'crunch', when, s.volume * 0.35));
      break;
    case 'whoosh':
      SoundSynthesizer.playSfx(ctx, bus, 'whoosh', when, s.volume * 0.5);
      break;
  }
}

/** Schedule one MIDI note (melodic synth or GM drum kit). */
export function playMidiNote(
  ctx: BaseAudioContext,
  bus: AudioNode,
  n: PlannedNote,
  when: number,
  synth: InstrumentType,
  pan: number
): void {
  const vel = Math.max(0.05, Math.min(1, n.velocity));
  if (n.isDrum) {
    const role = drumRole(n.midi);
    if (role === 'kick') {
      SoundSynthesizer.playNote(ctx, bus, 52, when, 0.3, 'subBass808', vel * 0.9, 0);
      SoundSynthesizer.playSfx(ctx, bus, 'thud', when, vel * 0.5);
    } else if (role === 'snare') {
      SoundSynthesizer.playNote(ctx, bus, 190, when, 0.15, 'snareRimshot', vel * 0.7, 0);
    } else if (role === 'hat') {
      withPan(ctx, bus, 0.25, when, (dest) => SoundSynthesizer.playSfx(ctx, dest, 'crunch', when, vel * 0.18));
    } else if (role === 'cymbal') {
      SoundSynthesizer.playSfx(ctx, bus, 'shatter', when, vel * 0.25);
    } else {
      SoundSynthesizer.playNote(ctx, bus, midiToFreq(n.midi + 12), when, 0.2, 'woodblock', vel * 0.5, 0);
    }
    return;
  }
  SoundSynthesizer.playNote(ctx, bus, midiToFreq(n.midi), when, Math.min(2.5, Math.max(0.08, n.duration)), synth, vel * 0.75, pan);
}

export interface ReelBuses {
  master: GainNode;
  music: GainNode;
  drops: GainNode;
  collisions: GainNode;
  ambient: GainNode;
  limiter: DynamicsCompressorNode;
}

export function createBuses(ctx: BaseAudioContext, destination: AudioNode, mix: ReelMix): ReelBuses {
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -6;
  limiter.knee.value = 6;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.2;
  const master = ctx.createGain();
  master.connect(limiter);
  limiter.connect(destination);
  const mk = () => {
    const g = ctx.createGain();
    g.connect(master);
    return g;
  };
  const buses = { master, music: mk(), drops: mk(), collisions: mk(), ambient: mk(), limiter };
  applyMix(buses, mix);
  return buses;
}

export function applyMix(b: ReelBuses, mix: ReelMix): void {
  b.master.gain.value = mix.muted ? 0 : mix.master;
  b.music.gain.value = mix.music;
  b.drops.gain.value = mix.drops;
  b.collisions.gain.value = mix.collisions;
  b.ambient.gain.value = mix.ambient;
}

/** Track pan spread so parts sit apart in stereo. */
export function trackPan(trackIndex: number): number {
  const spread = [0, -0.35, 0.35, -0.2, 0.2, -0.5, 0.5];
  return spread[trackIndex % spread.length];
}

/** Soft drone on the song's root (ambient bus). */
export function startDrone(ctx: BaseAudioContext, bus: AudioNode, rootMidi: number, start: number, end: number): OscillatorNode[] {
  const oscs: OscillatorNode[] = [];
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(0.06, start + 2);
  gain.gain.setValueAtTime(0.06, Math.max(start + 2, end - 2));
  gain.gain.linearRampToValueAtTime(0.0001, end);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 700;
  gain.connect(filter);
  filter.connect(bus);
  for (const [ratio, type] of [[1, 'sine'], [1.5, 'triangle'], [2, 'sine']] as const) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = midiToFreq(rootMidi) * ratio * 0.5;
    o.connect(gain);
    o.start(start);
    o.stop(end + 0.05);
    oscs.push(o);
  }
  return oscs;
}

/**
 * Offline mix for export: the MIDI soundtrack + effects from the recorded physics events,
 * rendered sample-accurately at 48kHz stereo.
 */
export async function renderReelAudio(
  plan: ReelPlan,
  events: CollisionEvent[],
  mix: ReelMix,
  duration: number
): Promise<AudioBuffer> {
  const sampleRate = 48000;
  const ctx = new OfflineAudioContext(2, Math.ceil(duration * sampleRate), sampleRate);
  const buses = createBuses(ctx, ctx.destination, mix);
  for (const n of limitPolyphony(plan.notes)) {
    if (n.time >= duration) break;
    playMidiNote(ctx, buses.music, n, n.time, plan.trackSynths[n.trackIndex] || 'grandPiano', trackPan(n.trackIndex));
  }
  const rules = new SfxRules(mix.bassImpacts);
  for (const ev of [...events].sort((a, b) => a.time - b.time)) {
    if (ev.time >= duration) break;
    for (const s of rules.process(ev)) playSfx(ctx, buses[s.bus], s, s.time);
  }
  if (mix.ambient > 0.01) startDrone(ctx, buses.ambient, plan.rootMidi, 0, duration);
  const out = await ctx.startRendering();
  peakLimit(out);
  return out;
}

/**
 * Look-ahead brickwall on the rendered buffer: the compressor's 3ms attack lets transients through,
 * so this adds makeup gain and guarantees the export stays under -1.5 dBFS (true peak below the -0.5 dBTP check).
 */
export function peakLimit(buffer: AudioBuffer, ceilingDb = -1.5, makeupDb = 4, lookAhead = 0.005, release = 0.08): void {
  const ceiling = Math.pow(10, ceilingDb / 20);
  const makeup = Math.pow(10, makeupDb / 20);
  const n = buffer.length;
  const chans = Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c));
  // Makeup gain keeps the reel near the -14 LUFS social target after peaks are tamed
  for (const d of chans) for (let i = 0; i < n; i++) d[i] *= makeup;
  // Required gain per sample (linked across channels)
  const need = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let p = 0;
    for (const d of chans) p = Math.max(p, Math.abs(d[i]));
    need[i] = p > ceiling ? ceiling / p : 1;
  }
  // Look-ahead: gain at i is the min need over [i, i+la]; then ramp down early, release smoothly
  const la = Math.max(1, Math.round(lookAhead * buffer.sampleRate));
  const rel = 1 - Math.exp(-1 / (release * buffer.sampleRate));
  const gain = new Float32Array(n);
  let g = 1;
  for (let i = n - 1; i >= 0; i--) {
    // backward pass: linear attack ramp toward upcoming peaks
    g = Math.min(need[i], g + (1 - need[i]) / la, 1);
    gain[i] = g;
  }
  let cur = 1;
  for (let i = 0; i < n; i++) {
    cur = gain[i] < cur ? gain[i] : cur + (gain[i] - cur) * rel;
    for (const d of chans) d[i] *= cur;
  }
}

/** Dense MIDI: at most 12 notes may start within any 25ms window (the loudest win). */
export function limitPolyphony(notes: PlannedNote[]): PlannedNote[] {
  const out: PlannedNote[] = [];
  let i = 0;
  const sorted = [...notes].sort((a, b) => a.time - b.time);
  while (i < sorted.length) {
    let j = i;
    while (j < sorted.length && sorted[j].time - sorted[i].time < 0.025) j++;
    const group = sorted.slice(i, j);
    if (group.length > 12) group.sort((a, b) => b.velocity - a.velocity).splice(12);
    out.push(...group.sort((a, b) => a.time - b.time));
    i = j;
  }
  return out;
}

function withPan(ctx: BaseAudioContext, bus: AudioNode, pan: number, when: number, fn: (dest: AudioNode) => void): void {
  if (typeof (ctx as any).createStereoPanner === 'function') {
    const p = ctx.createStereoPanner();
    p.pan.setValueAtTime(clampPan(pan), when);
    p.connect(bus);
    fn(p);
  } else {
    fn(bus);
  }
}

function clampPan(p: number): number {
  return Math.max(-0.85, Math.min(0.85, p));
}

function clampMidi(m: number): number {
  return Math.max(24, Math.min(108, m));
}
