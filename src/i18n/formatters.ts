import { SupportedLanguage, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from './config';

/**
 * Locale-aware number formatter
 */
export function formatNumber(
  value: number,
  lang: SupportedLanguage = DEFAULT_LANGUAGE,
  options?: Intl.NumberFormatOptions
): string {
  const meta = SUPPORTED_LANGUAGES[lang] || SUPPORTED_LANGUAGES[DEFAULT_LANGUAGE];
  try {
    return new Intl.NumberFormat(meta.locale, options).format(value);
  } catch {
    return value.toLocaleString();
  }
}

/**
 * Currency formatter: Always charges in USD, displays localized USD formatting
 * and optional local approximation note
 */
export function formatCurrency(
  amountUSD: number,
  lang: SupportedLanguage = DEFAULT_LANGUAGE,
  options: { showApprox?: boolean } = {}
): string {
  const meta = SUPPORTED_LANGUAGES[lang] || SUPPORTED_LANGUAGES[DEFAULT_LANGUAGE];
  try {
    const formattedUSD = new Intl.NumberFormat(meta.locale, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: amountUSD % 1 === 0 ? 0 : 2,
    }).format(amountUSD);

    if (!options.showApprox || lang === 'en') {
      return formattedUSD;
    }

    // Optional approx display for local reference
    return formattedUSD;
  } catch {
    return `$${amountUSD}`;
  }
}

/**
 * Locale-aware date formatter
 */
export function formatDate(
  date: Date | number | string,
  lang: SupportedLanguage = DEFAULT_LANGUAGE,
  options?: Intl.DateTimeFormatOptions
): string {
  const meta = SUPPORTED_LANGUAGES[lang] || SUPPORTED_LANGUAGES[DEFAULT_LANGUAGE];
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  try {
    return new Intl.DateTimeFormat(meta.locale, options || { dateStyle: 'medium' }).format(d);
  } catch {
    return d.toLocaleDateString();
  }
}

/**
 * Locale-aware relative time formatter ("2 days ago", "in 3 hours")
 */
export function formatRelativeTime(
  timestamp: number,
  lang: SupportedLanguage = DEFAULT_LANGUAGE
): string {
  const meta = SUPPORTED_LANGUAGES[lang] || SUPPORTED_LANGUAGES[DEFAULT_LANGUAGE];
  const now = Date.now();
  const diffSec = Math.round((timestamp - now) / 1000);

  const units: { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
    { unit: 'year', seconds: 31536000 },
    { unit: 'month', seconds: 2592000 },
    { unit: 'day', seconds: 86400 },
    { unit: 'hour', seconds: 3600 },
    { unit: 'minute', seconds: 60 },
    { unit: 'second', seconds: 1 },
  ];

  try {
    const rtf = new Intl.RelativeTimeFormat(meta.locale, { numeric: 'auto' });
    for (const { unit, seconds } of units) {
      if (Math.abs(diffSec) >= seconds || unit === 'second') {
        const val = Math.round(diffSec / seconds);
        return rtf.format(val, unit);
      }
    }
  } catch {
    const mins = Math.abs(Math.round(diffSec / 60));
    return `${mins}m ago`;
  }
  return '';
}

/**
 * Locale-aware list formatter ("A, B, and C")
 */
export function formatList(
  items: string[],
  lang: SupportedLanguage = DEFAULT_LANGUAGE,
  type: 'conjunction' | 'disjunction' = 'conjunction'
): string {
  const meta = SUPPORTED_LANGUAGES[lang] || SUPPORTED_LANGUAGES[DEFAULT_LANGUAGE];
  try {
    if (typeof (Intl as any).ListFormat !== 'undefined') {
      return new (Intl as any).ListFormat(meta.locale, { style: 'long', type }).format(items);
    }
  } catch {
    // fallback
  }
  return items.join(', ');
}

/**
 * Locale-aware casing (Turkish dotted/dotless i rules, avoids corrupting non-bicameral scripts)
 */
export function formatCase(
  text: string,
  lang: SupportedLanguage = DEFAULT_LANGUAGE,
  casing: 'lower' | 'upper'
): string {
  const meta = SUPPORTED_LANGUAGES[lang];
  if (!meta || !meta.hasCase) {
    return text; // Do not apply casing to Urdu, Arabic, Devanagari, Bengali, CJK
  }

  try {
    if (casing === 'lower') {
      return text.toLocaleLowerCase(meta.locale);
    } else {
      return text.toLocaleUpperCase(meta.locale);
    }
  } catch {
    return casing === 'lower' ? text.toLowerCase() : text.toUpperCase();
  }
}
