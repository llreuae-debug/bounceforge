import i18n from 'i18next';
import { initReactI18next, useTranslation as useReactI18nextTranslation } from 'react-i18next';
import ICU from 'i18next-icu';
import {
  SupportedLanguage,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  ALL_NAMESPACES,
  TranslationNamespace,
  isRTL,
  getLanguageMeta,
} from './config';
import { EN_BUNDLE, loadLocaleNamespace } from '../locales';
import { ensureFontLoaded } from './fonts';
import {
  formatNumber,
  formatCurrency,
  formatDate,
  formatRelativeTime,
  formatList,
  formatCase,
} from './formatters';

// In-memory tracker for missing keys (reported to Admin Panel Translation Manager)
export interface MissingKeyReport {
  id: string;
  lang: SupportedLanguage;
  namespace: string;
  key: string;
  timestamp: number;
}

class MissingKeyTracker {
  private missing = new Map<string, MissingKeyReport>();

  record(lang: SupportedLanguage, ns: string, key: string) {
    if (lang === 'en') return;
    const id = `${lang}:${ns}:${key}`;
    if (!this.missing.has(id)) {
      this.missing.set(id, {
        id,
        lang,
        namespace: ns,
        key,
        timestamp: Date.now(),
      });
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[i18n Missing Key] (${lang}) [${ns}] -> ${key}`);
      }
    }
  }

  getAll(): MissingKeyReport[] {
    return Array.from(this.missing.values());
  }

  clear() {
    this.missing.clear();
  }
}

export const missingKeysTracker = new MissingKeyTracker();
export function getMissingKeysReport(): MissingKeyReport[] {
  return missingKeysTracker.getAll();
}

// Initialize i18next instance
i18n
  .use(ICU)
  .use(initReactI18next)
  .init({
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: Object.keys(SUPPORTED_LANGUAGES),
    defaultNS: 'common',
    ns: ALL_NAMESPACES,
    resources: {
      en: EN_BUNDLE,
    },
    interpolation: {
      escapeValue: false, // React handles XSS safely
    },
    missingKeyHandler: (lngs, ns, key) => {
      const primaryLang = (Array.isArray(lngs) ? lngs[0] : lngs) as SupportedLanguage;
      missingKeysTracker.record(primaryLang, ns, key);
    },
    react: {
      useSuspense: false,
    },
  });

/**
 * Changes active language, sets document html attributes, loads fonts, and dynamically fetches namespaces
 */
export async function setLanguage(lang: SupportedLanguage): Promise<void> {
  const meta = getLanguageMeta(lang);
  const targetLang = meta.code;

  // 1. Preload needed namespaces for this language
  const loadPromises = ALL_NAMESPACES.map(async (ns) => {
    if (!i18n.hasResourceBundle(targetLang, ns)) {
      const bundle = await loadLocaleNamespace(targetLang, ns);
      i18n.addResourceBundle(targetLang, ns, bundle, true, true);
    }
  });
  await Promise.allSettled(loadPromises);

  // 2. Change language in i18n core
  await i18n.changeLanguage(targetLang);

  // 3. Update DOM attributes <html lang="..." dir="...">
  if (typeof document !== 'undefined') {
    document.documentElement.lang = targetLang;
    document.documentElement.dir = meta.dir;
    document.documentElement.setAttribute('data-script', meta.code);

    // Apply font-family override to root element when non-latin script is active
    if (meta.googleFontFamily) {
      document.body.style.fontFamily = meta.fontFamily;
    } else {
      document.body.style.fontFamily = '';
    }

    // Save user preference
    try {
      localStorage.setItem('bounceforge_lang', targetLang);
    } catch {}
  }

  // 4. Ensure script webfonts are loaded for canvas & DOM
  await ensureFontLoaded(targetLang);

  // 5. Dispatch event for canvas & non-react renderers
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('bf:language_changed', { detail: { lang: targetLang, dir: meta.dir } }));
  }
}

/**
 * Custom hook wrapping useTranslation with Intl helpers
 */
export function useI18n(ns?: TranslationNamespace | TranslationNamespace[]) {
  const { t, i18n: instance } = useReactI18nextTranslation(ns);
  const currentLang = (instance.language || DEFAULT_LANGUAGE) as SupportedLanguage;
  const meta = getLanguageMeta(currentLang);

  return {
    t,
    i18n: instance,
    currentLanguage: currentLang,
    meta,
    isRTL: meta.dir === 'rtl',
    dir: meta.dir,
    setLanguage,
    formatNumber: (val: number, opts?: Intl.NumberFormatOptions) => formatNumber(val, currentLang, opts),
    formatCurrency: (amt: number, opts?: { showApprox?: boolean }) => formatCurrency(amt, currentLang, opts),
    formatDate: (d: Date | number | string, opts?: Intl.DateTimeFormatOptions) => formatDate(d, currentLang, opts),
    formatRelativeTime: (ts: number) => formatRelativeTime(ts, currentLang),
    formatList: (items: string[], type?: 'conjunction' | 'disjunction') => formatList(items, currentLang, type),
    formatCase: (text: string, casing: 'lower' | 'upper') => formatCase(text, currentLang, casing),
  };
}

export default i18n;
export * from './config';
export * from './fonts';
export * from './formatters';
