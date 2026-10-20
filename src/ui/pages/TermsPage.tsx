import React, { useEffect } from 'react';
import { useStudioStore } from '../../store/useStudioStore';
import { Header } from '../Header';
import { Footer } from '../Footer';
import { FileText, CheckCircle2, Play } from 'lucide-react';

export const TermsPage: React.FC = () => {
  const { setRoute } = useStudioStore();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  return (
    <div className="min-h-screen bg-[#050608] text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 w-full space-y-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-400 text-xs font-mono font-bold uppercase tracking-wider">
            <FileText className="w-3.5 h-3.5" /> legal terms &amp; commercial rights
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase">
            Terms of Service
          </h1>
          <p className="text-slate-400 text-xs font-mono">
            Effective Date: October 15, 2026 • Version 1.2
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 space-y-6 text-sm text-slate-300 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#CCFF00]" /> 1. Commercial Monetization &amp; Ownership
            </h2>
            <p>
              You own 100% of all video, audio, image, and data files generated and exported using BounceForge. You are granted an unconditional, perpetual, worldwide, royalty-free license to use, monetize, publish, broadcast, and distribute exported content across social platforms including YouTube, TikTok, Instagram Reels, Twitter/X, and commercial advertising without attribution or license fees.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#CCFF00]" /> 2. Audio &amp; Musical Compositions
            </h2>
            <p>
              All included classical melodies are strictly in the Public Domain. All procedural synthesizer sounds, noise generators, and binaural audio textures are generated mathematically in real time via Web Audio and are royalty-free. When uploading your own custom MIDI files, you affirm that you possess the necessary distribution rights.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#CCFF00]" /> 3. Client-Side Software Execution
            </h2>
            <p>
              BounceForge operates entirely on your device via standard web APIs (HTML5 Canvas, WebGL, WebGPU, Web Audio, WebCodecs). No subscription or hidden account is required to generate or export videos. You are responsible for maintaining a supported browser and compatible graphics hardware.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#CCFF00]" /> 4. Disclaimer of Warranty
            </h2>
            <p>
              BounceForge is provided "as is", without warranty of any kind, express or implied. Under no circumstances will the creators of BounceForge be liable for device overheating, browser memory limits, or lost unsaved project files stored in temporary browser cache.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#CCFF00]" /> 5. Questions &amp; Inquiries
            </h2>
            <p>
              For commercial licensing inquiries, enterprise custom builds, or legal questions, please reach out via our{' '}
              <button
                onClick={() => setRoute('contact')}
                className="text-cyan-400 hover:underline font-bold"
              >
                contact page
              </button>{' '}
              or email{' '}
              <a
                href="mailto:support@bounceforge.app?subject=Terms%20of%20Service%20Inquiry"
                className="inline-flex items-center min-h-[44px] text-[#CCFF00] hover:underline font-bold"
              >
                support@bounceforge.app
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
