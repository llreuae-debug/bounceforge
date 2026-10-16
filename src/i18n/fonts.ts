import { SupportedLanguage, SUPPORTED_LANGUAGES } from './config';

const loadedFonts = new Set<string>();

export async function ensureFontLoaded(lang: SupportedLanguage): Promise<void> {
  if (typeof document === 'undefined') return;

  const meta = SUPPORTED_LANGUAGES[lang];
  if (!meta || !meta.googleFontFamily) return;

  const fontKey = meta.googleFontFamily;
  if (loadedFonts.has(fontKey)) return;

  // 1. Inject link tag if not already in document
  const linkId = `bf-font-${lang}`;
  if (!document.getElementById(linkId)) {
    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${meta.googleFontFamily}&display=swap`;
    document.head.appendChild(link);
  }

  // 2. Wait for font to register in document.fonts
  try {
    if (document.fonts && document.fonts.load) {
      // Load standard weight 400 and bold 700
      const primaryName = meta.fontFamily.split(',')[0].replace(/"/g, '').trim();
      await Promise.allSettled([
        document.fonts.load(`16px "${primaryName}"`),
        document.fonts.load(`bold 24px "${primaryName}"`),
      ]);
      await (document.fonts.ready || Promise.resolve());
    }
  } catch (err) {
    console.warn(`Font load note for ${lang}:`, err);
  }

  loadedFonts.add(fontKey);
}

export function getScriptFontFamily(lang: SupportedLanguage): string {
  const meta = SUPPORTED_LANGUAGES[lang];
  return meta ? meta.fontFamily : '"Helvetica Neue", Helvetica, Arial, sans-serif';
}

export function getScriptLineHeight(lang: SupportedLanguage): number {
  const meta = SUPPORTED_LANGUAGES[lang];
  return meta ? meta.lineHeight : 1.45;
}
