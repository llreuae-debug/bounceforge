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
    id: 'what-is-bounceforge',
    category: 'general',
    question: 'What is BounceForge?',
    answer:
      'BounceForge is a browser-based generative physics studio designed specifically for short-form video creators. It simulates oddly satisfying ball physics (like concentric rings, spiral vortices, and web battles) synchronized with musical melodies and binaural ASMR audio, rendered directly in your browser up to 4K 60fps.',
  },
  {
    id: 'commercial-monetization',
    category: 'commercial',
    question: 'Can I monetize videos created with BounceForge on YouTube, TikTok, and Instagram?',
    answer:
      'Yes, 100%! All video and audio files exported from BounceForge are 100% royalty-free. The included classical melodies (Für Elise, Canon in D, Ode to Joy, etc.) are in the Public Domain, and the procedural ASMR synthesizers generate synthetic waveforms in real time. You own all commercial monetization rights for your creations.',
  },
  {
    id: 'export-quality-offline',
    category: 'export',
    question: 'How does the 4K offline video export work without lag?',
    answer:
      'Unlike screen recording tools that lag under heavy CPU load, BounceForge uses hardware-accelerated WebCodecs and mp4-muxer. The physics engine steps frame-by-frame deterministically at 240Hz, drawing every frame to an offscreen canvas and encoding an exact 60fps video. The audio is synthesized offline via OfflineAudioContext at 48kHz stereo.',
  },
  {
    id: 'auto-seed-finder',
    category: 'physics',
    question: 'What is the Auto-Seed Finder and how does it guarantee viral finish times?',
    answer:
      'View retention on TikTok and YouTube Shorts depends on precise video lengths (e.g. 59.0 to 60.0 seconds). The Auto-Seed Finder spins up a headless Web Worker that runs physics simulations at thousands of frames per second across consecutive seeds. It automatically tests and returns seeds where the ball escapes within your chosen viral duration window.',
  },
  {
    id: 'deterministic-physics',
    category: 'physics',
    question: 'Are simulations completely deterministic?',
    answer:
      'Yes! BounceForge uses the Mulberry32 Pseudo-Random Number Generator and substepped Verlet numerical integration. Given the same simulation mode, settings, and integer seed, the ball positions, bounce vectors, collision counts, and musical notes will be identical bit-for-bit on every device and every render.',
  },
  {
    id: 'custom-midi-melodies',
    category: 'audio',
    question: 'Can I compose my own melodies or import MIDI files?',
    answer:
      'Absolutely. BounceForge features an interactive 4-octave piano roll MIDI editor. You can click on the grid to create or edit melodic notes, adjust octave shifts, choose musical scales (Pentatonic, Dorian, Harmonic Minor, Synthwave), or import standard .mid files directly from your computer.',
  },
  {
    id: 'privacy-client-side',
    category: 'general',
    question: 'Is my project data uploaded to any external server?',
    answer:
      'No. BounceForge is 100% client-side. All physics calculations, audio synthesis, video muxing, and project saving happen directly in your browser using Web Workers and IndexedDB. Nothing leaves your device.',
  },
  {
    id: 'supported-devices',
    category: 'general',
    question: 'Which devices and browsers are supported?',
    answer:
      'BounceForge works on modern desktop and mobile browsers including Chrome, Edge, Safari (macOS & iOS 16.4+), and Firefox. For optimal 4K WebCodecs video encoding, Chromium-based browsers (Chrome, Edge, Brave) and Safari 16.4+ are recommended.',
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
