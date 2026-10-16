import React, { useEffect } from 'react';
import { useAuthStore } from '../../auth/useAuthStore';
import { useBillingStore } from '../../billing/billingStore';
import { useStudioStore } from '../../store/useStudioStore';
import { affiliateService } from '../../affiliates/affiliateService';
import { Header } from '../Header';
import { Footer } from '../Footer';
import { Sparkles, ArrowRight, CheckCircle2, ShieldCheck, Play } from 'lucide-react';
import { PlanId } from '../../billing/types';

export const CheckoutSuccessPage: React.FC = () => {
  const { currentUser } = useAuthStore();
  const { upgradeUserPlan } = useBillingStore();
  const { showToast, setRoute } = useStudioStore();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const plan = (params.get('plan') || 'creator_pro') as PlanId;
    const cycle = (params.get('cycle') || 'month') as any;

    if (currentUser) {
      upgradeUserPlan(currentUser.id, plan, cycle);
      // Record affiliate commission if attributed
      affiliateService.recordPurchaseCommission(
        currentUser.id,
        currentUser.email,
        'ord_' + Math.random().toString(36).slice(2, 10),
        plan === 'creator_pro' ? 19 : 29,
        plan === 'creator_pro' ? 'Creator Pro' : 'Gamer Pack'
      );
      showToast('Welcome to Creator Pro! All features unlocked.');
    }
  }, [currentUser, upgradeUserPlan, showToast]);

  return (
    <div className="min-h-screen bg-[#07090f] text-slate-100 flex flex-col font-sans select-none">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-xl mx-auto space-y-6">
        {/* Inline SVG celebration icon */}
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.25)] animate-bounce">
          <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            PAYMENT CONFIRMED
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white uppercase tracking-tight">
            You're In 🎉
          </h1>
          <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
            Your Creator Pro entitlement is activated. You now have unlimited 4K video exports, all 47 simulation modes, custom watermark removal, and commercial rights.
          </p>
        </div>

        {/* Plan Summary Card */}
        <div className="w-full p-5 rounded-2xl bg-[#0e121a] border border-white/10 text-left space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-white uppercase">
            <span>Creator Pro Subscription</span>
            <span className="text-emerald-400 font-mono">STATUS: ACTIVE</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-1 border-t border-white/5">
            <div>
              <span>Billing Cycle:</span> <strong className="text-white">Active</strong>
            </div>
            <div>
              <span>License:</span> <strong className="text-white">Commercial Included</strong>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setRoute('studio');
          }}
          className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#00e599] hover:bg-[#05fca8] text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-xl shadow-[#00e599]/25 transform hover:-translate-y-0.5 cursor-pointer"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Open Studio &amp; Start Creating</span>
        </button>
      </main>

      <Footer />
    </div>
  );
};
