export type SupportedLanguage =
  | 'en'
  | 'ur'
  | 'hi'
  | 'ar'
  | 'es'
  | 'pt-BR'
  | 'fr'
  | 'de'
  | 'id'
  | 'tr'
  | 'ru'
  | 'bn'
  | 'vi'
  | 'ja'
  | 'ko'
  | 'zh-CN';

export type TranslationNamespace =
  | 'common'
  | 'landing'
  | 'studio'
  | 'modes'
  | 'settings'
  | 'export'
  | 'pricing'
  | 'account'
  | 'affiliate'
  | 'admin'
  | 'legal'
  | 'emails'
  | 'errors'
  | 'seo'
  | 'ai';

export interface LanguageMeta {
  code: SupportedLanguage;
  name: string; // Native name shown in switcher
  englishName: string;
  dir: 'ltr' | 'rtl';
  fontFamily: string;
  googleFontFamily?: string;
  lineHeight: number;
  hasCase: boolean;
  locale: string;
  enabled: boolean;
}

export const SUPPORTED_LANGUAGES: Record<SupportedLanguage, LanguageMeta> = {
  en: {
    code: 'en',
    name: 'English',
    englishName: 'English',
    dir: 'ltr',
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    lineHeight: 1.45,
    hasCase: true,
    locale: 'en-US',
    enabled: true,
  },
  ur: {
    code: 'ur',
    name: 'اردو',
    englishName: 'Urdu',
    dir: 'rtl',
    fontFamily: '"Noto Nastaliq Urdu", "Noto Naskh Arabic", "Urdu Typesetting", Tahoma, sans-serif',
    googleFontFamily: 'Noto+Nastaliq+Urdu:wght@400;700',
    lineHeight: 2.05,
    hasCase: false,
    locale: 'ur-PK',
    enabled: true,
  },
  hi: {
    code: 'hi',
    name: 'हिन्दी',
    englishName: 'Hindi',
    dir: 'ltr',
    fontFamily: '"Noto Sans Devanagari", sans-serif',
    googleFontFamily: 'Noto+Sans+Devanagari:wght@400;600;800',
    lineHeight: 1.6,
    hasCase: false,
    locale: 'hi-IN',
    enabled: true,
  },
  ar: {
    code: 'ar',
    name: 'العربية',
    englishName: 'Arabic',
    dir: 'rtl',
    fontFamily: '"Noto Sans Arabic", "Segoe UI Arabic", Tahoma, sans-serif',
    googleFontFamily: 'Noto+Sans+Arabic:wght@400;600;800',
    lineHeight: 1.7,
    hasCase: false,
    locale: 'ar-SA',
    enabled: true,
  },
  es: {
    code: 'es',
    name: 'Español',
    englishName: 'Spanish',
    dir: 'ltr',
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    lineHeight: 1.45,
    hasCase: true,
    locale: 'es-ES',
    enabled: true,
  },
  'pt-BR': {
    code: 'pt-BR',
    name: 'Português (Brasil)',
    englishName: 'Portuguese (Brazil)',
    dir: 'ltr',
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    lineHeight: 1.45,
    hasCase: true,
    locale: 'pt-BR',
    enabled: true,
  },
  fr: {
    code: 'fr',
    name: 'Français',
    englishName: 'French',
    dir: 'ltr',
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    lineHeight: 1.45,
    hasCase: true,
    locale: 'fr-FR',
    enabled: true,
  },
  de: {
    code: 'de',
    name: 'Deutsch',
    englishName: 'German',
    dir: 'ltr',
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    lineHeight: 1.45,
    hasCase: true,
    locale: 'de-DE',
    enabled: true,
  },
  id: {
    code: 'id',
    name: 'Bahasa Indonesia',
    englishName: 'Indonesian',
    dir: 'ltr',
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    lineHeight: 1.45,
    hasCase: true,
    locale: 'id-ID',
    enabled: true,
  },
  tr: {
    code: 'tr',
    name: 'Türkçe',
    englishName: 'Turkish',
    dir: 'ltr',
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    lineHeight: 1.45,
    hasCase: true,
    locale: 'tr-TR',
    enabled: true,
  },
  ru: {
    code: 'ru',
    name: 'Русский',
    englishName: 'Russian',
    dir: 'ltr',
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    lineHeight: 1.45,
    hasCase: true,
    locale: 'ru-RU',
    enabled: true,
  },
  bn: {
    code: 'bn',
    name: 'বাংলা',
    englishName: 'Bengali',
    dir: 'ltr',
    fontFamily: '"Noto Sans Bengali", sans-serif',
    googleFontFamily: 'Noto+Sans+Bengali:wght@400;600;800',
    lineHeight: 1.6,
    hasCase: false,
    locale: 'bn-BD',
    enabled: true,
  },
  vi: {
    code: 'vi',
    name: 'Tiếng Việt',
    englishName: 'Vietnamese',
    dir: 'ltr',
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    lineHeight: 1.45,
    hasCase: true,
    locale: 'vi-VN',
    enabled: true,
  },
  ja: {
    code: 'ja',
    name: '日本語',
    englishName: 'Japanese',
    dir: 'ltr',
    fontFamily: '"Noto Sans JP", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif',
    googleFontFamily: 'Noto+Sans+JP:wght@400;700',
    lineHeight: 1.65,
    hasCase: false,
    locale: 'ja-JP',
    enabled: true,
  },
  ko: {
    code: 'ko',
    name: '한국어',
    englishName: 'Korean',
    dir: 'ltr',
    fontFamily: '"Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
    googleFontFamily: 'Noto+Sans+KR:wght@400;700',
    lineHeight: 1.6,
    hasCase: false,
    locale: 'ko-KR',
    enabled: true,
  },
  'zh-CN': {
    code: 'zh-CN',
    name: '简体中文',
    englishName: 'Simplified Chinese',
    dir: 'ltr',
    fontFamily: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
    googleFontFamily: 'Noto+Sans+SC:wght@400;700',
    lineHeight: 1.6,
    hasCase: false,
    locale: 'zh-CN',
    enabled: true,
  },
};

export const ALL_LANGUAGE_CODES = Object.keys(SUPPORTED_LANGUAGES) as SupportedLanguage[];

export const ALL_NAMESPACES: TranslationNamespace[] = [
  'common',
  'landing',
  'studio',
  'modes',
  'settings',
  'export',
  'pricing',
  'account',
  'affiliate',
  'admin',
  'legal',
  'emails',
  'errors',
  'seo',
  'ai',
];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

export const isRTL = (lang: SupportedLanguage): boolean => {
  return SUPPORTED_LANGUAGES[lang]?.dir === 'rtl';
};

export const getLanguageMeta = (lang: string): LanguageMeta => {
  return (
    SUPPORTED_LANGUAGES[lang as SupportedLanguage] || SUPPORTED_LANGUAGES[DEFAULT_LANGUAGE]
  );
};
