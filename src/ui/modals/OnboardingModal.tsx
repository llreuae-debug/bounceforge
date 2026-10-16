import React, { useState } from 'react';
import { useAuthStore } from '../../auth/useAuthStore';
import { useStudioStore } from '../../store/useStudioStore';
import { Sparkles, ArrowRight, Video, Flame, Music, Smile } from 'lucide-react';

export const OnboardingModal: React.FC = () => {
  const { isOnboardingOpen, closeOnboarding, currentUser, updateCurrentUser } = useAuthStore();
  const { setRoute, showToast } = useStudioStore();

  const [creatorGoal, setCreatorGoal] = useState<'tiktok' | 'reels' | 'shorts' | 'fun' | 'business'>('tiktok');
  const [name, setName] = useState(currentUser?.fullName || '');

  if (!isOnboardingOpen) return null;

  const handleFinish = async () => {
    if (currentUser) {
      await updateCurrentUser({
        fullName: name || currentUser.fullName,
        creatorGoal,
        onboardingCompleted: true,
      });
    }
    closeOnboarding();
    showToast('Studio profile configured! Let’s create.');
    setRoute('studio');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="w-full max-w-lg bg-[#0e121a] border border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-cyan-500/10 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            CREATOR SETUP
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
            Welcome to BounceForge!
          </h2>
          <p className="text-xs text-slate-300">
            Tell us about your content goals so we can tune your default safe zones and rendering presets.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Your Creator / Channel Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. NeonBounceLab"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300">What are you creating?</label>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: 'tiktok', label: 'TikTok Shorts', desc: 'Fast hook & buzzer beaters', icon: Flame },
                { id: 'reels', label: 'Instagram Reels', desc: 'High-contrast aesthetic', icon: Video },
                { id: 'shorts', label: 'YouTube Shorts', desc: 'High retention loop sequences', icon: Sparkles },
                { id: 'fun', label: 'Just for Fun / Relax', desc: 'Satisfying 2D ASMR physics', icon: Smile },
              ].map((item) => {
                const Icon = item.icon;
                const active = creatorGoal === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCreatorGoal(item.id as any)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      active
                        ? 'border-cyan-400 bg-cyan-500/20 text-white shadow-lg shadow-cyan-500/10'
                        : 'border-white/5 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mb-1.5 ${active ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <div className="text-xs font-bold text-white">{item.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <button
          onClick={handleFinish}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xl shadow-cyan-500/20 cursor-pointer"
        >
          <span>Launch Into Studio</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
