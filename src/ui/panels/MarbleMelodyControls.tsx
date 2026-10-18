import React, { useRef, useState } from 'react';
import { useStudioStore } from '../../store/useStudioStore';
import {
  MarbleMelodyConfig,
  PathStyle,
  MarbleStyle,
  MarbleSize,
  ThemePack,
  WallBackground,
  LightingStyle,
  CameraStyle,
} from '../../marble3d/types';
import { PUBLIC_DOMAIN_MELODIES, parseMidiFile } from '../../marble3d/melodyLibrary';
import { VariationEngine } from '../../marble3d/variationEngine';
import { MARBLE_MELODY_PRESETS, DEFAULT_MARBLE_MELODY_CONFIG } from '../../marble3d/presets';
import { MarblePresetGallery } from '../components/MarblePresetGallery';
import { ReelFormatPicker } from '../components/ReelFormatPicker';
import { triggerHaptic } from '../../platform/haptics';
import {
  Music,
  Upload,
  Lock,
  Unlock,
  Shuffle,
  Layers,
  Sparkles,
  Sliders,
  Palette,
  Camera,
  Sun,
  Shield,
  RotateCcw,
  Check,
  Disc,
  Image as ImageIcon,
  Pipette,
  Trash2,
  X,
} from 'lucide-react';

const WALL_COLOR_SWATCHES = [
  { name: 'Peach', color: '#fed7aa' },
  { name: 'Mint', color: '#a7f3d0' },
  { name: 'Sky', color: '#bae6fd' },
  { name: 'Blush', color: '#fbcfe8' },
  { name: 'Lavender', color: '#ddd6fe' },
  { name: 'Cream', color: '#fef3c7' },
  { name: 'Studio Grey', color: '#334155' },
  { name: 'Midnight', color: '#0f172a' },
  { name: 'Pitch Black', color: '#050505' },
  { name: 'Clean White', color: '#f8fafc' },
];

export const MarbleMelodyControls: React.FC = () => {
  const {
    modeSettings,
    updateModeSetting,
    seed,
    setSeed,
    showToast,
    targetDuration,
    setTargetDuration,
    reelSpeed,
    marbleMelodySlowMoMode,
    setMarbleMelodySlowMoMode,
  } = useStudioStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const [rightsChecked, setRightsChecked] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleCustomImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('⚠️ Please upload a valid image file (PNG, JPG, WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      updateModeSetting('customWallImage', result);
      showToast('🖼️ Custom background image applied to wall!');
    };
    reader.readAsDataURL(file);
  };

  // Auto-select 56s reel time by default when loading Marble Melody
  React.useEffect(() => {
    if (!targetDuration || targetDuration === 60) {
      setTargetDuration(56);
      updateModeSetting('targetDuration', 56);
    }
  }, []);

  // Current config or fallback to defaults
  const config: MarbleMelodyConfig = {
    ...DEFAULT_MARBLE_MELODY_CONFIG,
    ...modeSettings,
    seed,
  };

  const locks = config.locks || {};

  const toggleLock = (key: keyof MarbleMelodyConfig['locks']) => {
    triggerHaptic(10);
    const updated = { ...locks, [key]: !locks[key] };
    updateModeSetting('locks', updated);
  };

  const handleShuffleUnlocked = () => {
    triggerHaptic(20);
    const newSeed = Math.floor(Math.random() * 900000) + 10000;
    const shuffled = VariationEngine.shuffleUnlocked(config, newSeed);
    setSeed(newSeed);
    Object.keys(shuffled).forEach((key) => {
      updateModeSetting(key, (shuffled as any)[key]);
    });
    showToast('✨ Shuffled unlocked layers into fresh 3D run!');
  };

  const handleMake10Variations = () => {
    triggerHaptic(30);
    const variations = VariationEngine.generate10Variations(config, seed);
    // Pick the first one immediately and notify
    const first = variations[1] || variations[0];
    setSeed(first.seed);
    Object.keys(first).forEach((key) => {
      updateModeSetting(key, (first as any)[key]);
    });
    showToast('🚀 10 unique variations generated (batch guarantee applied)!');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!rightsChecked) {
      alert('Please confirm you own the rights or have permission to use this MIDI file.');
      return;
    }

    try {
      setIsUploading(true);
      const buffer = await file.arrayBuffer();
      const notes = await parseMidiFile(buffer);
      if (notes.length === 0) {
        showToast('⚠️ No notes found in MIDI file');
        return;
      }
      updateModeSetting('customNotes', notes);
      updateModeSetting('customMidiName', file.name);
      updateModeSetting('melodyId', 'custom_midi');
      showToast(`🎵 Loaded ${notes.length} notes from ${file.name}`);
    } catch (err: any) {
      console.error(err);
      showToast('⚠️ Failed to parse MIDI: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleResetSection = (section: string) => {
    triggerHaptic(10);
    if (section === 'melody') {
      updateModeSetting('tempoMultiplier', 1.0);
      updateModeSetting('transposeSemitones', 0);
      updateModeSetting('trimStartSeconds', 0);
      updateModeSetting('trimEndSeconds', 60);
    } else if (section === 'marble') {
      updateModeSetting('marbleCount', 1);
      updateModeSetting('marbleStyle', 'glass_swirl');
      updateModeSetting('marbleSize', 'medium');
    } else if (section === 'visuals') {
      updateModeSetting('wallBackground', 'pastel_peach');
      updateModeSetting('lightingStyle', 'soft_studio');
      updateModeSetting('cameraStyle', 'top_down_follow');
      updateModeSetting('themePack', 'pastel_dream');
    }
    showToast(`Reset ${section} settings to default`);
  };

  return (
    <div className="space-y-4 text-xs select-none">
      {/* Top Action Bar: Shuffle & 10 Variations */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleShuffleUnlocked}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-pink-500/20 to-purple-500/20 hover:from-pink-500/30 hover:to-purple-500/30 border border-pink-500/40 text-pink-300 font-bold transition-all active:scale-95"
        >
          <Shuffle className="w-3.5 h-3.5" />
          <span>Shuffle Unlocked</span>
        </button>
        <button
          onClick={handleMake10Variations}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-500/40 text-emerald-300 font-bold transition-all active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Make 10 Variations</span>
        </button>
      </div>

      {/* 12 Viral Reel Formats & Series Mode */}
      <ReelFormatPicker />

      {/* 50 Unique Worlds Visual Preset Gallery */}
      <MarblePresetGallery />

      {/* 1. Melody & Audio Section */}
      <div className="p-3 bg-white/[0.03] border border-white/10 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-200 flex items-center gap-1.5">
            <Music className="w-3.5 h-3.5 text-purple-400" />
            Melody & Music Layout
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleLock('melody')}
              className={`p-1 rounded-lg border transition-all ${
                locks.melody
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
              }`}
              title={locks.melody ? 'Locked during shuffle' : 'Unlocked'}
            >
              {locks.melody ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            </button>
            <button
              onClick={() => handleResetSection('melody')}
              className="text-[10px] text-slate-500 hover:text-slate-300"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Melody Picker */}
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-slate-400">Select Melody</label>
          <select
            value={config.melodyId}
            onChange={(e) => updateModeSetting('melodyId', e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-purple-400 font-medium"
          >
            <optgroup label="Public Domain Classics (Original Arrangements)">
              {PUBLIC_DOMAIN_MELODIES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.composer}
                </option>
              ))}
            </optgroup>
            <option value="procedural">✨ Infinite Procedural Melody (AI/L-System)</option>
            {config.customMidiName && <option value="custom_midi">📁 {config.customMidiName}</option>}
          </select>
        </div>

        {/* MIDI Upload */}
        <div className="p-2.5 bg-black/30 border border-white/5 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-300 flex items-center gap-1 text-[11px]">
              <Upload className="w-3 h-3 text-cyan-400" />
              Upload Custom MIDI (.mid)
            </span>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rightsChecked}
              onChange={(e) => setRightsChecked(e.target.checked)}
              className="rounded border-white/20 bg-black/40 text-purple-500 focus:ring-0"
            />
            <span className="text-[10px] text-slate-400 leading-tight">
              I have the rights to use this music (Public Domain or Original)
            </span>
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept=".mid,.midi"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!rightsChecked || isUploading}
            className={`w-full py-1.5 rounded-lg border font-bold text-[10px] transition-all flex items-center justify-center gap-1.5 ${
              rightsChecked
                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 hover:bg-cyan-500/30'
                : 'bg-white/5 border-white/10 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Upload className="w-3 h-3" />
            {isUploading ? 'Parsing MIDI...' : 'Choose MIDI File'}
          </button>
        </div>

        {/* Tempo & Transpose Sliders */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Tempo</span>
              <span className="text-purple-300 font-bold">{config.tempoMultiplier.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.6"
              max="1.8"
              step="0.05"
              value={config.tempoMultiplier}
              onChange={(e) => updateModeSetting('tempoMultiplier', parseFloat(e.target.value))}
              className="w-full accent-purple-400 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Transpose</span>
              <span className="text-purple-300 font-bold">
                {config.transposeSemitones > 0 ? `+${config.transposeSemitones}` : config.transposeSemitones} st
              </span>
            </div>
            <input
              type="range"
              min="-12"
              max="12"
              step="1"
              value={config.transposeSemitones}
              onChange={(e) => updateModeSetting('transposeSemitones', parseInt(e.target.value))}
              className="w-full accent-purple-400 cursor-pointer"
            />
          </div>
        </div>

        {/* Slow-Motion Melody Choice: Calm Tempo vs Normal Tempo (Part 4) */}
        <div className="pt-2 border-t border-white/5 space-y-1.5">
          <div className="flex justify-between items-center text-[10px]">
            <span className="font-bold text-slate-300">Slow-Motion Melody Mode</span>
            <span className="text-purple-300 font-mono text-[9.5px]">Reel: {reelSpeed ?? 0.5}x</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => {
                triggerHaptic(10);
                setMarbleMelodySlowMoMode('calm_tempo');
                updateModeSetting('marbleMelodySlowMoMode', 'calm_tempo');
                updateModeSetting('slowMoMode', 'calm_tempo');
              }}
              className={`p-2 rounded-xl text-left transition-all ${
                (marbleMelodySlowMoMode ?? 'calm_tempo') === 'calm_tempo'
                  ? 'btn-3d-purple text-white shadow-sm'
                  : 'btn-3d-glass text-slate-400 hover:text-white'
              }`}
            >
              <div className="text-[11px] font-black">Calm Tempo (Default)</div>
              <div className="text-[9.5px] opacity-80 leading-tight mt-0.5">
                Half-tempo melody, peaceful ASMR spacing
              </div>
            </button>

            <button
              onClick={() => {
                triggerHaptic(10);
                setMarbleMelodySlowMoMode('normal_tempo');
                updateModeSetting('marbleMelodySlowMoMode', 'normal_tempo');
                updateModeSetting('slowMoMode', 'normal_tempo');
              }}
              className={`p-2 rounded-xl text-left transition-all ${
                marbleMelodySlowMoMode === 'normal_tempo'
                  ? 'btn-3d-purple text-white shadow-sm'
                  : 'btn-3d-glass text-slate-400 hover:text-white'
              }`}
            >
              <div className="text-[11px] font-black">Normal Tempo</div>
              <div className="text-[9.5px] opacity-80 leading-tight mt-0.5">
                Original tempo with compact object spacing
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Marbles & Multi-Lane Section */}
      <div className="p-3 bg-white/[0.03] border border-white/10 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-200 flex items-center gap-1.5">
            <Disc className="w-3.5 h-3.5 text-pink-400" />
            Marbles & Orchestra Lanes
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleLock('marble')}
              className={`p-1 rounded-lg border transition-all ${
                locks.marble
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              {locks.marble ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            </button>
            <button
              onClick={() => handleResetSection('marble')}
              className="text-[10px] text-slate-500 hover:text-slate-300"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Marble Count */}
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-slate-400">Marble Count</label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { count: 1, label: '1 Marble (Melody)' },
              { count: 2, label: '2 Marbles (+ Bass)' },
              { count: 3, label: '3 Marbles (Orchestra)' },
            ].map((m) => (
              <button
                key={m.count}
                onClick={() => {
                  triggerHaptic(10);
                  updateModeSetting('marbleCount', m.count);
                }}
                className={`py-2 px-1 rounded-xl text-center border font-bold text-[10px] transition-all ${
                  config.marbleCount === m.count
                    ? 'bg-pink-500/20 border-pink-400 text-pink-300'
                    : 'bg-white/[0.02] border-white/5 text-slate-400 hover:border-white/20'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Marble Style & Size */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-400">Material Style</label>
            <select
              value={config.marbleStyle}
              onChange={(e) => updateModeSetting('marbleStyle', e.target.value as MarbleStyle)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-slate-200 outline-none"
            >
              <option value="glass_swirl">Glass Swirl</option>
              <option value="crystal">Clear Crystal</option>
              <option value="chrome">Brushed Chrome</option>
              <option value="pearl">Lustrous Pearl</option>
              <option value="frosted">Frosted Ice</option>
              <option value="neon_core">Neon Core</option>
              <option value="cats_eye">Cat's Eye</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-400">Marble Size</label>
            <select
              value={config.marbleSize}
              onChange={(e) => updateModeSetting('marbleSize', e.target.value as MarbleSize)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-slate-200 outline-none"
            >
              <option value="small">Small (Fast Agility)</option>
              <option value="medium">Medium (Standard)</option>
              <option value="large">Large (Heavy Impact)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Path & Layout Section */}
      <div className="p-3 bg-white/[0.03] border border-white/10 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-200 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            Path Trajectory & Acts
          </span>
          <button
            onClick={() => toggleLock('pathStyle')}
            className={`p-1 rounded-lg border transition-all ${
              locks.pathStyle
                ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            {locks.pathStyle ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
          </button>
        </div>

        {/* Path Style */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-400">Path Flow Shape</label>
            <select
              value={config.pathStyle}
              onChange={(e) => updateModeSetting('pathStyle', e.target.value as PathStyle)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-slate-200 outline-none"
            >
              <option value="zigzag">Zig-Zag Bounce</option>
              <option value="scurve">Smooth S-Curve</option>
              <option value="spiral">Spiral Descent</option>
              <option value="wide_swings">Wide Swings</option>
              <option value="tight_cascade">Tight Cascade</option>
              <option value="bounce_heavy">Bounce Heavy</option>
              <option value="roll_heavy">Roll Heavy (Rails)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-400">Number of Acts</label>
            <select
              value={config.actCount}
              onChange={(e) => updateModeSetting('actCount', parseInt(e.target.value))}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-slate-200 outline-none"
            >
              <option value="3">3 Acts (Quick Progression)</option>
              <option value="4">4 Acts (Balanced)</option>
              <option value="5">5 Acts (Full Symphony)</option>
              <option value="6">6 Acts (Long Run)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Pastel Studio Aesthetics & Wall Section */}
      <div className="p-3 bg-white/[0.03] border border-white/10 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-200 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-amber-400" />
            Pastel Studio & Atmosphere
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleLock('theme')}
              className={`p-1 rounded-lg border transition-all ${
                locks.theme
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              {locks.theme ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            </button>
            <button
              onClick={() => handleResetSection('visuals')}
              className="text-[10px] text-slate-500 hover:text-slate-300"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Theme Pack & Background */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-400">Theme Pack</label>
            <select
              value={config.themePack}
              onChange={(e) => updateModeSetting('themePack', e.target.value as ThemePack)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-slate-200 outline-none"
            >
              <option value="pastel_dream">Pastel Dream</option>
              <option value="candy_shop">Candy Shop</option>
              <option value="glass_lab">Glass Lab</option>
              <option value="metal_workshop">Metal Workshop</option>
              <option value="night_neon">Night Neon</option>
              <option value="nature_garden">Nature Garden</option>
              <option value="space_toys">Space Toys</option>
              <option value="winter_crystal">Winter Crystal</option>
              <option value="festive">Festive Celebration</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-400">3D Wall Surface</label>
            <select
              value={config.wallBackground}
              onChange={(e) => updateModeSetting('wallBackground', e.target.value as WallBackground)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-slate-200 outline-none"
            >
              <optgroup label="3D PBR Materials">
                <option value="matte_plaster">Matte Plaster</option>
                <option value="soft_paper">Soft Paper</option>
                <option value="fine_stucco">Fine Stucco</option>
                <option value="satin_paint">Satin Paint</option>
                <option value="light_wood">Light Wood Grain</option>
                <option value="frosted_acrylic">Frosted Acrylic</option>
                <option value="soft_fabric">Soft Fabric</option>
              </optgroup>
              <optgroup label="Theme Palettes">
                <option value="pastel_peach">Pastel Peach</option>
                <option value="pastel_mint">Pastel Mint</option>
                <option value="pastel_lavender">Pastel Lavender</option>
                <option value="pastel_sky">Pastel Sky Blue</option>
                <option value="candy_pink">Candy Pink</option>
                <option value="cream">Soft Cream</option>
                <option value="blush">Blush Pink</option>
                <option value="sand">Warm Sand</option>
                <option value="lilac">Lilac Mist</option>
                <option value="deep_teal">Deep Teal</option>
                <option value="night_blue">Night Blue</option>
                <option value="neon_grid">Neon Grid</option>
                <option value="starfield">Starfield Galaxy</option>
              </optgroup>
            </select>
          </div>
        </div>

        {/* Color Options & Custom Upload Image */}
        <div className="p-2.5 rounded-xl bg-black/30 border border-white/10 space-y-2.5">
          {/* Color Options Header */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
              <Pipette className="w-3.5 h-3.5 text-pink-400" />
              Wall Color Options
            </span>
            {config.customWallColor && (
              <button
                onClick={() => {
                  updateModeSetting('customWallColor', undefined);
                  showToast('Reset wall color to theme');
                }}
                className="text-[10px] text-pink-400 hover:text-pink-300 font-bold"
              >
                Reset Color
              </button>
            )}
          </div>

          {/* Quick Swatches */}
          <div className="flex flex-wrap items-center gap-1.5">
            {WALL_COLOR_SWATCHES.map((swatch) => {
              const isActive = (config.customWallColor || '').toLowerCase() === swatch.color.toLowerCase();
              return (
                <button
                  key={swatch.name}
                  onClick={() => {
                    triggerHaptic(10);
                    updateModeSetting('customWallColor', swatch.color);
                    showToast(`🎨 Applied ${swatch.name} color`);
                  }}
                  title={swatch.name}
                  className={`w-5 h-5 rounded-full border transition-all ${
                    isActive ? 'scale-115 ring-2 ring-purple-400 border-white' : 'border-white/20 hover:scale-110'
                  }`}
                  style={{ backgroundColor: swatch.color }}
                />
              );
            })}

            {/* Custom Hex Color Picker input */}
            <div className="flex items-center gap-1 ml-auto">
              <input
                type="color"
                value={config.customWallColor || '#fed7aa'}
                onChange={(e) => updateModeSetting('customWallColor', e.target.value)}
                className="w-5 h-5 rounded-full border border-white/20 cursor-pointer bg-transparent"
                title="Custom Color Picker"
              />
              <span className="text-[10px] font-mono text-slate-400 uppercase">
                {config.customWallColor || 'Auto'}
              </span>
            </div>
          </div>

          {/* Custom Upload Image */}
          <div className="pt-2 border-t border-white/5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                Custom Wall Image / Texture
              </span>
              {config.customWallImage && (
                <button
                  onClick={() => {
                    updateModeSetting('customWallImage', undefined);
                    showToast('Cleared custom background image');
                  }}
                  className="flex items-center gap-1 text-[10px] text-rose-400 hover:text-rose-300 font-bold"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove Image</span>
                </button>
              )}
            </div>

            <input
              type="file"
              ref={imageInputRef}
              onChange={handleCustomImageUpload}
              accept="image/*"
              className="hidden"
            />

            {config.customWallImage ? (
              <div className="flex items-center gap-2 p-1.5 bg-black/40 rounded-xl border border-white/10">
                <img
                  src={config.customWallImage}
                  alt="Custom wall preview"
                  className="w-12 h-12 rounded-lg object-cover border border-white/10 shrink-0"
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="text-[10px] text-slate-300 font-bold truncate">Custom Image Active</div>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-slate-400">Tile Repeat:</span>
                    {([1, 4, 10, 20] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => updateModeSetting('customWallImageRepeatY', r)}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          (config.customWallImageRepeatY || 10) === r
                            ? 'bg-cyan-500 text-black'
                            : 'bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {r === 1 ? 'Fit' : `${r}x`}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-bold"
                  title="Replace Image"
                >
                  Replace
                </button>
              </div>
            ) : (
              <button
                onClick={() => imageInputRef.current?.click()}
                className="w-full py-2 px-3 rounded-xl border border-dashed border-white/20 hover:border-cyan-400/50 bg-black/20 hover:bg-cyan-500/5 text-slate-400 hover:text-cyan-300 transition-all flex items-center justify-center gap-2 text-xs font-medium"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                <span>Upload Custom Image (JPG, PNG, WebP)</span>
              </button>
            )}
          </div>
        </div>

        {/* Lighting & Camera */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-400">Studio Lighting</label>
            <select
              value={config.lightingStyle}
              onChange={(e) => updateModeSetting('lightingStyle', e.target.value as LightingStyle)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-slate-200 outline-none"
            >
              <option value="soft_studio">Soft Studio</option>
              <option value="warm_morning">Warm Morning</option>
              <option value="cool_daylight">Cool Daylight</option>
              <option value="golden_hour">Golden Hour</option>
              <option value="colourful_bounce">Colourful Bounce</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-400">Camera Style</label>
            <select
              value={config.cameraStyle}
              onChange={(e) => updateModeSetting('cameraStyle', e.target.value as CameraStyle)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-slate-200 outline-none"
            >
              <option value="top_down_follow">Top-Down Follow</option>
              <option value="tilted_follow">Tilted Follow (45°)</option>
              <option value="orbit_follow">Slow Orbit Follow</option>
              <option value="macro_close">Macro Close-Up</option>
              <option value="wide_reveal">Wide Finale Reveal</option>
            </select>
          </div>
        </div>

        {/* Wall Text & Handle Controls (Default Off for clean background) */}
        <div className="space-y-2 pt-1 border-t border-white/5">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(config.showBackgroundText || config.embossedText?.enabled)}
                onChange={(e) => {
                  const val = e.target.checked;
                  updateModeSetting('showBackgroundText', val);
                  updateModeSetting('embossedText', {
                    ...(config.embossedText || {}),
                    enabled: val,
                  });
                }}
                className="rounded border-white/20 bg-black/40 text-purple-500 focus:ring-0"
              />
              <span className="text-[11px] text-slate-300 font-medium">Show Embossed Wall Text (Titles / Reminders)</span>
            </label>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-semibold text-slate-400">Embossed 3D @Handle on Wall</label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(config.showHandleText)}
                  onChange={(e) => updateModeSetting('showHandleText', e.target.checked)}
                  className="rounded border-white/20 bg-black/40 text-purple-500 focus:ring-0"
                />
                <span className="text-[10px] text-slate-400">Enable</span>
              </label>
            </div>
            <input
              type="text"
              value={config.handleText || ''}
              onChange={(e) => updateModeSetting('handleText', e.target.value)}
              placeholder="e.g. @YourChannel (leave blank or toggle off to hide)"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-slate-200 outline-none"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.decorEnabled}
                onChange={(e) => updateModeSetting('decorEnabled', e.target.checked)}
                className="rounded border-white/20 bg-black/40 text-amber-500 focus:ring-0"
              />
              <span className="text-[11px] text-slate-300 font-medium">Original Decor Props (Mascot, Plants, Shelves)</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
