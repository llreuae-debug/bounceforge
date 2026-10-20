import React, { useState } from 'react';
import { useStudioStore } from '../../store/useStudioStore';
import { useAuthStore } from '../../auth/useAuthStore';
import { BUILTIN_THEMES } from '../../render/themes';
import { generateOfflineHooks } from '../../ai/offlineEngine';
import { triggerHaptic } from '../../platform/haptics';
import { AudioEngine } from '../../audio/audioEngine';
import {
  Music,
  Palette,
  Circle,
  Type,
  Clock,
  Sparkles,
  Sliders,
  RotateCcw,
  Upload,
  Play,
  Check,
  ChevronDown,
  ChevronUp,
  Activity,
  X,
} from 'lucide-react';
import { SettingsPanel } from './SettingsPanel';

export interface EssentialControlsProps {
  className?: string;
  onClose?: () => void;
  defaultTab?: 'essentials' | 'all';
}

export const EssentialControls: React.FC<EssentialControlsProps> = ({ className, onClose, defaultTab = 'essentials' }) => {
  const {
    currentModeId,
    modeSettings,
    updateModeSetting,
    visuals,
    setVisuals,
    overlays,
    setOverlays,
    ballPhysics,
    setBallPhysics,
    customBall,
    setCustomBall,
    targetDuration,
    setTargetDuration,
    reelSpeed,
    setReelSpeed,
    audioSettings,
    setAudioSettings,
    setMidiEditorOpen,
    setRoute,
    showToast,
  } = useStudioStore();

  const { currentUser, openUpgradeModal } = useAuthStore();
  const isGuest = !currentUser;

  // View Mode: 'essentials' (quick 5) vs 'all' (100% full settings)
  const [settingsTab, setSettingsTab] = useState<'essentials' | 'all'>(defaultTab);

  // Advanced Drawer state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showMoreMarbles, setShowMoreMarbles] = useState(false);

  // Sound preview helper
  const [isPlayingMelodyPreview, setIsPlayingMelodyPreview] = useState(false);

  // 1. MUSIC ESSENTIAL
  const activeMelodyId = modeSettings.melodyId || audioSettings.selectedMelodyId || 'toybox_run';
  const melodyList = [
    { id: 'happy_birthday', name: '🎂 Happy Birthday to You' },
    { id: 'bella_ciao', name: '🎭 Bella Ciao (Italian folk song)' },
    { id: 'toybox_run', name: 'Pastel Toybox Run (Original)' },
    { id: 'birthday_bells_orig', name: '🎉 Birthday Bells Fanfare (Original)' },
    { id: 'twinkle_star', name: 'Twinkle Twinkle Little Star' },
    { id: 'jingle_bells', name: 'Jingle Bells' },
    { id: 'we_wish_you_merry_christmas', name: '🎄 We Wish You a Merry Christmas' },
    { id: 'fur_elise', name: 'Für Elise (Beethoven)' },
    { id: 'moonlight_sonata', name: 'Moonlight Sonata (Beethoven)' },
    { id: 'ode_to_joy', name: 'Ode to Joy (Beethoven)' },
    { id: 'canon_in_d', name: 'Canon in D (Pachelbel)' },
    { id: 'turkish_march', name: 'Turkish March (Mozart)' },
    { id: 'clair_de_lune', name: 'Clair de Lune (Debussy)' },
    { id: 'gymnopedie_1', name: 'Gymnopédie No. 1 (Satie)' },
  ];

  const handleSelectMelody = (id: string) => {
    triggerHaptic(10);
    updateModeSetting('melodyId', id);
    setAudioSettings({ selectedMelodyId: id });
    const audio = AudioEngine.getInstance();
    audio.updateSettings({ selectedMelodyId: id });
    showToast(`Melody updated: ${melodyList.find((m) => m.id === id)?.name || id}`);
  };

  const handlePreviewMelody = () => {
    try {
      triggerHaptic(10);
      const audio = AudioEngine.getInstance();
      audio.init();
      audio.resume();
      audio.playAuditionRiff();
      setIsPlayingMelodyPreview(true);
      setTimeout(() => setIsPlayingMelodyPreview(false), 800);
    } catch {
      setIsPlayingMelodyPreview(false);
    }
  };

  const handleResetMusic = () => {
    triggerHaptic(8);
    updateModeSetting('melodyId', 'toybox_run');
    showToast('Reset melody to default');
  };

  // 2. LOOK ESSENTIAL (Themes)
  const currentThemeId = visuals.themeId || 'neon_night';

  const handleSelectTheme = (themeId: string) => {
    triggerHaptic(10);
    setVisuals({ themeId });
    updateModeSetting('themePack', themeId);
    showToast(`Theme updated: ${themeId.replace('_', ' ')}`);
  };

  const handleResetLook = () => {
    triggerHaptic(8);
    setVisuals({ themeId: 'neon_night', bloomEnabled: true, trailEnabled: true });
    updateModeSetting('themePack', 'pastel_dream');
    showToast('Reset visual theme');
  };

  // 3. MARBLE ESSENTIAL (8 Favorites + More)
  const favoriteMarbles = [
    { id: 'glass_swirl', name: 'Glass Swirl', color: '#00F0FF', style: 'swirl_glass' },
    { id: 'chrome_silver', name: 'Chrome Silver', color: '#cbd5e1', style: 'chrome' },
    { id: 'neon_cyan', name: 'Neon Cyan', color: '#38bdf8', style: 'neon' },
    { id: 'eight_ball', name: '8-Ball', color: '#18181b', style: 'pool_eight' },
    { id: 'gold_coin', name: 'Gold Coin', color: '#f59e0b', style: 'gold' },
    { id: 'peach_pearl', name: 'Peach Pearl', color: '#FF8FB8', style: 'pearl' },
    { id: 'emoji_basketball', name: 'Basketball', emoji: '🏀', type: 'emoji' },
    { id: 'emoji_gem', name: 'Gemstone', emoji: '💎', type: 'emoji' },
    { id: 'emoji_fire', name: 'Fireball', emoji: '🔥', type: 'emoji' },
  ];

  const handleSelectMarble = (marble: (typeof favoriteMarbles)[0]) => {
    triggerHaptic(10);
    if (marble.type === 'emoji' && marble.emoji) {
      renderEmojiTexture(marble.emoji);
    } else {
      setCustomBall({ type: 'default' });
      setBallPhysics({ color: marble.color });
      updateModeSetting('marbleStyle', marble.style || 'swirl_glass');
      updateModeSetting('swirlColor', marble.color);
    }
    showToast(`Marble selected: ${marble.name}`);
  };

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
    showToast(`Custom marble: ${emojiChar}`);
  };

  const handleResetMarble = () => {
    triggerHaptic(8);
    setCustomBall({ type: 'default' });
    setBallPhysics({ color: '#00F0FF', radius: 14 });
    updateModeSetting('marbleStyle', 'swirl_glass');
    showToast('Reset marble to default glass');
  };

  // 4. TEXT ESSENTIAL (Hook, @handle, Watermark)
  const currentHook = overlays.titleText || '';
  const currentHandle = overlays.centerText || '';
  const showWatermark = overlays.showWatermark;

  const handleAiSuggestHook = () => {
    triggerHaptic(12);
    const hooks = generateOfflineHooks({
      modeName: currentModeId,
      category: 'fresh_drops',
      styles: ['curiosity'],
    });
    if (hooks && hooks.length > 0) {
      const randomHook = hooks[Math.floor(Math.random() * hooks.length)];
      setOverlays({ titleText: randomHook, showTitle: true });
      updateModeSetting('handleText', randomHook);
      showToast('AI Hook suggested!');
    }
  };

  const handleToggleWatermark = () => {
    triggerHaptic(10);
    if (isGuest && showWatermark) {
      openUpgradeModal();
      return;
    }
    setOverlays({ showWatermark: !showWatermark });
    showToast(!showWatermark ? 'Watermark enabled' : 'Watermark removed (Pro)');
  };

  const handleResetText = () => {
    triggerHaptic(8);
    setOverlays({
      titleText: 'Wait for the ending... 🎶✨',
      showTitle: true,
      centerText: '@bounceforge',
      showCenterText: true,
      showWatermark: true,
    });
    showToast('Reset text overlays');
  };

  // 5. LENGTH & SPEED ESSENTIAL
  const handleSelectDuration = (sec: number) => {
    triggerHaptic(10);
    setTargetDuration(sec);
    updateModeSetting('targetDuration', sec);
    showToast(`Reel length: ${sec}s`);
  };

  const handleSelectSpeed = (speed: number) => {
    triggerHaptic(10);
    setReelSpeed(speed);
    updateModeSetting('reelSpeed', speed);
    showToast(speed === 0.5 ? 'Calm 0.5x Slow-Mo' : 'Normal 1.0x Speed');
  };

  const handleResetLengthSpeed = () => {
    triggerHaptic(8);
    setTargetDuration(60);
    setReelSpeed(0.5);
    updateModeSetting('targetDuration', 60);
    updateModeSetting('reelSpeed', 0.5);
    showToast('Reset length to 60s & speed to 0.5x');
  };

  return (
    <aside
      className={
        className ||
        'w-80 sm:w-96 h-[calc(100vh-4rem)] border-l border-white/10 bg-[#07090e]/95 backdrop-blur-md flex flex-col select-none shrink-0 font-sans'
      }
    >
      {/* Header */}
      <div className="p-3.5 sm:p-4 border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
          <h2 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-lime-400" />
            <span>Step 2 · Settings &amp; Customize</span>
          </h2>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
            title="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Sub-Tabs: Quick Essentials vs All Settings (100%) */}
      <div className="px-3.5 pt-2.5 shrink-0">
        <div className="grid grid-cols-2 gap-1 p-1 bg-white/[0.04] rounded-xl border border-white/10">
          <button
            onClick={() => {
              triggerHaptic(10);
              setSettingsTab('essentials');
            }}
            className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              settingsTab === 'essentials'
                ? 'btn-3d-lime text-black font-black shadow-sm shadow-lime-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Quick Essentials</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic(10);
              setSettingsTab('all');
            }}
            className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              settingsTab === 'all'
                ? 'btn-3d-cyan text-black font-black shadow-sm shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>All Settings (100%)</span>
          </button>
        </div>
      </div>

      {settingsTab === 'all' ? (
        /* 100% Full Settings Panel */
        <div className="flex-1 overflow-hidden flex flex-col min-h-0 pt-2">
          <SettingsPanel className="w-full h-full border-none bg-transparent" onClose={onClose} />
        </div>
      ) : (
        /* Main 5 Essentials Scroll Area */
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-4">
        {/* 1. MUSIC ESSENTIAL */}
        <section className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5 text-purple-400" />
              <span>1. Music</span>
            </label>
            <button
              onClick={handleResetMusic}
              className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
              title="Reset music"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <select
              value={activeMelodyId}
              onChange={(e) => handleSelectMelody(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-cyan-400 truncate cursor-pointer"
            >
              {melodyList.map((m) => (
                <option key={m.id} value={m.id} className="bg-[#0e121a] text-slate-200">
                  {m.name}
                </option>
              ))}
            </select>

            <button
              onClick={handlePreviewMelody}
              className={`p-2 rounded-xl transition-all ${
                isPlayingMelodyPreview
                  ? 'btn-3d-pink text-white'
                  : 'btn-3d-glass text-slate-300 hover:text-white'
              }`}
              title="Preview melody"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
            </button>

            <button
              onClick={() => setMidiEditorOpen(true)}
              className="btn-3d-glass px-2.5 py-2 rounded-xl text-[11px] font-bold text-purple-300 hover:text-white flex items-center gap-1 shrink-0"
              title="Open MIDI piano roll editor or upload custom MIDI file"
            >
              <Upload className="w-3 h-3 text-purple-400" />
              <span>MIDI</span>
            </button>
          </div>
        </section>

        {/* 2. LOOK ESSENTIAL */}
        <section className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-cyan-400" />
              <span>2. Look &amp; World</span>
            </label>
            <button
              onClick={handleResetLook}
              className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
              title="Reset visual look"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {BUILTIN_THEMES.slice(0, 8).map((theme) => {
              const isActive = currentThemeId === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => handleSelectTheme(theme.id)}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    isActive
                      ? 'border-cyan-400 bg-cyan-500/15 shadow-sm shadow-cyan-400/20'
                      : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/15'
                  }`}
                  title={theme.name}
                >
                  <div className="flex items-center gap-1">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm"
                      style={{ backgroundColor: theme.ballDefault }}
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-white/20"
                      style={{ backgroundColor: theme.ringColors[0] || theme.accent }}
                    />
                  </div>
                  <span className="text-[9.5px] font-bold text-slate-300 truncate w-full text-center">
                    {theme.name.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 3. MARBLE ESSENTIAL */}
        <section className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <Circle className="w-3.5 h-3.5 text-lime-400" />
              <span>3. Marble</span>
            </label>
            <button
              onClick={handleResetMarble}
              className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
              title="Reset marble"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {favoriteMarbles.map((m) => {
              const isSelected =
                (m.type === 'emoji' && customBall?.emoji === m.emoji) ||
                (customBall?.type !== 'emoji' && ballPhysics.color === m.color);

              return (
                <button
                  key={m.id}
                  onClick={() => handleSelectMarble(m)}
                  className={`p-2 rounded-xl border flex flex-col items-center justify-center transition-all ${
                    isSelected
                      ? 'border-lime-400 bg-lime-500/15 shadow-sm shadow-lime-400/20'
                      : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/15'
                  }`}
                  title={m.name}
                >
                  {m.type === 'emoji' ? (
                    <span className="text-base leading-none">{m.emoji}</span>
                  ) : (
                    <span
                      className="w-4 h-4 rounded-full border border-white/30 shadow-inner"
                      style={{ backgroundColor: m.color }}
                    />
                  )}
                  <span className="text-[9px] font-bold text-slate-300 mt-1 truncate w-full text-center">
                    {m.name.split(' ')[0]}
                  </span>
                </button>
              );
            })}

            {/* More Marbles Button */}
            <button
              onClick={() => setShowMoreMarbles(!showMoreMarbles)}
              className="p-2 rounded-xl border border-dashed border-white/20 hover:border-white/40 flex flex-col items-center justify-center text-slate-400 hover:text-white transition-all text-[9.5px] font-bold"
            >
              <Sparkles className="w-3.5 h-3.5 mb-0.5 text-cyan-400" />
              <span>More</span>
            </button>
          </div>

          {/* Quick Drawer for More Emojis */}
          {showMoreMarbles && (
            <div className="pt-2 border-t border-white/10 space-y-2 animate-fadeIn">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Quick Emojis:
              </span>
              <div className="flex flex-wrap gap-1">
                {['⚽', '🎾', '🎱', '🪙', '🍕', '🍩', '🪐', '💣', '🚀', '🌟', '👻', '💀'].map((em) => (
                  <button
                    key={em}
                    onClick={() => renderEmojiTexture(em)}
                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 flex items-center justify-center text-sm"
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 4. TEXT ESSENTIAL */}
        <section className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-pink-400" />
              <span>4. Text &amp; Hook</span>
            </label>
            <button
              onClick={handleResetText}
              className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
              title="Reset text overlays"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          {/* Hook Input with AI Suggest */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
              <span>Viral Hook Caption:</span>
              <button
                onClick={handleAiSuggestHook}
                className="btn-3d-cyan h-6 px-2 rounded-lg text-[10px] font-black uppercase tracking-wider text-black flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>AI Suggest</span>
              </button>
            </div>
            <input
              type="text"
              value={currentHook}
              onChange={(e) => {
                setOverlays({ titleText: e.target.value, showTitle: true });
                updateModeSetting('handleText', e.target.value);
              }}
              placeholder="e.g. Wait for the final chord... 🎶✨"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* @Handle and Watermark row */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400">@Handle</span>
              <input
                type="text"
                value={currentHandle}
                onChange={(e) =>
                  setOverlays({
                    centerText: e.target.value,
                    showCenterText: !!e.target.value,
                  })
                }
                placeholder="@mychannel"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400">Watermark</span>
              <button
                onClick={handleToggleWatermark}
                className={`w-full py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  showWatermark
                    ? 'border-white/10 bg-white/5 text-slate-300 hover:text-white'
                    : 'border-emerald-400 bg-emerald-500/15 text-emerald-300 font-extrabold'
                }`}
              >
                {showWatermark ? (
                  <span>Watermark: ON</span>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>No Watermark</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* 5. LENGTH & SPEED ESSENTIAL */}
        <section className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>5. Length &amp; Speed</span>
            </label>
            <button
              onClick={handleResetLengthSpeed}
              className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
              title="Reset length & speed"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          <div className="space-y-2">
            {/* Duration Pills: 15 / 30 / 60 / 90 s */}
            <div className="flex items-center gap-1.5">
              {[15, 30, 60, 90].map((sec) => (
                <button
                  key={sec}
                  onClick={() => handleSelectDuration(sec)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all ${
                    targetDuration === sec
                      ? 'btn-3d-cyan text-black shadow-sm shadow-cyan-500/20'
                      : 'btn-3d-glass text-slate-300 hover:text-white'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>

            {/* Reel Speed Pills: Calm 0.5x / Normal 1x */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => handleSelectSpeed(0.5)}
                className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
                  reelSpeed === 0.5
                    ? 'btn-3d-lime text-black font-black shadow-sm shadow-lime-500/20'
                    : 'btn-3d-glass text-slate-300 hover:text-white'
                }`}
              >
                Calm 0.5x
              </button>

              <button
                onClick={() => handleSelectSpeed(1.0)}
                className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
                  reelSpeed === 1.0
                    ? 'btn-3d-lime text-black font-black shadow-sm shadow-lime-500/20'
                    : 'btn-3d-glass text-slate-300 hover:text-white'
                }`}
              >
                Normal 1.0x
              </button>
            </div>
          </div>
        </section>

        {/* 6. ADVANCED SETTINGS ACCORDION */}
        <div className="pt-2 border-t border-white/10">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between text-xs font-bold text-slate-200 transition-all"
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Advanced Settings</span>
            </div>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAdvanced && (
            <div className="mt-3 p-3 rounded-2xl bg-black/40 border border-white/10 space-y-3.5 animate-fadeIn">
              {/* Physics Sliders */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Physics Fine-Tuning:
                </span>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-300">
                    <span>Gravity</span>
                    <span className="font-mono">{ballPhysics.gravity.toFixed(2)}G</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2.5"
                    step="0.05"
                    value={ballPhysics.gravity}
                    onChange={(e) => setBallPhysics({ gravity: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-300">
                    <span>Elastic Bounciness</span>
                    <span className="font-mono">{ballPhysics.restitution.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.2"
                    step="0.02"
                    value={ballPhysics.restitution}
                    onChange={(e) => setBallPhysics({ restitution: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Sound Sub-Mix */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Audio Sub-Mix:
                </span>
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Sidechain Ducking (-14 LUFS)</span>
                  <span className="text-[10px] font-mono text-emerald-400">Active</span>
                </div>
              </div>

              {/* Switch to 100% Full Settings */}
              <div className="pt-2 border-t border-white/5 space-y-2">
                <button
                  onClick={() => {
                    triggerHaptic(10);
                    setSettingsTab('all');
                  }}
                  className="btn-3d-cyan w-full py-2 px-3 rounded-xl text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-cyan-500/20"
                >
                  <Sliders className="w-4 h-4 stroke-[2.5]" />
                  <span>Switch to All Settings (100% Full Controls)</span>
                </button>
              </div>

              {/* Link to Diagnostics */}
              <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                <button
                  onClick={() => setRoute('diagnostics')}
                  className="text-xs text-purple-300 hover:text-white font-bold flex items-center gap-1.5"
                >
                  <Activity className="w-3.5 h-3.5 text-purple-400" />
                  <span>Device Diagnostics &amp; Tests</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      )}
    </aside>
  );
};
