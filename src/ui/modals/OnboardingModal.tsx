import React, { useState } from 'react';
import { useAuthStore } from '../../auth/useAuthStore';
import { useStudioStore } from '../../store/useStudioStore';
import { ArrowRight, Sliders, Download, X, Film } from 'lucide-react';
import { triggerHaptic } from '../../platform/haptics';

export const OnboardingModal: React.FC = () => {
  const { isOnboardingOpen, closeOnboarding } = useAuthStore();
  const { setRoute, setIsPlaying, showToast } = useStudioStore();
  const [currentTip, setCurrentTip] = useState<number>(0);

  if (!isOnboardingOpen) return null;

  const tips = [
    {
      step: '1 / 3',
      title: 'Pick a Reel',
      subtitle: 'Browse 12 Top Picks or 6 simple categories',
      desc: 'Start with guaranteed viral templates: Marble Music, Satisfying Escape, Battles, ASMR Glass, Squeaky Fun, or Calm & Relaxing.',
      icon: Film,
      color: 'text-cyan-400',
      border: 'border-cyan-500/30',
      bg: 'bg-cyan-500/10',
    },
    {
      step: '2 / 3',
      title: 'Change Music or Look',
      subtitle: 'Only 5 essentials visible by default',
      desc: 'Swap melodies (public domain or original), pick color worlds, select a marble style, adjust your hook caption, or toggle 0.5x slow-mo.',
      icon: Sliders,
      color: 'text-lime-400',
      border: 'border-lime-500/30',
      bg: 'bg-lime-500/10',
    },
    {
      step: '3 / 3',
      title: 'Export in 1 Tap',
      subtitle: 'Frame-perfect 1080×1920 60fps MP4',
      desc: 'Hit Export Reel to render your video with sound verified, no clicks, -14 LUFS loudness, and an instant viral SEO title, caption and hashtags pack.',
      icon: Download,
      color: 'text-pink-400',
      border: 'border-pink-500/30',
      bg: 'bg-pink-500/10',
    },
  ];

  const handleNext = () => {
    triggerHaptic(10);
    if (currentTip < tips.length - 1) {
      setCurrentTip((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    triggerHaptic(15);
    try {
      localStorage.setItem('bounceforge_onboarded_v2', 'true');
    } catch {}
    closeOnboarding();
    setIsPlaying(true);
    setRoute('studio');
    showToast('Reel is now playing! Enjoy creating.');
  };

  const activeTip = tips[currentTip];
  const Icon = activeTip.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none font-sans">
      <div className="w-full max-w-md bg-[#0e121a] border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl relative space-y-6">
        {/* Skip Button */}
        <button
          onClick={handleComplete}
          className="absolute right-5 top-5 text-xs font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-1"
        >
          <span>Skip</span>
          <X className="w-4 h-4" />
        </button>

        {/* Tip Badge */}
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono font-bold text-cyan-300">
            Tip {activeTip.step}
          </span>
          <span className="text-xs text-slate-400 font-medium">Quick 3-step guide</span>
        </div>

        {/* Icon & Title */}
        <div className="space-y-3">
          <div
            className={`w-14 h-14 rounded-2xl ${activeTip.bg} ${activeTip.border} border flex items-center justify-center shadow-lg`}
          >
            <Icon className={`w-7 h-7 ${activeTip.color}`} />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {activeTip.title}
            </h2>
            <p className="text-xs font-bold text-slate-300">{activeTip.subtitle}</p>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">{activeTip.desc}</p>
        </div>

        {/* Step Dots & Next Button */}
        <div className="pt-2 flex items-center justify-between border-t border-white/10">
          <div className="flex items-center gap-1.5">
            {tips.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentTip ? 'w-6 bg-cyan-400' : 'w-1.5 bg-white/20'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="btn-3d-lime px-5 py-2.5 rounded-xl text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md shadow-lime-500/20"
          >
            <span>{currentTip === tips.length - 1 ? 'Start Creating' : 'Next Tip'}</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};
