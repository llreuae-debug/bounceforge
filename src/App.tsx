import React, { useEffect, useRef } from 'react';
import { useStudioStore, StudioRoute } from './store/useStudioStore';
import { LandingPage } from './ui/LandingPage';
import { Studio } from './ui/Studio';
import { Header } from './ui/Header';
import { DiagnosticsPage } from './ui/pages/DiagnosticsPage';
import { FaqPage } from './ui/pages/FaqPage';
import { TermsPage } from './ui/pages/TermsPage';
import { PrivacyPage } from './ui/pages/PrivacyPage';
import { ContactPage } from './ui/pages/ContactPage';
import { NotFoundPage } from './ui/pages/NotFoundPage';
import { BackgroundSimulator3D } from './render3d/background3d';
import { GlobalToast } from './ui/components/GlobalToast';

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
  return '404';
};

export const App: React.FC = () => {
  const { currentRoute, setRoute, loadFromUrlHash, isExportOpen } = useStudioStore();
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgSimRef = useRef<BackgroundSimulator3D | null>(null);

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
    currentRoute === 'landing' ? 'opacity-55' : currentRoute === 'studio' ? 'opacity-20' : 'opacity-35';

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
        {currentRoute === 'diagnostics' && <DiagnosticsPage />}
        {currentRoute === 'faq' && <FaqPage />}
        {currentRoute === 'terms' && <TermsPage />}
        {currentRoute === 'privacy' && <PrivacyPage />}
        {currentRoute === 'contact' && <ContactPage />}
        {currentRoute === '404' && <NotFoundPage />}
      </div>

      {/* App-Wide Fixed Centered Toast System */}
      <GlobalToast />
    </div>
  );
};
