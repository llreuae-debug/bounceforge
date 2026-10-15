import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Calendar,
  Layers,
  BarChart2,
  Download,
  Check,
  Plus,
  Play,
  Share2,
} from 'lucide-react';
import { useStudioStore } from '../../store/useStudioStore';
import { AiService, WhatNextCard, PerformanceLogEntry } from '../../ai/aiService';
import { BUILTIN_THEMES } from '../../render/themes';
import { getModeById } from '../../modes/registry';

interface WhatNextModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WhatNextModal: React.FC<WhatNextModalProps> = ({ isOpen, onClose }) => {
  const {
    currentModeId,
    setMode,
    setSeed,
    setVisuals,
    setOverlays,
    overlays,
    visuals,
    showToast,
  } = useStudioStore();

  const [cards, setCards] = useState<WhatNextCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAi, setIsAi] = useState(false);
  const [activeTab, setActiveTab] = useState<'suggestions' | 'series' | 'performance'>('suggestions');
  const [appliedId, setAppliedId] = useState<string | null>(null);

  // Performance log state
  const [perfLogs, setPerfLogs] = useState<PerformanceLogEntry[]>([]);
  const [showLogForm, setShowLogForm] = useState(false);
  const [logPlatform, setLogPlatform] = useState<'tiktok' | 'reels' | 'shorts'>('tiktok');
  const [logViews, setLogViews] = useState('');
  const [logLikes, setLogLikes] = useState('');
  const [logComments, setLogComments] = useState('');
  const [logWatch, setLogWatch] = useState('75');

  useEffect(() => {
    if (isOpen) {
      loadSuggestions();
      AiService.getInstance().getPerformanceLogs().then(setPerfLogs);
    }
  }, [isOpen, currentModeId]);

  const loadSuggestions = async () => {
    setLoading(true);
    const res = await AiService.getInstance().getWhatNextSuggestions(currentModeId);
    setCards(res.suggestions);
    setIsAi(res.isAi);
    setLoading(false);
  };

  if (!isOpen) return null;

  const handleApplyCard = (card: WhatNextCard) => {
    if (card.modeId) {
      setMode(card.modeId);
    }
    if (card.seed) {
      setSeed(card.seed);
    }
    if (card.themeId) {
      const t = BUILTIN_THEMES.find((theme) => theme.id === card.themeId);
      if (t) setVisuals({ themeId: t.id });
    }
    if (card.hookText) {
      setOverlays({
        titleText: card.hookText,
        showTitle: true,
        showPartSeries: card.partNumber !== undefined,
        partNumber: card.partNumber || 1,
      });
    }

    setAppliedId(card.id);
    showToast(`loaded "${card.title}" into studio`);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  const handleApplyDay = (day: { modeId: string; title: string; hook: string }) => {
    setMode(day.modeId);
    setOverlays({ titleText: day.hook, showTitle: true });
    showToast(`loaded ${day.title} into studio`);
    onClose();
  };

  const handleSavePerfLog = async (e: React.FormEvent) => {
    e.preventDefault();
    await AiService.getInstance().addPerformanceLog({
      modeId: currentModeId,
      hookText: overlays.titleText || 'viral physics escape',
      duration: 60,
      platform: logPlatform,
      views: Number(logViews) || 0,
      likes: Number(logLikes) || 0,
      comments: Number(logComments) || 0,
      shares: 0,
      avgWatchPercent: Number(logWatch) || 70,
    });

    const updated = await AiService.getInstance().getPerformanceLogs();
    setPerfLogs(updated);
    setShowLogForm(false);
    setLogViews('');
    setLogLikes('');
    setLogComments('');
    showToast('performance log saved on device');
  };

  const seriesPlanCard = cards.find((c) => c.type === 'series_plan');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="w-full max-w-2xl bg-[#0a0d14] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-pink-500/20 flex items-center justify-center text-pink-400">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                What Next? AI Studio Navigator
                {isAi ? (
                  <span className="px-1.5 py-0.5 rounded-full bg-pink-500/20 text-pink-400 text-[9px] font-mono border border-pink-500/30">
                    ai active
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-[9px] font-mono border border-cyan-500/30">
                    offline suggestions
                  </span>
                )}
              </h2>
              <span className="text-[10px] text-slate-400">Data-backed creator ideas to maximize completion &amp; comments</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-Tabs */}
        <div className="flex border-b border-white/10 px-4 gap-2 bg-white/[0.01]">
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`py-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'suggestions'
                ? 'border-pink-400 text-pink-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3 h-3" /> Next Actions ({cards.length})
          </button>
          <button
            onClick={() => setActiveTab('series')}
            className={`py-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'series'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3 h-3" /> 7-Day Series Plan
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`py-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'performance'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart2 className="w-3 h-3" /> Log &amp; Results ({perfLogs.length})
          </button>
        </div>

        {/* Tab 1: AI Suggestions */}
        {activeTab === 'suggestions' && (
          <div className="p-4 overflow-y-auto space-y-3 flex-1">
            {loading ? (
              <div className="space-y-3 py-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {cards
                  .filter((c) => c.type !== 'series_plan')
                  .map((card) => {
                    const isApplied = appliedId === card.id;
                    return (
                      <div
                        key={card.id}
                        className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-pink-500/40 transition-all flex flex-col justify-between group"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-mono font-bold text-pink-400 tracking-wider">
                              {card.type.replace('_', ' ')}
                            </span>
                            {card.modeId && (
                              <span className="text-[10px] font-mono text-slate-500">
                                {card.modeId}
                              </span>
                            )}
                          </div>
                          <h3 className="text-xs font-bold text-white group-hover:text-pink-300 transition-colors">
                            {card.title}
                          </h3>
                          <p className="text-[11px] text-slate-400 leading-relaxed">{card.reason}</p>
                          {card.hookText && (
                            <div className="p-1.5 rounded-lg bg-black/40 border border-white/5 text-[10px] font-mono text-cyan-300 truncate">
                              "{card.hookText}"
                            </div>
                          )}
                        </div>

                        <div className="pt-3 mt-2 border-t border-white/5 flex items-center justify-end">
                          <button
                            onClick={() => handleApplyCard(card)}
                            className={`btn-3d px-3 py-1.5 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition-all ${
                              isApplied
                                ? 'bg-emerald-500 text-black'
                                : 'btn-3d-pink text-black'
                            }`}
                          >
                            {isApplied ? (
                              <>
                                <Check className="w-3.5 h-3.5" /> applied
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3 fill-current" /> load it
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: 7-Day Series Plan */}
        {activeTab === 'series' && (
          <div className="p-4 overflow-y-auto space-y-3 flex-1">
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300 flex items-center justify-between">
              <span>7-Day Episodic Rollout • Post 1 video per day at optimal audience windows</span>
              <button
                onClick={() => {
                  const markdown = seriesPlanCard?.seriesDays
                    ?.map((d) => `### Day ${d.day}: ${d.title}\n- Mode: ${d.modeId}\n- Hook: "${d.hook}"\n- Peak Time: ${d.time}\n`)
                    .join('\n');
                  const blob = new Blob([markdown || ''], { type: 'text/markdown' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'bounceforge_7_day_viral_plan.md';
                  a.click();
                  showToast('series plan exported as markdown checklist');
                }}
                className="btn-3d-glass px-2.5 py-1 rounded-lg text-xs font-bold text-white flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> export checklist
              </button>
            </div>

            <div className="space-y-2">
              {seriesPlanCard?.seriesDays?.map((day) => (
                <div
                  key={day.day}
                  className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3 hover:border-cyan-500/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-white/10 text-cyan-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      {day.day}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-white">{day.title}</h4>
                      <p className="text-[11px] text-slate-400 font-mono">
                        "{day.hook}" • <span className="text-pink-400">{day.time}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleApplyDay(day)}
                    className="btn-3d-glass px-3 py-1.5 rounded-xl text-xs font-bold text-cyan-300 flex items-center gap-1"
                  >
                    load day {day.day}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Performance Log */}
        {activeTab === 'performance' && (
          <div className="p-4 overflow-y-auto space-y-4 flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white">Private Local Performance Tracker</h3>
                <span className="text-[10px] text-slate-400">Stored on your device only (IndexedDB). Feeds into AI recommendations.</span>
              </div>
              <button
                onClick={() => setShowLogForm(!showLogForm)}
                className="btn-3d-lime px-3 py-1.5 rounded-xl text-black font-black text-xs uppercase flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> log video results
              </button>
            </div>

            {showLogForm && (
              <form onSubmit={handleSavePerfLog} className="p-4 rounded-xl bg-black/60 border border-white/15 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Platform</label>
                    <select
                      value={logPlatform}
                      onChange={(e) => setLogPlatform(e.target.value as any)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg p-1.5 text-xs text-white"
                    >
                      <option value="tiktok">TikTok</option>
                      <option value="reels">Reels</option>
                      <option value="shorts">Shorts</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Views</label>
                    <input
                      type="number"
                      value={logViews}
                      onChange={(e) => setLogViews(e.target.value)}
                      placeholder="e.g. 45000"
                      className="w-full bg-white/5 border border-white/10 rounded-lg p-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Likes</label>
                    <input
                      type="number"
                      value={logLikes}
                      onChange={(e) => setLogLikes(e.target.value)}
                      placeholder="e.g. 3200"
                      className="w-full bg-white/5 border border-white/10 rounded-lg p-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Comments</label>
                    <input
                      type="number"
                      value={logComments}
                      onChange={(e) => setLogComments(e.target.value)}
                      placeholder="e.g. 180"
                      className="w-full bg-white/5 border border-white/10 rounded-lg p-1.5 text-xs text-white"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowLogForm(false)}
                    className="btn-3d-glass px-3 py-1 rounded-lg text-xs text-slate-300"
                  >
                    cancel
                  </button>
                  <button type="submit" className="btn-3d-lime px-4 py-1 rounded-lg text-black font-black text-xs uppercase">
                    save log
                  </button>
                </div>
              </form>
            )}

            {perfLogs.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs font-mono">
                no logged results yet. enter view metrics after posting to tune your recommendations.
              </div>
            ) : (
              <div className="space-y-2">
                {perfLogs.map((l) => (
                  <div
                    key={l.id}
                    className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-white uppercase text-[11px] block">{l.modeId}</span>
                      <span className="text-[10px] text-slate-400 font-mono">"{l.hookText}"</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-[11px]">
                      <span className="text-cyan-300">{l.views.toLocaleString()} views</span>
                      <span className="text-pink-300">{l.likes.toLocaleString()} likes</span>
                      <span className="text-slate-400">{l.platform}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="p-3 border-t border-white/10 flex items-center justify-between bg-white/[0.02]">
          <span className="text-[10px] font-mono text-slate-500">
            BounceForge Growth AI • 100% Deterministic Physics Synced
          </span>
          <button
            onClick={loadSuggestions}
            className="btn-3d-glass px-3 py-1 rounded-lg text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" /> refresh suggestions
          </button>
        </div>
      </div>
    </div>
  );
};
