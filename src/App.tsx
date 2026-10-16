import React, { useEffect, useRef } from 'react';
import { useStudioStore, StudioRoute } from './store/useStudioStore';
import { useAuthStore } from './auth/useAuthStore';
import { affiliateService } from './affiliates/affiliateService';
import { LandingPage } from './ui/LandingPage';
import { Studio } from './ui/Studio';
import { Header } from './ui/Header';
import { DiagnosticsPage } from './ui/pages/DiagnosticsPage';
import { FaqPage } from './ui/pages/FaqPage';
import { TermsPage } from './ui/pages/TermsPage';
import { PrivacyPage } from './ui/pages/PrivacyPage';
import { ContactPage } from './ui/pages/ContactPage';
import { NotFoundPage } from './ui/pages/NotFoundPage';
import { PricingPage } from './ui/pages/PricingPage';
import { AccountPage } from './ui/pages/AccountPage';
import { AdminPanel } from './ui/admin/AdminPanel';
import { BlogPage } from './ui/pages/BlogPage';
import { ArticlePage } from './ui/pages/ArticlePage';
import { AffiliateTermsPage } from './ui/pages/AffiliateTermsPage';
import { RefundPolicyPage } from './ui/pages/RefundPolicyPage';
import { CheckoutSuccessPage } from './ui/pages/CheckoutSuccessPage';
import { CheckoutCancelPage } from './ui/pages/CheckoutCancelPage';
import { BackgroundSimulator3D } from './render3d/background3d';
import { GlobalToast } from './ui/components/GlobalToast';
import { AuthModal } from './ui/modals/AuthModal';
import { OnboardingModal } from './ui/modals/OnboardingModal';
import { UpgradeModal } from './ui/modals/UpgradeModal';

const pathToRoute = (pathname: string): StudioRoute => {
  const clean = pathname.replace(/\/$/, '') || '/';
  if (clean === '/') return 'landing';
  if (clean === '/studio') return 'studio';
  if (clean === '/settings') return 'settings';
  if (clean === '/diagnostics') return 'diagnostics';
  if (clean === '/faq') return 'faq';
  if (clean === '/terms') return 'terms';
  if (clean === '/privacy') return 'privacy';
  if (clean === '/contact') return 'contact';
  if (clean === '/pricing') return 'pricing';
  if (clean === '/account') return 'account';
  if (clean === '/admin') return 'admin';
  if (clean === '/blog') return 'blog';
  if (clean.startsWith('/blog/')) return 'article';
  if (clean === '/affiliate-terms') return 'affiliate_terms';
  if (clean === '/refunds') return 'refunds';
  if (clean === '/checkout/success') return 'checkout_success';
  if (clean === '/checkout/cancelled') return 'checkout_cancelled';
  return '404';
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
    const loaded = loadFromUrlHash();
    if (loaded) {
      setRoute('studio', false);
    } else {
      const initialRoute = pathToRoute(window.location.pathname);
      setRoute(initialRoute, false);
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
      const route = pathToRoute(window.location.pathname);
      setRoute(route, false);
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
      {/* 3D Lightweight Background Simulator */}
      <canvas
        ref={bgCanvasRef}
        className={`fixed inset-0 w-full h-full pointer-events-none transition-opacity duration-700 z-0 ${bgOpacity}`}
      />

      {/* Foreground Application Content */}
      <div className="relative z-10">
        {currentRoute === 'studio' && <Studio />}
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
        {currentRoute === 'faq' && <FaqPage />}
        {currentRoute === 'terms' && <TermsPage />}
        {currentRoute === 'privacy' && <PrivacyPage />}
        {currentRoute === 'contact' && <ContactPage />}
        {currentRoute === '404' && <NotFoundPage />}
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
