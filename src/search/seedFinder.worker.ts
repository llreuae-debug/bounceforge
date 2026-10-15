import {
  CandidateResult,
  SeedFinderRequest,
  createSeedSimulator,
  considerCandidate,
} from './simulate';

export type { CandidateResult, SeedFinderRequest };

self.onmessage = (e: MessageEvent<SeedFinderRequest>) => {
  const req = e.data;
  const candidates: CandidateResult[] = [];
  const simulate = createSeedSimulator(req);

  for (let s = 0; s < req.totalSeedsToSearch; s++) {
    const currentSeed = req.startSeed + s;

    // Fast Headless Simulation with Viral Retention Metrics
    const metrics = simulate(currentSeed);

    // Check candidate quality (keeps top 5 based on retention timeline score)
    considerCandidate(candidates, req, currentSeed, metrics);


    // Send periodic progress
    if (s % 25 === 0 || s === req.totalSeedsToSearch - 1) {
      self.postMessage({
        type: 'progress',
        searched: s + 1,
        total: req.totalSeedsToSearch,
        candidates,
      });
    }
  }

  self.postMessage({
    type: 'complete',
    candidates,
  });
};
