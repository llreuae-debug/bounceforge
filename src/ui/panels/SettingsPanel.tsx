import React, { useState, useRef, useMemo } from 'react';
import { useStudioStore } from '../../store/useStudioStore';
import { THEMES } from '../../render/themes';
import { BUILTIN_MELODIES } from '../../audio/melodies';
import { InstrumentType } from '../../audio/types';
import { AudioEngine } from '../../audio/audioEngine';
import { AsmrEngine, AsmrTextureType } from '../../audio/asmrEngine';
import { getDefaults, isModeAtDefault } from '../../modes/defaults';
import { checkGpu4KCapability } from '../../export/videoExporter';
import { getRandomHook, HOOK_CATEGORIES } from '../../engine/hooksLibrary';
import { AiHookSuggester } from '../components/AiHookSuggester';
import { AiLabelSuggester } from '../components/AiLabelSuggester';
import { SeoPackViewer } from '../components/SeoPackViewer';
import { ALL_MODES } from '../../modes/registry';
import { AiService, DEFAULT_AI_SETTINGS, AiUserSettings } from '../../ai/aiService';
import { TrendsManager } from '../../ai/trendsManager';
import { SupportedLanguage, HookStyle } from '../../ai/offlineEngine';
import { generateSeoPack } from '../../ai/seoEngine';

import {
  Sliders,
  Sparkles,
  Volume2,
  Tv,
  RotateCcw,
  AlertTriangle,
  Activity,
  ShieldAlert,
  Check,
  Film,
  Info,
  Copy,
  Smartphone,
  Cpu,
  Gauge,
  Vibrate,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Clock,
  Compass,
  Trash2,
  ExternalLink,
  Bot,
} from 'lucide-react';
import { detectCapabilities, generateDiagnosticReport, DeviceCapabilities } from '../../platform/capabilities';
import { triggerHaptic } from '../../platform/haptics';

interface ControlWrapperProps {
  label: string;
  valueDisplay?: React.ReactNode;
  isModified: boolean;
  onReset: () => void;
  children: React.ReactNode;
  description?: string;
}

export interface SettingsPanelProps {
  className?: string;
  onClose?: () => void;
}

const ControlWrapper: React.FC<ControlWrapperProps> = ({
  label,
  valueDisplay,
  isModified,
  onReset,
  children,
  description,
}) => {
  const touchTimer = useRef<NodeJS.Timeout | null>(null);

  const handleTouchStart = () => {
    touchTimer.current = setTimeout(() => {
      onReset();
    }, 550);
  };

  const handleTouchEnd = () => {
    if (touchTimer.current) clearTimeout(touchTimer.current);
  };

  return (
    <div
      onDoubleClick={onReset}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="group transition-colors rounded-xl p-1 -m-1 hover:bg-white/[0.03]"
      title="double-click or long-press to reset this control"
    >
      <div className="flex justify-between items-center text-xs text-slate-300 mb-1">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-200">{label}</span>
          {isModified && (
            <span
              className="w-1.5 h-1.5 rounded-full bg-[#CCFF00] shadow-[0_0_6px_#CCFF00] inline-block"
              title="modified from default (double-click to reset)"
            />
          )}
        </div>
        {valueDisplay && <div className="font-mono text-cyan-400 text-[11px] font-bold">{valueDisplay}</div>}
      </div>
      {description && <p className="text-[10px] text-slate-400 mb-1.5">{description}</p>}
      {children}
    </div>
  );
};

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ className, onClose }) => {
  const {
    currentModeId,
    modeSettings,
    updateModeSetting,
    seed,
    visuals,
    setVisuals,
    overlays,
    setOverlays,
    audioSettings,
    setAudioSettings,
    asmrSettings,
    setAsmrSettings,
    backingGenre,
    setBackingGenre,
    generativeScale,
    setGenerativeScale,
    generativeMood,
    setGenerativeMood,
    setCustomNotes,
    resetModeToDefault,
    resetSection,
    resetSingleSetting,
    factoryReset,
    setSelfTestOpen,
    qualityMode,
    setQualityMode,
    currentQualityTier,
    hapticsEnabled,
    setHapticsEnabled,
    capabilities,
    setCapabilities,
    showToast,
    setWhatNextOpen,
    setTrendsAdminOpen,
  } = useStudioStore();

  const [activeTab, setActiveTab] = useState<'physics' | 'visuals' | 'audio' | 'overlays' | 'ai' | 'diagnostics'>('physics');
  const [soundSubTab, setSoundSubTab] = useState<'music' | 'asmr' | 'beat' | 'mix'>('music');
  const [showFactoryModal, setShowFactoryModal] = useState(false);
  const [alsoDeleteSaved, setAlsoDeleteSaved] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Growth Tools & AI state
  const currentMode = useMemo(() => ALL_MODES.find((m) => m.id === currentModeId) || ALL_MODES[0], [currentModeId]);
  const [aiSettings, setAiSettings] = useState<AiUserSettings>(AiService.getInstance().getSettings());
  const [savedHooks, setSavedHooks] = useState<string[]>(AiService.getInstance().getMyHooks());
  const [trendsMeta, setTrendsMeta] = useState<{ updated: string; isOutdated: boolean }>({ updated: '', isOutdated: false });

  // Compute live draft SEO pack for current studio configuration
  const draftSeoPack = useMemo(() => {
    return generateSeoPack({
      modeName: currentMode.name,
      modeId: currentMode.id,
      category: currentMode.category,
      hookText: overlays.titleText || 'can it escape??',
      seed: seed,
    });
  }, [currentMode, overlays.titleText, seed]);

  React.useEffect(() => {
    TrendsManager.getInstance().getTrends().then((res) => {
      setTrendsMeta({ updated: res.data.updated, isOutdated: res.isOutdated });
    });
  }, [activeTab]);

  const handleUpdateAiSettings = (updates: Partial<AiUserSettings>) => {
    AiService.getInstance().updateSettings(updates);
    setAiSettings(AiService.getInstance().getSettings());
  };

  const handleResetAiSettings = () => {
    AiService.getInstance().updateSettings(DEFAULT_AI_SETTINGS);
    setAiSettings(DEFAULT_AI_SETTINGS);
    showToast('AI defaults restored');
  };

  const handleRemoveHook = (hook: string) => {
    AiService.getInstance().removeHook(hook);
    setSavedHooks(AiService.getInstance().getMyHooks());
    showToast('hook removed from library');
  };

  // Auto-detect capabilities if not already loaded
  React.useEffect(() => {
    if (!capabilities) {
      detectCapabilities().then(setCapabilities);
    }
  }, [capabilities, setCapabilities]);

  const handleCopyReport = () => {
    if (!capabilities) return;
    const report = generateDiagnosticReport(capabilities);
    navigator.clipboard.writeText(report);
    triggerHaptic(15);
    showToast('device report copied to clipboard');
  };

  const defaults = getDefaults(currentModeId);

  const isCurrentModeDefault = isModeAtDefault(currentModeId, {
    seed,
    modeSettings,
    visuals,
    overlays,
    audioSettings,
  });

  const instruments: { id: InstrumentType; name: string; tag: string }[] = [
    { id: 'grandPiano', name: 'Grand Piano', tag: 'Classic' },
    { id: 'waterDrop', name: 'Water Drop', tag: 'Viral ASMR' },
    { id: 'kalimba', name: 'Kalimba', tag: 'Chime' },
    { id: 'subBass808', name: '808 Sub Bass', tag: 'Trap Kick' },
    { id: 'musicBox', name: 'Music Box', tag: 'Chime' },
    { id: 'woodblock', name: 'Woodblock', tag: 'Percussion' },
    { id: 'marimba', name: 'Marimba', tag: 'Wooden' },
    { id: 'sinePop', name: 'Sine Pop', tag: 'Rubber ASMR' },
    { id: 'glass', name: 'Crystal Glass', tag: 'Harmonic' },
    { id: 'metallicAnvil', name: 'Metallic Anvil', tag: 'Forge' },
    { id: 'bellGlock', name: 'Bell / Glock', tag: 'Bell' },
    { id: 'soapBubble', name: 'Soap Bubble', tag: 'Pop ASMR' },
    { id: 'celesta', name: 'Celesta', tag: 'Bell Piano' },
    { id: 'vibraphone', name: 'Vibraphone', tag: 'Jazz Mallet' },
    { id: 'japaneseKoto', name: 'Japanese Koto', tag: 'Pluck' },
    { id: 'pluckHarp', name: 'Pluck / Harp', tag: 'String' },
    { id: 'guitarHarmonic', name: 'Guitar Chime', tag: 'Acoustic' },
    { id: 'steelDrum', name: 'Steel Drum', tag: 'Steelpan' },
    { id: 'square8bit', name: '8-Bit Square', tag: 'NES Retro' },
    { id: 'chiptunePulse', name: 'Chiptune Pulse', tag: 'Arcade' },
    { id: 'laserBounce', name: 'Laser Bounce', tag: 'Sci-Fi' },
    { id: 'synthLead', name: 'Synth Lead', tag: 'Analog' },
    { id: 'softPad', name: 'Soft Pad', tag: 'Dreamy' },
    { id: 'snareRimshot', name: 'Snare Rimshot', tag: 'Acoustic Beat' },
  ];

  const handleAuditionTexture = (tex: AsmrTextureType) => {
    AsmrEngine.getInstance().playTexture(tex);
  };

  const handleGenerateMelody = () => {
    const notes = GenerativeMusicEngine.generateMelody('C', 4, generativeScale, generativeMood, 32);
    setCustomNotes(notes);
    AudioEngine.getInstance().setCustomMelody(notes, `Procedural ${generativeScale}`);
  };

  const handleConfirmFactoryReset = async () => {
    setIsResetting(true);
    await factoryReset(alsoDeleteSaved);
    setIsResetting(false);
    setShowFactoryModal(false);
  };

  const gpuStatus = checkGpu4KCapability();

  return (
    <aside className={className || "w-92 h-[calc(100vh-4rem)] border-l border-white/10 bg-[#07090e]/90 backdrop-blur-md flex flex-col select-none shrink-0 font-sans"}>
      {/* Settings Panel Header with Master Reset to Default Button */}
      <div className="px-3.5 py-2.5 border-b border-white/10 flex items-center justify-between bg-white/[0.03]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-[#CCFF00] shadow-[0_0_10px_#CCFF00] shrink-0" />
          <span className="text-xs font-black text-white tracking-wider uppercase truncate">
            {currentModeId}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Master Reset to Default 3D Button */}
          <button
            onClick={() => resetModeToDefault()}
            disabled={isCurrentModeDefault}
            title={isCurrentModeDefault ? 'mode is already at default' : 'reset current mode to default (Shift+R)'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-extrabold tracking-tight transition-all ${
              isCurrentModeDefault
                ? 'opacity-40 cursor-not-allowed border border-white/10 bg-white/[0.03] text-slate-500 shadow-none'
                : 'btn-3d-reset-pill'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="whitespace-nowrap">reset to default</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl btn-3d-glass text-slate-300 hover:text-white text-xs font-bold"
              title="Close panel"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs - Perfectly Aligned 3D Tactile Tabs (Zero Truncation) */}
      <div className="grid grid-cols-5 border-b border-white/10 p-1.5 gap-1 bg-white/[0.02] shrink-0">
        <button
          onClick={() => setActiveTab('physics')}
          className={`tab-3d py-1.5 px-0.5 rounded-xl text-[10.5px] font-extrabold tracking-tight flex items-center justify-center gap-1 min-w-0 ${
            activeTab === 'physics'
              ? 'tab-3d-active bg-cyan-500/20 text-cyan-300 border-cyan-400/50 border-b-cyan-400 shadow-[0_2px_0_0_#007380,0_4px_12px_rgba(6,182,212,0.25)]'
              : 'tab-3d-inactive'
          }`}
          title="Physics & Simulation Parameters"
        >
          <Sliders className="w-3 h-3 shrink-0" />
          <span className="whitespace-nowrap">physics</span>
        </button>

        <button
          onClick={() => setActiveTab('visuals')}
          className={`tab-3d py-1.5 px-0.5 rounded-xl text-[10.5px] font-extrabold tracking-tight flex items-center justify-center gap-1 min-w-0 ${
            activeTab === 'visuals'
              ? 'tab-3d-active bg-emerald-500/20 text-emerald-300 border-emerald-400/50 border-b-emerald-400 shadow-[0_2px_0_0_#065f46,0_4px_12px_rgba(160,255,200,0.2)]'
              : 'tab-3d-inactive'
          }`}
          title="Visual Effects & Shaders"
        >
          <Sparkles className="w-3 h-3 shrink-0" />
          <span className="whitespace-nowrap">visuals</span>
        </button>

        <button
          onClick={() => setActiveTab('audio')}
          className={`tab-3d py-1.5 px-0.5 rounded-xl text-[10.5px] font-extrabold tracking-tight flex items-center justify-center gap-1 min-w-0 ${
            activeTab === 'audio'
              ? 'tab-3d-active bg-purple-500/20 text-purple-300 border-purple-400/50 border-b-purple-400 shadow-[0_2px_0_0_#581c87,0_4px_12px_rgba(168,85,247,0.25)]'
              : 'tab-3d-inactive'
          }`}
          title="Synthesizers, Notes & Scales"
        >
          <Volume2 className="w-3 h-3 shrink-0" />
          <span className="whitespace-nowrap">sound</span>
        </button>

        <button
          onClick={() => setActiveTab('overlays')}
          className={`tab-3d py-1.5 px-0.5 rounded-xl text-[10.5px] font-extrabold tracking-tight flex items-center justify-center gap-1 min-w-0 ${
            activeTab === 'overlays'
              ? 'tab-3d-active bg-amber-500/20 text-amber-300 border-amber-400/50 border-b-amber-400 shadow-[0_2px_0_0_#78350f,0_4px_12px_rgba(245,158,11,0.25)]'
              : 'tab-3d-inactive'
          }`}
          title="Viral Overlays & Hooks"
        >
          <Tv className="w-3 h-3 shrink-0" />
          <span className="whitespace-nowrap">hooks</span>
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`tab-3d py-1.5 px-0.5 rounded-xl text-[10.5px] font-extrabold tracking-tight flex items-center justify-center gap-1 min-w-0 ${
            activeTab === 'ai'
              ? 'tab-3d-active bg-pink-500/20 text-pink-300 border-pink-400/50 border-b-pink-400 shadow-[0_2px_0_0_#831843,0_4px_12px_rgba(244,114,182,0.25)]'
              : 'tab-3d-inactive'
          }`}
          title="AI Growth Tools, SEO Packs & Strategy"
        >
          <Sparkles className="w-3 h-3 shrink-0 text-pink-400" />
          <span className="whitespace-nowrap">ai &amp; seo</span>
        </button>

        <button
          onClick={() => setActiveTab('diagnostics')}
          className={`tab-3d py-1.5 px-0.5 rounded-xl text-[10.5px] font-extrabold tracking-tight flex items-center justify-center gap-1 min-w-0 ${
            activeTab === 'diagnostics'
              ? 'tab-3d-active bg-red-500/20 text-red-300 border-red-400/50 border-b-red-400 shadow-[0_2px_0_0_#7f1d1d,0_4px_12px_rgba(239,68,68,0.25)]'
              : 'tab-3d-inactive'
          }`}
          title="Performance Diagnostics & System"
        >
          <Activity className="w-3 h-3 shrink-0" />
          <span className="whitespace-nowrap">system</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* 1. PHYSICS & RINGS SECTION */}
        {activeTab === 'physics' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-white/10">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                physics &amp; rings
              </h3>
              <button
                onClick={() => resetSection('physics')}
                aria-label="reset physics to default"
                className="btn-3d-glass p-1 px-2.5 rounded-xl text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-[11px] font-bold"
                title="reset physics to default"
              >
                <RotateCcw className="w-3 h-3 stroke-[2.2]" />
                <span className="text-[10px]">reset</span>
              </button>
            </div>

            {/* Dynamic and standard controls */}
            {modeSettings.ringCount !== undefined && (
              <ControlWrapper
                label="Ring Count"
                valueDisplay={modeSettings.ringCount}
                isModified={modeSettings.ringCount !== defaults.modeSettings.ringCount}
                onReset={() => resetSingleSetting('ringCount', defaults.modeSettings.ringCount, 'mode')}
              >
                <input
                  type="range"
                  min="4"
                  max="40"
                  value={modeSettings.ringCount}
                  onChange={(e) => updateModeSetting('ringCount', Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </ControlWrapper>
            )}

            {modeSettings.gapSizeDeg !== undefined && (
              <ControlWrapper
                label="Gap Size"
                valueDisplay={`${modeSettings.gapSizeDeg}°`}
                isModified={modeSettings.gapSizeDeg !== defaults.modeSettings.gapSizeDeg}
                onReset={() => resetSingleSetting('gapSizeDeg', defaults.modeSettings.gapSizeDeg, 'mode')}
              >
                <input
                  type="range"
                  min="15"
                  max="75"
                  value={modeSettings.gapSizeDeg}
                  onChange={(e) => updateModeSetting('gapSizeDeg', Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </ControlWrapper>
            )}

            {modeSettings.speed !== undefined && (
              <ControlWrapper
                label="Spin Speed"
                valueDisplay={`${modeSettings.speed}x`}
                isModified={modeSettings.speed !== defaults.modeSettings.speed}
                onReset={() => resetSingleSetting('speed', defaults.modeSettings.speed, 'mode')}
              >
                <input
                  type="range"
                  min="0.2"
                  max="4.0"
                  step="0.1"
                  value={modeSettings.speed}
                  onChange={(e) => updateModeSetting('speed', Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </ControlWrapper>
            )}

            {modeSettings.maxBalls !== undefined && (
              <ControlWrapper
                label="Max Ball Cap"
                valueDisplay={modeSettings.maxBalls}
                isModified={modeSettings.maxBalls !== defaults.modeSettings.maxBalls}
                onReset={() => resetSingleSetting('maxBalls', defaults.modeSettings.maxBalls, 'mode')}
              >
                <input
                  type="range"
                  min="50"
                  max="5000"
                  step="50"
                  value={modeSettings.maxBalls}
                  onChange={(e) => updateModeSetting('maxBalls', Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </ControlWrapper>
            )}

            {modeSettings.gravity !== undefined && (
              <ControlWrapper
                label="Gravity"
                valueDisplay={`${modeSettings.gravity}g`}
                isModified={modeSettings.gravity !== defaults.modeSettings.gravity}
                onReset={() => resetSingleSetting('gravity', defaults.modeSettings.gravity, 'mode')}
              >
                <input
                  type="range"
                  min="0"
                  max="3"
                  step="0.1"
                  value={modeSettings.gravity}
                  onChange={(e) => updateModeSetting('gravity', Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </ControlWrapper>
            )}

            {modeSettings.bounciness !== undefined && (
              <ControlWrapper
                label="Bounciness (Restitution)"
                valueDisplay={`${Math.round(modeSettings.bounciness * 100)}%`}
                isModified={modeSettings.bounciness !== defaults.modeSettings.bounciness}
                onReset={() => resetSingleSetting('bounciness', defaults.modeSettings.bounciness, 'mode')}
              >
                <input
                  type="range"
                  min="0.5"
                  max="1.2"
                  step="0.05"
                  value={modeSettings.bounciness}
                  onChange={(e) => updateModeSetting('bounciness', Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </ControlWrapper>
            )}

            {/* Any remaining settings for advanced modes */}
            {Object.entries(modeSettings).map(([key, val]) => {
              if (['ringCount', 'gapSizeDeg', 'speed', 'maxBalls', 'gravity', 'bounciness'].includes(key)) return null;
              if (typeof val === 'number') {
                const defVal = defaults.modeSettings[key] ?? val;
                return (
                  <ControlWrapper
                    key={key}
                    label={key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    valueDisplay={val}
                    isModified={val !== defVal}
                    onReset={() => resetSingleSetting(key, defVal, 'mode')}
                  >
                    <input
                      type="range"
                      min={Math.min(0, val)}
                      max={Math.max(val * 2, 10)}
                      step={Number.isInteger(val) ? 1 : 0.1}
                      value={val}
                      onChange={(e) => updateModeSetting(key, Number(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                  </ControlWrapper>
                );
              }
              if (typeof val === 'string') {
                const defVal = defaults.modeSettings[key] ?? val;
                return (
                  <ControlWrapper
                    key={key}
                    label={key === 'names' ? 'Contestant Names' : key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    valueDisplay={val}
                    isModified={val !== defVal}
                    onReset={() => resetSingleSetting(key, defVal, 'mode')}
                  >
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={val}
                        onChange={(e) => updateModeSetting(key, e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-400 font-mono"
                      />
                      {(key === 'names' || key.toLowerCase().includes('contestant') || currentMode.category === 'battle' || currentMode.id.includes('battle')) && (
                        <AiLabelSuggester
                          type="contestant_names"
                          currentValue={val}
                          onApply={(newNames) => updateModeSetting(key, newNames)}
                          modeName={currentMode.name}
                          category={currentMode.category}
                          labelTitle="ai suggest contestant names"
                        />
                      )}
                    </div>
                  </ControlWrapper>
                );
              }
              return null;
            })}
          </div>
        )}

        {/* 2. VISUALS SECTION */}
        {activeTab === 'visuals' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-white/10">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                visuals &amp; themes
              </h3>
              <button
                onClick={() => resetSection('visuals')}
                aria-label="reset visuals to default"
                className="btn-3d-glass p-1 px-2.5 rounded-xl text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-[11px] font-bold"
                title="reset visuals to default"
              >
                <RotateCcw className="w-3 h-3 stroke-[2.2]" />
                <span className="text-[10px]">reset</span>
              </button>
            </div>

            {/* Theme Selector */}
            <ControlWrapper
              label="Color Theme"
              valueDisplay={visuals.themeId}
              isModified={visuals.themeId !== defaults.visuals.themeId}
              onReset={() => resetSingleSetting('themeId', defaults.visuals.themeId, 'visuals')}
            >
              <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                {Object.values(THEMES).map((th) => (
                  <button
                    key={th.id}
                    onClick={() => setVisuals({ themeId: th.id })}
                    className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all ${
                      visuals.themeId === th.id
                        ? 'border-emerald-400 bg-emerald-500/20 text-white'
                        : 'border-white/5 bg-white/[0.03] text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: th.ballDefault }}
                    />
                    <span className="text-[11px] font-bold truncate">{th.name}</span>
                  </button>
                ))}
              </div>
            </ControlWrapper>

            {/* Bloom Intensity */}
            <ControlWrapper
              label="Neon Bloom Glow"
              valueDisplay={`${visuals.bloomIntensity}x`}
              isModified={visuals.bloomIntensity !== defaults.visuals.bloomIntensity}
              onReset={() => resetSingleSetting('bloomIntensity', defaults.visuals.bloomIntensity, 'visuals')}
            >
              <input
                type="range"
                min="0"
                max="2.5"
                step="0.1"
                value={visuals.bloomIntensity}
                onChange={(e) => setVisuals({ bloomIntensity: Number(e.target.value) })}
                className="w-full accent-emerald-400"
              />
            </ControlWrapper>

            {/* Trail Length */}
            <ControlWrapper
              label="Motion Trail Length"
              valueDisplay={visuals.trailLength}
              isModified={visuals.trailLength !== defaults.visuals.trailLength}
              onReset={() => resetSingleSetting('trailLength', defaults.visuals.trailLength, 'visuals')}
            >
              <input
                type="range"
                min="0"
                max="40"
                value={visuals.trailLength}
                onChange={(e) => setVisuals({ trailLength: Number(e.target.value) })}
                className="w-full accent-emerald-400"
              />
            </ControlWrapper>

            {/* Screen Shake */}
            <ControlWrapper
              label="Impact Screen Shake"
              valueDisplay={`${visuals.screenShakeIntensity}x`}
              isModified={visuals.screenShakeIntensity !== defaults.visuals.screenShakeIntensity}
              onReset={() => resetSingleSetting('screenShakeIntensity', defaults.visuals.screenShakeIntensity, 'visuals')}
            >
              <input
                type="range"
                min="0"
                max="2.0"
                step="0.1"
                value={visuals.screenShakeIntensity}
                onChange={(e) => setVisuals({ screenShakeIntensity: Number(e.target.value) })}
                className="w-full accent-emerald-400"
              />
            </ControlWrapper>

            {/* Toggles */}
            <div className="pt-2 border-t border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300 font-bold">Chromatic Bounce Flash</span>
                <input
                  type="checkbox"
                  checked={visuals.chromaticFlash}
                  onChange={(e) => setVisuals({ chromaticFlash: e.target.checked })}
                  className="accent-emerald-400"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300 font-bold">Slow-Motion Climax End</span>
                <input
                  type="checkbox"
                  checked={visuals.slowMotionEnd}
                  onChange={(e) => setVisuals({ slowMotionEnd: e.target.checked })}
                  className="accent-emerald-400"
                />
              </div>
            </div>
          </div>
        )}



        {/* 3. SOUND PANEL */}
        {activeTab === 'audio' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-white/10">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                sound &amp; asmr
              </h3>
              <button
                onClick={() => resetSection('sound')}
                aria-label="reset sound to default"
                className="btn-3d-glass p-1 px-2.5 rounded-xl text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-[11px] font-bold"
                title="reset sound to default"
              >
                <RotateCcw className="w-3 h-3 stroke-[2.2]" />
                <span className="text-[10px]">reset</span>
              </button>
            </div>

            {/* Sub-Tabs - 3D Buttons */}
            <div className="flex border-b border-white/10 pb-2 gap-1.5">
              <button
                onClick={() => setSoundSubTab('music')}
                className={`flex-1 py-1 text-[11px] font-bold rounded-xl transition-all ${
                  soundSubTab === 'music'
                    ? 'tab-3d-active bg-purple-500/20 text-purple-300 border border-purple-400/50 border-b-2 border-b-purple-400 shadow-[0_2px_0_0_#581c87]'
                    : 'btn-3d-glass text-slate-400 hover:text-slate-200'
                }`}
              >
                music
              </button>
              <button
                onClick={() => setSoundSubTab('asmr')}
                className={`flex-1 py-1 text-[11px] font-bold rounded-xl transition-all ${
                  soundSubTab === 'asmr'
                    ? 'tab-3d-active bg-pink-500/20 text-pink-300 border border-pink-400/50 border-b-2 border-b-pink-400 shadow-[0_2px_0_0_#831843]'
                    : 'btn-3d-glass text-slate-400 hover:text-slate-200'
                }`}
              >
                asmr
              </button>
              <button
                onClick={() => setSoundSubTab('beat')}
                className={`flex-1 py-1 text-[11px] font-bold rounded-xl transition-all ${
                  soundSubTab === 'beat'
                    ? 'tab-3d-active bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 border-b-2 border-b-cyan-400 shadow-[0_2px_0_0_#007380]'
                    : 'btn-3d-glass text-slate-400 hover:text-slate-200'
                }`}
              >
                beat
              </button>
              <button
                onClick={() => setSoundSubTab('mix')}
                className={`flex-1 py-1 text-[11px] font-bold rounded-lg ${
                  soundSubTab === 'mix' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400'
                }`}
              >
                mix
              </button>
            </div>

            {soundSubTab === 'music' && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-slate-300 font-bold">Ball Sound Synthesizer (24 Instruments)</span>
                    <span className="text-[10px] text-purple-300 font-mono bg-purple-500/20 px-1.5 py-0.5 rounded border border-purple-400/30">
                      {audioSettings.instrument}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-1">
                    {instruments.map((inst) => (
                      <button
                        key={inst.id}
                        onClick={() => {
                          setAudioSettings({ instrument: inst.id });
                          AudioEngine.getInstance().updateSettings({ instrument: inst.id });
                        }}
                        className={`p-2 rounded-xl border text-left text-xs transition-all flex flex-col justify-between gap-1 ${
                          audioSettings.instrument === inst.id
                            ? 'border-purple-400 bg-purple-500/25 text-white font-bold shadow-md shadow-purple-500/15'
                            : 'border-white/5 bg-white/[0.03] text-slate-400 hover:bg-white/[0.07] hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate">{inst.name}</span>
                          <span className="text-[9px] px-1 py-0.5 rounded bg-white/5 text-slate-400 font-mono">
                            {inst.tag}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sound Modes (Melody, Pentatonic, Chord Arp, Pitch Ramp) */}
                <div className="pt-2 border-t border-white/10 space-y-2">
                  <span className="text-xs text-slate-300 block font-bold">Ball Sound Variations</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'melody', label: 'Melody Stepper', desc: 'Song sequence' },
                      { id: 'pentatonic', label: 'Pentatonic Harmony', desc: 'Harmonic in-key' },
                      { id: 'chordArp', label: 'Chord Arpeggio', desc: '1-3-5 triad climb' },
                      { id: 'pitchSpeed', label: 'Speed Pitch Ramp', desc: 'Velocity pitch' },
                    ].map((modeOption) => (
                      <button
                        key={modeOption.id}
                        onClick={() => {
                          setAudioSettings({ soundMode: modeOption.id as any });
                          AudioEngine.getInstance().updateSettings({ soundMode: modeOption.id as any });
                        }}
                        className={`p-2 rounded-xl border text-left transition-all ${
                          (audioSettings.soundMode || 'melody') === modeOption.id
                            ? 'border-cyan-400 bg-cyan-500/20 text-white font-bold'
                            : 'border-white/5 bg-white/[0.02] text-slate-400 hover:bg-white/[0.05]'
                        }`}
                      >
                        <span className="text-xs block text-white font-medium">{modeOption.label}</span>
                        <span className="text-[10px] text-slate-400 block">{modeOption.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Spatial Stereo Panning & Tactile ASMR Toggles */}
                <div className="pt-2 border-t border-white/10 space-y-2">
                  <label className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5 cursor-pointer text-xs text-slate-300">
                    <span className="font-medium">Spatial Stereo Panning (Ball X Pos)</span>
                    <input
                      type="checkbox"
                      checked={audioSettings.stereoPanning !== false}
                      onChange={(e) => {
                        setAudioSettings({ stereoPanning: e.target.checked });
                        AudioEngine.getInstance().updateSettings({ stereoPanning: e.target.checked });
                      }}
                      className="accent-cyan-400 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5 cursor-pointer text-xs text-slate-300">
                    <span className="font-medium">Tactile ASMR Impact Layer (Pop / Thud)</span>
                    <input
                      type="checkbox"
                      checked={audioSettings.asmrLayer !== false}
                      onChange={(e) => {
                        setAudioSettings({ asmrLayer: e.target.checked });
                        AudioEngine.getInstance().updateSettings({ asmrLayer: e.target.checked });
                      }}
                      className="accent-purple-400 rounded"
                    />
                  </label>
                </div>

                <div className="pt-2 border-t border-white/10 space-y-2">
                  <span className="text-xs text-slate-300 block font-bold">Generative Procedural Melody</span>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={generativeScale}
                      onChange={(e) => setGenerativeScale(e.target.value as any)}
                      className="bg-white/5 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white outline-none"
                    >
                      <option value="pentatonic">Pentatonic</option>
                      <option value="major">Major</option>
                      <option value="minor">Minor</option>
                      <option value="dorian">Dorian</option>
                      <option value="hijaz">Hijaz Exotic</option>
                      <option value="japaneseInSen">Japanese In-Sen</option>
                    </select>

                    <select
                      value={generativeMood}
                      onChange={(e) => setGenerativeMood(e.target.value as any)}
                      className="bg-white/5 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white outline-none"
                    >
                      <option value="dreamy">Dreamy</option>
                      <option value="hype">Hype</option>
                      <option value="dark">Dark</option>
                      <option value="lofi">Lofi</option>
                      <option value="epic">Epic</option>
                    </select>
                  </div>

                  <button
                    onClick={handleGenerateMelody}
                    className="w-full py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95"
                  >
                    🎲 generate new procedural track
                  </button>
                </div>
              </div>
            )}

            {soundSubTab === 'asmr' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5">
                  <div>
                    <span className="text-xs text-slate-300 font-bold block">Headphones Mode</span>
                    <span className="text-[10px] text-slate-400 block lowercase">wider stereo + close-mic detail + high-shelf boost</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={asmrSettings.headphonesMode !== false}
                    onChange={(e) => {
                      setAsmrSettings({ headphonesMode: e.target.checked });
                      AsmrEngine.getInstance().setHeadphonesMode(e.target.checked);
                    }}
                    className="accent-pink-400 w-4 h-4 cursor-pointer"
                  />
                </div>

                {/* ASMR Intensity Slider / Segmented Buttons */}
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300 font-bold">ASMR Intensity</span>
                    <span className="text-[10px] font-mono text-pink-400 uppercase font-black">
                      {asmrSettings.asmrIntensity || 'balanced'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 pt-1">
                    {(['subtle', 'balanced', 'max_tingles'] as const).map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => {
                          setAsmrSettings({ asmrIntensity: lvl });
                          AsmrEngine.getInstance().setAsmrIntensity(lvl);
                        }}
                        className={`py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                          (asmrSettings.asmrIntensity || 'balanced') === lvl
                            ? 'btn-3d-pink text-white shadow-pink-500/30'
                            : 'btn-3d-glass text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {lvl === 'max_tingles' ? 'max tingles' : lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-xs text-slate-300 font-bold">Binaural 3D Spatial Audio</span>
                  <input
                    type="checkbox"
                    checked={asmrSettings.asmrMode}
                    onChange={(e) => {
                      setAsmrSettings({ asmrMode: e.target.checked });
                      AsmrEngine.getInstance().setAsmrMode(e.target.checked);
                    }}
                    className="accent-pink-400 w-4 h-4 cursor-pointer"
                  />
                </div>


                <ControlWrapper
                  label="Impact ASMR Strength"
                  valueDisplay={`${Math.round(asmrSettings.impactVolume * 100)}%`}
                  isModified={asmrSettings.impactVolume !== defaults.asmrSettings.impactVolume}
                  onReset={() => resetSingleSetting('impactVolume', defaults.asmrSettings.impactVolume, 'asmr')}
                >
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.05"
                    value={asmrSettings.impactVolume}
                    onChange={(e) => setAsmrSettings({ impactVolume: Number(e.target.value) })}
                    className="w-full accent-pink-400"
                  />
                </ControlWrapper>

                <ControlWrapper
                  label="Destruction / Shatter ASMR"
                  valueDisplay={`${Math.round(asmrSettings.destructionVolume * 100)}%`}
                  isModified={asmrSettings.destructionVolume !== defaults.asmrSettings.destructionVolume}
                  onReset={() => resetSingleSetting('destructionVolume', defaults.asmrSettings.destructionVolume, 'asmr')}
                >
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.05"
                    value={asmrSettings.destructionVolume}
                    onChange={(e) => setAsmrSettings({ destructionVolume: Number(e.target.value) })}
                    className="w-full accent-pink-400"
                  />
                </ControlWrapper>
              </div>
            )}

            {soundSubTab === 'mix' && (
              <div className="space-y-3">
                <ControlWrapper
                  label="Master Synth Volume"
                  valueDisplay={`${Math.round(audioSettings.masterVolume * 100)}%`}
                  isModified={audioSettings.masterVolume !== defaults.audioSettings.masterVolume}
                  onReset={() => resetSingleSetting('masterVolume', defaults.audioSettings.masterVolume, 'audio')}
                >
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={audioSettings.masterVolume}
                    onChange={(e) => setAudioSettings({ masterVolume: Number(e.target.value) })}
                    className="w-full accent-amber-400"
                  />
                </ControlWrapper>

                <ControlWrapper
                  label="Reverb Space"
                  valueDisplay={`${Math.round(audioSettings.reverbAmount * 100)}%`}
                  isModified={audioSettings.reverbAmount !== defaults.audioSettings.reverbAmount}
                  onReset={() => resetSingleSetting('reverbAmount', defaults.audioSettings.reverbAmount, 'audio')}
                >
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={audioSettings.reverbAmount}
                    onChange={(e) => setAudioSettings({ reverbAmount: Number(e.target.value) })}
                    className="w-full accent-amber-400"
                  />
                </ControlWrapper>
              </div>
            )}
          </div>
        )}

        {/* 6. VIRAL HOOKS, OVERLAYS & SAFE AREA */}
        {activeTab === 'overlays' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-1 border-b border-white/10">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                hooks &amp; safe areas
              </h3>
              <button
                onClick={() => resetSection('overlays')}
                aria-label="reset overlays to default"
                className="btn-3d-glass p-1 px-2.5 rounded-xl text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-[11px] font-bold"
                title="reset overlays to default"
              >
                <RotateCcw className="w-3 h-3 stroke-[2.2]" />
                <span className="text-[10px]">reset</span>
              </button>
            </div>

            {/* Hook Title */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-200 font-bold">Top Hook Title (50+ Library)</span>
                <input
                  type="checkbox"
                  checked={overlays.showTitle}
                  onChange={(e) => setOverlays({ showTitle: e.target.checked })}
                  className="accent-amber-400"
                />
              </div>
              {overlays.showTitle && (
                <div className="space-y-2.5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={overlays.titleText}
                      onChange={(e) => setOverlays({ titleText: e.target.value })}
                      placeholder="can it escape?? 🔥"
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-amber-400 font-medium"
                    />
                    <button
                      onClick={() => {
                        const randomHook = getRandomHook();
                        setOverlays({ titleText: randomHook });
                      }}
                      className="btn-3d-cyan px-3 py-1.5 rounded-xl text-black font-black text-[11px] uppercase tracking-wider shrink-0"
                      title="Roll random viral hook from 50+ library"
                    >
                      🎲 roll hook
                    </button>
                  </div>

                  {/* AI Hook Suggester (6 cards, safe area fit, styles, languages) */}
                  <AiHookSuggester
                    currentText={overlays.titleText}
                    onApplyHook={(hook) => setOverlays({ titleText: hook })}
                    modeName={currentMode.name}
                    category={currentMode.category}
                  />

                  {/* Hook Category Chips */}
                  <div className="flex flex-wrap gap-1">
                    {HOOK_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          const h = getRandomHook(cat.id);
                          setOverlays({ titleText: h });
                        }}
                        className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-slate-400 hover:text-cyan-300 text-[10px] font-mono border border-white/5 lowercase"
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>

                  {overlays.titleText.length > 36 && (
                    <div className="flex items-center gap-1.5 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>heads up: ur text is under the buttons</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Prediction Intro Card (2s) */}
            <div className="pt-2 border-t border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-200 font-bold block">Prediction Intro Card</span>
                  <span className="text-[10px] text-slate-400">2-second 'pick ur color' screen to drive comments</span>
                </div>
                <input
                  type="checkbox"
                  checked={overlays.showPredictionIntro !== false}
                  onChange={(e) => setOverlays({ showPredictionIntro: e.target.checked })}
                  className="accent-pink-400 w-4 h-4"
                />
              </div>
            </div>

            {/* Part Series */}
            <div className="pt-2 border-t border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-200 font-bold block">Part Series Tag</span>
                  <span className="text-[10px] text-slate-400">Shows 'PART 1 / 2 / 3' in safe top-left corner</span>
                </div>
                <input
                  type="checkbox"
                  checked={overlays.showPartSeries === true}
                  onChange={(e) => setOverlays({ showPartSeries: e.target.checked })}
                  className="accent-purple-400 w-4 h-4"
                />
              </div>
              {overlays.showPartSeries && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Part Number:</span>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={overlays.partNumber || 1}
                    onChange={(e) => setOverlays({ partNumber: Number(e.target.value) })}
                    className="w-16 bg-white/5 border border-white/10 rounded-xl px-2 py-1 text-xs text-white text-center font-mono"
                  />
                </div>
              )}
            </div>

            {/* End Card CTA */}
            <div className="pt-2 border-t border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-200 font-bold block">Winner End Card CTA Line</span>
                <AiLabelSuggester
                  type="end_card_cta"
                  currentValue={overlays.endCardCta || ''}
                  onApply={(cta) => setOverlays({ endCardCta: cta })}
                  modeName={currentMode.name}
                  category={currentMode.category}
                  labelTitle="ai suggest cta"
                />
              </div>
              <input
                type="text"
                value={overlays.endCardCta || 'follow for part 2 • comment ur color'}
                onChange={(e) => setOverlays({ endCardCta: e.target.value })}
                placeholder="follow for part 2 • comment ur color"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-cyan-300 outline-none focus:border-cyan-400 font-mono"
              />
            </div>

            {/* Live Counter */}
            <div className="pt-2 border-t border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-200 font-bold">Live Counter</span>
                <input
                  type="checkbox"
                  checked={overlays.showCounter}
                  onChange={(e) => setOverlays({ showCounter: e.target.checked })}
                  className="accent-amber-400"
                />
              </div>
              {overlays.showCounter && (
                <div className="space-y-2">
                  <select
                    value={overlays.counterType}
                    onChange={(e) => setOverlays({ counterType: e.target.value as any })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-none"
                  >
                    <option value="rings">Rings Left Counter</option>
                    <option value="balls">Ball Count</option>
                    <option value="bounces">Total Bounces</option>
                    <option value="timer">MM:SS.ms Timer</option>
                    <option value="percent">Percentage %</option>
                  </select>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-medium">Custom Counter Label</span>
                      <AiLabelSuggester
                        type="counter"
                        currentValue={overlays.counterCustomLabel || ''}
                        onApply={(lbl) => setOverlays({ counterCustomLabel: lbl })}
                        modeName={currentMode.name}
                        category={currentMode.category}
                        labelTitle="ai suggest label"
                      />
                    </div>
                    <input
                      type="text"
                      value={overlays.counterCustomLabel || ''}
                      onChange={(e) => setOverlays({ counterCustomLabel: e.target.value })}
                      placeholder="e.g. rings left, balls trapped, alive"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1 text-xs text-cyan-300 outline-none focus:border-cyan-400 font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Watermark */}
            <div className="pt-2 border-t border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-200 font-bold block">BounceForge Watermark</span>
                  <span className="text-[10px] text-slate-400">Positioned above platform captions (23% safe margin)</span>
                </div>
                <input
                  type="checkbox"
                  checked={overlays.showWatermark}
                  onChange={(e) => setOverlays({ showWatermark: e.target.checked })}
                  className="accent-amber-400"
                />
              </div>
            </div>

            {/* Safe Area Controls */}
            <div className="pt-2 border-t border-white/10 space-y-3">
              <div>
                <span className="text-xs text-slate-200 font-bold block mb-1">Target Social Platform</span>
                <select
                  value={overlays.safeZonePlatform || 'all'}
                  onChange={(e) => setOverlays({ safeZonePlatform: e.target.value as any })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-amber-400"
                >
                  <option value="all">All Platforms (Safest - TikTok, Shorts, Reels)</option>
                  <option value="tiktok">TikTok Safe Area</option>
                  <option value="shorts">YouTube Shorts Safe Area</option>
                  <option value="reels">Instagram Reels Safe Area</option>
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-200 font-bold block">Show Safe Zones</span>
                    <span className="text-[10px] text-slate-400">Red shaded blocked areas + dashed safe box</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={overlays.showSafeZone}
                    onChange={(e) => setOverlays({ showSafeZone: e.target.checked })}
                    className="accent-amber-400"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-200 font-bold block">Platform UI Mockup</span>
                    <span className="text-[10px] text-slate-400">Generic short video buttons overlay (preview only)</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={overlays.showPlatformMockup}
                    onChange={(e) => setOverlays({ showPlatformMockup: e.target.checked })}
                    className="accent-amber-400"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 6.5 AI GROWTH TOOLS & SEO PACK */}
        {activeTab === 'ai' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-1 border-b border-white/10">
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-pink-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-pink-400 stroke-[2.2]" />
                  <span>ai growth tools &amp; seo</span>
                </h3>
                <p className="text-[10px] text-slate-400">Viral short-form SEO, smart hooks &amp; content strategy</p>
              </div>
              <button
                onClick={handleResetAiSettings}
                aria-label="reset ai settings to default"
                className="btn-3d-glass p-1 px-2.5 rounded-xl text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-[11px] font-bold"
                title="reset AI preferences to default"
              >
                <RotateCcw className="w-3 h-3 stroke-[2.2]" />
                <span className="text-[10px]">reset</span>
              </button>
            </div>

            {/* AI Engine Switch */}
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-200 block">AI Suggestions Engine</span>
                  <span className="text-[10px] text-slate-400">Google Gemini Flash serverless API (/api/ai)</span>
                </div>
                <input
                  type="checkbox"
                  checked={aiSettings.enabled}
                  onChange={(e) => handleUpdateAiSettings({ enabled: e.target.checked })}
                  className="accent-pink-400 w-4 h-4 cursor-pointer"
                />
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                {aiSettings.enabled
                  ? '✨ Cloud AI active with automatic offline fallback (300+ templates) on network failure or rate limit.'
                  : '⚡ Offline Mode active. 100% of hooks and SEO suggestions run deterministically in browser memory.'}
              </p>
            </div>

            {/* AI Generation Preferences */}
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3.5">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Default Hook &amp; SEO Preferences
              </h4>

              {/* Language */}
              <div>
                <label className="text-[10.5px] font-semibold text-slate-400 block mb-1">Default Language</label>
                <select
                  value={aiSettings.language}
                  onChange={(e) => handleUpdateAiSettings({ language: e.target.value as SupportedLanguage })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-pink-400"
                >
                  <option value="en">English</option>
                  <option value="ur_roman">Urdu (Roman) - Roman Urdu</option>
                  <option value="ur_script">Urdu (اردو) - Nastaliq/Arabic Script</option>
                  <option value="hi">Hindi (हिन्दी) - Devanagari</option>
                  <option value="ar">Arabic (العربية)</option>
                  <option value="es">Spanish (Español)</option>
                  <option value="pt">Portuguese (Português)</option>
                  <option value="id">Indonesian (Bahasa)</option>
                  <option value="tr">Turkish (Türkçe)</option>
                </select>
              </div>

              {/* Hook Style Chips */}
              <div>
                <label className="text-[10.5px] font-semibold text-slate-400 block mb-1.5">Default Styles</label>
                <div className="flex flex-wrap gap-1.5">
                  {(['curiosity', 'challenge', 'prediction', 'countdown', 'asmr', 'funny', 'suspense'] as HookStyle[]).map((st) => {
                    const active = aiSettings.styles.includes(st);
                    return (
                      <button
                        key={st}
                        onClick={() => {
                          const next = active
                            ? aiSettings.styles.filter((s) => s !== st)
                            : [...aiSettings.styles, st];
                          if (next.length > 0) handleUpdateAiSettings({ styles: next });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10.5px] font-mono transition-all lowercase ${
                          active
                            ? 'bg-pink-500/20 text-pink-300 border border-pink-400/40 shadow-[0_0_8px_rgba(244,114,182,0.2)]'
                            : 'bg-white/5 text-slate-400 hover:text-slate-200 border border-white/5'
                        }`}
                      >
                        {st}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Emoji & Casing */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[10.5px] font-semibold text-slate-400 block mb-1">Emoji in Hooks</label>
                  <button
                    onClick={() => handleUpdateAiSettings({ emoji: !aiSettings.emoji })}
                    className={`w-full py-1.5 px-3 rounded-xl border text-xs font-mono flex items-center justify-center gap-1.5 transition-all ${
                      aiSettings.emoji
                        ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                        : 'bg-white/5 text-slate-400 border-white/10'
                    }`}
                  >
                    <span>{aiSettings.emoji ? '🔥 emoji on' : '🚫 emoji off'}</span>
                  </button>
                </div>

                <div>
                  <label className="text-[10.5px] font-semibold text-slate-400 block mb-1">Text Casing</label>
                  <select
                    value={aiSettings.casing}
                    onChange={(e) => handleUpdateAiSettings({ casing: e.target.value as any })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-pink-400 font-mono"
                  >
                    <option value="as_written">as written</option>
                    <option value="lowercase">all lowercase</option>
                    <option value="uppercase">ALL CAPS</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Live Draft SEO Pack */}
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    Active Draft SEO Pack
                  </h4>
                  <span className="text-[10px] text-slate-400">Platform-optimized titles, hashtags &amp; descriptions</span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 text-[10px] font-mono">
                  live sync
                </span>
              </div>
              <SeoPackViewer
                seoPack={draftSeoPack}
                modeName={currentMode.name}
                onOpenTrendsAdmin={() => setTrendsAdminOpen(true)}
                onApplyHookTweak={(tweak) => setOverlays({ titleText: tweak })}
              />
            </div>

            {/* Saved Hooks ("My Hooks") */}
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    My Saved Hooks ({savedHooks.length})
                  </h4>
                  <span className="text-[10px] text-slate-400">Favorited hooks saved across sessions</span>
                </div>
              </div>

              {savedHooks.length === 0 ? (
                <div className="p-4 rounded-xl bg-white/[0.01] border border-dashed border-white/10 text-center">
                  <p className="text-[11px] text-slate-400">no saved hooks yet.</p>
                  <p className="text-[10px] text-slate-400 mt-1">tap the heart icon on any hook suggestion to save it here.</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {savedHooks.map((h, i) => (
                    <div
                      key={i}
                      className="p-2 rounded-xl bg-white/5 border border-white/5 hover:border-pink-400/30 flex items-center justify-between gap-2 group transition-all"
                    >
                      <span className="text-xs text-slate-200 font-medium truncate flex-1">{h}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setOverlays({ titleText: h });
                            showToast(`hook applied: "${h}"`);
                          }}
                          className="px-2 py-1 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 text-[10px] font-bold transition-colors"
                        >
                          apply
                        </button>
                        <button
                          onClick={() => handleRemoveHook(h)}
                          className="p-1 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                          title="remove hook"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Trends & Social Signals */}
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Niche Trends Signal</span>
                  </h4>
                  <span className="text-[10px] text-slate-400">Keywords, hashtags &amp; audio signals for ASMR/Physics</span>
                </div>
                <button
                  onClick={() => setTrendsAdminOpen(true)}
                  className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-cyan-300 text-[10px] font-bold flex items-center gap-1"
                >
                  <span>admin edit</span>
                </button>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>trends updated {trendsMeta.updated || 'recently'}</span>
                </span>
                {trendsMeta.isOutdated ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono">
                    ⚠️ trends may be outdated (&gt;14d)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono">
                    fresh signals
                  </span>
                )}
              </div>
            </div>

            {/* What Next? AI Advisor Launcher */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-cyan-500/10 border border-pink-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-pink-400" />
                  <span>AI "What Next?" Strategy Advisor</span>
                </span>
                <button
                  onClick={() => setWhatNextOpen(true)}
                  className="btn-3d-pink px-3 py-1.5 rounded-xl text-black font-black text-xs uppercase tracking-wider"
                >
                  open advisor
                </button>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Personalized 7-day posting plans, Part 2 sequels, A/B test setups, and remix variations based on your export history.
              </p>
            </div>
          </div>
        )}

        {/* 7. DIAGNOSTICS & HARDWARE CAPABILITIES */}
        {activeTab === 'diagnostics' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-1 border-b border-white/10">
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                  diagnostics &amp; my device
                </h3>
                <p className="text-[10px] text-slate-400">All-devices hardware &amp; tier detection</p>
              </div>
              <button
                onClick={handleCopyReport}
                className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-[11px] font-bold flex items-center gap-1.5 transition-all"
                title="Copy complete capabilities report for support"
              >
                <Copy className="w-3.5 h-3.5 text-[#CCFF00]" />
                <span>copy report</span>
              </button>
            </div>

            {/* Quality Tier Selector */}
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-200 block">Performance Quality Tier</span>
                  <span className="text-[10px] text-slate-400">
                    Active: <span className="font-mono text-[#CCFF00] font-bold">{currentQualityTier.toUpperCase()}</span> ({qualityMode === 'auto' ? 'auto' : 'manual'})
                  </span>
                </div>
                <Gauge className="w-4 h-4 text-[#CCFF00]" />
              </div>

              <div className="grid grid-cols-5 gap-1.5">
                {(['auto', 'low', 'medium', 'high', 'ultra'] as const).map((tier) => (
                  <button
                    key={tier}
                    onClick={() => {
                      triggerHaptic(10);
                      setQualityMode(tier);
                    }}
                    className={`py-1.5 px-1 text-center rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all border ${
                      qualityMode === tier
                        ? 'bg-[#CCFF00]/20 border-[#CCFF00] text-[#CCFF00] shadow-sm shadow-[#CCFF00]/20'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>

              <p className="text-[10px] text-slate-400 leading-relaxed">
                Physics simulation is bit-for-bit identical across all tiers (same seed = same viral result). Visual effects, particle count, and canvas resolution scale to maintain smooth playback.
              </p>
            </div>

            {/* Haptic Feedback Toggle */}
            <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Vibrate className="w-4 h-4 text-[#CCFF00]" />
                <div>
                  <span className="text-xs font-bold text-slate-200 block">Haptic Feedback</span>
                  <span className="text-[10px] text-slate-400">10ms vibration on mobile taps, export &amp; reset</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={hapticsEnabled}
                onChange={(e) => {
                  setHapticsEnabled(e.target.checked);
                  if (e.target.checked) triggerHaptic(20);
                }}
                className="accent-[#CCFF00] w-4 h-4 rounded cursor-pointer"
              />
            </div>

            {/* "MY DEVICE" CHECKLIST */}
            <div className="space-y-2">
              <span className="text-xs text-slate-200 font-bold block uppercase tracking-wider">
                my device checklist
              </span>

              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/10 divide-y divide-white/5 text-xs">
                {/* Graphics API */}
                <div className="py-1.5 flex items-center justify-between">
                  <span className="text-slate-400">Graphics Engine</span>
                  <span className="font-mono text-[#CCFF00] font-bold">
                    {(capabilities?.graphics || 'webgl2').toUpperCase()}
                  </span>
                </div>

                {/* GPU Tier & Score */}
                <div className="py-1.5 flex items-center justify-between">
                  <span className="text-slate-400">GPU Tier</span>
                  <span className="font-mono text-cyan-300">
                    {capabilities?.gpuTier.toUpperCase() || 'MEDIUM'} ({capabilities?.benchmarkScore || 50}/100)
                  </span>
                </div>

                {/* Max Texture Size */}
                <div className="py-1.5 flex items-center justify-between">
                  <span className="text-slate-400">Max Texture Size</span>
                  <span className="font-mono text-slate-300">{capabilities?.maxTextureSize || 4096}px</span>
                </div>

                {/* Hardware */}
                <div className="py-1.5 flex items-center justify-between">
                  <span className="text-slate-400">CPU &amp; Memory</span>
                  <span className="text-slate-300">
                    {capabilities?.cpuCores || 4} cores • {capabilities?.deviceMemoryGB ? `${capabilities.deviceMemoryGB} GB RAM` : 'RAM N/A'}
                  </span>
                </div>

                {/* WebCodecs */}
                <div className="py-1.5 flex items-center justify-between">
                  <span className="text-slate-400">WebCodecs Video/Audio</span>
                  <span className={capabilities?.hasWebCodecs ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                    {capabilities?.hasWebCodecs ? 'Supported ✓' : 'Quick Record Mode'}
                  </span>
                </div>

                {/* Export Path */}
                <div className="py-1.5 flex items-center justify-between">
                  <span className="text-slate-400">Export Pipeline</span>
                  <span className="text-slate-300 font-mono">
                    {capabilities?.exportPath || 'webcodecs'} (Max {capabilities?.maxExportResolution || '1080'})
                  </span>
                </div>

                {/* OffscreenCanvas & Workers */}
                <div className="py-1.5 flex items-center justify-between">
                  <span className="text-slate-400">OffscreenCanvas &amp; Workers</span>
                  <span className={capabilities?.hasOffscreenCanvas ? 'text-emerald-400' : 'text-slate-500'}>
                    {capabilities?.hasOffscreenCanvas ? 'Ready ✓' : 'Main Thread'}
                  </span>
                </div>

                {/* Web Share API */}
                <div className="py-1.5 flex items-center justify-between">
                  <span className="text-slate-400">Native Share &amp; Photos</span>
                  <span className={capabilities?.hasWebShareFiles ? 'text-emerald-400' : 'text-slate-400'}>
                    {capabilities?.hasWebShareFiles ? 'Ready (Photos / Apps) ✓' : 'Direct Download'}
                  </span>
                </div>

                {/* Screen Wake Lock */}
                <div className="py-1.5 flex items-center justify-between">
                  <span className="text-slate-400">Screen Wake Lock</span>
                  <span className={capabilities?.hasWakeLock ? 'text-emerald-400' : 'text-slate-500'}>
                    {capabilities?.hasWakeLock ? 'Active in Export ✓' : 'Fallback'}
                  </span>
                </div>

                {/* Input Type */}
                <div className="py-1.5 flex items-center justify-between">
                  <span className="text-slate-400">Input Modality</span>
                  <span className="text-slate-300">
                    Pointer: {capabilities?.pointerType || 'fine'} • Touch: {capabilities?.isTouch ? 'yes' : 'no'}
                  </span>
                </div>

                {/* Storage Quota */}
                <div className="py-1.5 flex items-center justify-between">
                  <span className="text-slate-400">Storage Quota</span>
                  <span className="font-mono text-slate-300">
                    {capabilities?.storageQuotaMB ? `${capabilities.storageUsageMB}MB / ${capabilities.storageQuotaMB}MB` : 'IndexedDB Ready'}
                  </span>
                </div>
              </div>
            </div>

            {/* Test My Exports Button */}
            <div className="space-y-2">
              <span className="text-xs text-slate-200 font-bold block">Self-Test Pipeline</span>
              <p className="text-[11px] text-slate-400">
                Runs 5-second test renders at 1080p30, 1080p60, 1440p60, 4K30 and 4K60, then decodes and inspects frame dimensions, fps, audio sync and non-blank frames.
              </p>
              <button
                onClick={() => setSelfTestOpen(true)}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
              >
                <Activity className="w-4 h-4 text-black" />
                <span>test my exports</span>
              </button>
            </div>

            {/* DANGER ZONE */}
            <div className="pt-4 border-t border-red-500/20 space-y-3">
              <div className="flex items-center gap-2 text-red-400">
                <ShieldAlert className="w-4 h-4" />
                <h4 className="text-xs font-black uppercase tracking-wider">danger zone</h4>
              </div>
              <p className="text-[11px] text-slate-400">
                Factory reset restores first-run default settings across all modes. Saved presets and favorites remain safe unless selected.
              </p>
              <button
                onClick={() => {
                  setAlsoDeleteSaved(false);
                  setShowFactoryModal(true);
                }}
                className="w-full py-2 px-3 rounded-xl border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-xs font-bold transition-all active:scale-95"
              >
                factory reset
              </button>
            </div>
          </div>
        )}
      </div>

      {/* FACTORY RESET CONFIRMATION MODAL */}
      {showFactoryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#0e1017] border border-red-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold text-white">reset everything? this can't be undone.</h3>
              <p className="text-xs text-slate-400">
                all simulator settings, visuals, camera angles and audio will revert to factory defaults.
              </p>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer p-2 bg-white/[0.03] rounded-xl border border-white/5">
              <input
                type="checkbox"
                checked={alsoDeleteSaved}
                onChange={(e) => setAlsoDeleteSaved(e.target.checked)}
                className="accent-red-500 rounded"
              />
              <span>also delete my saved stuff (presets &amp; logos)</span>
            </label>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowFactoryModal(false)}
                disabled={isResetting}
                className="btn-3d-glass flex-1 py-2 px-3 rounded-xl text-xs font-bold text-white transition-all"
              >
                cancel
              </button>
              <button
                onClick={handleConfirmFactoryReset}
                disabled={isResetting}
                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 border border-red-400/50 border-b-[3px] border-b-red-900 shadow-[0_3px_0_0_#4c0519] text-xs font-black uppercase tracking-wider text-white active:translate-y-0.5 active:border-b-1 transition-all flex items-center justify-center gap-1.5"
              >
                {isResetting ? 'resetting...' : 'yes, reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
