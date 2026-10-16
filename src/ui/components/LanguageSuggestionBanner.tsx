import React, { useState, useEffect } from 'react';
import { Globe, X, ArrowRight } from 'lucide-react';
import { useI18n } from '../../i18n';
import {
  ALL_LANGUAGE_CODES,
  SupportedLanguage,
  SUPPORTED_LANGUAGES,
} from '../../i18n/config';

export const LanguageSuggestionBanner: React.FC = () => {
  const { currentLanguage, setLanguage } = useI18n();
  const [suggestedLang, setSuggestedLang] = useState<SupportedLanguage | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      const alreadyDismissed = sessionStorage.getItem('bf_lang_suggest_dismissed');
      if (alreadyDismissed) return;

      const browserLang = (navigator.language || '').toLowerCase();
      // Match 2-letter code or pt-BR / zh-CN
      let matchedCode: SupportedLanguage | null = null;

      if (browserLang.startsWith('pt')) matchedCode = 'pt-BR';
      else if (browserLang.startsWith('zh')) matchedCode = 'zh-CN';
      else {
        const short = browserLang.slice(0, 2) as SupportedLanguage;
        if (ALL_LANGUAGE_CODES.includes(short)) {
          matchedCode = short;
        }
      }

      if (matchedCode && matchedCode !== currentLanguage) {
        setSuggestedLang(matchedCode);
      }
    } catch {
      // ignore
    }
  }, [currentLanguage]);

  if (!suggestedLang || dismissed) return null;

  const targetMeta = SUPPORTED_LANGUAGES[suggestedLang];

  const handleSwitch = async () => {
    setDismissed(true);
    sessionStorage.setItem('bf_lang_suggest_dismissed', 'true');
    await setLanguage(suggestedLang);

    // Update URL prefix
    const path = window.location.pathname;
    const currentPrefixRegex = new RegExp(`^/(${ALL_LANGUAGE_CODES.join('|')})(/|$)`);
    const newPath = path.replace(currentPrefixRegex, `/${suggestedLang}$2`);
    window.history.pushState({}, '', newPath);
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('bf_lang_suggest_dismissed', 'true');
  };

  return (
    <aside
      aria-label="Language recommendation"
      className="bg-gradient-to-r from-purple-900/90 via-slate-900/95 to-cyan-950/90 border-b border-cyan-500/30 text-white px-4 py-2 text-xs flex items-center justify-between gap-3 sticky top-0 z-50 backdrop-blur-md shadow-lg"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <Globe className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />
        <span className="truncate">
          This page is available in <strong className="text-cyan-300 font-bold">{targetMeta.name}</strong> ({targetMeta.englishName}).
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleSwitch}
          className="px-3 py-1 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold text-[11px] uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shadow-md"
        >
          <span>Switch to {targetMeta.name}</span>
          <ArrowRight className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Dismiss notice"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
