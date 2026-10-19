import React, { useState, useMemo } from 'react';
import { useStudioStore } from '../../store/useStudioStore';
import { CURATED_TEMPLATES, CATEGORIES, CuratedTemplate, TemplateCategory } from '../../templates/curatedTemplates';
import { Search, Sparkles, Flame, Clock, Play, X, Music, Shield, Gem, Smile, Moon, Swords, Sliders } from 'lucide-react';
import { triggerHaptic } from '../../platform/haptics';

export interface ModeGalleryProps {
  className?: string;
  onClose?: () => void;
  onSelectTemplate?: (template: CuratedTemplate) => void;
  onOpenSettings?: () => void;
}

export const ModeGallery: React.FC<ModeGalleryProps> = ({ className, onClose, onSelectTemplate, onOpenSettings }) => {
  const {
    currentModeId,
    setMode,
    modeSettings,
    updateModeSetting,
    applyPreset,
    surpriseMe,
    setReelSpeed,
    reelSpeed,
    setSettingsOpen,
    showToast,
  } = useStudioStore();

  const [activeCategory, setActiveCategory] = useState<'top_picks' | TemplateCategory>('top_picks');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('top_pastel_toybox');
  const [activeVariant, setActiveVariant] = useState<'calm' | 'viral' | 'wild'>('viral');

  const filteredTemplates = useMemo(() => {
    return CURATED_TEMPLATES.filter((tpl) => {
      const matchesSearch =
        tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpl.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpl.hook.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (activeCategory === 'top_picks') {
        return tpl.isTopPick;
      }
      return tpl.category === activeCategory;
    });
  }, [activeCategory, searchQuery]);

  const handleSelect = (tpl: CuratedTemplate) => {
    triggerHaptic(12);
    setSelectedTemplateId(tpl.id);
    setMode(tpl.modeId);

    // Apply base settings and default viral variant
    if (tpl.presetSettings) {
      applyPreset({
        ...tpl.presetSettings,
        targetDuration: tpl.durationSeconds,
      });
    }

    if (tpl.variants?.viral) {
      applyPreset(tpl.variants.viral);
      setActiveVariant('viral');
    }

    if (onSelectTemplate) {
      onSelectTemplate(tpl);
    }
    showToast(`Loaded reel: ${tpl.name}`);
  };

  const handleVariantChange = (variant: 'calm' | 'viral' | 'wild', tpl: CuratedTemplate) => {
    triggerHaptic(10);
    setActiveVariant(variant);
    const variantSettings = tpl.variants[variant];
    if (variantSettings) {
      applyPreset(variantSettings);
    }
    if (variant === 'calm') {
      setReelSpeed(0.5);
    } else if (variant === 'viral') {
      setReelSpeed(0.5);
    } else {
      setReelSpeed(1.0);
    }
    showToast(`Switched to ${variant.toUpperCase()} variant`);
  };

  const getCategoryIcon = (catId: TemplateCategory) => {
    switch (catId) {
      case 'marble_music':
        return <Music className="w-3.5 h-3.5" />;
      case 'satisfying_escape':
        return <Sparkles className="w-3.5 h-3.5" />;
      case 'battles':
        return <Swords className="w-3.5 h-3.5" />;
      case 'asmr_glass':
        return <Gem className="w-3.5 h-3.5" />;
      case 'squeaky_fun':
        return <Smile className="w-3.5 h-3.5" />;
      case 'calm_relaxing':
        return <Moon className="w-3.5 h-3.5" />;
    }
  };

  return (
    <aside className={className || "w-80 sm:w-96 h-[calc(100vh-4rem)] border-r border-white/10 bg-[#07090e]/95 backdrop-blur-md flex flex-col select-none shrink-0 font-sans"}>
      {/* 1. Header & Quick Actions */}
      <div className="p-3.5 sm:p-4 border-b border-white/10 space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <h2 className="text-xs font-black uppercase tracking-wider text-white">
              Step 1 · Pick a Reel
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                triggerHaptic(10);
                if (onOpenSettings) onOpenSettings();
                else setSettingsOpen(true);
              }}
              className="btn-3d-lime h-7 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-black flex items-center gap-1 shadow-sm shadow-lime-500/20"
              title="Open Settings & Customize panel"
            >
              <Sliders className="w-3 h-3" />
              <span>Settings</span>
            </button>

            <button
              onClick={surpriseMe}
              className="btn-3d-pink h-7 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-white flex items-center gap-1.5 shadow-sm shadow-pink-500/20"
              title="Surprise me with a random viral combination"
            >
              <Sparkles className="w-3 h-3 text-white animate-spin-slow" />
              <span>Surprise Me</span>
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                title="Close gallery"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search templates, music, themes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Filter Tabs: Top Picks + 6 simple categories */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
          <button
            onClick={() => setActiveCategory('top_picks')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
              activeCategory === 'top_picks'
                ? 'btn-3d-cyan text-black font-extrabold shadow-sm shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span>Top Picks (12)</span>
          </button>

          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                activeCategory === cat.id
                  ? 'btn-3d-lime text-black font-extrabold shadow-sm shadow-lime-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {getCategoryIcon(cat.id)}
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Scrollable Template Cards */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-3.5 space-y-2.5">
        {filteredTemplates.length === 0 ? (
          <div className="py-12 text-center space-y-2 text-slate-400">
            <Sparkles className="w-6 h-6 text-slate-500 mx-auto" />
            <p className="text-xs">No matching templates found.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('top_picks');
              }}
              className="text-xs text-cyan-400 hover:underline font-bold"
            >
              Reset search
            </button>
          </div>
        ) : (
          filteredTemplates.map((tpl) => {
            const isSelected = selectedTemplateId === tpl.id || currentModeId === tpl.modeId;

            return (
              <div
                key={tpl.id}
                onClick={() => handleSelect(tpl)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                  isSelected
                    ? 'bg-gradient-to-br from-cyan-500/15 via-blue-500/10 to-transparent border-cyan-400 shadow-lg shadow-cyan-500/10'
                    : 'bg-white/[0.03] border-white/5 hover:border-white/20 hover:bg-white/[0.06]'
                }`}
              >
                {/* Background Hue Glow */}
                <div
                  className={`absolute -right-8 -top-8 w-24 h-24 rounded-full blur-2xl opacity-20 pointer-events-none bg-gradient-to-br ${tpl.previewGradient}`}
                />

                <div className="flex items-start justify-between gap-2 mb-1.5 relative z-10">
                  <div className="space-y-0.5">
                    <h3 className="font-extrabold text-xs text-white group-hover:text-cyan-300 transition-colors flex items-center gap-1.5">
                      <span>{tpl.name}</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 leading-snug line-clamp-1">
                      {tpl.description}
                    </p>
                  </div>

                  {/* Single Clean Badge (Max 1 per card!) */}
                  {tpl.badge && (
                    <span
                      className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded-full shrink-0 ${
                        tpl.badge === 'HOT'
                          ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-sm shadow-pink-500/30'
                          : 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-black'
                      }`}
                    >
                      {tpl.badge}
                    </span>
                  )}
                </div>

                {/* Duration & Tag Footer */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
                  <span className="flex items-center gap-1 text-slate-300">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    {tpl.durationSeconds}s runtime
                  </span>

                  <span className="text-[9px] uppercase font-mono tracking-wider text-slate-400">
                    {tpl.category.replace('_', ' ')}
                  </span>
                </div>

                {/* Variant Switcher & Customize CTA (Revealed ONLY after selecting the card) */}
                {isSelected && (
                  <div
                    className="mt-2.5 pt-2 border-t border-cyan-400/20 flex flex-col gap-2 animate-fadeIn"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider">
                        Variant:
                      </span>
                      <div className="flex items-center gap-1">
                        {(['calm', 'viral', 'wild'] as const).map((v) => (
                          <button
                            key={v}
                            onClick={() => handleVariantChange(v, tpl)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                              activeVariant === v
                                ? 'bg-cyan-400 text-black shadow-sm shadow-cyan-400/30'
                                : 'bg-white/5 text-slate-400 hover:text-white'
                            }`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHaptic(12);
                        if (onOpenSettings) {
                          onOpenSettings();
                        } else {
                          setSettingsOpen(true);
                        }
                      }}
                      className="btn-3d-lime w-full py-2 px-3 rounded-xl text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-lime-500/25 active:scale-95 transition-all mt-0.5"
                    >
                      <Sliders className="w-4 h-4 stroke-[2.5]" />
                      <span>Configure Settings &amp; Customize 👉</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
