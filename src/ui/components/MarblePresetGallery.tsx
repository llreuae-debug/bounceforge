import React, { useState, useEffect, useMemo } from 'react';
import { useStudioStore } from '../../store/useStudioStore';
import { MARBLE_MELODY_PRESETS, PASTEL_MARBLE_MUSIC_RUN_PRESETS, MarbleMelodyPresetDefinition } from '../../marble3d/presets';
import { triggerHaptic } from '../../platform/haptics';
import {
  Sparkles,
  Search,
  Heart,
  Disc,
  X,
} from 'lucide-react';

interface MarblePresetGalleryProps {
  onSelectPreset?: (preset: MarbleMelodyPresetDefinition, variant: 'chill' | 'viral' | 'insane') => void;
  compact?: boolean;
}

const FAVORITES_STORAGE_KEY = 'bounceforge_favorite_worlds';

export const MarblePresetGallery: React.FC<MarblePresetGalleryProps> = ({
  onSelectPreset,
  compact = false,
}) => {
  const { modeSettings, updateModeSetting, setSeed, setTargetDuration, showToast, setMode, currentModeId } = useStudioStore();

  const currentMelodyId = modeSettings.melodyId || 'toybox_run';

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<'ALL' | 'A' | 'B' | 'C' | 'D' | 'E'>('ALL');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('ALL');
  const [selectedMood, setSelectedMood] = useState<string>('ALL');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Per-card selected variant ('chill' | 'viral' | 'insane'), default 'viral'
  const [cardVariants, setCardVariants] = useState<Record<string, 'chill' | 'viral' | 'insane'>>({});

  // Hover preview state
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

  // Load favorites from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch {
      // Fallback
    }
  }, []);

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    triggerHaptic(10);
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Fallback
      }
      return next;
    });
  };

  const handleVariantChange = (e: React.MouseEvent, presetId: string, variant: 'chill' | 'viral' | 'insane') => {
    e.stopPropagation();
    triggerHaptic(10);
    setCardVariants((prev) => ({ ...prev, [presetId]: variant }));
  };

  const handleSelectWorld = (preset: MarbleMelodyPresetDefinition) => {
    triggerHaptic(20);
    if (currentModeId !== 'marble_melody_3d') {
      setMode('marble_melody_3d');
    }
    const variant = cardVariants[preset.id] || 'viral';
    const variantCfg = preset.variants[variant];

    setSeed(preset.baseSeed + (variant === 'insane' ? 99 : 0));
    updateModeSetting('melodyId', preset.melodyId);

    // Apply world layer configuration
    updateModeSetting('world', preset.world);
    updateModeSetting('wallBackground', preset.world.wallSurface);
    updateModeSetting('marbleStyle', preset.world.marbleType);

    // Apply variant configuration
    Object.keys(variantCfg).forEach((k) => {
      updateModeSetting(k, (variantCfg as any)[k]);
    });

    const chosenDuration = variantCfg.targetDuration || (variant === 'viral' ? 56 : 60);
    setTargetDuration(chosenDuration);
    updateModeSetting('targetDuration', chosenDuration);

    showToast(`Loaded #${preset.presetNumber.toString().padStart(2, '0')} ${preset.name} (${variant}) · ${chosenDuration}s Reel`);

    if (onSelectPreset) {
      onSelectPreset(preset, variant);
    }
  };

  const allPresets = useMemo(() => [...PASTEL_MARBLE_MUSIC_RUN_PRESETS, ...MARBLE_MELODY_PRESETS], []);

  const handleSurpriseMe = () => {
    triggerHaptic(30);
    const randomIndex = Math.floor(Math.random() * allPresets.length);
    const randomPreset = allPresets[randomIndex];
    handleSelectWorld(randomPreset);
  };

  // Filtered Presets
  const filteredPresets = useMemo(() => {
    return allPresets.filter((p) => {
      if (selectedGroup !== 'ALL' && p.group !== selectedGroup) return false;
      if (favoritesOnly && !favorites.includes(p.id)) return false;

      if (selectedMaterial !== 'ALL') {
        const matMatch = p.materialTags.some((t) => t.toLowerCase().includes(selectedMaterial.toLowerCase())) ||
          p.world.objectMaterial.toLowerCase().includes(selectedMaterial.toLowerCase());
        if (!matMatch) return false;
      }

      if (selectedMood !== 'ALL' && p.mood !== selectedMood) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesSong = p.melodyName.toLowerCase().includes(q);
        const matchesTag = p.materialTags.some((t) => t.toLowerCase().includes(q));
        if (!matchesName && !matchesSong && !matchesTag) return false;
      }

      return true;
    });
  }, [selectedGroup, selectedMaterial, selectedMood, favoritesOnly, favorites, searchQuery]);

  return (
    <div className="space-y-3.5 select-none text-xs">
      {/* Top Header Bar: Title + Surprise Me */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-slate-100 flex items-center gap-1.5 text-sm">
            <Disc className="w-4 h-4 text-lime-400" />
            50 Unique Worlds Gallery
          </span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-lime-400/20 text-lime-300 border border-lime-400/30">
            {filteredPresets.length}/50
          </span>
        </div>

        <button
          onClick={handleSurpriseMe}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-cyan-500/20 hover:from-pink-500/30 hover:to-cyan-500/30 border border-white/20 text-white font-bold transition-all active:scale-95 shadow-sm"
          title="Pick a random world + viral reel duration"
        >
          <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
          <span>Surprise Me</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search world, classical melody, material (crystal, ice, gold)..."
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-8 py-2 text-xs text-white placeholder-slate-400 outline-none focus:border-lime-400/60 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Group Tabs (All, A, B, C, D, E) */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] font-bold scrollbar-none">
        {[
          { id: 'ALL', label: 'All 50 Worlds' },
          { id: 'A', label: 'A: Classical' },
          { id: 'B', label: 'B: Classics 2' },
          { id: 'C', label: 'C: Traditional' },
          { id: 'D', label: 'D: Festive' },
          { id: 'E', label: 'E: Original Vibes' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              triggerHaptic(5);
              setSelectedGroup(tab.id as any);
            }}
            className={`px-2.5 py-1 rounded-lg border whitespace-nowrap transition-all ${
              selectedGroup === tab.id
                ? 'bg-lime-400/20 border-lime-400 text-lime-300 shadow-sm'
                : 'bg-white/[0.03] border-white/5 text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Material & Mood Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px]">
        {/* Favorites Filter */}
        <button
          onClick={() => {
            triggerHaptic(5);
            setFavoritesOnly(!favoritesOnly);
          }}
          className={`px-2 py-0.5 rounded-md border flex items-center gap-1 transition-all ${
            favoritesOnly
              ? 'bg-pink-500/20 border-pink-400 text-pink-300 font-bold'
              : 'bg-white/[0.02] border-white/5 text-slate-400 hover:text-white'
          }`}
        >
          <Heart className={`w-3 h-3 ${favoritesOnly ? 'fill-current text-pink-400' : ''}`} />
          <span>Favorites</span>
        </button>

        {/* Material categories */}
        {['ALL', 'crystal', 'glass', 'metal', 'ice', 'candy', 'stone'].map((mat) => (
          <button
            key={mat}
            onClick={() => {
              triggerHaptic(5);
              setSelectedMaterial(mat);
            }}
            className={`px-2 py-0.5 rounded-md border capitalize whitespace-nowrap transition-all ${
              selectedMaterial === mat
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                : 'bg-white/[0.02] border-white/5 text-slate-400 hover:text-white'
            }`}
          >
            {mat === 'ALL' ? 'All Materials' : mat}
          </button>
        ))}

        {/* Mood categories */}
        {['ALL', 'calm', 'epic', 'cute', 'festive', 'night'].map((mood) => (
          <button
            key={mood}
            onClick={() => {
              triggerHaptic(5);
              setSelectedMood(mood);
            }}
            className={`px-2 py-0.5 rounded-md border capitalize whitespace-nowrap transition-all ${
              selectedMood === mood
                ? 'bg-purple-500/20 border-purple-400 text-purple-300 font-bold'
                : 'bg-white/[0.02] border-white/5 text-slate-400 hover:text-white'
            }`}
          >
            {mood === 'ALL' ? 'All Moods' : mood}
          </button>
        ))}
      </div>

      {/* 50 Presets Grid (2 cols on phone, 3 on desktop) */}
      <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'} gap-2.5 max-h-[520px] overflow-y-auto pr-1`}>
        {filteredPresets.map((preset) => {
          const isSelected = currentMelodyId === preset.melodyId;
          const currentVariant = cardVariants[preset.id] || 'viral';
          const isFav = favorites.includes(preset.id);

          return (
            <div
              key={preset.id}
              onClick={() => handleSelectWorld(preset)}
              onMouseEnter={() => setHoveredCardId(preset.id)}
              onMouseLeave={() => setHoveredCardId(null)}
              className={`group relative rounded-2xl border transition-all cursor-pointer overflow-hidden p-3 flex flex-col justify-between ${
                isSelected
                  ? 'bg-white/[0.08] border-lime-400 shadow-[0_0_24px_rgba(204,255,0,0.22)]'
                  : 'bg-white/[0.03] border-white/10 hover:border-white/25 hover:bg-white/[0.05]'
              }`}
            >
              {/* Top Accent Strip */}
              <div
                className="absolute top-0 left-0 right-0 h-1 transition-opacity opacity-75 group-hover:opacity-100"
                style={{ backgroundColor: preset.accentColor }}
              />

              {/* World Card Header: Number + Favorites Heart */}
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-[10px] font-black text-slate-400 flex items-center gap-1">
                  #{preset.presetNumber.toString().padStart(2, '0')}
                  {isSelected && (
                    <span className="flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[8.5px] font-extrabold bg-lime-400 text-black uppercase tracking-wider shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                      Playing
                    </span>
                  )}
                </span>

                <button
                  onClick={(e) => toggleFavorite(e, preset.id)}
                  className="p-1 rounded-full text-slate-400 hover:text-pink-400 transition-colors"
                  title="Favorite World"
                >
                  <Heart
                    className={`w-3.5 h-3.5 transition-transform active:scale-125 ${
                      isFav ? 'fill-pink-500 text-pink-500' : 'hover:text-white'
                    }`}
                  />
                </button>
              </div>

              {/* World Title & Melody Name */}
              <div className="space-y-0.5 mb-2">
                <h4 className="font-extrabold text-[12px] text-white group-hover:text-lime-300 transition-colors capitalize leading-tight">
                  {preset.name}
                </h4>
                <p className="text-[10px] text-slate-400 truncate">{preset.melodyName}</p>
              </div>

              {/* Material Tags */}
              <div className="flex flex-wrap gap-1 mb-2.5">
                {preset.materialTags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="px-1.5 py-0.5 rounded text-[8.5px] font-bold bg-white/5 text-slate-300 border border-white/5 capitalize"
                  >
                    {tag.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>

              {/* Card Footer: Chill / Viral / Insane segmented switch */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-between bg-black/40 p-1 rounded-xl border border-white/10"
              >
                {(['chill', 'viral', 'insane'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={(e) => handleVariantChange(e, preset.id, v)}
                    className={`flex-1 py-0.5 text-[8.5px] font-extrabold rounded-lg capitalize transition-all ${
                      currentVariant === v
                        ? 'bg-lime-400 text-black shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {v === 'viral' ? 'Viral (56s)' : v}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {filteredPresets.length === 0 && (
        <div className="text-center py-8 text-slate-400 text-xs">
          No worlds found matching your criteria. Try resetting filters.
        </div>
      )}
    </div>
  );
};
