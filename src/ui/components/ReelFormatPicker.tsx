import React, { useState } from 'react';
import { useStudioStore } from '../../store/useStudioStore';
import { ReelFormatId, EmbossFontStyle } from '../../marble3d/types';
import { REEL_FORMATS, FORMAT_PRESETS, FormatPresetDefinition } from '../../marble3d/formats';
import { triggerHaptic } from '../../platform/haptics';
import {
  Flame,
  Check,
  Sparkles,
  Type,
  ChevronDown,
  ChevronUp,
  Tv,
  Smartphone,
} from 'lucide-react';
import { ChannelStyleModal } from '../modals/ChannelStyleModal';

interface ReelFormatPickerProps {
  onFormatSelected?: (formatId: ReelFormatId) => void;
}

export const ReelFormatPicker: React.FC<ReelFormatPickerProps> = ({ onFormatSelected }) => {
  const { modeSettings, updateModeSetting, setSeed, setTargetDuration, showToast, setMode, currentModeId } = useStudioStore();

  const activeFormatId: ReelFormatId = modeSettings.reelFormat || 'f1_guess_tune';
  const [selectedFormat, setSelectedFormat] = useState<ReelFormatId>(activeFormatId);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [showWallTextPanel, setShowWallTextPanel] = useState(false);

  // Variant selector ('chill' | 'viral' | 'insane') for presets
  const [selectedVariant, setSelectedVariant] = useState<'chill' | 'viral' | 'insane'>('viral');

  const currentFormatDef = REEL_FORMATS.find((f) => f.id === selectedFormat) || REEL_FORMATS[0];
  const formatPresets = FORMAT_PRESETS.filter((p) => p.formatId === selectedFormat);

  const isWallTextOn = Boolean(modeSettings.showBackgroundText || modeSettings.embossedText?.enabled);

  const handleSelectFormat = (id: ReelFormatId) => {
    triggerHaptic(15);
    setSelectedFormat(id);
    updateModeSetting('reelFormat', id);

    const fmt = REEL_FORMATS.find((f) => f.id === id);
    if (fmt) {
      updateModeSetting('wallBackground', fmt.defaultWall);
      const curEmbossed = modeSettings.embossedText || {};
      updateModeSetting('embossedText', {
        ...curEmbossed,
        titleText: curEmbossed.titleText || fmt.defaultTitle,
        enabled: isWallTextOn,
      });
    }

    if (onFormatSelected) {
      onFormatSelected(id);
    }
  };

  const handleApplyPreset = (preset: FormatPresetDefinition) => {
    triggerHaptic(25);
    if (currentModeId !== 'marble_melody_3d') {
      setMode('marble_melody_3d');
    }
    const newSeed = Math.floor(Math.random() * 900000) + 10000;
    setSeed(newSeed);

    updateModeSetting('reelFormat', preset.formatId);
    updateModeSetting('melodyId', preset.melodyId);
    updateModeSetting('wallBackground', preset.wallPalette);
    updateModeSetting('signatureMarble', preset.signatureMarble);

    if (preset.formatId === 'f1_guess_tune') {
      updateModeSetting('marbleStyle', 'swirl_glass');
      updateModeSetting('swirlColor', preset.signatureMarble.coreColor);
      updateModeSetting('actCount', 10);
      updateModeSetting('themePack', 'pastel_dream');
      updateModeSetting('lightingStyle', 'soft_studio');
      updateModeSetting('cameraStyle', 'tilted_follow');
      updateModeSetting('wallBackground', 'pastel_peach_blush');
    }

    const curEmbossed = modeSettings.embossedText || {};
    updateModeSetting('embossedText', {
      ...curEmbossed,
      titleText: preset.embossedTitle,
      reminders: preset.reminders,
      enabled: isWallTextOn,
    });

    const duration = preset.formatId === 'f1_guess_tune'
      ? 50
      : selectedVariant === 'chill' ? 45 : selectedVariant === 'insane' ? 68 : 56;
    setTargetDuration(duration);
    updateModeSetting('targetDuration', duration);

    showToast(`🎬 Loaded preset: "${preset.name}" (${duration}s 4K)`);
  };

  return (
    <div className="space-y-4">
      {/* Format Header & Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-pink-500/20 text-pink-400 border border-pink-500/30">
            <Tv className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-white tracking-wide uppercase">
              12 Viral Reel Formats
            </h3>
            <p className="text-[10px] text-slate-400">
              Studio Look • Long-Lens 3D • Embossed Wall Text
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowWallTextPanel(!showWallTextPanel)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
              isWallTextOn
                ? 'bg-purple-600/30 border-purple-500 text-purple-300'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <Type className="w-3 h-3" />
            <span>Wall Text: {isWallTextOn ? 'On' : 'Off'}</span>
            {showWallTextPanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          <button
            onClick={() => setShowChannelModal(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-pink-500/20 to-purple-500/20 hover:from-pink-500/30 hover:to-purple-500/30 border border-pink-500/30 text-pink-300 transition-all active:scale-95"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Series Mode</span>
          </button>
        </div>
      </div>

      {/* 12 Format Cards Horizontal Scroll Gallery */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
        {REEL_FORMATS.map((fmt) => {
          const isSelected = selectedFormat === fmt.id;
          return (
            <button
              key={fmt.id}
              onClick={() => handleSelectFormat(fmt.id)}
              className={`relative flex flex-col p-2.5 rounded-xl border text-left transition-all group ${
                isSelected
                  ? 'bg-gradient-to-br from-purple-900/60 to-slate-900 border-purple-400 shadow-lg shadow-purple-500/20 ring-1 ring-purple-400'
                  : 'bg-black/40 border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
              }`}
            >
              {/* Hot Badge */}
              {fmt.isHot && (
                <div className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[9px] font-black text-amber-300">
                  <Flame className="w-2.5 h-2.5 text-amber-400" />
                  HOT
                </div>
              )}

              {/* Number Badge */}
              <span className="text-[10px] font-mono font-bold text-slate-500 mb-0.5">
                F{fmt.formatNumber}
              </span>

              {/* Name */}
              <span className="text-xs font-extrabold text-white leading-tight line-clamp-1 mb-1">
                {fmt.name}
              </span>

              {/* Tagline */}
              <span className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                {fmt.tagline}
              </span>
            </button>
          );
        })}
      </div>

      {/* Wall Text Quick Panel (Collapsible) */}
      {showWallTextPanel && (
        <div className="p-3 bg-white/[0.03] border border-white/10 rounded-2xl space-y-3 animate-fade-in">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-purple-400" />
                Embossed 3D Wall Text
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  isWallTextOn
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'bg-slate-800 text-slate-400 border border-white/10'
                }`}
              >
                {isWallTextOn ? 'Visible' : 'Hidden (Clean Background)'}
              </span>
            </div>

            <button
              onClick={() => {
                const nextVal = !isWallTextOn;
                updateModeSetting('showBackgroundText', nextVal);
                updateModeSetting('embossedText', {
                  ...(modeSettings.embossedText || {}),
                  enabled: nextVal,
                });
                showToast(nextVal ? '📝 Wall text turned ON' : '🧹 Wall text turned OFF (Clean background)');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                isWallTextOn
                  ? 'bg-purple-600 text-white border-purple-400 hover:bg-purple-500'
                  : 'bg-white/10 text-slate-300 border-white/20 hover:bg-white/20'
              }`}
            >
              {isWallTextOn ? 'Turn Off' : 'Turn On'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                Embossed Title Text
              </label>
              <input
                type="text"
                value={modeSettings.embossedText?.titleText || currentFormatDef.defaultTitle}
                onChange={(e) =>
                  updateModeSetting('embossedText', {
                    ...(modeSettings.embossedText || {}),
                    titleText: e.target.value,
                  })
                }
                placeholder="Title on wall"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-purple-400"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                Font Style
              </label>
              <select
                value={modeSettings.embossedText?.fontStyle || 'script'}
                onChange={(e) =>
                  updateModeSetting('embossedText', {
                    ...(modeSettings.embossedText || {}),
                    fontStyle: e.target.value as EmbossFontStyle,
                  })
                }
                className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-purple-400"
              >
                <option value="script">Script (Handwritten cursive)</option>
                <option value="bold_cartoon">Bold Rounded Cartoon</option>
                <option value="clean_sans">Clean Bold Sans</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                Relief Mode
              </label>
              <div className="grid grid-cols-2 gap-1 bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
                <button
                  onClick={() =>
                    updateModeSetting('embossedText', {
                      ...(modeSettings.embossedText || {}),
                      embossMode: 'embossed',
                    })
                  }
                  className={`py-1 rounded-lg font-bold text-center transition-all ${
                    (modeSettings.embossedText?.embossMode || 'embossed') === 'embossed'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-400'
                  }`}
                >
                  Embossed
                </button>
                <button
                  onClick={() =>
                    updateModeSetting('embossedText', {
                      ...(modeSettings.embossedText || {}),
                      embossMode: 'debossed',
                    })
                  }
                  className={`py-1 rounded-lg font-bold text-center transition-all ${
                    modeSettings.embossedText?.embossMode === 'debossed'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-400'
                  }`}
                >
                  Debossed
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                Small Reminders along Path
              </label>
              <input
                type="text"
                value={(modeSettings.embossedText?.reminders || ['like & follow', 'subscribe']).join(', ')}
                onChange={(e) =>
                  updateModeSetting('embossedText', {
                    ...(modeSettings.embossedText || {}),
                    reminders: e.target.value.split(',').map((s) => s.trim()),
                  })
                }
                placeholder="like & follow, subscribe"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-purple-400"
              />
            </div>
          </div>
        </div>
      )}

      {/* Selected Format's 5 Ready Presets Header */}
      <div className="p-3 bg-white/[0.02] border border-white/10 rounded-2xl space-y-3">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div>
            <span className="text-xs font-black text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              {currentFormatDef.name} — 5 Viral Presets
            </span>
            <p className="text-[10px] text-slate-400">
              100% public domain / original music • No copyrighted brands or characters
            </p>
          </div>

          {/* Mood / Intensity Toggle */}
          <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/10 text-[10px]">
            <button
              onClick={() => setSelectedVariant('chill')}
              className={`px-2 py-0.5 rounded font-bold transition-all ${
                selectedVariant === 'chill' ? 'bg-cyan-600 text-white' : 'text-slate-400'
              }`}
            >
              Chill
            </button>
            <button
              onClick={() => setSelectedVariant('viral')}
              className={`px-2 py-0.5 rounded font-bold transition-all ${
                selectedVariant === 'viral' ? 'bg-purple-600 text-white' : 'text-slate-400'
              }`}
            >
              Viral
            </button>
            <button
              onClick={() => setSelectedVariant('insane')}
              className={`px-2 py-0.5 rounded font-bold transition-all ${
                selectedVariant === 'insane' ? 'bg-pink-600 text-white' : 'text-slate-400'
              }`}
            >
              Insane
            </button>
          </div>
        </div>

        {/* 5 Presets Cards Grid */}
        <div className="grid grid-cols-1 gap-2">
          {formatPresets.map((preset) => (
            <div
              key={preset.id}
              className="flex items-center justify-between p-2.5 bg-black/30 hover:bg-white/[0.04] border border-white/5 hover:border-white/15 rounded-xl transition-all group"
            >
              <div className="flex items-center gap-2.5">
                {/* Signature Marble Orb Preview */}
                <div
                  className="w-8 h-8 rounded-full border border-white/20 shadow-md shrink-0"
                  style={{
                    background: `radial-gradient(circle at 35% 35%, ${preset.signatureMarble.stripeColor}, ${preset.signatureMarble.coreColor})`,
                  }}
                />
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                    {preset.name}
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-2">
                    <span>🎵 {preset.melodyName}</span>
                    <span>•</span>
                    <span className="capitalize">{preset.wallPalette.replace('_', ' ')}</span>
                    <span>•</span>
                    <span className="text-purple-300">"{preset.embossedTitle}"</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleApplyPreset(preset)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/40 text-xs font-bold transition-all active:scale-95 shadow-sm"
              >
                <Check className="w-3 h-3" />
                <span>Apply</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Series Mode & Profile Grid Modal */}
      <ChannelStyleModal isOpen={showChannelModal} onClose={() => setShowChannelModal(false)} />
    </div>
  );
};
