import React, { useState, useEffect } from 'react';
import { useStudioStore } from '../../store/useStudioStore';
import { Header } from '../Header';
import { Footer } from '../Footer';
import {
  HelpCircle,
  Search,
  ChevronDown,
  Sparkles,
  Play,
  Film,
  Music,
  Zap,
  ShieldCheck,
  Mail,
  ArrowRight,
} from 'lucide-react';

interface FaqItem {
  id: string;
  category: 'general' | 'physics' | 'audio' | 'export' | 'commercial';
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    id: 'commercial-monetization',
    category: 'commercial',
    question: 'Can I monetize videos commercially, and which plans allow it?',
    answer:
      'Yes! Both the Creator Pro ($19/mo or $149/yr) and Gamer Pack ($29 one-time lifetime) plans grant complete, unrestricted commercial exploitation rights. You can monetize your exported videos on YouTube AdSense, TikTok Creator Rewards, Instagram Reels, Facebook, brand sponsorships, and client deliverables with zero watermark and zero royalties owed. The free Guest Tier is intended for personal evaluation and non-commercial testing, and includes a fixed BounceForge corner watermark.',
  },
  {
    id: 'mobile-support',
    category: 'general',
    question: 'Is BounceForge fully supported on mobile phones and tablets?',
    answer:
      'Yes! BounceForge includes a tailored mobile interface with responsive touch controls, haptic vibration feedback, and battery-conservation safeguards. It runs natively on iOS Safari (iOS 16.4+) and Android Chrome. The dynamic quality engine automatically adjusts shadow tiers to ensure a continuous 60 FPS viewport even on mid-tier mobile hardware.',
  },
  {
    id: 'keyboard-shortcuts',
    category: 'general',
    question: 'What keyboard shortcuts are available in the studio?',
    answer:
      'BounceForge offers hotkeys for rapid video creation: Space (Toggle Play / Pause), R (Restart current simulation from 0.00s with confirmation), Shift+R (Reset current mode to defaults), ? or Shift+/ (Open shortcuts cheat sheet), N (Randomize seed and generate new layout), E (Open 4K Video Exporter), M (Mute / Unmute audio), and Esc (Dismiss active modal).',
  },
  {
    id: 'export-formats',
    category: 'export',
    question: 'What video export formats and resolutions are supported?',
    answer:
      'Exports are encoded entirely client-side with W3C WebCodecs. Supported formats include MP4 (H.264 video with AAC stereo audio) configured for native Apple QuickTime and Windows Media Player playback, as well as WebM (VP9 / Opus). Available resolutions include 1080×1920 (FHD 9:16 default), 1440×2560 (2K QHD), 2160×3840 (4K UHD), 1080×1080 (Square 1:1), 1920×1080 (Landscape 16:9), and 720×1280 (HD free guest tier), rendered at true 60 FPS or 30 FPS.',
  },
  {
    id: 'refund-policy',
    category: 'commercial',
    question: 'What is your refund policy?',
    answer:
      'We offer a 14-day hassle-free money-back guarantee. If BounceForge does not run smoothly on your specific computer or GPU architecture, or if you encounter insurmountable technical export limitations, simply contact our support team at support@bounceforge.com or submit a note on the Feedback page within 14 days of purchase for a prompt refund.',
  },
  {
    id: 'privacy-client-side',
    category: 'general',
    question: 'How is user privacy protected and where are videos processed?',
    answer:
      'BounceForge operates under a strict privacy-first architecture: 100% of the physics simulation, audio synthesis, and video rendering takes place locally inside your browser memory. Your videos, custom image ball textures, and project presets are never uploaded to remote cloud rendering farms. Guest presets are stored in your device’s local IndexedDB, and logged-in accounts sync configurations securely via encrypted profile databases.',
  },
  {
    id: 'what-is-bounceforge',
    category: 'general',
    question: 'What makes BounceForge simulations deterministic?',
    answer:
      'Every simulation relies on a 32-bit Mulberry32 PRNG seed and fixed 240Hz sub-stepped numerical integration. Entering the exact same seed (e.g. #74218) will produce identical collision timings, trajectory rebounds, particle bursts, and musical melody notes on every browser and every computer worldwide.',
  },
  {
    id: 'auto-seed-finder',
    category: 'physics',
    question: 'How does the Auto-Seed Finder target viral video lengths?',
    answer:
      'Short-form retention depends on exact video payoff timings (e.g. escaping the ring at exactly 59.5 seconds). The Auto-Seed Finder runs a headless Web Worker that steps physics simulations at thousands of frames per second, testing consecutive seeds until it finds one where the ball escapes within your specified target duration window.',
  },
];

export const FaqPage: React.FC = () => {
  const { setRoute } = useStudioStore();
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({
    'what-is-bounceforge': true,
    'commercial-monetization': true,
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const toggle = (id: string) => {
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filtered = FAQS.filter((f) => {
    const matchCat = selectedCat === 'all' || f.category === selectedCat;
    const matchQuery =
      search.trim() === '' ||
      f.question.toLowerCase().includes(search.toLowerCase()) ||
      f.answer.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchQuery;
  });

  return (
    <div className="min-h-screen bg-[#050608] text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 w-full space-y-10">
        {/* Title */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-400 text-xs font-mono font-bold uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5" /> knowledge base &amp; support
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase">
            Frequently Asked Questions
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            Everything you need to know about viral ball physics, 4K video encoding, royalty-free audio rights, and browser compatibility.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search answers (e.g. 4K, monetization, MIDI, seeds, WebCodecs)..."
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
            {['all', 'general', 'commercial', 'export', 'physics', 'audio'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`px-3 py-1.5 rounded-xl uppercase font-bold transition-all ${
                  selectedCat === cat
                    ? 'bg-cyan-400 text-black shadow-md shadow-cyan-400/20'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm bg-white/[0.02] rounded-2xl border border-white/10">
              No matching answers found for "{search}". Try searching for physics, 4K, or audio!
            </div>
          ) : (
            filtered.map((item) => {
              const isOpen = !!openIds[item.id];
              return (
                <div
                  key={item.id}
                  id={item.id}
                  className="rounded-2xl bg-white/[0.02] border border-white/10 overflow-hidden transition-colors hover:border-white/20"
                >
                  <button
                    onClick={() => toggle(item.id)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 select-none"
                  >
                    <span className="text-base font-bold text-white">{item.question}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-cyan-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-white/5 animate-fadeIn">
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* CTA Card */}
        <div className="p-8 rounded-3xl bg-gradient-to-r from-cyan-950/40 via-indigo-950/30 to-[#CCFF00]/10 border border-cyan-400/30 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-xl font-bold text-white">Have another question or feature idea?</h3>
            <p className="text-xs text-slate-400">
              Contact our engineering team or launch the studio now to start creating.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setRoute('contact')}
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs"
            >
              Contact Support
            </button>
            <button
              onClick={() => setRoute('studio')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-[#CCFF00] text-black font-extrabold text-xs uppercase tracking-wider hover:scale-105 transition-all shadow-lg shadow-lime-400/20"
            >
              Launch Studio Free
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
