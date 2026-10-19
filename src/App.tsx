import React, { useEffect, useRef } from 'react';
import { useStudioStore, StudioRoute } from './store/useStudioStore';
import { useAuthStore } from './auth/useAuthStore';
import { affiliateService } from './affiliates/affiliateService';
import { LandingPage } from './ui/LandingPage';
import { Header } from './ui/Header';
import { FaqPage } from './ui/pages/FaqPage';
import { TermsPage } from './ui/pages/TermsPage';
import { PrivacyPage } from './ui/pages/PrivacyPage';
import { ContactPage } from './ui/pages/ContactPage';
import { NotFoundPage } from './ui/pages/NotFoundPage';
import { AffiliateTermsPage } from './ui/pages/AffiliateTermsPage';
import { RefundPolicyPage } from './ui/pages/RefundPolicyPage';
import { CheckoutSuccessPage } from './ui/pages/CheckoutSuccessPage';
import { CheckoutCancelPage } from './ui/pages/CheckoutCancelPage';
import { AboutPage } from './ui/pages/AboutPage';
import { ShowcasePage } from './ui/pages/ShowcasePage';
import { FeedbackPage } from './ui/pages/FeedbackPage';
import { DisclaimerPage } from './ui/pages/DisclaimerPage';
import { BackgroundSimulator3D } from './render3d/background3d';

// Code-split heavy routes so Landing, FAQ, Terms load immediately without 3D simulation or Admin bundles
const Studio = React.lazy(() => import('./ui/Studio').then((m) => ({ default: m.Studio })));
const MyVideosPage = React.lazy(() => import('./ui/pages/MyVideosPage').then((m) => ({ default: m.MyVideosPage })));
const PricingPage = React.lazy(() => import('./ui/pages/PricingPage').then((m) => ({ default: m.PricingPage })));
const AccountPage = React.lazy(() => import('./ui/pages/AccountPage').then((m) => ({ default: m.AccountPage })));
const AdminPanel = React.lazy(() => import('./ui/admin/AdminPanel').then((m) => ({ default: m.AdminPanel })));
const BlogPage = React.lazy(() => import('./ui/pages/BlogPage').then((m) => ({ default: m.BlogPage })));
const ArticlePage = React.lazy(() => import('./ui/pages/ArticlePage').then((m) => ({ default: m.ArticlePage })));
const MidiStudioPage = React.lazy(() => import('./ui/midi/MidiStudioPage').then((m) => ({ default: m.MidiStudioPage })));
const DiagnosticsPage = React.lazy(() => import('./ui/pages/DiagnosticsPage').then((m) => ({ default: m.DiagnosticsPage })));
import { GlobalToast } from './ui/components/GlobalToast';
import { AuthModal } from './ui/modals/AuthModal';
import { OnboardingModal } from './ui/modals/OnboardingModal';
import { UpgradeModal } from './ui/modals/UpgradeModal';
import { ALL_LANGUAGE_CODES, SupportedLanguage, DEFAULT_LANGUAGE } from './i18n/config';
import { setLanguage } from './i18n';
import { LanguageSuggestionBanner } from './ui/components/LanguageSuggestionBanner';
import { SeoHead } from './i18n/SeoHead';

const ALL_LANG_SET = new Set<string>(ALL_LANGUAGE_CODES);

export const parsePathWithLocale = (
  pathname: string
): { lang: SupportedLanguage | null; route: StudioRoute } => {
  const segments = pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
  let lang: SupportedLanguage | null = null;

  if (segments.length > 0 && ALL_LANG_SET.has(segments[0])) {
    lang = segments[0] as SupportedLanguage;
    segments.shift();
  }

  const clean = '/' + segments.join('/');
  if (clean === '/' || clean === '') return { lang, route: 'landing' };
  if (clean === '/studio') return { lang, route: 'studio' };
  if (clean === '/midi' || clean === '/midi-studio') return { lang, route: 'midi_studio' };
  if (clean === '/my-videos' || clean === '/videos') return { lang, route: 'my_videos' };
  if (clean === '/settings') return { lang, route: 'settings' };
  if (clean === '/diagnostics') return { lang, route: 'diagnostics' };
  if (clean === '/about') return { lang, route: 'about' };
  if (clean === '/showcase') return { lang, route: 'showcase' };
  if (clean === '/feedback') return { lang, route: 'feedback' };
  if (clean === '/disclaimer') return { lang, route: 'disclaimer' };
  if (clean === '/faq') return { lang, route: 'faq' };
  if (clean === '/terms') return { lang, route: 'terms' };
  if (clean === '/privacy') return { lang, route: 'privacy' };
  if (clean === '/contact') return { lang, route: 'contact' };
  if (clean === '/pricing') return { lang, route: 'pricing' };
  if (clean === '/account') return { lang, route: 'account' };
  if (clean === '/admin') return { lang, route: 'admin' };
  if (clean === '/blog') return { lang, route: 'blog' };
  if (clean.startsWith('/blog/')) return { lang, route: 'article' };
  if (clean === '/affiliate-terms') return { lang, route: 'affiliate_terms' };
  if (clean === '/refunds') return { lang, route: 'refunds' };
  if (clean === '/checkout/success') return { lang, route: 'checkout_success' };
  if (clean === '/checkout/cancelled') return { lang, route: 'checkout_cancelled' };
  return { lang, route: '404' };
};

export const App: React.FC = () => {
  const { currentRoute, setRoute, loadFromUrlHash, isExportOpen } = useStudioStore();
  const { initAuth, openAuthModal } = useAuthStore();
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgSimRef = useRef<BackgroundSimulator3D | null>(null);

  // Initialize Auth & Referral Cookie on Mount
  useEffect(() => {
    initAuth();

    // Check referral link format /r/code
    const path = window.location.pathname;
    if (path.startsWith('/r/')) {
      const code = path.replace('/r/', '').replace(/\/$/, '');
      if (code) {
        affiliateService.trackClick(code);
        // Clean URL and go to pricing
        window.history.replaceState({}, '', '/pricing');
        setRoute('pricing', false);
        return;
      }
    }

    if (path === '/login') {
      openAuthModal('login');
      window.history.replaceState({}, '', '/');
      setRoute('landing', false);
      return;
    }
    if (path === '/signup') {
      openAuthModal('signup');
      window.history.replaceState({}, '', '/');
      setRoute('landing', false);
      return;
    }
  }, [initAuth, openAuthModal, setRoute]);

  // Initialize App-Wide Lightweight 3D Background
  useEffect(() => {
    if (bgCanvasRef.current && !bgSimRef.current) {
      bgSimRef.current = new BackgroundSimulator3D(bgCanvasRef.current);
    }
    return () => {
      if (bgSimRef.current) {
        bgSimRef.current.destroy();
        bgSimRef.current = null;
      }
    };
  }, []);

  // Pause 3D background during video export to give 100% GPU to 4K encoder
  useEffect(() => {
    if (bgSimRef.current) {
      bgSimRef.current.setPaused(isExportOpen);
    }
  }, [isExportOpen]);

  // Route Synchronization on mount, popstate and hash navigation
  useEffect(() => {
    const { lang, route: parsedRoute } = parsePathWithLocale(window.location.pathname);
    if (lang) {
      setLanguage(lang);
    } else {
      // First visit: (1) URL (already checked), (2) saved preference, (3) browser language, else English
      const saved = localStorage.getItem('bounceforge_lang') as SupportedLanguage | null;
      if (saved && ALL_LANG_SET.has(saved)) {
        setLanguage(saved);
      } else if (typeof navigator !== 'undefined') {
        const browser = (navigator.language || '').toLowerCase();
        let matched: SupportedLanguage = DEFAULT_LANGUAGE;
        if (browser.startsWith('pt')) matched = 'pt-BR';
        else if (browser.startsWith('zh')) matched = 'zh-CN';
        else {
          const code = browser.slice(0, 2) as SupportedLanguage;
          if (ALL_LANG_SET.has(code)) matched = code;
        }
        setLanguage(matched);
      }
    }

    const loaded = loadFromUrlHash();
    if (loaded) {
      setRoute('studio', false);
    } else {
      setRoute(parsedRoute, false);
    }

    if (window.location.hash) {
      const anchor = window.location.hash.slice(1);
      setTimeout(() => {
        const el = document.getElementById(anchor);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 150);
    }

    const handlePop = () => {
      const { lang: popLang, route: popRoute } = parsePathWithLocale(window.location.pathname);
      if (popLang) {
        setLanguage(popLang);
      }
      setRoute(popRoute, false);
      if (window.location.hash) {
        const anchor = window.location.hash.slice(1);
        setTimeout(() => {
          const el = document.getElementById(anchor);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }
    };

    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [loadFromUrlHash, setRoute]);

  const bgOpacity =
    currentRoute === 'landing' || currentRoute === 'pricing'
      ? 'opacity-55'
      : currentRoute === 'studio'
      ? 'opacity-20'
      : 'opacity-35';

  return (
    <div className="relative min-h-screen bg-[#050608] text-slate-100 overflow-x-hidden">
      {/* Dynamic Multi-Language Meta, Titles, og:locale, canonical & hreflang */}
      <SeoHead route={currentRoute} />

      {/* Dismissible Browser Language Suggestion Banner */}
      <LanguageSuggestionBanner />

      {/* 3D Lightweight Background Simulator */}
      <canvas
        ref={bgCanvasRef}
        className={`fixed inset-0 w-full h-full pointer-events-none transition-opacity duration-700 z-0 ${bgOpacity}`}
      />

      {/* Foreground Application Content */}
      <div className="relative z-10">
        <React.Suspense
          fallback={
            <div className="min-h-screen bg-[#050608] flex items-center justify-center font-mono text-xs text-slate-400">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                <span className="uppercase tracking-widest text-[11px] font-bold">Loading BounceForge...</span>
              </div>
            </div>
          }
        >
          {currentRoute === 'studio' && <Studio />}
          {currentRoute === 'my_videos' && <MyVideosPage />}
          {currentRoute === 'midi_studio' && <MidiStudioPage />}
          {currentRoute === 'settings' && <Studio />}
          {currentRoute === 'landing' && (
            <>
              <Header />
              <LandingPage />
            </>
          )}
          {currentRoute === 'pricing' && <PricingPage />}
          {currentRoute === 'account' && <AccountPage />}
          {currentRoute === 'admin' && <AdminPanel />}
          {currentRoute === 'blog' && <BlogPage />}
          {currentRoute === 'article' && <ArticlePage />}
          {currentRoute === 'affiliate_terms' && <AffiliateTermsPage />}
          {currentRoute === 'refunds' && <RefundPolicyPage />}
          {currentRoute === 'checkout_success' && <CheckoutSuccessPage />}
          {currentRoute === 'checkout_cancelled' && <CheckoutCancelPage />}
          {currentRoute === 'diagnostics' && <DiagnosticsPage />}
          {currentRoute === 'about' && <AboutPage />}
          {currentRoute === 'showcase' && <ShowcasePage />}
          {currentRoute === 'feedback' && <FeedbackPage />}
          {currentRoute === 'disclaimer' && <DisclaimerPage />}
          {currentRoute === 'faq' && <FaqPage />}
          {currentRoute === 'terms' && <TermsPage />}
          {currentRoute === 'privacy' && <PrivacyPage />}
          {currentRoute === 'contact' && <ContactPage />}
          {currentRoute === '404' && <NotFoundPage />}
        </React.Suspense>
      </div>

      {/* Modals */}
      <AuthModal />
      <OnboardingModal />
      <UpgradeModal />

      {/* App-Wide Fixed Centered Toast System */}
      <GlobalToast />
    </div>
  );
};
