import React, { useState, useEffect } from 'react';
import { Header } from '../Header';
import { useStudioStore } from '../../store/useStudioStore';
import { exportHistoryService, ExportedVideoRecord } from '../../export/exportHistoryService';
import { copyText } from '../../platform/clipboard';
import {
  Film,
  FolderOpen,
  Download,
  Copy,
  Trash2,
  CopyPlus,
  Play,
  Sparkles,
  ArrowRight,
  Clock,
  Calendar,
  Check,
  Video,
} from 'lucide-react';

export const MyVideosPage: React.FC = () => {
  const {
    userPresets,
    loadPreset,
    duplicatePreset,
    deletePreset,
    setRoute,
    setExportOpen,
    showToast,
  } = useStudioStore();

  const [activeTab, setActiveTab] = useState<'exports' | 'presets'>('exports');
  const [exportsList, setExportsList] = useState<ExportedVideoRecord[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    exportHistoryService.getAll().then(setExportsList);
  }, []);

  const handleDeleteExport = async (id: string) => {
    await exportHistoryService.deleteRecord(id);
    setExportsList((prev) => prev.filter((r) => r.id !== id));
    showToast('Export removed from history');
  };

  const handleCopySeo = async (item: ExportedVideoRecord) => {
    if (!item.seoPack) {
      showToast('No SEO pack saved for this video');
      return;
    }
    const text = `${item.seoPack.title}\n\n${item.seoPack.caption}\n\n${item.seoPack.hashtags.join(' ')}`;
    await copyText(text);
    setCopiedId(item.id);
    showToast('SEO Pack copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenPreset = async (preset: any) => {
    await loadPreset(preset);
    setRoute('studio');
  };

  const handleReExportPreset = async (preset: any) => {
    await loadPreset(preset);
    setRoute('studio');
    setTimeout(() => {
      setExportOpen(true);
    }, 250);
  };

  return (
    <div className="min-h-screen bg-[#050608] text-slate-100 flex flex-col font-sans select-none">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Title & Subtitle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Film className="w-7 h-7 text-[#00F0FF]" />
              <span>My Videos &amp; Creations</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Access your rendered video exports and saved customizable physics setups.
            </p>
          </div>

          <button
            onClick={() => setRoute('studio')}
            className="btn-3d-lime h-10 px-5 rounded-xl text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 self-start sm:self-auto"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Create New Reel</span>
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-white/5 pb-2">
          <button
            onClick={() => setActiveTab('exports')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'exports'
                ? 'btn-3d-cyan text-black'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Exported Reels ({exportsList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('presets')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'presets'
                ? 'btn-3d-cyan text-black'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Saved Setups ({userPresets.length})</span>
          </button>
        </div>

        {/* Content View */}
        {activeTab === 'exports' ? (
          <div>
            {exportsList.length === 0 ? (
              <div className="py-20 text-center space-y-4 max-w-md mx-auto">
                <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-500">
                  <Film className="w-8 h-8 text-cyan-400/60" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">No exported videos yet</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Make your first viral reel in 3 quick taps: Pick a reel, customize its look or sound, and click Export.
                  </p>
                </div>
                <button
                  onClick={() => setRoute('studio')}
                  className="btn-3d-lime px-6 py-2.5 rounded-xl text-black font-black text-xs uppercase tracking-wider inline-flex items-center gap-2"
                >
                  <span>Launch Studio</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {exportsList.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-cyan-400/30 transition-all space-y-3 group"
                  >
                    {/* Thumbnail / Header */}
                    <div className="aspect-[9/16] max-h-56 w-full rounded-xl bg-black/60 border border-white/5 overflow-hidden relative flex items-center justify-center">
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-500">
                          <Film className="w-8 h-8 text-cyan-400/40" />
                          <span className="text-[10px] font-mono uppercase tracking-wider">9:16 Video</span>
                        </div>
                      )}
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[10px] font-mono text-cyan-300 font-bold border border-cyan-500/20">
                        {item.duration}s · {item.fps}fps
                      </span>
                    </div>

                    {/* Metadata */}
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-white truncate" title={item.title}>
                        {item.title}
                      </h4>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {item.resolution}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
                      {item.downloadUrl && (
                        <a
                          href={item.downloadUrl}
                          download={`${item.title || 'bounceforge_reel'}.mp4`}
                          className="btn-3d-cyan py-2 rounded-xl text-black font-bold text-xs flex items-center justify-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </a>
                      )}

                      {item.seoPack && (
                        <button
                          onClick={() => handleCopySeo(item)}
                          className="btn-3d-glass py-2 rounded-xl text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5"
                          title="Copy SEO title, caption & tags"
                        >
                          {copiedId === item.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-300">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-cyan-400" />
                              <span>SEO Pack</span>
                            </>
                          )}
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteExport(item.id)}
                        className="col-span-2 py-1.5 rounded-xl hover:bg-rose-500/10 text-rose-400 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Record</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Presets List */
          <div>
            {userPresets.length === 0 ? (
              <div className="py-20 text-center space-y-4 max-w-md mx-auto">
                <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-500">
                  <FolderOpen className="w-8 h-8 text-purple-400/60" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">No saved setups yet</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Whenever you tweak a look, melody, or physics in the Studio, save it to access it anytime.
                  </p>
                </div>
                <button
                  onClick={() => setRoute('studio')}
                  className="btn-3d-lime px-6 py-2.5 rounded-xl text-black font-black text-xs uppercase tracking-wider inline-flex items-center gap-2"
                >
                  <span>Open Studio</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userPresets.map((preset) => (
                  <div
                    key={preset.id}
                    className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-purple-400/30 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-white truncate max-w-48" title={preset.name}>
                          {preset.name}
                        </h4>
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                          <span className="uppercase text-purple-300 font-bold">{preset.modeId}</span>
                          <span>·</span>
                          <span>{preset.targetDuration}s</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 text-slate-400 border border-white/5">
                        Seed {preset.seed}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
                      <button
                        onClick={() => handleOpenPreset(preset)}
                        className="btn-3d-cyan py-2 rounded-xl text-black font-bold text-xs flex items-center justify-center gap-1"
                        title="Open in studio"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Open</span>
                      </button>

                      <button
                        onClick={() => duplicatePreset(preset.id)}
                        className="btn-3d-glass py-2 rounded-xl text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1"
                        title="Duplicate setup with new seed"
                      >
                        <CopyPlus className="w-3 h-3 text-cyan-400" />
                        <span>Clone</span>
                      </button>

                      <button
                        onClick={() => handleReExportPreset(preset)}
                        className="btn-3d-lime py-2 rounded-xl text-black font-bold text-xs flex items-center justify-center gap-1"
                        title="Export directly"
                      >
                        <Download className="w-3 h-3 stroke-[2.5]" />
                        <span>Export</span>
                      </button>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => deletePreset(preset.id)}
                        className="text-xs text-rose-400/80 hover:text-rose-300 flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
