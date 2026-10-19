import { PhysicsWorld } from '../engine/world';
import type { CollisionEvent } from '../engine/types';
import type { ReelPhysicsSettings, ReelPlan } from './types';
import { MidiDropMode, type ReelImpact } from './midiDropMode';

export const REEL_FPS = 60;

export interface ReelAlignment {
  total: number;
  landed: number;
  withinOneFrame: number;
  maxErrorMs: number;
  meanErrorMs: number;
}

export interface ReelDryRun {
  events: CollisionEvent[];
  impacts: ReelImpact[];
  alignment: ReelAlignment;
  collisions: number;
}

export function createReelWorld(plan: ReelPlan, physics: ReelPhysicsSettings, seed: number): {
  world: PhysicsWorld;
  settings: Record<string, any>;
} {
  const world = new PhysicsWorld(1080, 1920, seed);
  world.reelSpeed = physics.simSpeed;
  world.targetDuration = plan.duration;
  const settings = { reelPlan: plan, physics };
  MidiDropMode.setup(world, settings, seed);
  return { world, settings };
}

/** Advance one video frame (mode step + physics step). Export uses its own fps, preview 60. */
export function stepReel(world: PhysicsWorld, settings: Record<string, any>, dt: number = 1 / REEL_FPS): void {
  MidiDropMode.step!(world, dt * world.getEffectiveSpeed(), settings);
  world.step(dt);
}

/**
 * Runs the whole reel headless (deterministic for a given plan + physics + seed).
 * Gives the timeline its collision markers and measures how closely impacts land on the music.
 */
export function dryRunReel(
  plan: ReelPlan,
  physics: ReelPhysicsSettings,
  seed: number,
  until?: number,
  fps: number = REEL_FPS
): ReelDryRun {
  const { world, settings } = createReelWorld(plan, physics, seed);
  const events: CollisionEvent[] = [];
  world.eventBus.subscribe((ev) => {
    events.push(ev);
    MidiDropMode.onCollision!(world, ev, settings);
  });
  const end = Math.min(until ?? plan.duration, plan.duration);
  while (world.videoTime < end - 1e-6) stepReel(world, settings, 1 / fps);
  const impacts: ReelImpact[] = world.customState.impacts || [];
  return {
    events,
    impacts,
    alignment: measureAlignment(plan, impacts, end),
    collisions: events.filter((e) => !e.extra?.midiReel).length,
  };
}

export function measureAlignment(plan: ReelPlan, impacts: ReelImpact[], until: number): ReelAlignment {
  const due = plan.drops.filter((d) => !d.muted && d.time + (d.nudge || 0) < until - 0.05);
  const errors = impacts.map((i) => Math.abs(i.actual - i.planned) * 1000);
  const frameMs = 1000 / REEL_FPS;
  return {
    total: due.length,
    landed: impacts.length,
    withinOneFrame: errors.filter((e) => e <= frameMs).length,
    maxErrorMs: errors.length ? Math.max(...errors) : 0,
    meanErrorMs: errors.length ? errors.reduce((a, b) => a + b, 0) / errors.length : 0,
  };
}
