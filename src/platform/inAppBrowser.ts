/**
 * In-app browser detection.
 *
 * Google blocks OAuth inside embedded webviews ("disallowed_useragent"), and
 * most social-bio traffic lands in exactly those webviews. We detect them so
 * the UI can offer "open in browser" + email/magic-link fallbacks instead of
 * a Google button that is guaranteed to fail.
 */

export type InAppBrowserName =
  | 'tiktok'
  | 'instagram'
  | 'facebook'
  | 'messenger'
  | 'youtube'
  | 'snapchat'
  | 'twitter'
  | 'linkedin'
  | 'whatsapp'
  | 'telegram'
  | 'line'
  | 'wechat'
  | 'generic_webview';

export interface InAppBrowserInfo {
  isInApp: boolean;
  name: InAppBrowserName | null;
  label: string;
  isAndroid: boolean;
  isIOS: boolean;
}

const RULES: { name: InAppBrowserName; label: string; re: RegExp }[] = [
  { name: 'tiktok', label: 'TikTok', re: /musical_ly|Bytedance|BytedanceWebview|TikTok|trill/i },
  { name: 'instagram', label: 'Instagram', re: /Instagram/i },
  { name: 'messenger', label: 'Messenger', re: /\bMessenger\b|FB_IAB\/MESSENGER/i },
  { name: 'facebook', label: 'Facebook', re: /FBAN|FBAV|FB_IAB|FBIOS|FB4A/i },
  { name: 'youtube', label: 'YouTube', re: /com\.google\.android\.youtube|YouTube\//i },
  { name: 'snapchat', label: 'Snapchat', re: /Snapchat/i },
  { name: 'twitter', label: 'X', re: /Twitter|TwitterAndroid/i },
  { name: 'linkedin', label: 'LinkedIn', re: /LinkedInApp/i },
  { name: 'whatsapp', label: 'WhatsApp', re: /WhatsApp/i },
  { name: 'telegram', label: 'Telegram', re: /Telegram|TelegramBot/i },
  { name: 'line', label: 'LINE', re: /\bLine\//i },
  { name: 'wechat', label: 'WeChat', re: /MicroMessenger/i },
];

export function detectInAppBrowser(uaOverride?: string): InAppBrowserInfo {
  const ua = uaOverride ?? (typeof navigator !== 'undefined' ? navigator.userAgent || '' : '');
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1);

  for (const rule of RULES) {
    if (rule.re.test(ua)) {
      return { isInApp: true, name: rule.name, label: rule.label, isAndroid, isIOS };
    }
  }

  // Generic Android WebView ("; wv)") — e.g. unknown apps embedding a webview.
  if (isAndroid && /;\s?wv\)/i.test(ua)) {
    return { isInApp: true, name: 'generic_webview', label: 'this app', isAndroid, isIOS };
  }

  // Generic iOS WKWebView: has AppleWebKit + Mobile but no "Safari/" token and
  // isn't Chrome/Firefox/Edge for iOS (those include CriOS/FxiOS/EdgiOS).
  if (isIOS && /AppleWebKit/i.test(ua) && !/Safari\//i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua)) {
    return { isInApp: true, name: 'generic_webview', label: 'this app', isAndroid, isIOS };
  }

  return { isInApp: false, name: null, label: '', isAndroid, isIOS };
}

/**
 * Android: an intent:// URL hands the current page to Chrome (or the default
 * browser if Chrome is missing, via browser_fallback_url).
 */
export function buildAndroidIntentUrl(targetUrl: string): string {
  const u = new URL(targetUrl);
  const pathAndQuery = `${u.host}${u.pathname}${u.search}${u.hash}`;
  const scheme = u.protocol.replace(':', '');
  return (
    `intent://${pathAndQuery}#Intent;scheme=${scheme};package=com.android.chrome;` +
    `S.browser_fallback_url=${encodeURIComponent(targetUrl)};end`
  );
}

/**
 * Try to escape the webview. Returns true if an automatic method was
 * attempted; on iOS there is no reliable programmatic escape, so the caller
 * must show "tap ••• → Open in browser" instructions.
 */
export function openInExternalBrowser(targetUrl: string = window.location.href): boolean {
  const info = detectInAppBrowser();
  if (info.isAndroid) {
    window.location.href = buildAndroidIntentUrl(targetUrl);
    return true;
  }
  return false;
}

/** True when running as an installed PWA (Android, iOS home-screen, desktop). */
export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  const mq = window.matchMedia?.('(display-mode: standalone)').matches;
  const iosStandalone = (navigator as any).standalone === true;
  return Boolean(mq || iosStandalone);
}

/** Phones, tablets in touch mode, in-app browsers and PWAs should use redirect flows, not popups/overlays. */
export function shouldUseRedirectFlows(): boolean {
  if (typeof window === 'undefined') return true;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;
  return coarse || detectInAppBrowser().isInApp || isStandalonePWA();
}
