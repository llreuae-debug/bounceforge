import React, { useState, useEffect } from 'react';
import { Sparkles, RotateCcw, Heart, Check, ChevronDown, ChevronUp, AlertCircle, Shuffle } from 'lucide-react';
import { AiService, AiUserSettings } from '../../ai/aiService';
import { HookStyle, SupportedLanguage, fitsSafeLineLimit } from '../../ai/offlineEngine';
import { useStudioStore } from '../../store/useStudioStore';

interface AiHookSuggesterProps {
  currentText: string;
  onApplyHook: (hook: string) => void;
  modeName: string;
  category: string;
  endingType?: string;
}

export const AiHookSuggester: React.FC<AiHookSuggesterProps> = ({
  currentText,
  onApplyHook,
  modeName,
  category,
  endingType = 'escape',
}) => {
  const { showToast } = useStudioStore();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const [isAi, setIsAi] = useState(false);
  const [showMyHooks, setShowMyHooks] = useState(false);
  const [myHooks, setMyHooks] = useState<string[]>([]);

  // Controls
  const [selectedStyles, setSelectedStyles] = useState<HookStyle[]>(['curiosity', 'challenge']);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('en');
  const [emojiEnabled, setEmojiEnabled] = useState(true);
  const [casing, setCasing] = useState<'as_written' | 'lowercase' | 'uppercase'>('as_written');

  const availableStyles: { id: HookStyle; label: string }[] = [
    { id: 'curiosity', label: 'curiosity' },
    { id: 'challenge', label: 'challenge' },
    { id: 'prediction', label: 'prediction' },
    { id: 'countdown', label: 'countdown' },
    { id: 'asmr', label: 'asmr' },
    { id: 'funny', label: 'funny' },
    { id: 'suspense', label: 'suspense' },
  ];

  const languages: { id: SupportedLanguage; label: string }[] = [
    { id: 'en', label: 'English' },
    { id: 'ur_roman', label: 'Urdu (Roman)' },
    { id: 'ur_script', label: 'Urdu (اردو)' },
    { id: 'hi', label: 'Hindi (हिन्दी)' },
    { id: 'ar', label: 'Arabic (العربية)' },
    { id: 'es', label: 'Spanish' },
    { id: 'pt', label: 'Portuguese' },
    { id: 'id', label: 'Indonesian' },
    { id: 'tr', label: 'Turkish' },
  ];

  useEffect(() => {
    setMyHooks(AiService.getInstance().getMyHooks());
  }, [isOpen]);

  const fetchHooks = async () => {
    setLoading(true);
    const res = await AiService.getInstance().generateHooks({
      modeName,
      category,
      endingType,
      styles: selectedStyles,
      language: selectedLanguage,
      emoji: emojiEnabled,
      casing,
    });

    setOptions(res.hooks);
    setIsAi(res.isAi);
    setLoading(false);
  };

  const handleToggleOpen = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState && options.length === 0) {
      fetchHooks();
    }
  };

  const handleToggleStyle = (style: HookStyle) => {
    if (selectedStyles.includes(style)) {
      if (selectedStyles.length > 1) {
        setSelectedStyles(selectedStyles.filter((s) => s !== style));
      }
    } else {
      setSelectedStyles([...selectedStyles, style]);
    }
  };

  const handleSaveHook = (e: React.MouseEvent, hook: string) => {
    e.stopPropagation();
    if (AiService.getInstance().isHookSaved(hook)) {
      AiService.getInstance().removeHook(hook);
      showToast('hook removed from my hooks');
    } else {
      AiService.getInstance().saveHook(hook);
      showToast('hook saved to my hooks ❤️');
    }
    setMyHooks(AiService.getInstance().getMyHooks());
  };

  const handleApply = (hook: string) => {
    if (!fitsSafeLineLimit(hook)) {
      showToast('hook exceeds 40 characters limit');
      return;
    }
    onApplyHook(hook);
    showToast(`applied: "${hook}"`);
  };

  return (
    <div className="space-y-2">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggleOpen}
        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
          isOpen
            ? 'btn-3d-pink text-black'
            : 'btn-3d-glass text-pink-300 hover:text-white border-pink-500/20'
        }`}
        title="Open AI & offline hook generator"
      >
        <Sparkles className="w-3.5 h-3.5 stroke-[2.2] animate-pulse" />
        <span>ai suggest</span>
        {isOpen ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
      </button>

      {/* Expanded AI Suggester Panel */}
      {isOpen && (
        <div className="p-3 rounded-2xl bg-black/60 border border-pink-500/30 space-y-3 animate-fade-in font-sans">
          {/* Header Controls */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-white uppercase tracking-wider">Hook Generator</span>
              {isAi ? (
                <span className="px-1.5 py-0.2 rounded-full bg-pink-500/20 text-pink-400 text-[9px] font-mono border border-pink-500/30">
                  ai
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-400 text-[9px] font-mono border border-cyan-500/30">
                  offline
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowMyHooks(!showMyHooks)}
                className={`text-[10px] font-mono px-2 py-0.5 rounded-md flex items-center gap-1 transition-all ${
                  showMyHooks ? 'bg-pink-500 text-black font-bold' : 'bg-white/5 text-slate-300 hover:text-white'
                }`}
              >
                <Heart className="w-3 h-3 fill-current" />
                <span>my hooks ({myHooks.length})</span>
              </button>

              <button
                type="button"
                onClick={fetchHooks}
                disabled={loading}
                className="text-[10px] font-mono text-cyan-300 hover:text-white flex items-center gap-1"
                title="Regenerate hook options"
              >
                <RotateCcw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                <span>regenerate</span>
              </button>
            </div>
          </div>

          {!showMyHooks ? (
            <>
              {/* Style Chips (Multi-select) */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Styles (multi-select)
                </span>
                <div className="flex flex-wrap gap-1">
                  {availableStyles.map((s) => {
                    const active = selectedStyles.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleToggleStyle(s.id)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-mono transition-all ${
                          active
                            ? 'bg-pink-500 text-black font-black shadow-sm shadow-pink-500/20'
                            : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Language, Emoji & Casing */}
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/5 text-[10px]">
                <div>
                  <span className="text-slate-400 block mb-0.5 font-bold">Language</span>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value as any)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-1 text-white text-[10px] outline-none"
                  >
                    {languages.map((l) => (
                      <option key={l.id} value={l.id} className="bg-slate-900 text-white">
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="text-slate-400 block mb-0.5 font-bold">Emoji</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setEmojiEnabled(true)}
                      className={`flex-1 py-1 rounded-md text-[10px] font-mono ${
                        emojiEnabled ? 'bg-amber-400 text-black font-bold' : 'bg-white/5 text-slate-400'
                      }`}
                    >
                      on
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmojiEnabled(false)}
                      className={`flex-1 py-1 rounded-md text-[10px] font-mono ${
                        !emojiEnabled ? 'bg-amber-400 text-black font-bold' : 'bg-white/5 text-slate-400'
                      }`}
                    >
                      off
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block mb-0.5 font-bold">Case</span>
                  <select
                    value={casing}
                    onChange={(e) => setCasing(e.target.value as any)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-1 text-white text-[10px] outline-none"
                  >
                    <option value="as_written" className="bg-slate-900 text-white">as written</option>
                    <option value="lowercase" className="bg-slate-900 text-white">lowercase</option>
                    <option value="uppercase" className="bg-slate-900 text-white">ALL CAPS</option>
                  </select>
                </div>
              </div>

              {/* Hook Option Cards */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Tap to Apply Instantly (Max 40 chars • Safe Area Verified)
                </span>

                {loading ? (
                  <div className="space-y-1.5 py-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-9 rounded-xl bg-white/5 animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-1.5">
                    {options.map((hook, idx) => {
                      const isCurrent = currentText === hook;
                      const isSaved = myHooks.includes(hook);
                      const isRtl = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(hook);
                      return (
                        <div
                          key={idx}
                          onClick={() => handleApply(hook)}
                          className={`min-h-[44px] px-3 py-2 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                            isCurrent
                              ? 'bg-pink-500/15 border-pink-500/60 shadow-sm shadow-pink-500/20'
                              : 'bg-white/[0.03] border-white/10 hover:border-pink-500/40 hover:bg-white/[0.05]'
                          }`}
                        >
                          <div className={`flex items-center gap-2 overflow-hidden flex-1 ${isRtl ? 'flex-row-reverse text-right' : ''}`}>
                            {isCurrent && <Check className="w-3.5 h-3.5 text-pink-400 shrink-0" />}
                            <span dir={isRtl ? 'rtl' : 'ltr'} className="text-xs text-white font-medium truncate flex-1">
                              {hook}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-mono text-slate-500">
                              {hook.length}c
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleSaveHook(e, hook)}
                              className="p-1 text-slate-400 hover:text-pink-400 transition-colors"
                              title={isSaved ? 'Remove from My Hooks' : 'Save to My Hooks'}
                            >
                              <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-pink-500 text-pink-500' : ''}`} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* My Hooks Tab */
            <div className="space-y-2 py-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Saved Reusable Hooks ({myHooks.length})
              </span>
              {myHooks.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs font-mono">
                  tap the heart on any hook to save it here for quick 1-tap reuse.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {myHooks.map((h, i) => (
                    <div
                      key={i}
                      onClick={() => handleApply(h)}
                      className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between cursor-pointer hover:border-pink-500/40"
                    >
                      <span className="text-xs text-white font-medium truncate">{h}</span>
                      <button
                        type="button"
                        onClick={(e) => handleSaveHook(e, h)}
                        className="text-pink-500 p-1"
                        title="Remove from My Hooks"
                      >
                        <Heart className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
