import { PhysicsWorld } from '../engine/world';
import { getModeById } from '../modes/registry';
import { withTargetDuration } from '../engine/duration';

export interface SeedFinderRequest {
  modeId: string;
  targetTimeMin: number;
  targetTimeMax: number;
  startSeed: number;
  totalSeedsToSearch: number;
  settings: Record<string, any>;
}

export interface CandidateResult {
  seed: number;
  finishTime: number;
  score: number; // distance from target midpoint
}

const FIXED_DT = 1 / 60; // 60fps frame steps (with internal 240Hz substeps)

/**
 * Builds a reusable headless simulator for a request. Returns a function that runs one
 * seed and reports when the mode naturally finished (or `maxSimDuration` if it never did).
 *
 * The simulation stops as soon as it passes `targetTimeMax`, so short targets
 * (15s / 30s) are proportionally faster to search than 60s ones.
 */
export function createSeedSimulator(req: SeedFinderRequest): (seed: number) => number {
  // Mode finish checks see the target duration so time-based modes end exactly on it.
  const settings = withTargetDuration(req.settings, req.targetTimeMax);
  const maxSimDuration = req.targetTimeMax + 0.5;
  const maxFrames = Math.ceil(maxSimDuration / FIXED_DT);


  const mode = getModeById(req.modeId);
  const world = new PhysicsWorld(1080, 1920, req.startSeed);
  return (seed) => {
    mode.setup(world, req.settings, seed);
    for (let frame = 0; frame < maxFrames; frame++) {
      if (mode.step) mode.step(world, FIXED_DT, req.settings);
      world.step(FIXED_DT);
      if (world.isFinished || mode.isFinished(world, settings)) return world.time;
    }
    return maxSimDuration;
  };
}

/** Inserts a result into the top-5 candidate list if it lands in the target window. */
export function considerCandidate(
  candidates: CandidateResult[],
  req: SeedFinderRequest,
  seed: number,
  finishTime: number
): void {
  // Frame-stepped time can overshoot the target by a fraction of a frame; clamp it.
  if (finishTime > req.targetTimeMax && finishTime <= req.targetTimeMax + FIXED_DT * 1.5) {
    finishTime = req.targetTimeMax;
  }
  if (finishTime < req.targetTimeMin || finishTime > req.targetTimeMax) return;
  const targetMid = (req.targetTimeMin + req.targetTimeMax) / 2;
  candidates.push({
    seed,
    finishTime: Number(finishTime.toFixed(2)),
    score: Math.abs(finishTime - targetMid),
  });
  candidates.sort((a, b) => a.score - b.score);
  if (candidates.length > 5) candidates.pop();
}
