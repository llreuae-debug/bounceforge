/// <reference lib="webworker" />
import { dryRunReel, summarizeDryRun } from './reelSimulation';
import type { ReelPhysicsSettings, ReelPlan } from './types';

/** Runs the reel simulation off the main thread so the studio stays responsive while generating. */
self.onmessage = (e: MessageEvent<{ id: number; plan: ReelPlan; physics: ReelPhysicsSettings; seed: number }>) => {
  const { id, plan, physics, seed } = e.data;
  try {
    const d = dryRunReel(plan, physics, seed, undefined, undefined, (fraction) => self.postMessage({ id, progress: fraction }));
    const summary = summarizeDryRun(d);
    self.postMessage({ id, summary }, [summary.collisionTimes.buffer]);
  } catch (err: any) {
    self.postMessage({ id, error: err?.message || String(err) });
  }
};
