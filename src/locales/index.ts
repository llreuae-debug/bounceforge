// Auto-generated locale registry
import { SupportedLanguage, TranslationNamespace } from '../i18n/config';

// Eager English dictionary bundle for guaranteed synchronous fallback
import en_common from './en/common.json';
import en_landing from './en/landing.json';
import en_studio from './en/studio.json';
import en_modes from './en/modes.json';
import en_settings from './en/settings.json';
import en_export from './en/export.json';
import en_pricing from './en/pricing.json';
import en_account from './en/account.json';
import en_affiliate from './en/affiliate.json';
import en_admin from './en/admin.json';
import en_legal from './en/legal.json';
import en_emails from './en/emails.json';
import en_errors from './en/errors.json';
import en_seo from './en/seo.json';
import en_ai from './en/ai.json';

export const EN_BUNDLE: Record<TranslationNamespace, Record<string, any>> = {
  common: en_common,
  landing: en_landing,
  studio: en_studio,
  modes: en_modes,
  settings: en_settings,
  export: en_export,
  pricing: en_pricing,
  account: en_account,
  affiliate: en_affiliate,
  admin: en_admin,
  legal: en_legal,
  emails: en_emails,
  errors: en_errors,
  seo: en_seo,
  ai: en_ai,
};

// Lazy chunks for every non-English namespace (English is bundled eagerly above)
const NON_EN_LOCALES = import.meta.glob(['./*/*.json', '!./en/*.json']);

/**
 * Dynamically loads a localized namespace for a given language
 */
export async function loadLocaleNamespace(
  lang: SupportedLanguage,
  ns: TranslationNamespace
): Promise<Record<string, any>> {
  if (lang === 'en') {
    return EN_BUNDLE[ns];
  }

  try {
    const load = NON_EN_LOCALES[`./${lang}/${ns}.json`];
    if (!load) throw new Error('missing locale file');
    const mod: any = await load();
    return mod.default || mod;
  } catch (err) {
    console.warn(`Could not dynamically load locale [${lang}/${ns}], falling back to English:`, err);
    return EN_BUNDLE[ns];
  }
}
