import React, { useState, useRef, useEffect } from 'react';
import { useStudioStore } from '../../store/useStudioStore';
import { SeedFinderService } from '../../search/seedFinderService';
import { CandidateResult } from '../../search/simulate';
import { getTargetWindow } from '../../engine/duration';
import { DurationPicker } from '../components/DurationPicker';
import { X, Search, Check, Flame, Clock, Play, RotateCcw } from 'lucide-react';

export const SeedFinderModal: React.FC = () => {
  const {
    isSeedFinderOpen,
    setSeedFinderOpen,
    currentModeId,
    modeSettings,
    setSeed,
    setIsPlaying,
    targetDuration,
    setTargetDuration,
  } = useStudioStore();

  const [targetMin, setTargetMin] = useState(getTargetWindow(targetDuration).min);
  const [targetMax, setTargetMax] = useState(getTargetWindow(targetDuration).max);
  const [totalSeeds, setTotalSeeds] = useState(500);

  const [isSearching, setIsSearching] = useState(false);
  const [progress, setProgress] = useState({ searched: 0, total: 500 });
  const [candidates, setCandidates] = useState<CandidateResult[]>([]);
  const cancelRef = useRef<(() => void) | null>(null);

  // Keep the search window in sync with the studio's target duration
  useEffect(() => {
    const w = getTargetWindow(targetDuration);
    setTargetMin(w.min);
    setTargetMax(w.max);
  }, [targetDuration, isSeedFinderOpen]);

  if (!isSeedFinderOpen) return null;

  const handleStartSearch = () => {
    setIsSearching(true);
    setProgress({ searched: 0, total: totalSeeds });
    setCandidates([]);

    const service = new SeedFinderService();
    const randomStartSeed = Math.floor(Math.random() * 800000) + 10000;

    const cancel = service.startSearch(
      {
        modeId: currentModeId,
        targetTimeMin: targetMin,
        targetTimeMax: targetMax,
        startSeed: randomStartSeed,
        totalSeedsToSearch: totalSeeds,
        settings: modeSettings,
      },
      (searched, total, cands) => {
        setProgress({ searched, total });
        setCandidates(cands);
      },
      (cands) => {
        setIsSearching(false);
        setCandidates(cands);
      }
    );

    cancelRef.current = cancel;
  };

  const handleStop = () => {
    if (cancelRef.current) {
      cancelRef.current();
      cancelRef.current = null;
    }
    setIsSearching(false);
  };

  const handleApplySeed = (seedNum: number) => {
    // Make the studio complete at the chosen window's end
    if (Math.round(targetMax) !== targetDuration) setTargetDuration(Math.round(targetMax));
    setSeed(seedNum);
    setIsPlaying(true);
    setSeedFinderOpen(false);
  };

  const progressPct = Math.round((progress.searched / Math.max(1, progress.total)) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#0c0e17] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-16 px-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Auto-Seed Finder</h2>
              <p className="text-xs text-slate-400">
                Headless physics worker • Finds exact {targetMin}s–{targetMax}s timing
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              handleStop();
              setSeedFinderOpen(false);
            }}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Configuration Body */}
        <div className="p-6 space-y-6">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-2">
              Animation Completes In
            </label>
            <DurationPicker
              value={targetDuration}
              onChange={setTargetDuration}
              disabled={isSearching}
              size="md"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Target Min Duration (Seconds)
              </label>
              <input
                type="number"
                step="0.5"
                value={targetMin}
                onChange={(e) => setTargetMin(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-cyan-300 font-mono outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Target Max Duration (Seconds)
              </label>
              <input
                type="number"
                step="0.5"
                value={targetMax}
                onChange={(e) => setTargetMax(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-cyan-300 font-mono outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Seeds to Scan</span>
              <span className="font-mono text-cyan-400">{totalSeeds} seeds</span>
            </div>
            <input
              type="range"
              min="100"
              max="2000"
              step="100"
              value={totalSeeds}
              onChange={(e) => setTotalSeeds(Number(e.target.value))}
              disabled={isSearching}
              className="w-full"
            />
          </div>

          {/* Action Trigger */}
          <div className="flex items-center gap-3">
            {!isSearching ? (
              <button
                onClick={handleStartSearch}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:opacity-90 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4" /> Start Headless Simulation Search
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="flex-1 py-3 rounded-xl bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2"
              >
                Stop Search
              </button>
            )}
          </div>

          {/* Progress Bar */}
          {isSearching && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono text-slate-400">
                <span>
                  Scanning seed {progress.searched} / {progress.total}...
                </span>
                <span className="text-cyan-400 font-bold">{progressPct}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-150"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Candidates Result List */}
          <div className="space-y-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Flame className="w-3.5 h-3.5 text-pink-400" />
              Top Viral Seed Candidates ({candidates.length} Found)
            </h3>

            {candidates.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-white/10 text-center text-xs text-slate-500">
                No candidates yet. Click &apos;Start Headless Simulation Search&apos; to find seeds that finish exactly between {targetMin}s and {targetMax}s.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {candidates.map((cand, idx) => (
                  <div
                    key={cand.seed}
                    className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between hover:border-pink-500/40 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-xl bg-pink-500/20 text-pink-300 font-mono text-xs font-black flex items-center justify-center border border-pink-500/40">
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold font-mono text-white">
                            Seed: {cand.seed}
                          </span>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                            {cand.engagementScore || 95}% retention
                          </span>
                        </div>
                        <span className="text-xs text-slate-300 flex items-center gap-1.5 mt-0.5 lowercase font-mono">
                          <Clock className="w-3 h-3 text-cyan-400" /> payoff: {cand.finishTime}s • {cand.nearMisses || 0} near-misses • {cand.bounces || 0} bounces
                        </span>
                      </div>
                    </div>


                    <button
                      onClick={() => handleApplySeed(cand.seed)}
                      className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <Play className="w-3 h-3 fill-current" /> Load in Studio
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
