import { dryRunReel, summarizeDryRun, type ReelDrySummary } from './reelSimulation';
import type { ReelPhysicsSettings, ReelPlan } from './types';

let worker: Worker | null = null;
let workerBroken = false;
let nextId = 1;
let pending: { id: number; reject: (e: Error) => void } | null = null;

function getWorker(): Worker | null {
  if (workerBroken || typeof Worker === 'undefined') return null;
  if (!worker) {
    try {
      worker = new Worker(new URL('./dryRunWorker.ts', import.meta.url), { type: 'module' });
    } catch {
      workerBroken = true;
      return null;
    }
  }
  return worker;
}

/**
 * Simulates the reel in a Web Worker (falls back to the main thread).
 * A newer call cancels the previous one, so dragging a slider never queues up stale runs.
 */
export function simulateReel(
  plan: ReelPlan,
  physics: ReelPhysicsSettings,
  seed: number,
  onProgress?: (fraction: number) => void
): Promise<ReelDrySummary> {
  const w = getWorker();
  if (!w) return Promise.resolve(summarizeDryRun(dryRunReel(plan, physics, seed)));

  if (pending) {
    pending.reject(new DOMException('Superseded by a newer generation', 'AbortError') as any);
    worker?.terminate();
    worker = null;
  }
  const active = getWorker()!;
  const id = nextId++;
  return new Promise<ReelDrySummary>((resolve, reject) => {
    pending = { id, reject };
    const finish = () => {
      if (pending?.id === id) pending = null;
    };
    active.onmessage = (e) => {
      const m = e.data;
      if (m.id !== id) return;
      if (m.progress !== undefined) return onProgress?.(m.progress);
      finish();
      if (m.error) reject(new Error(m.error));
      else resolve(m.summary);
    };
    active.onerror = (e) => {
      // Worker failed to load (e.g. blocked): run inline instead
      e.preventDefault?.();
      finish();
      workerBroken = true;
      worker?.terminate();
      worker = null;
      try {
        resolve(summarizeDryRun(dryRunReel(plan, physics, seed)));
      } catch (err) {
        reject(err as Error);
      }
    };
    active.postMessage({ id, plan, physics, seed });
  });
}
