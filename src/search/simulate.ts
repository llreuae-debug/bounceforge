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
  reelSpeed?: number;
}

export interface CandidateResult {
  seed: number;
  finishTime: number;
  score: number; // lower is better
  nearMisses: number;
  leadChanges: number;
  bounces: number;
  engagementScore: number; // 0-100 retention rating
}

const FIXED_DT = 1 / 60; // 60fps frame steps (with internal 240Hz substeps)

export interface SimulationResultMetrics {
  finishTime: number;
  nearMisses: number;
  leadChanges: number;
  bounces: number;
  maxEventGap: number;
}

/**
 * Builds a reusable headless simulator scoring seeds against the 60s viral retention timeline.
 */
export function createSeedSimulator(req: SeedFinderRequest): (seed: number) => SimulationResultMetrics {
  const settings = withTargetDuration(req.settings, req.targetTimeMax);
  const maxSimDuration = req.targetTimeMax + 0.5;
  const maxFrames = Math.ceil(maxSimDuration / FIXED_DT);

  const mode = getModeById(req.modeId);
  const world = new PhysicsWorld(1080, 1920, req.startSeed);
  world.reelSpeed = req.reelSpeed !== undefined ? req.reelSpeed : 0.5;
  world.targetDuration = req.targetTimeMax;

  if (mode.onCollision) {
    const onCol = mode.onCollision;
    world.eventBus.subscribe((ev) => {
      onCol(world, ev, req.settings);
    });
  }

  return (seed) => {
    world.reset(seed);
    mode.setup(world, req.settings, seed);
    let lastBounceTime = 0;
    let maxEventGap = 0;
    let leadChanges = 0;
    let lastLeader: string | undefined = undefined;

    for (let frame = 0; frame < maxFrames; frame++) {
      const effectiveSpeed = world.getEffectiveSpeed();
      if (mode.step) mode.step(world, FIXED_DT * effectiveSpeed, req.settings);
      world.step(FIXED_DT);

      // Track event gap pacing in video time
      if (world.bounces > 0) {
        const gap = world.videoTime - lastBounceTime;
        if (gap > maxEventGap) maxEventGap = gap;
        lastBounceTime = world.videoTime;
      }

      // Track lead changes for race/battle modes
      if (world.balls.length > 1) {
        const currentLeader = world.balls.reduce((prev, curr) => (curr.y < prev.y ? curr : prev)).label;
        if (currentLeader && currentLeader !== lastLeader) {
          if (lastLeader !== undefined) leadChanges++;
          lastLeader = currentLeader;
        }
      }

      if (world.isFinished || mode.isFinished(world, settings)) {
        return {
          finishTime: world.videoTime,
          nearMisses: world.customState.nearMisses || 0,
          leadChanges,
          bounces: world.bounces,
          maxEventGap,
        };
      }
    }

    return {
      finishTime: maxSimDuration,
      nearMisses: world.customState.nearMisses || 0,
      leadChanges,
      bounces: world.bounces,
      maxEventGap,
    };
  };
}

/**
 * Inserts a result into the top-5 candidate list, ranked by viral retention timeline score.
 */
export function considerCandidate(
  candidates: CandidateResult[],
  req: SeedFinderRequest,
  seed: number,
  metrics: SimulationResultMetrics
): void {
  let finishTime = metrics.finishTime;
  if (finishTime > req.targetTimeMax && finishTime <= req.targetTimeMax + FIXED_DT * 1.5) {
    finishTime = req.targetTimeMax;
  }
  if (finishTime < req.targetTimeMin || finishTime > req.targetTimeMax) return;

  const targetMid = (req.targetTimeMin + req.targetTimeMax) / 2;
  const timeDiff = Math.abs(finishTime - targetMid);

  // Retention Engine Scoring:
  // - Payoff window: rewards finishing close to target (55s-59s)
  // - Event spacing: penalizes stretches > 8s without excitement
  // - Near misses: rewards tense teases
  // - Lead changes: rewards unpredictability
  const gapPenalty = Math.max(0, metrics.maxEventGap - 8) * 2.0;
  const nearMissReward = Math.min(10, metrics.nearMisses) * 0.4;
  const leadChangeReward = Math.min(8, metrics.leadChanges) * 0.3;

  const score = Number((timeDiff * 1.5 + gapPenalty - nearMissReward - leadChangeReward).toFixed(3));

  // Compute 0-100 retention rating
  const engagementScore = Math.max(
    50,
    Math.min(99, Math.round(98 - timeDiff * 3 - gapPenalty * 2 + nearMissReward * 2 + leadChangeReward * 2))
  );

  candidates.push({
    seed,
    finishTime: Number(finishTime.toFixed(2)),
    score,
    nearMisses: metrics.nearMisses,
    leadChanges: metrics.leadChanges,
    bounces: metrics.bounces,
    engagementScore,
  });

  candidates.sort((a, b) => a.score - b.score);
  if (candidates.length > 5) candidates.pop();
}
