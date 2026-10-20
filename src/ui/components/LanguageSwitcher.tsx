import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import {
  SupportedLanguage,
  SUPPORTED_LANGUAGES,
  ALL_LANGUAGE_CODES,
  getLanguageMeta,
} from '../../i18n/config';
import { useI18n } from '../../i18n';
import { useStudioStore } from '../../store/useStudioStore';

interface LanguageSwitcherProps {
  variant?: 'header' | 'footer' | 'mobile';
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'header',
  className = '',
}) => {
  const { currentLanguage, setLanguage, isRTL } = useI18n();
  const { currentRoute } = useStudioStore();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const activeMeta = getLanguageMeta(currentLanguage);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelectLanguage = async (code: SupportedLanguage) => {
    setIsOpen(false);
    await setLanguage(code);

    // Update browser URL with new language prefix while preserving route & state
    const cleanRoute = currentRoute === 'landing' ? '' : currentRoute;
    const newPath = `/${code}${cleanRoute ? '/' + cleanRoute : ''}`;
    window.history.pushState({}, '', newPath);
  };

  if (variant === 'mobile') {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 uppercase tracking-wider px-1">
          <Globe className="w-3.5 h-3.5 text-cyan-400" />
          <span>Language / زبان</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 max-h-60 overflow-y-auto p-1 bg-black/40 rounded-xl border border-white/10">
          {ALL_LANGUAGE_CODES.map((code) => {
            const meta = SUPPORTED_LANGUAGES[code];
            const isSelected = code === currentLanguage;
            return (
              <button
                key={code}
                onClick={() => handleSelectLanguage(code)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all text-start cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex flex-col">
                  <span className="font-bold">{meta.name}</span>
                  <span className="text-[10px] text-slate-500">{meta.englishName}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative inline-block text-start shrink-0 ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-9 flex items-center gap-2 px-2.5 rounded-xl border transition-all text-xs cursor-pointer whitespace-nowrap shrink-0 ${
          variant === 'footer'
            ? 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-neutral-300 hover:text-white'
            : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200 hover:text-white'
        }`}
        aria-label="Select language"
        aria-expanded={isOpen}
      >
        <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span className="font-bold">{activeMeta.name}</span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute z-50 mt-2 w-72 max-h-96 overflow-y-auto overscroll-contain bg-[#0e121a]/95 backdrop-blur-xl border border-white/15 rounded-2xl p-2 shadow-2xl animate-fadeIn ${
            isRTL ? 'start-0' : 'end-0'
          }`}
          style={{
            top: variant === 'footer' ? 'auto' : '100%',
            bottom: variant === 'footer' ? '100%' : 'auto',
            marginBottom: variant === 'footer' ? '0.5rem' : '0',
          }}
        >
          <div className="px-2.5 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 border-b border-white/5 flex items-center justify-between">
            <span>Choose Language</span>
            <span className="text-cyan-400">16 Available</span>
          </div>

          <div className="grid grid-cols-1 gap-1 py-1">
            {ALL_LANGUAGE_CODES.map((code) => {
              const meta = SUPPORTED_LANGUAGES[code];
              const isSelected = code === currentLanguage;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => handleSelectLanguage(code)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all text-start cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 text-[10px] font-mono text-slate-500 uppercase">{code}</span>
                    <div className="flex flex-col">
                      <span className="font-bold text-white">{meta.name}</span>
                      <span className="text-[10px] text-slate-400">{meta.englishName}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {meta.dir === 'rtl' && (
                      <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[9px] font-mono">
                        RTL
                      </span>
                    )}
                    {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
