import React from 'react';
import { Header } from '../Header';
import { Footer } from '../Footer';
import { useStudioStore } from '../../store/useStudioStore';
import {
  Sparkles,
  Zap,
  Play,
  Cpu,
  Layers,
  Music,
  ShieldCheck,
  Video,
  ArrowRight,
  Eye,
  CheckCircle2,
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  const { setRoute } = useStudioStore();

  return (
    <div className="min-h-screen bg-[#050608] text-white flex flex-col font-sans select-none">
      <Header />

      <main className="flex-1 max-w-5xl mx-auto px-6 py-16 space-y-16">
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono text-cyan-300 uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            The Deterministic Physics Laboratory
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white uppercase">
            About <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-pink-500 to-[#CCFF00]">BounceForge</span>
          </h1>
          <p className="text-base text-slate-300 leading-relaxed font-normal">
            BounceForge is a browser-native generative physics studio engineered to produce oddly satisfying visual simulations synchronized with algorithmic ASMR audio and procedural music.
          </p>
        </div>

        {/* Who It Is For */}
        <div className="space-y-6">
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white text-center">
            Who BounceForge Is Built For
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Video className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-white">Short-Form Content Creators</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Creators on TikTok, YouTube Shorts, and Instagram Reels who need high-retention, hypnotizing visuals that stop scrolling thumbs. With Auto-Seed Finder and safe-zone compliance, videos hit the 59–60s mark consistently.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
                <Music className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-white">Music &amp; ASMR Producers</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Sound designers and audiophiles fascinated by polyrhythms, physical modeling synthesis, and spatial binaural panning. Every bounce triggers a tuned note from mathematical scales without static audio samples.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[#CCFF00]/10 border border-[#CCFF00]/30 flex items-center justify-center text-[#CCFF00]">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-white">Engineers &amp; Game Designers</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Developers exploring sub-stepped numerical integration (Verlet &amp; spatial hashing), WebCodecs hardware export acceleration, and strictly reproducible PRNG simulations.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Eye className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-white">Curious Explorers &amp; Relaxation</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Anyone looking for therapeutic, oddly satisfying visual audio experiences. Play in guest mode directly in your browser without creating an account or installing anything.
              </p>
            </div>
          </div>
        </div>

        {/* 3 Core Engineering Pillars */}
        <div className="p-8 rounded-3xl bg-gradient-to-br from-white/[0.04] to-transparent border border-white/10 space-y-6">
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
            Our Core Architectural Principles
          </h2>

          <div className="space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-6 h-6 rounded-full bg-cyan-400/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-white">100% Deterministic (Same Seed = Same Video)</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Every collision, trajectory, and harmonic chime is seeded with a 32-bit stateful PRNG. Running seed #48291 in preview is frame-by-frame identical to a 4K UHD 60FPS export render.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-6 h-6 rounded-full bg-[#CCFF00]/20 text-[#CCFF00] flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-white">Zero Server Queues &amp; Total Privacy</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  All encoding runs inside your browser using the W3C WebCodecs API and OffscreenCanvas. No raw assets or proprietary videos are ever uploaded to a remote server.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-6 h-6 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-white">Zero Copyright Claims (100% Synthesized Audio)</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  All melody notes, harmonics, and ASMR impacts are synthesized in real-time with Web Audio oscillator banks. You can monetize your exported videos on YouTube, TikTok, and Meta without strike warnings.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Launch Banner */}
        <div className="text-center p-8 rounded-3xl bg-gradient-to-r from-cyan-950/40 via-purple-950/40 to-pink-950/40 border border-cyan-500/30 space-y-4">
          <h2 className="text-2xl font-black uppercase text-white">Ready to create your first simulation?</h2>
          <p className="text-xs text-slate-300 max-w-md mx-auto">
            Test all simulation modes, customize physics parameters, and preview ASMR audio in guest mode with zero friction.
          </p>
          <button
            onClick={() => {
              setRoute('studio');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="btn-3d-cyan px-6 py-3 rounded-2xl text-black font-black uppercase tracking-wider text-xs inline-flex items-center gap-2 shadow-lg shadow-cyan-500/20"
          >
            <Play className="w-4 h-4 fill-current" />
            Open Studio Free
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
};
