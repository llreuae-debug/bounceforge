import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useStudioStore } from '../../store/useStudioStore';
import { useAuthStore } from '../../auth/useAuthStore';
import { THEMES } from '../../render/themes';
import { InstrumentType } from '../../audio/types';
import { AudioEngine } from '../../audio/audioEngine';
import { AsmrEngine, AsmrTextureType } from '../../audio/asmrEngine';
import { getDefaults, isModeAtDefault } from '../../modes/defaults';
import { checkGpu4KCapability } from '../../export/videoExporter';
import { ALL_MODES, getModeById } from '../../modes/registry';
import { presetService, SavedPreset } from '../../presets/presetService';
import { copyText } from '../../platform/clipboard';
import { triggerHaptic } from '../../platform/haptics';
import { detectCapabilities, generateDiagnosticReport } from '../../platform/capabilities';
import { MarbleMelodyControls } from './MarbleMelodyControls';

import {
  Search,
  Sliders,
  Sparkles,
  Volume2,
  Tv,
  RotateCcw,
  Zap,
  Activity,
  Check,
  Film,
  Info,
  Copy,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Share2,
  Download,
  Upload,
  Layers,
  Circle,
  HelpCircle,
  Shield,
  Palette,
  Flame,
  Music,
  FileText,
  Lock,
  Globe,
} from 'lucide-react';
import { useI18n } from '../../i18n';
import { ALL_LANGUAGE_CODES, SUPPORTED_LANGUAGES, SupportedLanguage } from '../../i18n/config';

export interface SettingsPanelProps {
  className?: string;
  onClose?: () => void;
}

const STORAGE_KEY_SECTIONS = 'bounceforge_settings_open_sections';

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ className, onClose }) => {
  const { t } = useI18n();
  const {
    currentModeId,
    setMode,
    modeSettings,
    updateModeSetting,
    applyPreset,
    resetModeToDefault,
    seed,
    setSeed,
    randomizeSeed,
    visuals,
    setVisuals,
    overlays,
    setOverlays,
    ballPhysics,
    setBallPhysics,
    wallControls,
    setWallControls,
    customBall,
    setCustomBall,
    audioSettings,
    targetDuration,
    setTargetDuration,
    resolution,
    setResolution,
    setExportOpen,
    setSeedFinderOpen,
    userPresets,
    saveCurrentAsPreset,
    loadPreset,
    deletePreset,
    duplicatePreset,
    renamePreset,
    showToast,
    capabilities,
    setCapabilities,
  } = useStudioStore();

  const { currentUser, openAuthModal, openUpgradeModal } = useAuthStore();
  const isGuest = !currentUser;

  // Search Filter State
  const [searchQuery, setSearchQuery] = useState('');

  // Collapsible Sections State (remembered in localStorage)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SECTIONS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      mode: true,
      ball: true,
      walls: true,
      visuals: true,
      sound: false,
      overlays: false,
      recording: false,
      presets: false,
    };
  });

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const updated = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(STORAGE_KEY_SECTIONS, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Preset Management State
  const [newPresetName, setNewPresetName] = useState('');
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editingPresetName, setEditingPresetName] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const ballImageInputRef = useRef<HTMLInputElement | null>(null);

  // Custom Ball Crop/Zoom State
  const [imageZoom, setImageZoom] = useState(1.0);
  const [rawImageUrl, setRawImageUrl] = useState<string | null>(null);

  const currentMode = useMemo(() => getModeById(currentModeId), [currentModeId]);
  const defaults = useMemo(() => getDefaults(currentModeId), [currentModeId]);
  const isCurrentModeDefault = isModeAtDefault(currentModeId, {
    seed,
    modeSettings,
    visuals,
    overlays,
    audioSettings,
  });

  const quickEmojiList = ['🏀', '⚽', '🎾', '🎱', '🪙', '🍕', '🍩', '🪐', '💣', '💎', '🔥', '💀', '👁️', '🚀', '🌟', '👻'];

  // Helper to render emoji to a crisp 256x256 circular texture
  const renderEmojiTexture = (emojiChar: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '160px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    ctx.fillText(emojiChar, 128, 138);
    const dataUrl = canvas.toDataURL();
    setCustomBall({ type: 'emoji', emoji: emojiChar, dataUrl });
    showToast(`set custom ball: ${emojiChar}`);
  };

  // Helper to process uploaded ball image with circular crop and zoom
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image file exceeds 5MB limit');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      setRawImageUrl(src);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Circular clipping
        ctx.beginPath();
        ctx.arc(128, 128, 120, 0, Math.PI * 2);
        ctx.clip();

        const aspect = img.width / img.height;
        let dw = 256 * imageZoom;
        let dh = 256 * imageZoom;
        if (aspect > 1) {
          dw = 256 * aspect * imageZoom;
        } else {
          dh = (256 / aspect) * imageZoom;
        }
        const dx = (256 - dw) / 2;
        const dy = (256 - dh) / 2;
        ctx.drawImage(img, dx, dy, dw, dh);

        const dataUrl = canvas.toDataURL('image/png');
        setCustomBall({ type: 'image', dataUrl });
        showToast('custom image ball applied');
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  // Break Effect ASMR Audition
  const handleAuditionBreakEffect = (effect: 'confetti' | 'glass_shatter' | 'shockwave' | 'sparks') => {
    AsmrEngine.getInstance().playBreakEffectSound(effect);
    triggerHaptic(10);
  };

  // Search filter matching helper
  const matchesSearch = (text: string) => {
    if (!searchQuery.trim()) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  const isSectionVisible = (sectionName: string, keywords: string[]) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    if (sectionName.toLowerCase().includes(q)) return true;
    return keywords.some((k) => k.toLowerCase().includes(q));
  };

  // Handle Preset Actions
  const handleSavePreset = async () => {
    const name = newPresetName.trim() || `${currentMode.name} Setup`;
    await saveCurrentAsPreset(name, currentUser?.id || null);
    setNewPresetName('');
  };

  const handleImportPresetFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const preset = presetService.importPresetFromJson(text);
        loadPreset(preset);
        showToast(`imported preset "${preset.name}"!`);
      } catch (err: any) {
        showToast(err.message || 'Failed to import preset');
      }
    };
    reader.readAsText(file);
  };

  const handleSharePreset = (preset: SavedPreset) => {
    const link = presetService.createShareLink(preset);
    copyText(link).then(() => {
      triggerHaptic(15);
      showToast('share link copied to clipboard!');
    });
  };

  return (
    <aside className={className || "w-96 h-[calc(100vh-4rem)] border-l border-white/10 bg-[#07090e]/95 backdrop-blur-md flex flex-col select-none shrink-0 font-sans"}>
      {/* Search Header */}
      <div className="p-3 border-b border-white/10 bg-white/[0.02] space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#CCFF00] shadow-[0_0_8px_#CCFF00]" />
            <span className="text-xs font-black uppercase text-white tracking-wider">
              {currentMode.name}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => resetModeToDefault()}
              disabled={isCurrentModeDefault}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-all ${
                isCurrentModeDefault
                  ? 'opacity-30 cursor-not-allowed bg-white/5 text-slate-500'
                  : 'btn-3d-reset-pill'
              }`}
              title="Reset current mode to defaults"
            >
              <RotateCcw className="w-3 h-3 stroke-[2.2]" />
              <span>reset</span>
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Search Input Box */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search settings (glow, bounce, spikes, trail)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Accordion Content Sections */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* ========================================================
            1. MODE SECTION
        ======================================================== */}
        {isSectionVisible('mode', ['preset', 'chill', 'viral', 'insane', 'order', 'segment', 'palette', 'wear', 'freeze']) && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
            <button
              onClick={() => toggleSection('mode')}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-black uppercase text-white tracking-wider">
                  Mode &amp; Presets
                </span>
              </div>
              {openSections.mode ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
            </button>

            {openSections.mode && (
              <div className="p-3.5 pt-0 border-t border-white/5 space-y-3 mt-1">
                {/* Mode Selector */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Active Mode</label>
                  <select
                    value={currentModeId}
                    onChange={(e) => setMode(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-cyan-300 font-bold outline-none cursor-pointer"
                  >
                    {ALL_MODES.map((m) => (
                      <option key={m.id} value={m.id} className="bg-[#0b0e14] text-white">
                        {m.name} ({m.category})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3 Quick Presets: Chill, Viral, Insane */}
                {currentMode.presets && Object.keys(currentMode.presets).length > 0 && (
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Tuned Presets</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {['chill', 'viral', 'insane'].map((presetKey) => {
                        const p = Array.isArray(currentMode.presets)
                          ? currentMode.presets.find((x) => x.name.toLowerCase().includes(presetKey))
                          : (currentMode.presets as any)?.[presetKey];
                        if (!p) return null;
                        return (
                          <button
                            key={presetKey}
                            onClick={() => {
                              applyPreset(p);
                              triggerHaptic(10);
                              showToast(`applied ${presetKey} preset`);
                            }}
                            className={`py-1.5 px-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                              presetKey === 'viral'
                                ? 'btn-3d-cyan text-black'
                                : presetKey === 'insane'
                                ? 'btn-3d-pink text-white'
                                : 'btn-3d-glass text-slate-300 hover:text-white'
                            }`}
                          >
                            {presetKey}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Dynamic Mode-Specific Rules */}
                <div className="pt-2 border-t border-white/5 space-y-2.5 text-xs">
                  {/* Marble Melody 3D Flagship Controls */}
                  {currentModeId === 'marble_melody_3d' && (
                    <MarbleMelodyControls />
                  )}

                  {/* Sequence Break Controls */}
                  {currentModeId === 'sequence_break' && (
                    <>
                      <div>
                        <div className="flex justify-between text-slate-300 mb-1">
                          <span>Segment Count</span>
                          <span className="font-mono text-cyan-400">{modeSettings.segmentCount || 12}</span>
                        </div>
                        <input
                          type="range"
                          min="6"
                          max="24"
                          value={modeSettings.segmentCount || 12}
                          onChange={(e) => updateModeSetting('segmentCount', Number(e.target.value))}
                          className="w-full accent-cyan-400"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300">Random Number Order</span>
                        <input
                          type="checkbox"
                          checked={modeSettings.randomOrder ?? false}
                          onChange={(e) => updateModeSetting('randomOrder', e.target.checked)}
                          className="accent-cyan-400 rounded cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300">Show Numbers on Ring</span>
                        <input
                          type="checkbox"
                          checked={modeSettings.showNumbers ?? true}
                          onChange={(e) => updateModeSetting('showNumbers', e.target.checked)}
                          className="accent-cyan-400 rounded cursor-pointer"
                        />
                      </div>
                    </>
                  )}

                  {/* Color Lock Controls */}
                  {currentModeId === 'color_lock' && (
                    <>
                      <div>
                        <div className="flex justify-between text-slate-300 mb-1">
                          <span>Palette Size (Colors)</span>
                          <span className="font-mono text-cyan-400">{modeSettings.paletteSize || 4}</span>
                        </div>
                        <input
                          type="range"
                          min="3"
                          max="8"
                          value={modeSettings.paletteSize || 4}
                          onChange={(e) => updateModeSetting('paletteSize', Number(e.target.value))}
                          className="w-full accent-cyan-400"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300">Color Order</span>
                        <select
                          value={modeSettings.orderType || 'cycle'}
                          onChange={(e) => updateModeSetting('orderType', e.target.value)}
                          className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-cyan-300"
                        >
                          <option value="cycle">Cycle</option>
                          <option value="random">Random</option>
                        </select>
                      </div>
                    </>
                  )}

                  {/* Portal Rings Controls */}
                  {currentModeId === 'portal_rings' && (
                    <div>
                      <div className="flex justify-between text-slate-300 mb-1">
                        <span>Portal Wear Limit (Uses)</span>
                        <span className="font-mono text-cyan-400">{modeSettings.wearLimit || 5}</span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="10"
                        value={modeSettings.wearLimit || 5}
                        onChange={(e) => updateModeSetting('wearLimit', Number(e.target.value))}
                        className="w-full accent-cyan-400"
                      />
                    </div>
                  )}

                  {/* Accumulation Controls */}
                  {currentModeId === 'accumulation' && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300">Freeze Timer Mode</span>
                        <input
                          type="checkbox"
                          checked={modeSettings.freezeTimerVariant ?? true}
                          onChange={(e) => updateModeSetting('freezeTimerVariant', e.target.checked)}
                          className="accent-cyan-400 rounded cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-slate-300 mb-1">
                          <span>Ball Lifetime (s)</span>
                          <span className="font-mono text-cyan-400">{modeSettings.ballLifetime || 5}s</span>
                        </div>
                        <input
                          type="range"
                          min="3"
                          max="8"
                          value={modeSettings.ballLifetime || 5}
                          onChange={(e) => updateModeSetting('ballLifetime', Number(e.target.value))}
                          className="w-full accent-cyan-400"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            2. BALL SECTION (PART 2 & PART 5)
        ======================================================== */}
        {isSectionVisible('ball', ['speed', 'size', 'gravity', 'color', 'bounciness', 'boost', 'energy', 'custom', 'emoji', 'image', 'crop']) && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
            <button
              onClick={() => toggleSection('ball')}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Circle className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-black uppercase text-white tracking-wider">
                  Ball &amp; Physics
                </span>
              </div>
              {openSections.ball ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
            </button>

            {openSections.ball && (
              <div className="p-3.5 pt-0 border-t border-white/5 space-y-3 mt-1 text-xs">
                {/* Ball Speed */}
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Initial Speed</span>
                    <span className="font-mono text-cyan-400">{ballPhysics.speed.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.1"
                    value={ballPhysics.speed}
                    onChange={(e) => setBallPhysics({ speed: Number(e.target.value) })}
                    className="w-full accent-cyan-400"
                  />
                </div>

                {/* Ball Size */}
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Ball Size (Radius)</span>
                    <span className="font-mono text-cyan-400">{ballPhysics.radius}px</span>
                  </div>
                  <input
                    type="range"
                    min="8"
                    max="32"
                    step="1"
                    value={ballPhysics.radius}
                    onChange={(e) => setBallPhysics({ radius: Number(e.target.value) })}
                    className="w-full accent-cyan-400"
                  />
                </div>

                {/* Ball Gravity */}
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Gravity</span>
                    <span className="font-mono text-cyan-400">{ballPhysics.gravity.toFixed(2)}G</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2.5"
                    step="0.05"
                    value={ballPhysics.gravity}
                    onChange={(e) => setBallPhysics({ gravity: Number(e.target.value) })}
                    className="w-full accent-cyan-400"
                  />
                </div>

                {/* Ball Bounciness (Restitution) */}
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Bounciness (Restitution)</span>
                    <span className="font-mono text-cyan-400">{ballPhysics.restitution.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.6"
                    max="1.2"
                    step="0.02"
                    value={ballPhysics.restitution}
                    onChange={(e) => setBallPhysics({ restitution: Number(e.target.value) })}
                    className="w-full accent-cyan-400"
                  />
                </div>

                {/* Ball Color */}
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Ball Color</span>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ backgroundColor: ballPhysics.color }} />
                      <span className="font-mono text-cyan-400">{ballPhysics.color}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {['#00f0ff', '#ff0055', '#ccff00', '#a855f7', '#fbbf24', '#ffffff'].map((c) => (
                      <button
                        key={c}
                        onClick={() => setBallPhysics({ color: c })}
                        className="w-6 h-6 rounded-full border border-white/20 hover:scale-110 transition-transform"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <input
                      type="color"
                      value={ballPhysics.color}
                      onChange={(e) => setBallPhysics({ color: e.target.value })}
                      className="w-7 h-7 rounded-lg bg-transparent cursor-pointer border border-white/10"
                    />
                  </div>
                </div>

                {/* NEW: Bounce Boost Controls */}
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      Bounce Boost
                    </span>
                    <input
                      type="checkbox"
                      checked={ballPhysics.bounceBoostEnabled}
                      onChange={(e) => setBallPhysics({ bounceBoostEnabled: e.target.checked })}
                      className="accent-amber-400 rounded cursor-pointer"
                    />
                  </div>
                  {ballPhysics.bounceBoostEnabled && (
                    <>
                      <div>
                        <div className="flex justify-between text-slate-300 mb-0.5 text-[11px]">
                          <span>Boost Rate per Wall Hit</span>
                          <span className="font-mono text-amber-300">+{(ballPhysics.bounceBoostRate * 100).toFixed(0)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.01"
                          max="0.08"
                          step="0.01"
                          value={ballPhysics.bounceBoostRate}
                          onChange={(e) => setBallPhysics({ bounceBoostRate: Number(e.target.value) })}
                          className="w-full accent-amber-400"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-slate-300 mb-0.5 text-[11px]">
                          <span>Max Bounciness Cap</span>
                          <span className="font-mono text-amber-300">{ballPhysics.bounceBoostMax.toFixed(2)}x</span>
                        </div>
                        <input
                          type="range"
                          min="1.1"
                          max="2.2"
                          step="0.05"
                          value={ballPhysics.bounceBoostMax}
                          onChange={(e) => setBallPhysics({ bounceBoostMax: Number(e.target.value) })}
                          className="w-full accent-amber-400"
                        />
                      </div>
                      <p className="text-[10px] text-amber-300/80 lowercase">
                        resets after each escape. energy meter displays in live preview.
                      </p>
                    </>
                  )}
                </div>

                {/* Max Speed Cap */}
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Max Speed Cap</span>
                    <span className="font-mono text-cyan-400">{ballPhysics.maxSpeedCap} px/s</span>
                  </div>
                  <input
                    type="range"
                    min="800"
                    max="4000"
                    step="100"
                    value={ballPhysics.maxSpeedCap}
                    onChange={(e) => setBallPhysics({ maxSpeedCap: Number(e.target.value) })}
                    className="w-full accent-cyan-400"
                  />
                  <p className="text-[10px] text-slate-500 lowercase mt-0.5">
                    prevents tunneling through walls at extreme velocities
                  </p>
                </div>

                {/* PART 5: Custom Ball (Emoji or Uploaded Image) */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">Custom Ball Texture</span>
                    <div className="flex items-center gap-1">
                      {(['default', 'emoji', 'image'] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => setCustomBall({ type })}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                            customBall.type === type
                              ? 'btn-3d-cyan text-black'
                              : 'btn-3d-glass text-slate-400 hover:text-white'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Emoji Ball Selector */}
                  {customBall.type === 'emoji' && (
                    <div className="space-y-1.5">
                      <div className="grid grid-cols-8 gap-1">
                        {quickEmojiList.map((em) => (
                          <button
                            key={em}
                            onClick={() => renderEmojiTexture(em)}
                            className={`h-8 rounded-lg text-lg flex items-center justify-center transition-all ${
                              customBall.emoji === em
                                ? 'bg-cyan-500/30 border border-cyan-400 scale-110 shadow-sm'
                                : 'bg-white/5 hover:bg-white/10'
                            }`}
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-400 lowercase">
                        rendered to a crisp canvas texture once. spins naturally with physics roll.
                      </p>
                    </div>
                  )}

                  {/* Image Ball Upload */}
                  {customBall.type === 'image' && (
                    <div className="space-y-2">
                      <input
                        type="file"
                        ref={ballImageInputRef}
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => ballImageInputRef.current?.click()}
                          className="btn-3d-glass flex-1 py-1.5 px-3 rounded-xl text-xs font-bold text-slate-300 hover:text-white flex items-center justify-center gap-1.5"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Image (Max 5MB)</span>
                        </button>
                        {customBall.dataUrl && (
                          <div className="w-9 h-9 rounded-full overflow-hidden border border-cyan-400 shadow-md shrink-0">
                            <img src={customBall.dataUrl} alt="ball" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-amber-300/80 font-mono">
                        * only use images u own or have rights to
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            3. WALLS SECTION (PART 3)
        ======================================================== */}
        {isSectionVisible('walls', ['ring', 'gap', 'break', 'confetti', 'shatter', 'shockwave', 'sparks', 'spike']) && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
            <button
              onClick={() => toggleSection('walls')}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-black uppercase text-white tracking-wider">
                  Wall &amp; Break Controls
                </span>
              </div>
              {openSections.walls ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
            </button>

            {openSections.walls && (
              <div className="p-3.5 pt-0 border-t border-white/5 space-y-3 mt-1 text-xs">
                {/* Ring Layers */}
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Ring Layer Count</span>
                    <span className="font-mono text-cyan-400">{wallControls.ringCount}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="40"
                    value={wallControls.ringCount}
                    onChange={(e) => setWallControls({ ringCount: Number(e.target.value) })}
                    className="w-full accent-cyan-400"
                  />
                </div>

                {/* Gap Width Degrees */}
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Ring Gap Width</span>
                    <span className="font-mono text-cyan-400">{wallControls.gapWidthDeg}°</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    value={wallControls.gapWidthDeg}
                    onChange={(e) => setWallControls({ gapWidthDeg: Number(e.target.value) })}
                    className="w-full accent-cyan-400"
                  />
                </div>

                {/* Multi-Select Break Effects Picker */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-300 block">
                    Break Effects (Multi-Select)
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['confetti', 'glass_shatter', 'shockwave', 'sparks'] as const).map((effect) => {
                      const isSelected = wallControls.breakEffects.includes(effect);
                      return (
                        <div
                          key={effect}
                          className={`p-2 rounded-xl border flex items-center justify-between transition-all ${
                            isSelected
                              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                              : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                          }`}
                        >
                          <label className="flex items-center gap-2 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setWallControls({ breakEffects: [...wallControls.breakEffects, effect] });
                                } else {
                                  setWallControls({
                                    breakEffects: wallControls.breakEffects.filter((x) => x !== effect),
                                  });
                                }
                              }}
                              className="accent-cyan-400 rounded"
                            />
                            <span className="capitalize">{effect.replace('_', ' ')}</span>
                          </label>
                          <button
                            onClick={() => handleAuditionBreakEffect(effect)}
                            className="p-1 text-slate-400 hover:text-white"
                            title={`Audition ${effect} ASMR sound`}
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Inward Spikes Toggle */}
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-red-300 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-red-400" />
                      Inward-Pointing Spikes
                    </span>
                    <input
                      type="checkbox"
                      checked={wallControls.spikesEnabled}
                      onChange={(e) => setWallControls({ spikesEnabled: e.target.checked })}
                      className="accent-red-400 rounded cursor-pointer"
                    />
                  </div>
                  {wallControls.spikesEnabled && (
                    <>
                      <div>
                        <div className="flex justify-between text-slate-300 mb-0.5 text-[11px]">
                          <span>Spike Count</span>
                          <span className="font-mono text-red-300">{wallControls.spikeCount}</span>
                        </div>
                        <input
                          type="range"
                          min="4"
                          max="32"
                          value={wallControls.spikeCount}
                          onChange={(e) => setWallControls({ spikeCount: Number(e.target.value) })}
                          className="w-full accent-red-400"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-slate-300 mb-0.5 text-[11px]">
                          <span>Spike Length</span>
                          <span className="font-mono text-red-300">{wallControls.spikeLength}px</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="60"
                          value={wallControls.spikeLength}
                          onChange={(e) => setWallControls({ spikeLength: Number(e.target.value) })}
                          className="w-full accent-red-400"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            4. VISUALS SECTION (PART 4)
        ======================================================== */}
        {isSectionVisible('visuals', ['theme', 'rainbow', 'glow', 'trail', 'hue', 'reactive', 'background', 'shake']) && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
            <button
              onClick={() => toggleSection('visuals')}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-black uppercase text-white tracking-wider">
                  Visuals &amp; Shaders
                </span>
              </div>
              {openSections.visuals ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
            </button>

            {openSections.visuals && (
              <div className="p-3.5 pt-0 border-t border-white/5 space-y-3 mt-1 text-xs">
                {/* Theme Selector */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Color Palette Theme</label>
                  <select
                    value={visuals.themeId}
                    onChange={(e) => setVisuals({ themeId: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-purple-300 font-bold outline-none cursor-pointer"
                  >
                    {Object.entries(THEMES).map(([id, t]) => (
                      <option key={id} value={id} className="bg-[#0b0e14] text-white">
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Rainbow Walls: Off / Flow / Flash */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-slate-300">Rainbow Walls Style</span>
                    <span className="text-[10px] uppercase font-mono text-cyan-400">{visuals.rainbowWallsMode}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['off', 'flow', 'flash'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setVisuals({ rainbowWallsMode: mode })}
                        className={`py-1 rounded-xl text-xs font-bold uppercase transition-all ${
                          visuals.rainbowWallsMode === mode
                            ? 'btn-3d-cyan text-black'
                            : 'btn-3d-glass text-slate-400 hover:text-white'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Separate Glow Toggles & Intensity */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-300">Ball Glow</span>
                      <input
                        type="checkbox"
                        checked={visuals.ballGlowEnabled}
                        onChange={(e) => setVisuals({ ballGlowEnabled: e.target.checked })}
                        className="accent-cyan-400 rounded cursor-pointer"
                      />
                    </div>
                    {visuals.ballGlowEnabled && (
                      <input
                        type="range"
                        min="0.2"
                        max="3.0"
                        step="0.1"
                        value={visuals.ballGlowIntensity}
                        onChange={(e) => setVisuals({ ballGlowIntensity: Number(e.target.value) })}
                        className="w-full accent-cyan-400"
                      />
                    )}
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-300">Wall Glow</span>
                      <input
                        type="checkbox"
                        checked={visuals.wallGlowEnabled}
                        onChange={(e) => setVisuals({ wallGlowEnabled: e.target.checked })}
                        className="accent-purple-400 rounded cursor-pointer"
                      />
                    </div>
                    {visuals.wallGlowEnabled && (
                      <input
                        type="range"
                        min="0.2"
                        max="3.0"
                        step="0.1"
                        value={visuals.wallGlowIntensity}
                        onChange={(e) => setVisuals({ wallGlowIntensity: Number(e.target.value) })}
                        className="w-full accent-purple-400"
                      />
                    )}
                  </div>
                </div>

                {/* Trail: On/Off, Length, Hue Shift */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-300">Ball Trail</span>
                    <input
                      type="checkbox"
                      checked={visuals.trailEnabled}
                      onChange={(e) => setVisuals({ trailEnabled: e.target.checked })}
                      className="accent-cyan-400 rounded cursor-pointer"
                    />
                  </div>
                  {visuals.trailEnabled && (
                    <>
                      <div>
                        <div className="flex justify-between text-slate-400 mb-0.5 text-[11px]">
                          <span>Trail Length</span>
                          <span className="font-mono text-cyan-400">{visuals.trailLength}</span>
                        </div>
                        <input
                          type="range"
                          min="2"
                          max="40"
                          value={visuals.trailLength}
                          onChange={(e) => setVisuals({ trailLength: Number(e.target.value) })}
                          className="w-full accent-cyan-400"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300 text-[11px]">Rainbow Hue Shift</span>
                        <input
                          type="checkbox"
                          checked={visuals.trailHueShift}
                          onChange={(e) => setVisuals({ trailHueShift: e.target.checked })}
                          className="accent-cyan-400 rounded cursor-pointer"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Reactive Background Pulse */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-300">Reactive Background</span>
                    <input
                      type="checkbox"
                      checked={visuals.reactiveBgEnabled}
                      onChange={(e) => setVisuals({ reactiveBgEnabled: e.target.checked })}
                      className="accent-cyan-400 rounded cursor-pointer"
                    />
                  </div>
                  {visuals.reactiveBgEnabled && (
                    <div>
                      <div className="flex justify-between text-slate-400 mb-0.5 text-[11px]">
                        <span>Pulse Intensity</span>
                        <span className="font-mono text-cyan-400">{visuals.reactiveBgIntensity.toFixed(1)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.2"
                        max="2.0"
                        step="0.1"
                        value={visuals.reactiveBgIntensity}
                        onChange={(e) => setVisuals({ reactiveBgIntensity: Number(e.target.value) })}
                        className="w-full accent-cyan-400"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            5. SOUND SECTION
        ======================================================== */}
        {isSectionVisible('sound', ['instrument', 'melody', 'asmr', 'volume', 'audio', 'sound']) && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
            <button
              onClick={() => toggleSection('sound')}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-pink-400" />
                <span className="text-xs font-black uppercase text-white tracking-wider">
                  Sound &amp; ASMR Mix
                </span>
              </div>
              {openSections.sound ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
            </button>

            {openSections.sound && (
              <div className="p-3.5 pt-0 border-t border-white/5 space-y-3 mt-1 text-xs">
                {/* Instrument Selector */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Synthesizer Instrument</label>
                  <select
                    value={audioSettings.instrument}
                    onChange={(e) => {
                      AudioEngine.getInstance().updateSettings({ instrument: e.target.value as InstrumentType });
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-pink-300 font-bold outline-none cursor-pointer"
                  >
                    <option value="marimba" className="bg-[#0b0e14]">Marimba (Wooden ASMR)</option>
                    <option value="grandPiano" className="bg-[#0b0e14]">Grand Piano</option>
                    <option value="synthLead" className="bg-[#0b0e14]">Synth Lead</option>
                    <option value="kalimba" className="bg-[#0b0e14]">Kalimba (Thumb Piano)</option>
                    <option value="square8bit" className="bg-[#0b0e14]">8-Bit Arcade Square</option>
                    <option value="trumpet" className="bg-[#0b0e14]">Trumpet (Brass)</option>
                    <option value="waterDrop" className="bg-[#0b0e14]">Water Drop (Organic)</option>
                    <option value="musicBox" className="bg-[#0b0e14]">Music Box</option>
                  </select>
                </div>

                {/* ASMR Textures */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">ASMR Textures Audition</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['sandPour', 'kineticCut', 'bubbleWrap', 'soapPop', 'marbleRoll', 'softRain', 'vinylCrackle'] as AsmrTextureType[]).map((tex) => (
                      <button
                        key={tex}
                        onClick={() => AsmrEngine.getInstance().playTexture(tex)}
                        className="btn-3d-glass py-1.5 px-2 rounded-xl text-slate-300 hover:text-white flex items-center justify-between text-[11px]"
                      >
                        <span className="capitalize">{tex.replace('_', ' ')}</span>
                        <Volume2 className="w-3 h-3 text-pink-400" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            6. OVERLAYS & CAPTIONS SECTION (PART 5)
        ======================================================== */}
        {isSectionVisible('overlays', ['caption', 'title', 'top', 'bottom', 'center', 'text', 'watermark', 'safe']) && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
            <button
              onClick={() => toggleSection('overlays')}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-black uppercase text-white tracking-wider">
                  Captions &amp; Overlays
                </span>
              </div>
              {openSections.overlays ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
            </button>

            {openSections.overlays && (
              <div className="p-3.5 pt-0 border-t border-white/5 space-y-3 mt-1 text-xs">
                {/* Video Text Language Picker (Separate from UI language) */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">
                      {t('settings:overlays.videoLang', 'Video Text Language')}
                    </span>
                    <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <select
                    value={overlays.videoLanguage || 'en'}
                    onChange={(e) => setOverlays({ videoLanguage: e.target.value as SupportedLanguage })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-400"
                  >
                    {ALL_LANGUAGE_CODES.map((code) => (
                      <option key={code} value={code}>
                        {SUPPORTED_LANGUAGES[code].name} ({SUPPORTED_LANGUAGES[code].englishName})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400">
                    {t('settings:overlays.videoLangHint', 'Language used inside exported video hooks and counters')}
                  </p>
                </div>

                {/* Top Caption (Hook Title) */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">Top Caption (Hook Title)</span>
                    <input
                      type="checkbox"
                      checked={overlays.showTitle}
                      onChange={(e) => setOverlays({ showTitle: e.target.checked })}
                      className="accent-cyan-400 rounded cursor-pointer"
                    />
                  </div>
                  {overlays.showTitle && (
                    <>
                      <input
                        type="text"
                        value={overlays.titleText}
                        onChange={(e) => setOverlays({ titleText: e.target.value })}
                        placeholder="e.g. can it escape??"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-400"
                      />
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={overlays.titleBold ?? true}
                            onChange={(e) => setOverlays({ titleBold: e.target.checked })}
                            className="accent-cyan-400 rounded"
                          />
                          <span>Bold</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={overlays.titleOutline ?? true}
                            onChange={(e) => setOverlays({ titleOutline: e.target.checked })}
                            className="accent-cyan-400 rounded"
                          />
                          <span>Outline</span>
                        </label>
                        <input
                          type="color"
                          value={overlays.titleColor || '#ffffff'}
                          onChange={(e) => setOverlays({ titleColor: e.target.value })}
                          className="w-6 h-6 rounded border border-white/10 bg-transparent cursor-pointer ml-auto"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Bottom Caption (PART 5) */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">Bottom Caption</span>
                    <input
                      type="checkbox"
                      checked={overlays.showBottomCaption ?? false}
                      onChange={(e) => setOverlays({ showBottomCaption: e.target.checked })}
                      className="accent-cyan-400 rounded cursor-pointer"
                    />
                  </div>
                  {overlays.showBottomCaption && (
                    <>
                      <input
                        type="text"
                        value={overlays.bottomCaptionText || ''}
                        onChange={(e) => setOverlays({ bottomCaptionText: e.target.value })}
                        placeholder="e.g. comment ur prediction below 👇"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-400"
                      />
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={overlays.bottomCaptionBold ?? true}
                            onChange={(e) => setOverlays({ bottomCaptionBold: e.target.checked })}
                            className="accent-cyan-400 rounded"
                          />
                          <span>Bold</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={overlays.bottomCaptionOutline ?? true}
                            onChange={(e) => setOverlays({ bottomCaptionOutline: e.target.checked })}
                            className="accent-cyan-400 rounded"
                          />
                          <span>Outline</span>
                        </label>
                        <input
                          type="color"
                          value={overlays.bottomCaptionColor || '#ccff00'}
                          onChange={(e) => setOverlays({ bottomCaptionColor: e.target.value })}
                          className="w-6 h-6 rounded border border-white/10 bg-transparent cursor-pointer ml-auto"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Center Text (PART 5) */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">Arena Center Text</span>
                    <input
                      type="checkbox"
                      checked={overlays.showCenterText ?? false}
                      onChange={(e) => setOverlays({ showCenterText: e.target.checked })}
                      className="accent-cyan-400 rounded cursor-pointer"
                    />
                  </div>
                  {overlays.showCenterText && (
                    <>
                      <input
                        type="text"
                        value={overlays.centerText || ''}
                        onChange={(e) => setOverlays({ centerText: e.target.value })}
                        placeholder="e.g. @yourhandle"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-400"
                      />
                      <div className="space-y-1">
                        <div className="flex justify-between text-slate-400 text-[11px]">
                          <span>Opacity</span>
                          <span className="font-mono text-cyan-400">{Math.round((overlays.centerTextOpacity ?? 0.5) * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="1.0"
                          step="0.05"
                          value={overlays.centerTextOpacity ?? 0.5}
                          onChange={(e) => setOverlays({ centerTextOpacity: Number(e.target.value) })}
                          className="w-full accent-cyan-400"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            7. RECORDING SECTION (PART 6)
        ======================================================== */}
        {isSectionVisible('recording', ['length', 'duration', 'resolution', '1080', '1440', '4k', 'square', 'landscape', 'export']) && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
            <button
              onClick={() => toggleSection('recording')}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-black uppercase text-white tracking-wider">
                  Recording &amp; Output
                </span>
              </div>
              {openSections.recording ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
            </button>

            {openSections.recording && (
              <div className="p-3.5 pt-0 border-t border-white/5 space-y-3 mt-1 text-xs">
                {/* Recording Length (10 to 120s with quick pills) */}
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Target Length</span>
                    <span className="font-mono text-cyan-400 font-bold">{targetDuration}s</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="120"
                    value={targetDuration}
                    onChange={(e) => setTargetDuration(Number(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                  <div className="flex items-center gap-1.5 mt-2">
                    {[15, 30, 60, 90, 120].map((s) => (
                      <button
                        key={s}
                        onClick={() => setTargetDuration(s)}
                        className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${
                          targetDuration === s
                            ? 'btn-3d-cyan text-black'
                            : 'btn-3d-glass text-slate-400 hover:text-white'
                        }`}
                      >
                        {s}s
                      </button>
                    ))}
                  </div>
                </div>

                {/* Resolution Pills */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Canvas Resolution</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: '1080', label: '1080×1920' },
                      { id: '1440', label: '1440×2560' },
                      { id: '4k', label: '2160×3840' },
                      { id: 'square', label: '1080×1080' },
                      { id: 'landscape', label: '1920×1080' },
                    ].map((res) => (
                      <button
                        key={res.id}
                        onClick={() => setResolution(res.id as any)}
                        className={`py-1.5 px-1 rounded-xl text-[10.5px] font-bold transition-all text-center ${
                          resolution === res.id
                            ? 'btn-3d-cyan text-black'
                            : 'btn-3d-glass text-slate-400 hover:text-white'
                        }`}
                      >
                        {res.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={() => setSeedFinderOpen(true)}
                    className="btn-3d-glass flex-1 py-2 rounded-xl text-slate-300 hover:text-white flex items-center justify-center gap-1.5 font-bold"
                  >
                    <span>Auto-Seed Finder</span>
                  </button>
                  <button
                    onClick={() => setExportOpen(true)}
                    className="btn-3d-lime flex-1 py-2 rounded-xl text-black font-black uppercase flex items-center justify-center gap-1.5 shadow-md shadow-lime-500/20"
                  >
                    <Film className="w-3.5 h-3.5 text-black" />
                    <span>Export 4K</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            8. PRESETS SECTION (PART 7)
        ======================================================== */}
        {isSectionVisible('presets', ['preset', 'save', 'duplicate', 'share', 'export', 'import', 'guest']) && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
            <button
              onClick={() => toggleSection('presets')}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-[#CCFF00]" />
                <span className="text-xs font-black uppercase text-white tracking-wider">
                  Saved Presets
                </span>
              </div>
              {openSections.presets ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
            </button>

            {openSections.presets && (
              <div className="p-3.5 pt-0 border-t border-white/5 space-y-3 mt-1 text-xs">
                {/* Guest Storage Note */}
                {isGuest && (
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-[11px] text-cyan-200">
                    <span>presets saved locally (IndexedDB). </span>
                    <button onClick={() => openAuthModal('signup')} className="font-bold underline text-[#CCFF00]">
                      log in to keep these on all ur devices
                    </button>
                  </div>
                )}

                {/* Save Current Preset */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="Name this setup..."
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-400"
                  />
                  <button
                    onClick={handleSavePreset}
                    className="btn-3d-cyan px-3 py-1.5 rounded-xl text-black font-black flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Save</span>
                  </button>
                </div>

                {/* Hidden File Input for Preset Import */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json,application/json"
                  onChange={handleImportPresetFile}
                  className="hidden"
                />

                {/* Import / Export File Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-3d-glass flex-1 py-1.5 rounded-xl text-slate-300 hover:text-white flex items-center justify-center gap-1 text-[11px]"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Import JSON</span>
                  </button>
                </div>

                {/* Presets List */}
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {userPresets.length === 0 ? (
                    <div className="text-center py-4 text-slate-500 text-[11px]">
                      No custom presets saved yet.
                    </div>
                  ) : (
                    userPresets.map((preset) => (
                      <div
                        key={preset.id}
                        className="p-2 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between hover:border-white/15 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          {editingPresetId === preset.id ? (
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                renamePreset(preset.id, editingPresetName, currentUser?.id || null);
                                setEditingPresetId(null);
                              }}
                              className="flex items-center gap-1"
                            >
                              <input
                                type="text"
                                value={editingPresetName}
                                onChange={(e) => setEditingPresetName(e.target.value)}
                                className="bg-white/10 border border-white/20 rounded px-1.5 py-0.5 text-xs text-white"
                                autoFocus
                              />
                              <button type="submit" className="text-xs text-cyan-400 font-bold">✓</button>
                            </form>
                          ) : (
                            <span
                              onClick={() => loadPreset(preset)}
                              className="font-bold text-white cursor-pointer hover:text-cyan-300 truncate block text-xs"
                              title="Click to load preset"
                            >
                              {preset.name}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500 capitalize block">
                            {preset.modeId} • {preset.targetDuration}s
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <button
                            onClick={() => loadPreset(preset)}
                            className="btn-3d-cyan px-2 py-0.5 rounded-lg text-[10px] font-bold text-black"
                            title="Load preset"
                          >
                            Load
                          </button>
                          <button
                            onClick={() => handleSharePreset(preset)}
                            className="p-1 text-slate-400 hover:text-white"
                            title="Copy share link"
                          >
                            <Share2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => presetService.exportPresetToFile(preset)}
                            className="p-1 text-slate-400 hover:text-white"
                            title="Export to file"
                          >
                            <Download className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => duplicatePreset(preset.id, currentUser?.id || null)}
                            className="p-1 text-slate-400 hover:text-white"
                            title="Duplicate preset"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => deletePreset(preset.id, currentUser?.id || null)}
                            className="p-1 text-slate-500 hover:text-red-400"
                            title="Delete preset"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
