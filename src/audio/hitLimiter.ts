import type { CollisionEvent } from '../engine/types';

/**
 * Keeps collision audio musical when contacts are constant (balls riding a ring, rolling,
 * jittering in a pile): the same ball can't re-trigger the same kind of hit within 100ms,
 * and at most 8 hit sounds start in any 100ms window.
 * Decisions use the event's video time, so the live preview and the export render agree.
 * Scripted musical hits (3D marble melody notes, escapes/finales) always play.
 */
export class HitLimiter {
  private lastByKey = new Map<string, number>();
  private recent: number[] = [];
  private latest = -Infinity;

  static readonly PER_BALL_COOLDOWN = 0.1;
  static readonly WINDOW = 0.1;
  static readonly MAX_PER_WINDOW = 8;

  allow(ev: CollisionEvent): boolean {
    if (ev.extra?.marbleMelodyHit || ev.type === 'escape' || ev.type === 'finale') return true;
    const t = ev.time ?? 0;
    // Time jumped back (restart, seek, new export): start fresh
    if (t < this.latest - 0.25) this.reset();
    this.latest = Math.max(this.latest, t);
    const key = `${ev.ballId}:${ev.type}`;
    const last = this.lastByKey.get(key);
    if (last !== undefined && t - last >= 0 && t - last < HitLimiter.PER_BALL_COOLDOWN) return false;

    while (this.recent.length && this.recent[0] < t - HitLimiter.WINDOW) this.recent.shift();
    if (this.recent.length >= HitLimiter.MAX_PER_WINDOW) return false;

    this.lastByKey.set(key, t);
    this.recent.push(t);
    return true;
  }

  reset(): void {
    this.lastByKey.clear();
    this.recent = [];
    this.latest = -Infinity;
  }
}
