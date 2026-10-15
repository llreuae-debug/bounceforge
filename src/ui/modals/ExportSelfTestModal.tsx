import React, { useState, useRef } from 'react';
import { ExportSelfTester, TestResultRow, SelfTestProgress, TEST_PRESETS } from '../../export/exportSelfTest';
import { X, Play, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Cpu, Activity } from 'lucide-react';

interface ExportSelfTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportSelfTestModal: React.FC<ExportSelfTestModalProps> = ({ isOpen, onClose }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<SelfTestProgress | null>(null);
  const [results, setResults] = useState<TestResultRow[]>([]);
  const testerRef = useRef<ExportSelfTester | null>(null);

  if (!isOpen) return null;

  const handleStartTest = async () => {
    setIsRunning(true);
    setResults([]);
    const tester = new ExportSelfTester();
    testerRef.current = tester;

    try {
      const finalResults = await tester.runAllTests((p) => {
        setProgress(p);
        setResults(p.results);
      });
      setResults(finalResults);
    } catch (e) {
      console.error('Self test error:', e);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCancel = () => {
    if (testerRef.current) {
      testerRef.current.cancel();
    }
    setIsRunning(false);
  };

  const allPassed = results.length === TEST_PRESETS.length && results.every((r) => r.passed);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-3xl bg-[#0a0c14] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh]">
        {/* Header */}
        <div className="h-16 px-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#CCFF00] via-cyan-400 to-purple-600 flex items-center justify-center text-black font-black shadow-md shadow-[#CCFF00]/20">
              <Activity className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Export Engine Diagnostics &amp; Self-Test</h2>
              <p className="text-xs text-slate-400">
                Full verification of 1080p30, 1080p60, 1440p60, 4K30 and 4K60 WebCodecs pipelines
              </p>
            </div>
          </div>

          {!isRunning && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Diagnostic Info Banner */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-200 block">Automated Verification Protocol</span>
              <p className="text-xs text-slate-400 leading-relaxed">
                Renders a 5-second test clip for each resolution, then reads each file back with VideoDecoder and AudioContext to check exact dimensions (2160x3840 for 4K), frame rate (±0.01), AAC 48kHz audio duration, and frame non-blank integrity.
              </p>
            </div>
            {!isRunning && results.length === 0 && (
              <button
                onClick={handleStartTest}
                className="px-5 py-2.5 rounded-xl bg-[#CCFF00] hover:bg-[#b8e600] text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-[#CCFF00]/20 flex items-center gap-2 shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Run Test Suite
              </button>
            )}
            {isRunning && (
              <button
                onClick={handleCancel}
                className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-xs font-bold uppercase tracking-wider shrink-0"
              >
                Stop
              </button>
            )}
          </div>

          {/* Running Progress */}
          {isRunning && progress && (
            <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-cyan-300 font-mono">
                  Test {progress.currentIndex} of {progress.total}: {progress.currentPreset}
                </span>
                <span className="text-slate-400 text-[11px] animate-pulse">Running diagnostics...</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-[#CCFF00] transition-all duration-300"
                  style={{ width: `${(progress.currentIndex / progress.total) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-300 font-mono truncate">{progress.statusText}</p>
            </div>
          )}

          {/* Results Table */}
          {results.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Diagnostics Results Table
                </h3>
                {allPassed && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-black uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> All 5 Tests Passed 100%
                  </span>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 overflow-hidden bg-black/40">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-white/5 border-b border-white/10 text-slate-400 text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Profile</th>
                      <th className="py-3 px-3">Resolution</th>
                      <th className="py-3 px-3">FPS</th>
                      <th className="py-3 px-3">Duration</th>
                      <th className="py-3 px-3">Audio &amp; Codec</th>
                      <th className="py-3 px-3">Size</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {results.map((r) => (
                      <tr key={r.presetName} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                          {r.passed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                          )}
                          <span>{r.presetName}</span>
                        </td>
                        <td className="py-3 px-3 text-cyan-300">
                          {r.actualWidth || r.width}×{r.actualHeight || r.height}
                        </td>
                        <td className="py-3 px-3">{r.fps} fps</td>
                        <td className="py-3 px-3">
                          {r.actualDuration ? `${r.actualDuration.toFixed(2)}s` : '5.00s'}
                        </td>
                        <td className="py-3 px-3 text-slate-400 text-[11px]">
                          {r.codec ? `${r.codec} + aac` : 'h.264 + aac'}
                        </td>
                        <td className="py-3 px-3 text-slate-400">
                          {r.actualSizeMb ? `${r.actualSizeMb} MB` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-black">
                          {r.passed ? (
                            <span className="text-emerald-400">PASS ✓</span>
                          ) : (
                            <span className="text-red-400">FAIL ✗</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Any Failure Breakdown */}
              {results.some((r) => !r.passed) && (
                <div className="space-y-2 pt-2">
                  {results
                    .filter((r) => !r.passed)
                    .map((fail) => (
                      <div
                        key={fail.presetName}
                        className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 space-y-1"
                      >
                        <div className="font-bold flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                          <span>{fail.presetName} Diagnosis: {fail.errorReason}</span>
                        </div>
                        {fail.suggestedFix && (
                          <p className="text-slate-400 text-[11px]">
                            💡 Suggested Fix: {fail.suggestedFix}
                          </p>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Action Row */}
          {!isRunning && results.length > 0 && (
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handleStartTest}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-2 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Re-run Suite
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
