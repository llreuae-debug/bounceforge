import React, { useEffect, useRef } from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { ALL_MODES } from '../modes/registry';
import { PhysicsWorld } from '../engine/world';
import { WorldRenderer } from '../render/renderer';
import {
  Sparkles,
  Play,
  Flame,
  Music,
  Compass,
  Film,
  Zap,
  CheckCircle2,
  ArrowRight,
  Shield,
  Layers,
  ChevronRight,
  Box,
  Headphones,
  Download,
} from 'lucide-react';
import { Logo } from '../brand/Logo';
import { Footer } from './Footer';
import { MultipleModesShowcase } from './components/MultipleModesShowcase';
import { InstrumentSelectorShowcase } from './components/InstrumentSelectorShowcase';

export const LandingPage: React.FC = () => {
  const { setRoute, setMode } = useStudioStore();
  const heroCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Hero Looping Canvas Simulation
  useEffect(() => {
    const canvas = heroCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const world = new PhysicsWorld(1080, 1920, 42);
    const mode = ALL_MODES[0]; // Classic
    mode.setup(world, mode.defaultSettings, 42);

    const renderer = new WorldRenderer();
    let animId: number;

    const loop = () => {
      world.step(1 / 60);
      if (mode.isFinished(world, mode.defaultSettings) || world.time > 45) {
        mode.setup(world, mode.defaultSettings, Math.floor(Math.random() * 9999));
      }

      renderer.render(
        ctx,
        world,
        {
          themeId: 'neon_night',
          bloomEnabled: true,
          bloomIntensity: 1.2,
          ballGlowEnabled: true,
          ballGlowIntensity: 1.0,
          wallGlowEnabled: true,
          wallGlowIntensity: 1.0,
          rainbowWallsMode: 'off',
          trailEnabled: true,
          trailLength: 16,
          trailFade: 0.65,
          trailHueShift: false,
          reactiveBgEnabled: true,
          reactiveBgIntensity: 0.5,
          screenShakeIntensity: 0.5,
          slowMotionEnd: true,
          chromaticFlash: true,
          ringColorMode: 'theme',
        },
        {
          showTitle: true,
          titleText: 'Can the ball escape? 🔥',
          titleFontSize: 42,
          titleColor: '#ffffff',
          titleY: 8,
          showCounter: true,
          counterType: 'rings',
          counterFontSize: 36,
          counterColor: '#00f0ff',
          showProgressBar: true,
          targetDuration: 60,
          progressBarColor: '#00f0ff',
          showWatermark: true,
          watermarkOpacity: 0.6,
          showEndCard: true,
          endCardText: 'ESCAPED! 🏆',
          showSafeZone: false,
          showPlatformMockup: false,
          safeZonePlatform: 'tiktok',
        },
        canvas.width,
        canvas.height,
        false
      );

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="min-h-screen bg-[#07080d] text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Hero Section */}
      <section className="relative pt-12 pb-24 overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,182,212,0.18),rgba(255,255,255,0))]" />

        <div className="max-w-7xl mx-auto px-6 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Hero Copy */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Logo concept="a" variant="horizontal" size="sm" className="hidden sm:inline-flex" />
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-lime-400/10 border border-lime-400/30 text-[#CCFF00] text-xs font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" /> Next-Gen Ball Physics Studio
              </div>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] text-white">
              Oddly Satisfying Ball Physics.{' '}
              <span className="bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Rendered in 4K.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Every bounce plays a musical note. Choose from 21 viral simulation modes, tune physics
              in real-time, find target viral finish times with the Auto-Seed Finder, and export
              frame-perfect 9:16 videos up to 4K for TikTok, YouTube Shorts, and Reels.
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
              <button
                onClick={() => setRoute('studio')}
                className="btn-3d-lime px-8 py-4 rounded-2xl text-black font-black text-sm uppercase tracking-wider flex items-center gap-3 transition-all"
              >
                <Play className="w-4 h-4 fill-current" /> Launch Studio Free
              </button>

              <a
                href="#modes"
                className="btn-3d-glass px-6 py-4 rounded-2xl text-white font-bold text-sm flex items-center gap-2 transition-all"
              >
                Explore 21 Modes <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            {/* Micro Stats */}
            <div className="pt-6 grid grid-cols-3 gap-4 border-t border-white/10 text-center lg:text-left">
              <div>
                <span className="text-2xl font-extrabold text-white block">240 Hz</span>
                <span className="text-xs text-slate-400">Deterministic Engine</span>
              </div>
              <div>
                <span className="text-2xl font-extrabold text-cyan-400 block">4K UHD</span>
                <span className="text-xs text-slate-400">Offline WebCodecs</span>
              </div>
              <div>
                <span className="text-2xl font-extrabold text-purple-400 block">12 Synths</span>
                <span className="text-xs text-slate-400">Harmonic Audio</span>
              </div>
            </div>
          </div>

          {/* Right Hero Live Canvas Card */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative group cursor-pointer" onClick={() => setRoute('studio')}>
              {/* Outer Glow */}
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-[34px] blur-xl opacity-40 group-hover:opacity-75 transition duration-500" />

              <div className="relative w-72 sm:w-80 aspect-[9/16] rounded-3xl overflow-hidden border border-white/20 bg-[#090b14] shadow-2xl">
                <canvas
                  ref={heroCanvasRef}
                  width={1080}
                  height={1920}
                  className="w-full h-full object-contain"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-cyan-300 block">LIVE PREVIEW</span>
                      <span className="text-sm font-extrabold text-white">Classic Mode #42</span>
                    </div>
                    <span className="px-3 py-1.5 rounded-xl bg-cyan-500 text-slate-950 font-extrabold text-xs flex items-center gap-1 shadow-md">
                      Customize <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section id="features" className="py-20 border-b border-white/10 bg-[#08090f] scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-cyan-400">
              BUILT FOR VIRAL CREATORS
            </h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-white">
              Studio Features Engineered For Millions of Views
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-cyan-500/40 transition-all space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">240Hz Custom Engine</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Mulberry32 PRNG and substepped continuous collision detection. Identical seed =
                identical physics every single time.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-purple-500/40 transition-all space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <Music className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">12 Pure Synths & MIDI</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Grand Piano, Kalimba, Marimba, 8-Bit, and Glass. Plus a 4-octave interactive piano
                roll editor and public-domain library.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-indigo-500/40 transition-all space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Film className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">4K WebCodecs Export</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Frame-perfect offline export in up to 2160x3840 UHD at 60 fps. Replays collision logs
                through OfflineAudioContext with zero lag.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-pink-500/40 transition-all space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-pink-500/20 text-pink-400 flex items-center justify-center">
                <Compass className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Auto-Seed Finder</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Headless Web Worker iterates thousands of seeds to automatically find candidates
                that finish at your exact viral duration.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 9-Instrument Selector Feature Showcase matching reference UI */}
      <InstrumentSelectorShowcase />

      {/* Multiple Modes Infinite Possibilities Showcase matching reference UI */}
      <MultipleModesShowcase />

      {/* FAQ */}
      <section id="faq" className="py-20 border-b border-white/10 bg-[#08090f] scroll-mt-20">
        <div className="max-w-4xl mx-auto px-6 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-cyan-400">
              FREQUENTLY ASKED QUESTIONS
            </h2>
            <p className="text-3xl font-extrabold text-white">Everything You Need to Know</p>
          </div>

          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
              <h3 className="text-base font-bold text-white">How does offline video export work?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Unlike laggy screen recorders, BounceForge uses WebCodecs and mp4-muxer to step physics
                deterministically at 240Hz frame by frame, rendering an exact 60fps 4K video with zero
                stutter. The audio is synthesized offline via OfflineAudioContext and encoded to AAC at
                48kHz stereo.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
              <h3 className="text-base font-bold text-white">Are the melodies copyright-free?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Yes! All included classical melodies (Für Elise, Canon in D, Ode to Joy, etc.) are in
                the Public Domain, and all original electronic tracks are 100% royalty-free. You can
                monetize on YouTube, TikTok, and Instagram without strikes.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
              <h3 className="text-base font-bold text-white">What is the Auto-Seed Finder?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                The Auto-Seed Finder is a background Web Worker that runs headless simulations at high
                speed across hundreds of seeds to find the ones that produce dramatic escapes at exactly
                59.0 to 60.0 seconds.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Rich Footer */}
      <Footer />
    </div>
  );
};
