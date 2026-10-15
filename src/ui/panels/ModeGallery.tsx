import React, { useState } from 'react';
import { useStudioStore } from '../../store/useStudioStore';
import { ALL_MODES } from '../../modes/registry';
import { Search, Flame, Cpu, Sparkles, X } from 'lucide-react';

export interface ModeGalleryProps {
  className?: string;
  onClose?: () => void;
}

export const ModeGallery: React.FC<ModeGalleryProps> = ({ className, onClose }) => {
  const { currentModeId, setMode, applyPreset, surpriseMe } = useStudioStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState<'all' | 'core' | 'exclusive'>('all');

  const activeModesList = ALL_MODES;

  const filteredModes = activeModesList.filter((m: any) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat =
      category === 'all' ||
      (category === 'exclusive' && m.category === 'exclusive') ||
      (category === 'core' && m.category === 'core');
    return matchesSearch && matchesCat;
  });

  return (
    <aside className={className || "w-80 h-[calc(100vh-4rem)] border-r border-white/10 bg-[#07090e]/85 backdrop-blur-md flex flex-col select-none shrink-0"}>
      {/* Header & Search */}
      <div className="p-4 border-b border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            2D Simulation Modes
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-300 border border-cyan-400/30">
              {activeModesList.length} MODES
            </span>
            {onClose && (
              <button
                onClick={onClose}
                className="btn-3d-glass p-1.5 rounded-xl text-slate-300 hover:text-white text-xs font-bold"
                title="Close modes"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Surprise Me 3D Tactile Button */}
        <button
          onClick={surpriseMe}
          className="btn-3d-purple w-full py-2.5 px-3 rounded-xl text-xs font-black text-white flex items-center justify-center gap-2 transition-all uppercase tracking-wider"
          title="Randomize combination of mode, balls, obstacles, colors, melody and physics!"
        >
          <Sparkles className="w-4 h-4 text-white animate-pulse" />
          <span>Surprise Me</span>
        </button>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search modes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
          />
        </div>

        {/* Filter Pills - 3D Buttons */}
        <div className="flex gap-1.5 pt-1">
          <button
            onClick={() => setCategory('all')}
            className={`flex-1 py-1.5 text-[11px] font-bold rounded-xl transition-all ${
              category === 'all'
                ? 'btn-3d-cyan text-black'
                : 'btn-3d-glass text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({activeModesList.length})
          </button>
          <button
            onClick={() => setCategory('core')}
            className={`flex-1 py-1.5 text-[11px] font-bold rounded-xl transition-all ${
              category === 'core'
                ? 'btn-3d-lime text-black'
                : 'btn-3d-glass text-slate-400 hover:text-slate-200'
            }`}
          >
            Core (11)
          </button>
          <button
            onClick={() => setCategory('exclusive')}
            className={`flex-1 py-1.5 text-[11px] font-bold rounded-xl transition-all ${
              category === 'exclusive'
                ? 'btn-3d-purple text-white'
                : 'btn-3d-glass text-slate-400 hover:text-slate-200'
            }`}
          >
            Advanced (10)
          </button>
        </div>
      </div>

      {/* Mode Cards List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filteredModes.map((mode: any) => {
          const isActive = mode.id === currentModeId;

          return (
            <div
              key={mode.id}
              onClick={() => {
                setMode(mode.id);
              }}
              className={`p-3 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden ${
                isActive
                  ? 'bg-gradient-to-br from-cyan-500/15 via-indigo-500/10 to-transparent border-cyan-400/50 shadow-lg shadow-cyan-400/10'
                  : 'bg-white/[0.03] border-white/5 hover:border-white/20 hover:bg-white/[0.06]'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-bold text-xs text-white group-hover:text-cyan-300 transition-colors flex items-center gap-1.5">
                  {mode.name}
                </h3>
                <div className="flex items-center gap-1.5 shrink-0">
                  {mode.id === 'classic' || mode.id === 'accumulation' || mode.id === 'web_expansion' || mode.id === 'spiral' ? (
                    <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-sm shadow-pink-500/20">
                      POPULAR
                    </span>
                  ) : mode.id === 'fragment_expansion' ? (
                    <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-sm shadow-purple-500/20">
                      EXCLUSIF
                    </span>
                  ) : (
                    <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded tracking-wider bg-white/5 text-slate-400">
                      {mode.category}
                    </span>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed mb-2 line-clamp-2">
                {mode.description}
              </p>

              {/* Presets */}
              <div className="flex flex-wrap gap-1">
                {mode.presets.map((preset: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMode(mode.id);
                      applyPreset(preset.settings);
                    }}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-200 border border-white/5 hover:border-cyan-500/30 transition-all font-medium"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
