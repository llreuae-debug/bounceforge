import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Zap, Music, Video, CheckCircle } from 'lucide-react';

export const OnboardingModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem('bounceforge_onboarded');
    if (!seen) {
      setIsOpen(true);
    }
  }, []);

  if (!isOpen) return null;

  const steps = [
    {
      badge: 'Step 1 of 3 • Modes & Physics',
      title: 'Pick Any Viral Simulation',
      desc: 'Browse 21 original physics modes on the left gallery. Nested rings, shatter cascades, web battles, and black holes.',
      icon: Zap,
      color: 'from-cyan-400 to-blue-500',
    },
    {
      badge: 'Step 2 of 3 • Musical Sync & ASMR',
      title: 'Every Bounce Plays a Note',
      desc: 'Choose from 12 synthesized instruments and public-domain melodies. Edit notes on the live piano roll or import your own .mid files with procedural ASMR sound.',
      icon: Music,
      color: 'from-purple-400 to-pink-500',
    },
    {
      badge: 'Step 3 of 3 • 4K Frame-Perfect Video',
      title: 'Export for TikTok, Shorts & Reels',
      desc: 'Our deterministic WebCodecs engine renders offline 9:16 vertical videos up to 4K 60fps with zero stutter, synchronized audio, and customizable viral overlays.',
      icon: Video,
      color: 'from-[#CCFF00] to-emerald-400',
    },
  ];

  const current = steps[step];
  const Icon = current.icon;

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem('bounceforge_onboarded', 'true');
      setIsOpen(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('bounceforge_onboarded', 'true');
    setIsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#0d0d16] border border-white/15 rounded-3xl p-8 shadow-2xl space-y-6">
        {/* Glow accent */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400">
            {current.badge}
          </span>
          <button
            onClick={handleSkip}
            className="text-xs text-neutral-500 hover:text-neutral-300 font-bold transition-colors"
          >
            Skip Intro
          </button>
        </div>

        <div className="flex items-start gap-4">
          <div className={`p-4 rounded-2xl bg-gradient-to-tr ${current.color} shadow-lg shrink-0`}>
            <Icon className="w-7 h-7 text-black stroke-[2.5]" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-2xl font-black text-white tracking-tight">{current.title}</h3>
            <p className="text-sm text-neutral-400 leading-relaxed">{current.desc}</p>
          </div>
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <div className="flex items-center gap-2">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === step ? 'w-8 bg-[#CCFF00]' : 'w-2 bg-neutral-700'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-[#CCFF00] hover:opacity-95 text-black font-extrabold text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 transform hover:scale-105 transition-all"
          >
            <span>{step === steps.length - 1 ? "Let's Bounce! 🔥" : 'Next Step'}</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
          </button>
        </div>
      </div>
    </div>
  );
};
