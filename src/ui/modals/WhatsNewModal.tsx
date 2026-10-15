import React from 'react';
import { useStudioStore } from '../../store/useStudioStore';
import { Sparkles, X, Play, Music, Flame, Zap, ShieldCheck, Share2 } from 'lucide-react';
import { ALL_MODES } from '../../modes/registry';

interface WhatsNewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WhatsNewModal: React.FC<WhatsNewModalProps> = ({ isOpen, onClose }) => {
  const { setMode, setRoute, applyPreset, showToast } = useStudioStore();

  if (!isOpen) return null;

  const freshModes = ALL_MODES.filter((m) => m.category === 'fresh_drops');

  const handleTryMode = (modeId: string) => {
    setMode(modeId);
    const mode = ALL_MODES.find((m) => m.id === modeId);
    if (mode && mode.presets && mode.presets[0]) {
      applyPreset(mode.presets[0].settings);
    }
    setRoute('studio');
    onClose();
    showToast(`loaded mode: ${mode?.name || modeId}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#07090e] border border-pink-500/40 rounded-3xl shadow-2xl shadow-pink-950/30 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-start justify-between gap-4 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-transparent">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-pink-500 text-white shadow-md shadow-pink-500/40 animate-pulse">
                NEW RELEASE
              </span>
              <span className="text-[11px] font-mono text-cyan-300">v2.5 · BOUNCEFORGE VIRAL UPDATE</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-pink-400" />
              what's new: engagement + asmr + 20 new modes
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl lowercase">
              every "coming soon" item is now fully unlocked. 20 engagement-first modes, asmr on by default, -14 lufs social loudness, and batch creator tools.
            </p>
          </div>

          <button
            onClick={onClose}
            className="btn-3d-glass p-2 rounded-2xl text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feature Highlights Grid */}
        <div className="p-4 sm:p-6 border-b border-white/5 bg-white/[0.02] grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-left">
            <Music className="w-4 h-4 text-pink-400 mb-1.5" />
            <h4 className="text-xs font-bold text-white uppercase">ASMR by default</h4>
            <p className="text-[10px] text-slate-400 lowercase mt-0.5">tuned procedural ASMR layer + headphones mode</p>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-left">
            <Flame className="w-4 h-4 text-orange-400 mb-1.5" />
            <h4 className="text-xs font-bold text-white uppercase">Retention engine</h4>
            <p className="text-[10px] text-slate-400 lowercase mt-0.5">50+ hooks, prediction cards, live tension bars</p>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-left">
            <ShieldCheck className="w-4 h-4 text-cyan-400 mb-1.5" />
            <h4 className="text-xs font-bold text-white uppercase">-14 LUFS audio</h4>
            <p className="text-[10px] text-slate-400 lowercase mt-0.5">integrated loudness normalized for reels & tiktok</p>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-left">
            <Share2 className="w-4 h-4 text-purple-400 mb-1.5" />
            <h4 className="text-xs font-bold text-white uppercase">Batch creator</h4>
            <p className="text-[10px] text-slate-400 lowercase mt-0.5">export 10 videos with unique seeds, cover frame & copy</p>
          </div>
        </div>

        {/* 20 New Modes List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              20 new fresh drops modes ({freshModes.length})
            </h3>
            <span className="text-[10px] font-mono text-pink-400">zero locked · all playable</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {freshModes.map((mode, idx) => (
              <div
                key={mode.id}
                className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-pink-500/50 hover:bg-white/[0.05] transition-all flex flex-col justify-between text-left group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-black uppercase text-white group-hover:text-pink-300 transition-colors flex items-center gap-1.5">
                      <span className="font-mono text-[10px] text-pink-400">N{(idx + 1).toString().padStart(2, '0')}</span>
                      {mode.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-pink-500/20 text-pink-300 border border-pink-500/40">
                      NEW
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                    {mode.description}
                  </p>
                </div>

                <div className="pt-3 mt-2 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-cyan-400 lowercase">
                    asmr: {mode.asmrProfile || 'crystal'}
                  </span>
                  <button
                    onClick={() => handleTryMode(mode.id)}
                    className="btn-3d-cyan px-3 py-1 rounded-xl text-black font-black text-[10px] uppercase tracking-wider flex items-center gap-1 hover:scale-105 transition-all"
                  >
                    <Play className="w-3 h-3 fill-current" /> try it
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-[#06080d] flex items-center justify-between">
          <span className="text-xs font-mono text-slate-400">
            BounceForge Pure Physics & ASMR Sound Studio
          </span>
          <button
            onClick={onClose}
            className="btn-3d-glass px-5 py-2 rounded-xl text-white font-bold text-xs uppercase tracking-wider"
          >
            got it
          </button>
        </div>
      </div>
    </div>
  );
};
