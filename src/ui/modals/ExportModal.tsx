import React, { useState, useRef, useEffect } from 'react';
import { useStudioStore } from '../../store/useStudioStore';
import { VideoExporter, ExportProgress, checkGpu4KCapability } from '../../export/videoExporter';
import {
  X,
  Download,
  Film,
  Sparkles,
  AlertCircle,
  Image as ImageIcon,
  CheckCircle2,
  Zap,
  HardDrive,
  Share2,
  BatteryWarning,
  PauseCircle,
  Smartphone,
  Copy,
  Check,
  Layers,
  FileArchive,
  RotateCcw,
} from 'lucide-react';
import { checkBatteryStatus, BatteryInfo } from '../../platform/battery';
import { triggerHaptic } from '../../platform/haptics';
import { generateSocialCopy, getBatchVariation, createBatchZip, SocialCopy } from '../../export/creatorTools';
import { BUILTIN_THEMES } from '../../render/themes';
import { BUILTIN_MELODIES } from '../../audio/melodies';
import { AiService } from '../../ai/aiService';
import { generateSeoPack, SeoPack, formatSeoPackAsText } from '../../ai/seoEngine';
import { copyText } from '../../platform/clipboard';
import { SeoPackViewer } from '../components/SeoPackViewer';

export const ExportModal: React.FC = () => {
  const {
    isExportOpen,
    setExportOpen,
    currentModeId,
    modeSettings,
    seed,
    setSeed,
    visuals,
    overlays,
    setOverlays,
    audioSettings,
    customNotes,
    targetDuration,
    capabilities,
    showToast,
    setWhatNextOpen,
    setTrendsAdminOpen,
  } = useStudioStore();

  const [resolution, setResolution] = useState<'1080' | '1440' | '4k' | '4k_landscape'>('1080');
  const [fps, setFps] = useState<30 | 60>(60);
  const [duration, setDuration] = useState<number>(targetDuration);
  const [useDiskStreaming, setUseDiskStreaming] = useState<boolean>(true);

  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [exportFilename, setExportFilename] = useState<string>('');
  const [directSaved, setDirectSaved] = useState<boolean>(false);
  const [exportBlob, setExportBlob] = useState<Blob | null>(null);
  const [coverBlob, setCoverBlob] = useState<Blob | null>(null);
  const [canShareFile, setCanShareFile] = useState<boolean>(false);
  const [batteryInfo, setBatteryInfo] = useState<BatteryInfo | null>(null);
  const [currentSeoPack, setCurrentSeoPack] = useState<SeoPack | null>(null);

  // Batch Export state
  const [isBatchExporting, setIsBatchExporting] = useState(false);
  const [batchCount, setBatchCount] = useState<number>(10);
  const [batchCurrentIndex, setBatchCurrentIndex] = useState<number>(0);
  const [batchZipBlob, setBatchZipBlob] = useState<Blob | null>(null);
  const [batchZipUrl, setBatchZipUrl] = useState<string | null>(null);

  // Creator Tools state
  const [copiedField, setCopiedField] = useState<'title' | 'caption' | 'hashtags' | null>(null);

  const exporterRef = useRef<VideoExporter | null>(null);
  const gpuInfo = checkGpu4KCapability();
  const hasFilePicker = typeof window !== 'undefined' && 'showSaveFilePicker' in window;

  const socialCopy: SocialCopy = generateSocialCopy(currentModeId, overlays.titleText);

  // Detect file share capability and battery
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'canShare' in navigator) {
      try {
        const testFile = new File([new Uint8Array(8)], 'test.mp4', { type: 'video/mp4' });
        setCanShareFile(navigator.canShare({ files: [testFile] }));
      } catch {
        setCanShareFile(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isExportOpen) {
      setDuration(targetDuration);
      checkBatteryStatus().then(setBatteryInfo);

      const isMobile = capabilities?.isTouch || window.innerWidth < 768;
      const lowMem = capabilities?.deviceMemoryGB !== null && capabilities?.deviceMemoryGB !== undefined && capabilities.deviceMemoryGB < 4;
      if (isMobile || lowMem) {
        setResolution('1080');
      } else if (capabilities?.supportedCodecs.h264_4k30 || capabilities?.supportedCodecs.h264_4k60) {
        setResolution('4k');
      } else {
        setResolution('1080');
      }
    }
  }, [isExportOpen, targetDuration, capabilities]);

  if (!isExportOpen) return null;

  const applyPlatformPreset = (platform: 'tiktok' | 'reels' | 'shorts' | 'all') => {
    setResolution('1080');
    setFps(60);
    if (platform === 'shorts') setDuration(60);
    else if (platform === 'reels') setDuration(30);
    else if (platform === 'tiktok') setDuration(60);
    else setDuration(60);
    showToast(`applied ${platform} preset (1080x1920 60fps)`);
  };

  const handleCopy = async (field: 'title' | 'caption' | 'hashtags', text: string) => {
    const ok = await copyText(text);
    setCopiedField(field);
    triggerHaptic(10);
    showToast(ok ? `copied ${field} to clipboard` : `could not copy ${field} automatically`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleMakePart2 = () => {
    const nextPart = (overlays.partNumber || 1) + 1;
    const newSeed = Math.floor(Math.random() * 900000) + 1000;
    setOverlays({
      showPartSeries: true,
      partNumber: nextPart,
      titleText: `can it escape part ${nextPart}??`,
    });
    setSeed(newSeed);
    cleanupUrls();
    showToast(`setup part ${nextPart} with new seed #${newSeed}`);
  };

  const handleStartExport = async () => {
    let width = 1080;
    let height = 1920;
    if (resolution === '1440') {
      width = 1440;
      height = 2560;
    } else if (resolution === '4k') {
      width = 2160;
      height = 3840;
    } else if (resolution === '4k_landscape') {
      width = 3840;
      height = 2160;
    }

    const defaultFilename = `bounceforge_${currentModeId}_${seed}_${width}x${height}_${fps}fps.mp4`;

    let fileHandle: any = null;
    let didDirectStream = false;

    if (useDiskStreaming && hasFilePicker) {
      try {
        fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: defaultFilename,
          types: [{ description: 'MP4 Video', accept: { 'video/mp4': ['.mp4'] } }],
        });
        didDirectStream = true;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.warn('File picker fallback:', err);
      }
    }

    setIsExporting(true);
    setProgress({
      frame: 0,
      totalFrames: duration * fps,
      percent: 0,
      stage: 'video',
      etaSeconds: 60,
    });
    setDownloadUrl(null);
    setThumbnailUrl(null);
    setDirectSaved(didDirectStream);

    const exporter = new VideoExporter();
    exporterRef.current = exporter;

    try {
      const result = await exporter.exportVideo(
        {
          width,
          height,
          fps,
          duration,
          seed,
          modeId: currentModeId,
          modeSettings,
          visuals,
          overlays,
          audioSettings,
          customNotes,
          fileHandle,
        },
        (p) => setProgress(p)
      );

      setExportFilename(result.filename);
      if (result.thumbnailBlob) {
        setThumbnailUrl(URL.createObjectURL(result.thumbnailBlob));
        setCoverBlob(result.thumbnailBlob);
      }
      if (!didDirectStream) {
        setDownloadUrl(URL.createObjectURL(result.blob));
        setExportBlob(result.blob);
      }

      // Generate SEO Pack
      AiService.getInstance().generateSeo({
        modeName: currentModeId,
        modeId: currentModeId,
        category: 'fresh_drops',
        hookText: overlays.titleText || 'can it escape??',
        duration,
        seed,
        resolution: resolution === '4k' ? '4k' : '1080p',
      }).then(setCurrentSeoPack);

      triggerHaptic(20);
    } catch (err: any) {
      if (err.message !== 'Export cancelled') {
        console.error('Export error:', err);
        showToast('Export failed: ' + err.message);
      }
    } finally {
      setIsExporting(false);
      exporterRef.current = null;
    }
  };

  // Batch Export: "Make 10 Videos" with Variation Guard
  const handleStartBatchExport = async () => {
    setIsBatchExporting(true);
    setBatchZipBlob(null);
    setBatchZipUrl(null);
    setBatchCurrentIndex(0);

    const width = 1080;
    const height = 1920;
    const batchFps = 60;
    const batchDuration = duration;

    const usedSeeds = new Set<number>();
    const finishedItems: Array<{
      filename: string;
      blob: Blob;
      coverBlob?: Blob;
      coverFilename?: string;
      seoText?: string;
      seoFilename?: string;
    }> = [];

    const totalToMake = batchCount;

    for (let i = 0; i < totalToMake; i++) {
      setBatchCurrentIndex(i + 1);
      const variation = getBatchVariation(i, currentModeId, usedSeeds);

      const theme = BUILTIN_THEMES.find((t) => t.id === variation.themeId) || BUILTIN_THEMES[0];
      const melody = BUILTIN_MELODIES.find((m) => m.id === variation.melodyId) || BUILTIN_MELODIES[0];

      const itemVisuals = { ...visuals, themeId: theme.id };
      const itemOverlays = {
        ...overlays,
        titleText: variation.hookText,
        showPartSeries: true,
        partNumber: i + 1,
      };
      const itemAudio = { ...audioSettings, selectedMelodyId: melody.id };

      const exporter = new VideoExporter();
      exporterRef.current = exporter;

      try {
        const res = await exporter.exportVideo(
          {
            width,
            height,
            fps: batchFps,
            duration: batchDuration,
            seed: variation.seed,
            modeId: currentModeId,
            modeSettings,
            visuals: itemVisuals,
            overlays: itemOverlays,
            audioSettings: itemAudio,
          },
          (p) => setProgress(p)
        );

        // Generate unique SEO pack for this batch video
        const itemSeo = await AiService.getInstance().generateSeo({
          modeName: currentModeId,
          modeId: currentModeId,
          category: 'fresh_drops',
          hookText: variation.hookText,
          duration: batchDuration,
          seed: variation.seed,
          resolution: '1080p',
          variationIndex: i,
        });
        const seoTxt = formatSeoPackAsText(itemSeo, currentModeId);

        finishedItems.push({
          filename: `batch_${i + 1}_${res.filename}`,
          blob: res.blob,
          coverBlob: res.thumbnailBlob,
          coverFilename: `batch_${i + 1}_cover.png`,
          seoText: seoTxt,
          seoFilename: `batch_${i + 1}_seo.txt`,
        });
      } catch (err: any) {
        console.warn('Batch item failed:', err);
        break;
      }
    }

    if (finishedItems.length > 0) {
      showToast(`packaging ${finishedItems.length} videos into zip...`);
      const zipBlob = await createBatchZip(finishedItems);
      setBatchZipBlob(zipBlob);
      setBatchZipUrl(URL.createObjectURL(zipBlob));
      showToast(`batch export complete! (${finishedItems.length} videos ready)`);
    }

    setIsBatchExporting(false);
    exporterRef.current = null;
  };

  const handleShareVideo = async () => {
    if (!exportBlob) return;
    try {
      const file = new File([exportBlob], exportFilename || 'bounceforge_video.mp4', { type: 'video/mp4' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'BounceForge Viral Reel',
          text: 'Rendered with BounceForge Studio',
        });
        triggerHaptic(15);
      }
    } catch {}
  };

  const handleCancel = () => {
    if (exporterRef.current) {
      exporterRef.current.cancel();
    }
    setIsExporting(false);
    setIsBatchExporting(false);
  };

  const cleanupUrls = () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    if (thumbnailUrl) URL.revokeObjectURL(thumbnailUrl);
    if (batchZipUrl) URL.revokeObjectURL(batchZipUrl);
    setDownloadUrl(null);
    setThumbnailUrl(null);
    setExportBlob(null);
    setBatchZipBlob(null);
    setBatchZipUrl(null);
    setExportOpen(false);
  };

  const canDo4K = capabilities
    ? capabilities.supportedCodecs.h264_4k30 || capabilities.supportedCodecs.h264_4k60
    : gpuInfo.canDo4K;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-2xl bg-[#0a0c14] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh]">
        {/* Header */}
        <div className="h-16 px-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#CCFF00] via-cyan-400 to-purple-600 flex items-center justify-center text-black font-black shadow-md shadow-[#CCFF00]/20">
              <Film className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-wider">Creator Studio Video Exporter</h2>
              <p className="text-xs text-slate-400 lowercase">
                -14 LUFS integrated audio • viral retention timeline • 4K UHD
              </p>
            </div>
          </div>

          {!isExporting && !isBatchExporting && (
            <button
              onClick={cleanupUrls}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto text-left">
          {!isExporting && !isBatchExporting && !downloadUrl && !directSaved && !batchZipUrl && (
            <>
              {/* Battery Low Warning */}
              {batteryInfo?.lowBatteryWarning && (
                <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center gap-3 text-xs text-amber-200">
                  <BatteryWarning className="w-5 h-5 text-amber-400 shrink-0 animate-bounce" />
                  <div>
                    <span className="font-bold block">battery is below 20% ({batteryInfo.levelPercent}%) & not charging</span>
                    <span className="text-[11px] text-amber-300/80">rendering video drains power quickly. plug in ur charger!</span>
                  </div>
                </div>
              )}

              {/* Platform Presets Required by Part 4 */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-2">
                  Social Platform Presets (1080×1920 60fps)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => applyPlatformPreset('tiktok')}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-pink-500/20 border border-white/10 hover:border-pink-400 text-left transition-all"
                  >
                    <span className="text-xs font-bold text-pink-300 block">TikTok</span>
                    <span className="text-[10px] text-slate-400 block">60s viral hook</span>
                  </button>
                  <button
                    onClick={() => applyPlatformPreset('reels')}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-purple-500/20 border border-white/10 hover:border-purple-400 text-left transition-all"
                  >
                    <span className="text-xs font-bold text-purple-300 block">Reels</span>
                    <span className="text-[10px] text-slate-400 block">30s quick drop</span>
                  </button>
                  <button
                    onClick={() => applyPlatformPreset('shorts')}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-400 text-left transition-all"
                  >
                    <span className="text-xs font-bold text-red-300 block">Shorts</span>
                    <span className="text-[10px] text-slate-400 block">60s vertical #shorts</span>
                  </button>
                  <button
                    onClick={() => applyPlatformPreset('all')}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-400 text-left transition-all"
                  >
                    <span className="text-xs font-bold text-cyan-300 block">All Platforms</span>
                    <span className="text-[10px] text-slate-400 block">safest boundary</span>
                  </button>
                </div>
              </div>

              {/* Resolution Picker */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-2">
                  Resolution Options
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    disabled={!canDo4K}
                    onClick={() => canDo4K && setResolution('4k')}
                    className={`p-2.5 rounded-2xl border text-center transition-all ${
                      !canDo4K
                        ? 'opacity-40 cursor-not-allowed bg-white/5 border-white/5 text-slate-500'
                        : resolution === '4k'
                        ? 'bg-purple-500/20 border-purple-400 text-purple-200 shadow-md shadow-purple-500/20'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-extrabold block">4K UHD (9:16)</span>
                    <span className="text-[10px] text-slate-400 block">{canDo4K ? '2160 × 3840' : 'not supported'}</span>
                  </button>

                  <button
                    onClick={() => setResolution('1080')}
                    className={`p-2.5 rounded-2xl border text-center transition-all ${
                      resolution === '1080'
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-extrabold block">1080p FHD</span>
                    <span className="text-[10px] text-slate-400 block">1080 × 1920</span>
                  </button>

                  <button
                    onClick={() => setResolution('1440')}
                    className={`p-2.5 rounded-2xl border text-center transition-all ${
                      resolution === '1440'
                        ? 'bg-indigo-500/20 border-indigo-400 text-indigo-200'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-extrabold block">1440p 2K</span>
                    <span className="text-[10px] text-slate-400 block">1440 × 2560</span>
                  </button>

                  <button
                    onClick={() => setResolution('4k_landscape')}
                    className={`p-2.5 rounded-2xl border text-center transition-all ${
                      resolution === '4k_landscape'
                        ? 'bg-pink-500/20 border-pink-400 text-pink-200'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-extrabold block">Landscape 4K</span>
                    <span className="text-[10px] text-slate-400 block">3840 × 2160</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons: Single Export & Batch Export */}
              <div className="pt-2 space-y-2.5">
                <button
                  onClick={handleStartExport}
                  className="btn-3d-lime w-full py-3.5 rounded-2xl text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-lime-500/20"
                >
                  <Sparkles className="w-4 h-4 text-black" /> Export Single Video ({resolution === '4k' ? '4K' : resolution})
                </button>

                {/* Batch Export ("Make 10 Videos") */}
                <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-purple-200 flex items-center gap-1.5 uppercase">
                      <Layers className="w-4 h-4 text-purple-400" /> Batch Creator Engine
                    </span>
                    <p className="text-[10px] text-slate-400 lowercase mt-0.5">
                      variation guard enabled: 10 unique seeds, distinct themes & melody combinations.
                    </p>
                  </div>
                  <button
                    onClick={handleStartBatchExport}
                    className="btn-3d-purple px-5 py-2.5 rounded-xl text-white font-black text-xs uppercase tracking-wider shrink-0 shadow-md shadow-purple-500/30 flex items-center gap-1.5"
                  >
                    <FileArchive className="w-3.5 h-3.5" /> Make 10 Videos (ZIP)
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Progress State (Single or Batch) */}
          {(isExporting || isBatchExporting) && progress && (
            <div className="space-y-5 py-4 text-center">
              {progress.previewDataUrl && (
                <div className="w-32 aspect-[9/16] mx-auto rounded-xl overflow-hidden border border-white/20 shadow-xl bg-black">
                  <img src={progress.previewDataUrl} alt="Export preview" className="w-full h-full object-cover" />
                </div>
              )}

              {isBatchExporting && (
                <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-bold font-mono">
                  rendering batch video {batchCurrentIndex} of {batchCount}...
                </div>
              )}

              <div className="space-y-1">
                <h3 className="text-base font-bold text-white capitalize">
                  Stage: {progress.stage} ({progress.percent}%)
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Frame {progress.frame} / {progress.totalFrames} • ETA ~{progress.etaSeconds}s • -14 LUFS audio normalization
                </p>
              </div>

              <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#CCFF00] via-cyan-400 to-purple-500 transition-all duration-200"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>

              <button
                onClick={handleCancel}
                className="w-full py-2.5 rounded-xl bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30 font-bold text-xs uppercase tracking-wider transition-all"
              >
                Cancel Export
              </button>
            </div>
          )}

          {/* Export Complete (Single Video) */}
          {(downloadUrl || directSaved) && (
            <div className="space-y-5 py-2">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20 mb-2">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-white uppercase tracking-wider">Video Export Complete!</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{exportFilename}</p>
                <span className="text-[10px] text-cyan-300 font-mono block mt-0.5">
                  ✓ Normalized to -14.0 LUFS integrated • True Peak -1.0 dBTP
                </span>
              </div>

              {downloadUrl && (
                <div className="w-32 aspect-[9/16] mx-auto rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-black">
                  <video src={downloadUrl} controls autoPlay loop className="w-full h-full object-cover" />
                </div>
              )}

              {/* Full Platform SEO Pack (TikTok, Reels, Shorts) */}
              <SeoPackViewer
                seoPack={
                  currentSeoPack ||
                  generateSeoPack({
                    modeName: currentModeId,
                    modeId: currentModeId,
                    category: 'fresh_drops',
                    hookText: overlays.titleText || 'can it escape??',
                    duration,
                    seed,
                    resolution: resolution === '4k' ? '4k' : '1080p',
                  })
                }
                modeName={currentModeId}
                onOpenTrendsAdmin={() => setTrendsAdminOpen(true)}
                onApplyHookTweak={(tweak) => setOverlays({ titleText: tweak })}
              />

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                {downloadUrl && (
                  <a
                    href={downloadUrl}
                    download={exportFilename}
                    className="btn-3d-lime w-full py-3 rounded-2xl text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-lime-500/20"
                  >
                    <Download className="w-4 h-4" /> Download Video (MP4)
                  </a>
                )}

                {/* AI What Next Recommendation Trigger */}
                <button
                  type="button"
                  onClick={() => {
                    cleanupUrls();
                    setExportOpen(false);
                    setWhatNextOpen(true);
                  }}
                  className="btn-3d-cyan w-full py-2.5 rounded-xl text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-cyan-500/20"
                >
                  <Sparkles className="w-4 h-4 text-black" />
                  <span>what next? ai recommendations</span>
                </button>

                {thumbnailUrl && (
                  <a
                    href={thumbnailUrl}
                    download={`cover_${exportFilename.replace('.mp4', '.png')}`}
                    className="btn-3d-glass w-full py-2.5 rounded-xl text-slate-200 text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <ImageIcon className="w-4 h-4 text-cyan-400" /> Download Dramatic Cover Frame (1080×1920 PNG)
                  </a>
                )}

                {/* Make Part 2 Button */}
                <button
                  onClick={handleMakePart2}
                  className="btn-3d-pink w-full py-2.5 rounded-xl text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-pink-500/30"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Make Part {(overlays.partNumber || 1) + 1} (New Seed)
                </button>

                <button onClick={cleanupUrls} className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-white">
                  Done
                </button>
              </div>
            </div>
          )}

          {/* Batch Export Complete */}
          {batchZipUrl && (
            <div className="space-y-5 text-center py-4">
              <div className="w-14 h-14 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-400 flex items-center justify-center mx-auto shadow-xl shadow-purple-500/20">
                <FileArchive className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wider">Batch Export Ready!</h3>
                <p className="text-xs text-slate-400 mt-1 lowercase">
                  10 unique videos with distinct seeds, palettes, and cover frames packaged in 1 ZIP archive.
                </p>
              </div>

              <a
                href={batchZipUrl}
                download={`bounceforge_batch_${currentModeId}_10videos.zip`}
                className="btn-3d-purple w-full py-3.5 rounded-2xl text-white font-black text-sm uppercase tracking-wider shadow-xl shadow-purple-500/30 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Download All 10 Videos (.ZIP)
              </a>

              <button onClick={cleanupUrls} className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-white">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
