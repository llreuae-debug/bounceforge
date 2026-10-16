import React from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { Logo } from '../brand/Logo';
import {
  Sparkles,
  Zap,
  Play,
  Download,
  Music,
  Compass,
  Box,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Cpu,
  Code2,
  Video,
  Radio,
  ExternalLink,
} from 'lucide-react';

export const Footer: React.FC = () => {
  const { setRoute, setMode } = useStudioStore();

  const handleLaunchMode = (modeId: string) => {
    setMode(modeId);
    setRoute('studio');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="relative bg-[#050507] border-t border-white/10 text-white overflow-hidden select-none">
      {/* Top Subtle Glow */}
      <div className="absolute top-0 left-1/4 w-96 h-32 bg-[#CCFF00]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-96 h-32 bg-[#FF2E93]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Marquee Banner */}
      <div className="border-b border-white/5 bg-[#090912]/60 py-3 overflow-hidden">
        <div className="flex items-center gap-8 text-[11px] font-mono tracking-widest uppercase text-neutral-400 whitespace-nowrap px-6">
          <span className="flex items-center gap-2 text-[#CCFF00] font-bold">
            <span className="w-2 h-2 rounded-full bg-[#CCFF00] animate-ping" />
            240Hz DETERMINISTIC PHYSICS ENGINE
          </span>
          <span>•</span>
          <span>4K 60FPS WEBM &amp; MP4 WEBCODECS</span>
          <span>•</span>
          <span className="text-[#FF2E93] font-bold">SPATIAL STEREO ASMR AUDIO</span>
          <span>•</span>
          <span>12 SYNTHESIZED INSTRUMENTS (NO SAMPLES)</span>
          <span>•</span>
          <span className="text-[#00F0FF] font-bold">21 VIRAL SIMULATION MODES</span>
          <span>•</span>
          <span>100% CLIENT-SIDE &amp; LOCAL ENCODING</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-16 pb-12 space-y-16 relative z-10">
        {/* Main 4-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Col 1 & 2: Brand & Identity */}
          <div className="lg:col-span-2 space-y-6">
            <Logo
              concept="a"
              variant="horizontal"
              size="md"
              onClick={() => {
                setRoute('landing');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="cursor-pointer hover:opacity-90 transition-opacity"
            />

            <p className="text-sm text-neutral-400 max-w-sm leading-relaxed font-normal">
              The premier browser-based viral ball physics studio. Create oddly satisfying videos with synchronized procedural music and binaural ASMR sound effects, exported deterministically up to 4K for TikTok, YouTube Shorts, and Instagram Reels.
            </p>

            {/* System Status Pill */}
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs font-mono text-neutral-300">
              <span className="w-2 h-2 rounded-full bg-[#CCFF00] animate-pulse" />
              <span>Engine Status:</span>
              <strong className="text-[#CCFF00]">240Hz WebGL/WebGPU Ready</strong>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => {
                  setRoute('studio');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-[#CCFF00] text-black font-extrabold text-xs uppercase tracking-wider hover:opacity-90 shadow-lg shadow-lime-400/10 flex items-center gap-2 transform hover:scale-105 transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Launch Studio Free
              </button>
            </div>
          </div>

          {/* Col 3: Popular Simulation Modes */}
          <div className="space-y-4">
            <h4 className="text-xs font-mono font-extrabold text-[#CCFF00] tracking-wider uppercase">
              Popular Modes
            </h4>
            <ul className="space-y-2.5 text-xs text-neutral-400 font-medium">
              <li>
                <button
                  onClick={() => handleLaunchMode('classic')}
                  className="hover:text-white transition-colors flex items-center gap-1.5 group cursor-pointer"
                >
                  <span className="text-neutral-600 group-hover:text-[#CCFF00]">›</span>
                  <span>Classic Ring Escape</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleLaunchMode('obstacle_course')}
                  className="hover:text-white transition-colors flex items-center gap-1.5 group cursor-pointer"
                >
                  <span className="text-neutral-600 group-hover:text-[#CCFF00]">›</span>
                  <span>Obstacle Course Arena</span>
                  <span className="px-1.5 py-0.2 rounded bg-lime-400/20 text-[#CCFF00] text-[9px] font-bold">HOT</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleLaunchMode('black_hole')}
                  className="hover:text-white transition-colors flex items-center gap-1.5 group cursor-pointer"
                >
                  <span className="text-neutral-600 group-hover:text-[#CCFF00]">›</span>
                  <span>Black Hole &amp; Gravity Well</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleLaunchMode('sand_fill')}
                  className="hover:text-white transition-colors flex items-center gap-1.5 group cursor-pointer"
                >
                  <span className="text-neutral-600 group-hover:text-[#CCFF00]">›</span>
                  <span>Sand Fill &amp; Hourglass</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleLaunchMode('web_battle')}
                  className="hover:text-white transition-colors flex items-center gap-1.5 group cursor-pointer"
                >
                  <span className="text-neutral-600 group-hover:text-[#CCFF00]">›</span>
                  <span>Web Battle Arena</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleLaunchMode('collision')}
                  className="hover:text-white transition-colors flex items-center gap-1.5 group cursor-pointer"
                >
                  <span className="text-neutral-600 group-hover:text-[#CCFF00]">›</span>
                  <span>Collision &amp; Particle Blast</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleLaunchMode('pendulum_wave')}
                  className="hover:text-white transition-colors flex items-center gap-1.5 group cursor-pointer"
                >
                  <span className="text-neutral-600 group-hover:text-[#CCFF00]">›</span>
                  <span>Harmonic Pendulum Wave</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleLaunchMode('destruction')}
                  className="hover:text-white transition-colors flex items-center gap-1.5 group cursor-pointer"
                >
                  <span className="text-neutral-600 group-hover:text-[#CCFF00]">›</span>
                  <span>Destruction &amp; Wall Shatter</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Audio & Studio Tools */}
          <div className="space-y-4">
            <h4 className="text-xs font-mono font-extrabold text-[#00F0FF] tracking-wider uppercase">
              Engine &amp; Audio
            </h4>
            <ul className="space-y-2.5 text-xs text-neutral-400 font-medium">
              <li>
                <button
                  onClick={() => {
                    setRoute('studio');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-white transition-colors flex items-center gap-1.5 group cursor-pointer"
                >
                  <span className="text-neutral-600 group-hover:text-[#00F0FF]">›</span>
                  <span>Auto-Seed Finder (59-60s)</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setRoute('studio');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-white transition-colors flex items-center gap-1.5 group cursor-pointer"
                >
                  <span className="text-neutral-600 group-hover:text-[#00F0FF]">›</span>
                  <span>MIDI Piano Roll Editor</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setRoute('diagnostics');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-white transition-colors flex items-center gap-1.5 group cursor-pointer"
                >
                  <span className="text-neutral-600 group-hover:text-[#00F0FF]">›</span>
                  <span>Device Diagnostics &amp; GPU</span>
                  <span className="px-1.5 py-0.2 rounded bg-cyan-400/20 text-[#00F0FF] text-[9px] font-bold">LIVE</span>
                </button>
              </li>
              <li>
                <span className="text-neutral-400 flex items-center gap-1.5">
                  <span className="text-neutral-600">›</span>
                  <span>12 Web Audio Synthesizers</span>
                </span>
              </li>
              <li>
                <span className="text-neutral-400 flex items-center gap-1.5">
                  <span className="text-neutral-600">›</span>
                  <span>Procedural ASMR Physical Models</span>
                </span>
              </li>
              <li>
                <span className="text-neutral-400 flex items-center gap-1.5">
                  <span className="text-neutral-600">›</span>
                  <span>Binaural HRTF Spatial Panning</span>
                </span>
              </li>
              <li>
                <a
                  href="/brand/brand-guide.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-1.5 group"
                >
                  <span className="text-neutral-600 group-hover:text-[#00F0FF]">›</span>
                  <span>Brand Guide &amp; Press Assets</span>
                  <ExternalLink className="w-3 h-3 text-neutral-500" />
                </a>
              </li>
            </ul>
          </div>

          {/* Col 5: Video Export & Formats */}
          <div className="space-y-4">
            <h4 className="text-xs font-mono font-extrabold text-[#FF2E93] tracking-wider uppercase">
              Export &amp; Social Presets
            </h4>
            <ul className="space-y-2.5 text-xs text-neutral-400 font-medium">
              <li>
                <span className="text-neutral-400 flex items-center gap-1.5">
                  <span className="text-[#FF2E93]">›</span>
                  <span>4K Ultra HD (2160 × 3840)</span>
                </span>
              </li>
              <li>
                <span className="text-neutral-400 flex items-center gap-1.5">
                  <span className="text-[#FF2E93]">›</span>
                  <span>9:16 Vertical (Shorts &amp; Reels)</span>
                </span>
              </li>
              <li>
                <span className="text-neutral-400 flex items-center gap-1.5">
                  <span className="text-[#FF2E93]">›</span>
                  <span>60 FPS WebCodecs Acceleration</span>
                </span>
              </li>
              <li>
                <span className="text-neutral-400 flex items-center gap-1.5">
                  <span className="text-[#FF2E93]">›</span>
                  <span>H.264 / AAC QuickTime MP4</span>
                </span>
              </li>
              <li>
                <span className="text-neutral-400 flex items-center gap-1.5">
                  <span className="text-[#FF2E93]">›</span>
                  <span>Transparent WebM Canvas Stream</span>
                </span>
              </li>
              <li>
                <span className="text-neutral-400 flex items-center gap-1.5">
                  <span className="text-[#FF2E93]">›</span>
                  <span>Social Safe-Zone Overlays</span>
                </span>
              </li>
              <li>
                <span className="text-neutral-400 flex items-center gap-1.5">
                  <span className="text-[#FF2E93]">›</span>
                  <span>Deterministic Audio Synchronization</span>
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Hotkeys Quick Bar */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-neutral-400">
          <div className="flex items-center gap-2">
            <span className="text-[#CCFF00] font-bold">⌨️ STUDIO HOTKEYS:</span>
            <span>Press any key while in studio</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-[#CCFF00]">Space</kbd> Play/Pause
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-[#CCFF00]">R</kbd> Restart
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-[#CCFF00]">N</kbd> Next Seed
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-[#CCFF00]">E</kbd> Export 4K
            </span>
          </div>
        </div>

        {/* Bottom Legal & Copyright Bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div className="flex flex-wrap items-center gap-3">
            <span>© 2026 BOUNCEFORGE. All rights reserved.</span>
            <span className="text-neutral-700">•</span>
            <span className="text-neutral-400">Public Domain &amp; Synthesized Audio</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <button
              onClick={() => {
                setRoute('faq');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-white transition-colors cursor-pointer"
            >
              FAQ
            </button>
            <button
              onClick={() => {
                setRoute('terms');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Terms
            </button>
            <button
              onClick={() => {
                setRoute('privacy');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Privacy
            </button>
            <button
              onClick={() => {
                setRoute('refunds');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Refunds
            </button>
            <button
              onClick={() => {
                setRoute('affiliate_terms');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Affiliate Terms
            </button>
            <button
              onClick={() => {
                setRoute('pricing');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-white transition-colors cursor-pointer text-[#00e599] font-bold"
            >
              Pricing
            </button>
            <button
              onClick={() => {
                setRoute('blog');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-white transition-colors cursor-pointer text-purple-400"
            >
              Blog
            </button>
            <button
              onClick={() => {
                setRoute('contact');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Contact
            </button>
            <button
              onClick={() => {
                setRoute('diagnostics');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-white transition-colors cursor-pointer text-cyan-400"
            >
              Diagnostics
            </button>
            <button
              onClick={() => {
                setRoute('studio');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-[#CCFF00] font-bold hover:underline cursor-pointer"
            >
              Open Studio ⚡
            </button>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Back to Top ↑
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
