import {
  CandidateResult,
  SeedFinderRequest,
  createSeedSimulator,
  considerCandidate,
} from './simulate';

export class SeedFinderService {
  private worker: Worker | null = null;

  startSearch(
    request: SeedFinderRequest,
    onProgress: (searched: number, total: number, candidates: CandidateResult[]) => void,
    onComplete: (candidates: CandidateResult[]) => void
  ): () => void {
    try {
      this.worker = new Worker(
        new URL('./seedFinder.worker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (e) => {
        if (e.data.type === 'progress') {
          onProgress(e.data.searched, e.data.total, e.data.candidates);
        } else if (e.data.type === 'complete') {
          onComplete(e.data.candidates);
        }
      };

      this.worker.postMessage(request);

      return () => {
        if (this.worker) {
          this.worker.terminate();
          this.worker = null;
        }
      };
    } catch (e) {
      console.warn('Worker fallback to synchronous chunked runner:', e);
      return this.fallbackSearch(request, onProgress, onComplete);
    }
  }

  private fallbackSearch(
    req: SeedFinderRequest,
    onProgress: (searched: number, total: number, candidates: CandidateResult[]) => void,
    onComplete: (candidates: CandidateResult[]) => void
  ): () => void {
    let cancelled = false;
    const candidates: CandidateResult[] = [];
    const simulate = createSeedSimulator(req);

    let s = 0;
    const chunkSize = 10;

    const runChunk = () => {
      if (cancelled) return;
      const end = Math.min(s + chunkSize, req.totalSeedsToSearch);

      for (; s < end; s++) {
        const currentSeed = req.startSeed + s;
        considerCandidate(candidates, req, currentSeed, simulate(currentSeed));
      }

      onProgress(s, req.totalSeedsToSearch, candidates);

      if (s < req.totalSeedsToSearch) {
        setTimeout(runChunk, 0);
      } else {
        onComplete(candidates);
      }
    };

    runChunk();

    return () => {
      cancelled = true;
    };
  }
}
