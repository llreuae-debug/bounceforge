import React, { useEffect } from 'react';
import { useStudioStore } from '../../store/useStudioStore';
import { Header } from '../Header';
import { Footer } from '../Footer';
import { ShieldCheck, Lock, Database, EyeOff, Play } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  const { setRoute } = useStudioStore();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  return (
    <div className="min-h-screen bg-[#050608] text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 w-full space-y-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider">
            <Lock className="w-3.5 h-3.5" /> 100% client-side zero-knowledge architecture
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase">
            Privacy Policy
          </h1>
          <p className="text-slate-400 text-xs font-mono">
            Effective Date: October 15, 2026 • Strict Zero Data Collection
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 space-y-6 text-sm text-slate-300 leading-relaxed">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs sm:text-sm font-medium">
            🔒 <strong>The Short Summary:</strong> BounceForge does not collect, transmit, store, sell, or share any personal information, tracking cookies, analytics identifiers, or exported files. Everything executes strictly on your local browser.
          </div>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-cyan-400" /> 1. No Tracking &amp; No Cookies
            </h2>
            <p>
              We do not use Google Analytics, advertising trackers, tracking pixels, or third-party behavioral profiling scripts. We do not set third-party tracking cookies or store device fingerprints.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-400" /> 2. Local Storage &amp; IndexedDB
            </h2>
            <p>
              When you save your BounceForge projects or change preferences (e.g. haptic feedback toggle, quality tier, audio mute state), this data is saved exclusively inside your browser's private <code className="text-cyan-300">IndexedDB</code> and <code className="text-cyan-300">localStorage</code>. This data never touches any remote server and can be wiped instantly by clearing your browser site data.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#CCFF00]" /> 3. Video Rendering &amp; File Generation
            </h2>
            <p>
              When you export 4K MP4 or WebM videos, the frame rendering and audio multiplexing are performed entirely by your local GPU and CPU via the browser's native WebCodecs and Web Audio APIs. Rendered videos are downloaded directly to your local storage without cloud relaying.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-pink-400" /> 4. Contact &amp; Inquiries
            </h2>
            <p>
              If you have any questions about this privacy statement, you can contact us directly at{' '}
              <a
                href="mailto:privacy@bounceforge.app?subject=Privacy%20Question"
                className="text-cyan-400 hover:underline font-bold"
              >
                privacy@bounceforge.app
              </a>.
            </p>
          </section>
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={() => setRoute('studio')}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-[#CCFF00] text-black font-extrabold text-xs uppercase tracking-wider hover:scale-105 transition-all shadow-lg shadow-lime-400/20 flex items-center gap-2"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> Open Studio ⚡
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
};
