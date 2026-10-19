import type { PhysicsWorld } from './world';
import type { ArcRing } from './types';
import { getTargetDuration } from './duration';

/**
 * Reel pacing helpers for event-driven modes, so the finale lands just before the
 * chosen reel length instead of whenever the physics happens to finish.
 * All timing is in video time, so it behaves the same at every reel speed.
 */

const originalGaps = new WeakMap<ArcRing, { size: number; count: number; spin: number }>();
const openedRings = new WeakSet<ArcRing>();

/**
 * Keeps escape rings closed until their time slot. Escapes are spread from `start` to `end`
 * (fractions of the reel), innermost ring first. Once a ring opens, its gap slowly widens
 * so a ball that keeps missing it still gets out on time.
 */
export function paceRingEscapes(
  world: PhysicsWorld,
  targetDuration: number,
  start: number = 0.15,
  end: number = 0.8
): void {
  const escapeRings = world.rings.filter((r) => r.shatterOnEscape);
  if (!escapeRings.length) return;

  for (const r of escapeRings) {
    if (!originalGaps.has(r)) originalGaps.set(r, { size: r.gapSize, count: Math.max(1, r.gapCount), spin: r.angularVelocity });
  }

  const remaining = escapeRings.filter((r) => !r.isShattered);
  if (!remaining.length) return;

  // Last-second guarantee: never end the reel with rings still standing
  if (world.videoTime >= targetDuration - 1.2) {
    for (const r of remaining) {
      r.isShattered = true;
      world.spawnRingShatter(r);
      world.eventBus.emit({
        id: Math.floor(Math.random() * 1000000),
        time: world.videoTime,
        type: 'escape',
        position: { x: r.centerX, y: r.centerY + r.radius },
        velocity: { x: 0, y: 0 },
        impulse: 400,
        ringId: r.id,
        ballId: world.balls[0]?.id ?? 0,
        noteIndex: 0,
      });
    }
    world.lastEventTime = world.videoTime;
    return;
  }

  const done = escapeRings.length - remaining.length;
  const slot = targetDuration * (start + (end - start) * ((done + 1) / escapeRings.length));
  const next = remaining.reduce((a, b) => (b.radius < a.radius ? b : a));

  for (const r of remaining) {
    const orig = originalGaps.get(r)!;
    if (r === next && world.videoTime >= slot) {
      if (!openedRings.has(r)) {
        // The ring was drawn closed until now, so place its gap just ahead of the ball
        // in the spin direction: a slow ring would otherwise take a full turn to line up
        openedRings.add(r);
        const ball = world.balls.find((b) => b.isAlive !== false);
        if (ball) {
          const ballAngle = Math.atan2(ball.y - r.centerY, ball.x - r.centerX);
          const dir = r.angularVelocity >= 0 ? 1 : -1;
          r.angle = ballAngle - dir * 0.6;
        }
      }
      // The longer the ball takes, the wider and faster the open ring gets
      const waited = world.videoTime - slot;
      r.gapCount = orig.count;
      r.gapSize = Math.min(Math.PI * 0.9, orig.size * (1 + Math.min(4, waited / 1.5)));
      r.angularVelocity = orig.spin * (1 + Math.min(1.5, waited / 3));
    } else {
      r.gapCount = 0;
    }
  }
}

/** Fraction of the reel elapsed (0..1), in video time. */
export function reelProgress(world: PhysicsWorld, targetDuration: number): number {
  return Math.min(1, world.videoTime / Math.max(1, targetDuration));
}

/**
 * The reel length in seconds. Prefers the length set on the world by the studio / exporter
 * (always current), since mode settings may carry a stale or missing targetDuration.
 */
export function reelLength(world: PhysicsWorld, settings?: Record<string, any>): number {
  return world.targetDuration && world.targetDuration > 0 ? world.targetDuration : getTargetDuration(settings);
}
