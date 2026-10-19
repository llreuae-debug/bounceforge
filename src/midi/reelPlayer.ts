import type { PhysicsWorld } from '../engine/world';
import type { InstrumentType } from '../audio/types';
import type { PlannedNote, ReelMix, ReelPhysicsSettings, ReelPlan } from './types';
import { DEFAULT_MIX } from './types';
import { MidiDropMode } from './midiDropMode';
import { createReelWorld, stepReel, REEL_FPS } from './reelSimulation';
import {
  SfxRules,
  applyMix,
  createBuses,
  limitPolyphony,
  playMidiNote,
  playSfx,
  startDrone,
  trackPan,
  type ReelBuses,
  type ReelSfx,
} from './reelAudio';

export type PlayerState = 'idle' | 'playing' | 'paused' | 'ended';

interface MusicSource {
  notes: PlannedNote[];
  synths: Record<number, InstrumentType>;
  duration: number;
  rootMidi: number;
}

/**
 * Live preview: the AudioContext clock is the master clock. Each animation frame advances the
 * physics to the audio position; every collision's sound is scheduled at that collision's exact
 * video time; music notes are scheduled 300ms ahead. Pause/resume suspend the clock itself.
 */
export class ReelPlayer {
  ctx: AudioContext | null = null;
  private buses: ReelBuses | null = null;
  private mix: ReelMix = { ...DEFAULT_MIX };
  private music: MusicSource | null = null;
  private plan: ReelPlan | null = null;
  private physics: ReelPhysicsSettings | null = null;
  private seed = 1337;
  world: PhysicsWorld | null = null;
  private settings: Record<string, any> = {};
  private rules = new SfxRules(true);
  private silent = false;
  private startCtxTime = 0;
  private musicCursor = 0;
  private scheduler: ReturnType<typeof setInterval> | null = null;
  private raf = 0;
  private state: PlayerState = 'idle';
  private pausedAt = 0;
  loop: { a: number; b: number } | null = null;

  /** Called every animation frame with the world (null in music-only mode) and reel time */
  onFrame: ((world: PhysicsWorld | null, t: number) => void) | null = null;
  onState: ((s: PlayerState) => void) | null = null;
  /** Diagnostics: every effect scheduled during playback */
  onSfx: ((s: ReelSfx) => void) | null = null;

  get duration(): number {
    return this.music?.duration ?? 0;
  }

  get currentTime(): number {
    if (!this.ctx || this.state !== 'playing') return this.pausedAt;
    return Math.max(0, this.ctx.currentTime - this.startCtxTime);
  }

  get playerState(): PlayerState {
    return this.state;
  }

  /** Music only (Screen 1/2 preview): plays the notes without physics */
  loadMusic(notes: PlannedNote[], synths: Record<number, InstrumentType>, duration: number, rootMidi: number): void {
    this.stop();
    this.plan = null;
    this.world = null;
    this.music = { notes: limitPolyphony(notes), synths, duration, rootMidi };
    this.pausedAt = 0;
  }

  /** Full reel: music + physics + effects */
  loadReel(plan: ReelPlan, physics: ReelPhysicsSettings, seed: number): void {
    this.stop();
    this.plan = plan;
    this.physics = physics;
    this.seed = seed;
    this.music = { notes: limitPolyphony(plan.notes), synths: plan.trackSynths, duration: plan.duration, rootMidi: plan.rootMidi };
    this.resetWorld(0);
    this.pausedAt = 0;
    this.onFrame?.(this.world, 0);
  }

  setMix(mix: ReelMix): void {
    this.mix = { ...mix };
    this.rules.setBassImpacts(mix.bassImpacts);
    if (this.buses) applyMix(this.buses, this.mix);
  }

  /** Must be called from a user gesture the first time (browser autoplay rules). */
  async play(from?: number): Promise<void> {
    if (!this.music) return;
    this.ensureContext();
    const ctx = this.ctx!;
    if (this.state === 'paused' && from === undefined) {
      await ctx.resume();
      this.setState('playing');
      this.startLoops();
      return;
    }
    await ctx.resume();
    this.restartAt(from ?? (this.state === 'ended' ? 0 : this.pausedAt));
  }

  pause(): void {
    if (this.state !== 'playing' || !this.ctx) return;
    this.pausedAt = this.currentTime;
    this.stopLoops();
    this.ctx.suspend().catch(() => {});
    this.setState('paused');
  }

  stop(): void {
    this.stopLoops();
    this.killScheduled();
    this.pausedAt = 0;
    if (this.plan) this.resetWorld(0);
    if (this.state !== 'idle') this.setState('idle');
    this.onFrame?.(this.world, 0);
  }

  /** Jump to a time; keeps playing if it was playing */
  seek(t: number): void {
    const target = Math.max(0, Math.min(this.duration, t));
    if (this.state === 'playing') {
      this.restartAt(target);
    } else {
      this.pausedAt = target;
      if (this.plan) this.resetWorld(target);
      if (this.state === 'ended') this.setState('paused');
      this.onFrame?.(this.world, target);
    }
  }

  setLoop(a: number | null, b?: number): void {
    this.loop = a !== null && b !== undefined && b - a > 0.2 ? { a, b } : null;
  }

  dispose(): void {
    this.stop();
    this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.buses = null;
  }

  // ---------------------------------------------------------------------------------------

  private ensureContext(): void {
    if (this.ctx) return;
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new Ctx({ latencyHint: 'interactive' });
    this.buses = createBuses(this.ctx, this.ctx.destination, this.mix);
  }

  /** New buses = every note/effect already scheduled on the old ones goes silent */
  private killScheduled(): void {
    if (!this.ctx || !this.buses) return;
    try {
      this.buses.master.disconnect();
    } catch {}
    this.buses = createBuses(this.ctx, this.ctx.destination, this.mix);
  }

  private restartAt(t: number): void {
    const ctx = this.ctx!;
    this.stopLoops();
    this.killScheduled();
    if (this.plan) this.resetWorld(t);
    this.rules.reset();
    this.startCtxTime = ctx.currentTime + 0.08 - t;
    const notes = this.music!.notes;
    this.musicCursor = lowerBound(notes, t);
    if (this.mix.ambient > 0.01 && this.music!.duration - t > 0.5) {
      startDrone(ctx, this.buses!.ambient, this.music!.rootMidi, ctx.currentTime + 0.08, this.startCtxTime + (this.loop?.b ?? this.music!.duration));
    }
    this.setState('playing');
    this.startLoops();
  }

  private startLoops(): void {
    this.stopLoops();
    this.scheduleMusic();
    this.scheduler = setInterval(() => this.scheduleMusic(), 25);
    const tick = () => {
      this.raf = requestAnimationFrame(tick);
      this.frame();
    };
    this.raf = requestAnimationFrame(tick);
  }

  private stopLoops(): void {
    if (this.scheduler) clearInterval(this.scheduler);
    this.scheduler = null;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private scheduleMusic(): void {
    if (!this.ctx || !this.music || !this.buses) return;
    const horizon = this.currentTime + 0.3;
    const end = this.loop?.b ?? this.music.duration;
    const notes = this.music.notes;
    while (this.musicCursor < notes.length && notes[this.musicCursor].time < Math.min(horizon, end)) {
      const n = notes[this.musicCursor++];
      const when = this.startCtxTime + n.time;
      if (when < this.ctx.currentTime - 0.02) continue;
      playMidiNote(this.ctx, this.buses.music, n, when, this.music.synths[n.trackIndex] || 'grandPiano', trackPan(n.trackIndex));
    }
  }

  private frame(): void {
    const t = this.currentTime;
    const end = this.loop?.b ?? this.duration;
    if (t >= end) {
      if (this.loop) {
        this.restartAt(this.loop.a);
        return;
      }
      this.pausedAt = this.duration;
      this.stopLoops();
      this.setState('ended');
      this.onFrame?.(this.world, this.duration);
      return;
    }
    // Physics follows the audio clock (one frame of look-ahead)
    if (this.world) {
      while (this.world.videoTime < t + 1 / REEL_FPS && this.world.videoTime < this.duration) {
        stepReel(this.world, this.settings);
      }
    }
    this.onFrame?.(this.world, t);
  }

  private resetWorld(t: number): void {
    if (!this.plan || !this.physics) return;
    const { world, settings } = createReelWorld(this.plan, this.physics, this.seed);
    this.world = world;
    this.settings = settings;
    world.eventBus.subscribe((ev) => {
      MidiDropMode.onCollision!(world, ev, settings);
      if (this.silent || !this.ctx || !this.buses || this.state !== 'playing') return;
      for (const s of this.rules.process(ev)) {
        const when = this.startCtxTime + s.time;
        if (when < this.ctx.currentTime - 0.03) continue;
        playSfx(this.ctx, this.buses[s.bus], s, Math.max(this.ctx.currentTime, when));
        this.onSfx?.(s);
      }
    });
    // Fast-forward silently to the seek point (deterministic)
    this.silent = true;
    while (world.videoTime < t - 1e-6) stepReel(world, settings);
    this.silent = false;
  }

  private setState(s: PlayerState): void {
    this.state = s;
    this.onState?.(s);
  }
}

function lowerBound(notes: PlannedNote[], t: number): number {
  let lo = 0;
  let hi = notes.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (notes[mid].time < t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
