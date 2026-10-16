import React, { useEffect } from 'react';
import { useI18n } from './index';
import { ALL_LANGUAGE_CODES, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, SupportedLanguage } from './config';
import { StudioRoute } from '../store/useStudioStore';

interface SeoHeadProps {
  route: StudioRoute;
}

export const SeoHead: React.FC<SeoHeadProps> = ({ route }) => {
  const { language, t } = useI18n();

  useEffect(() => {
    if (typeof document === 'undefined') return;

    // 1. Resolve localized title and description
    let pageTitle = 'BounceForge | 240Hz Viral Ball Physics Studio & ASMR Generator';
    let pageDesc =
      'Create oddly satisfying ball escape videos with synchronized procedural music and binaural ASMR sound effects, exported deterministically up to 4K.';

    if (route === 'studio' || route === 'settings') {
      pageTitle = t('seo:studioTitle', 'BounceForge Studio | Create 4K Viral Ball Physics Simulations');
      pageDesc = t(
        'seo:studioDesc',
        'Live WebGL physics simulator with 200+ modes, custom ball textures, safe-area social captions, and WebCodecs 60FPS export.'
      );
    } else if (route === 'pricing') {
      pageTitle = t('seo:pricingTitle', 'BounceForge Pricing | Gamer & Creator Pro Membership Plans');
      pageDesc = t(
        'seo:pricingDesc',
        'Unlock 4K 60FPS exports, 120s video duration, commercial monetization licenses, and AI hook generation tools.'
      );
    } else if (route === 'landing') {
      pageTitle = t('seo:landingTitle', 'BounceForge | 240Hz Viral Ball Physics Studio & ASMR Generator');
      pageDesc = t(
        'seo:landingDesc',
        'Create oddly satisfying ball escape videos with synchronized procedural music and binaural ASMR sound effects, exported deterministically up to 4K for TikTok, YouTube Shorts, and Instagram Reels.'
      );
    } else {
      pageTitle = `BounceForge - ${route.replace('_', ' ').toUpperCase()}`;
    }

    document.title = pageTitle;

    // Update Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', pageDesc);

    // Update Open Graph
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitle);
    }
    ogTitle.setAttribute('content', pageTitle);

    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (!ogDesc) {
      ogDesc = document.createElement('meta');
      ogDesc.setAttribute('property', 'og:description');
      document.head.appendChild(ogDesc);
    }
    ogDesc.setAttribute('content', pageDesc);

    let ogLocale = document.querySelector('meta[property="og:locale"]');
    if (!ogLocale) {
      ogLocale = document.createElement('meta');
      ogLocale.setAttribute('property', 'og:locale');
      document.head.appendChild(ogLocale);
    }
    const currentMeta = SUPPORTED_LANGUAGES[language as SupportedLanguage] || SUPPORTED_LANGUAGES.en;
    ogLocale.setAttribute('content', currentMeta.locale.replace('-', '_'));

    // Base subpath
    const subpath = route === 'landing' ? '' : `/${route}`;
    const origin = window.location.origin;

    // Canonical link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', `${origin}/${language}${subpath}`);

    // Hreflang alternates
    // Remove old hreflang tags
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => el.remove());

    // Inject all 16 hreflang links
    ALL_LANGUAGE_CODES.forEach((code) => {
      const link = document.createElement('link');
      link.setAttribute('rel', 'alternate');
      link.setAttribute('hreflang', code);
      link.setAttribute('href', `${origin}/${code}${subpath}`);
      document.head.appendChild(link);
    });

    // x-default hreflang (points to English version)
    const xDefault = document.createElement('link');
    xDefault.setAttribute('rel', 'alternate');
    xDefault.setAttribute('hreflang', 'x-default');
    xDefault.setAttribute('href', `${origin}/${DEFAULT_LANGUAGE}${subpath}`);
    document.head.appendChild(xDefault);
  }, [route, language, t]);

  return null;
};
