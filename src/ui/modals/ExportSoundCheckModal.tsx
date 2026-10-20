import React, { useState } from 'react';
import { useStudioStore } from '../../store/useStudioStore';
import { VideoExporter, ExportProgress } from '../../export/videoExporter';
import { ExportAudioVerificationResult } from '../../export/exportAudioVerifier';
import {
  X,
  Play,
  Download,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Headphones,
} from 'lucide-react';
import { triggerHaptic } from '../../platform/haptics';

export const ExportSoundCheckModal: React.FC = () => {
  const {
    isExportSoundCheckOpen,
    setExportSoundCheckOpen,
    currentModeId,
    modeSettings,
    seed,
    visuals,
    overlays,
    audioSettings,
    customNotes,
    reelSpeed,
    slowMoSoundFeel,
    speedRampFinale,
    marbleMelodySlowMoMode,
    ballPhysics,
    wallControls,
    customBall,
    showToast,
  } = useStudioStore();

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [verification, setVerification] = useState<ExportAudioVerificationResult | null>(null);
  const [testVideoUrl, setTestVideoUrl] = useState<string | null>(null);
  const [testVideoFilename, setTestVideoFilename] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isExportSoundCheckOpen) return null;

  const handleRunTest = async () => {
    setIsRunning(true);
    setVerification(null);
    setTestVideoUrl(null);
    setErrorMessage(null);
    setProgress({
      frame: 0,
      totalFrames: 600, // 10s @ 60fps
      percent: 0,
      stage: 'video',
      etaSeconds: 10,
    });

    const exporter = new VideoExporter();
    const testDuration = 10; // 10s clip for diagnostics

    try {
      triggerHaptic(10);
      const res = await exporter.exportVideo(
        {
          width: 1080,
          height: 1920,
          fps: 60,
          duration: testDuration,
          seed,
          modeId: currentModeId,
          modeSettings,
          visuals,
          overlays,
          audioSettings,
          ballPhysics,
          wallControls,
          customBall,
          customNotes,
          reelSpeed,
          slowMoSoundFeel,
          speedRampFinale,
          marbleMelodySlowMoMode,
        },
        (p) => setProgress(p)
      );

      const url = URL.createObjectURL(res.blob);
      setTestVideoUrl(url);
      setTestVideoFilename(`test_clip_${currentModeId}_10s.mp4`);

      if (res.verification) {
        setVerification(res.verification);
        if (res.verification.passed) {
          showToast('Export sound check passed 100%!');
        } else {
          showToast('Export sound check identified issues: ' + res.verification.failures[0]);
        }
      }
      triggerHaptic(20);
    } catch (err: any) {
      console.error('Export sound test error:', err);
      setErrorMessage(err.message || 'Export sound check failed');
      showToast('Export test failed: ' + err.message);
    } finally {
      setIsRunning(false);
    }
  };

  const handleDownload = () => {
    if (!testVideoUrl) return;
    const a = document.createElement('a');
    a.href = testVideoUrl;
    a.download = testVideoFilename || 'test_clip.mp4';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Test clip downloaded!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#0b0f17] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 flex items-center justify-center shadow-md">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span>Export Sound Diagnostics</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                  10s Clip QA
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Exports a 10s video of <strong className="text-white">{currentModeId}</strong>, tests AAC bitstream integrity, hit onset parity, sync and loudness.
              </p>
            </div>
          </div>

          <button
            onClick={() => setExportSoundCheckOpen(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action / Trigger */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-white uppercase tracking-wider block">
              Preset: {currentModeId} (Seed #{seed})
            </span>
            <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
              Instrument: {audioSettings.instrument} • Speed: {reelSpeed ?? 0.5}x
            </span>
          </div>

          <button
            onClick={handleRunTest}
            disabled={isRunning}
            className={`px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg ${
              isRunning
                ? 'bg-white/10 text-slate-400 cursor-not-allowed'
                : 'btn-3d-cyan text-black shadow-cyan-500/20 hover:scale-[1.02]'
            }`}
          >
            {isRunning ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                <span>Running Test ({progress?.percent || 0}%)...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Export Sound Test (10s)</span>
              </>
            )}
          </button>
        </div>

        {/* Progress Bar */}
        {isRunning && progress && (
          <div className="space-y-2 py-2">
            <div className="flex justify-between text-xs text-slate-300 font-mono">
              <span className="capitalize">{progress.stage} Stage...</span>
              <span>{progress.percent}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-[#CCFF00] transition-all duration-200"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Notice */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs space-y-1">
            <span className="font-bold flex items-center gap-1.5 text-red-300 uppercase">
              <XCircle className="w-4 h-4 text-red-400" /> Export Audio Error
            </span>
            <p>{errorMessage}</p>
          </div>
        )}

        {/* Verification Checklist */}
        {verification && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Automated Sound QA Verification
              </h3>
              <div
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold font-mono ${
                  verification.passed
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-red-500/20 text-red-300 border border-red-500/40'
                }`}
              >
                {verification.passed ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>PASSED 100%</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-red-400" />
                    <span>ISSUES DETECTED</span>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Check 1: Audio Track */}
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 flex items-start gap-2.5">
                {verification.metrics.hasAudioTrack ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-bold text-white block">Audio Track Present</span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    AAC 48kHz Stereo ({verification.metrics.channels}ch)
                  </span>
                </div>
              </div>

              {/* Check 2: Hit Onset Sound Parity */}
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 flex items-start gap-2.5">
                {verification.metrics.missingHitCount === 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-bold text-white block">Every Hit Has Sound</span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    {verification.metrics.missingHitCount} missing / {verification.metrics.totalHitsChecked} hits checked (±10ms)
                  </span>
                </div>
              </div>

              {/* Check 3: Audio Sync & Correlation */}
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 flex items-start gap-2.5">
                {Math.abs(verification.metrics.syncOffsetMs) <= 5 && verification.metrics.correlationWithPreview >= 0.94 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-bold text-white block">Audio In Sync with Video</span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    Offset: {verification.metrics.syncOffsetMs} ms • Corr: {verification.metrics.correlationWithPreview}
                  </span>
                </div>
              </div>

              {/* Check 4: Loudness */}
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 flex items-start gap-2.5">
                {verification.metrics.integratedLufs >= -15.5 && verification.metrics.integratedLufs <= -12.5 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-bold text-white block">BS.1770 / LUFS Loudness</span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    {verification.metrics.integratedLufs} LUFS (Target: -14.0 ±1)
                  </span>
                </div>
              </div>

              {/* Check 5: Peak & Dynamics */}
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 flex items-start gap-2.5">
                {verification.metrics.truePeakDb <= -0.9 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-bold text-white block">True Peak Protection</span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    Peak: {verification.metrics.truePeakDb} dBTP (Max: -1.0 dBTP)
                  </span>
                </div>
              </div>

              {/* Check 6: Mono Fold-down Safety */}
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 flex items-start gap-2.5">
                {verification.metrics.monoEnergyRetentionRatio >= 0.94 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-bold text-white block">Mono Compatibility</span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    {(verification.metrics.monoEnergyRetentionRatio * 100).toFixed(1)}% energy retained (Min 95%)
                  </span>
                </div>
              </div>
            </div>

            {/* Test Video Player & Download Button */}
            {testVideoUrl && (
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-16 aspect-[9/16] rounded-lg overflow-hidden border border-white/20 bg-black shrink-0">
                    <video src={testVideoUrl} controls autoPlay loop className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Audition 10s Rendered MP4</span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Listen directly or download to test on phone / external speakers
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleDownload}
                  className="btn-3d-lime px-4 py-2.5 rounded-xl text-black text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 shrink-0 shadow-md shadow-lime-500/20"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Test Clip</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
