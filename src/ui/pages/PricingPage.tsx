import React, { useState, useEffect } from 'react';
import { useBillingStore } from '../../billing/billingStore';
import { useAuthStore } from '../../auth/useAuthStore';
import { useStudioStore } from '../../store/useStudioStore';
import { useContentStore } from '../../content/contentStore';
import { Header } from '../Header';
import { Footer } from '../Footer';
import {
  Zap,
  Check,
  Minus,
  Lock,
  Clock,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  DollarSign,
  HelpCircle,
  CreditCard,
} from 'lucide-react';
import { BillingCycle, CurrencyCode } from '../../billing/types';

export const PricingPage: React.FC = () => {
  const {
    pricingConfig,
    selectedCycle,
    setSelectedCycle,
    selectedCurrency,
    setSelectedCurrency,
    getMonthlyPriceForCreatorPro,
    getTotalBilledForCreatorPro,
    formatPrice,
    startCheckout,
  } = useBillingStore();

  const { currentUser, openAuthModal } = useAuthStore();
  const { setRoute, showToast } = useStudioStore();
  const { articles } = useContentStore();

  // Countdown timer for limited time offer
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 23,
    minutes: 45,
    seconds: 12,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 23, minutes: 59, seconds: 59 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleChoosePlan = async (planId: 'gamer_pack' | 'creator_pro') => {
    if (!currentUser) {
      openAuthModal('signup', `/pricing?selectedPlan=${planId}`);
      showToast('Please sign in or create an account to activate your plan.');
      return;
    }

    try {
      showToast('Redirecting to secure hosted checkout...');
      await startCheckout(planId, currentUser.id, currentUser.email);
    } catch (err: any) {
      showToast(err.message || 'Checkout failed to start');
    }
  };

  const monthlyRate = getMonthlyPriceForCreatorPro();
  const totalBilled = getTotalBilledForCreatorPro();

  return (
    <div className="min-h-screen bg-[#07090f] text-slate-100 flex flex-col font-sans select-none">
      <Header />

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-16 space-y-16">
        {/* Main Title matching user screenshot */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white leading-tight">
            AFFORDABLE. EARNED BACK WITH A SINGLE VIDEO
          </h1>
          <p className="text-sm sm:text-base text-slate-300 font-normal">
            Pick the plan that matches your goals. Flexible subscriptions, cancel anytime.
          </p>

          {/* Currency Switcher */}
          <div className="pt-2 flex items-center justify-center gap-2 text-xs text-slate-400">
            <span>Currency:</span>
            {(['USD', 'PKR', 'INR', 'AED', 'EUR', 'GBP'] as CurrencyCode[]).map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCurrency(c)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  selectedCurrency === c
                    ? 'bg-white/20 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Billing Toggle (1 Month, 6 Months -40%, 12 Months -60%) */}
        <div className="flex justify-center">
          <div className="inline-flex p-1.5 rounded-2xl bg-[#121622] border border-white/10 shadow-xl">
            {(
              [
                { id: 'month', label: '1 MONTH', badge: '' },
                { id: 'six_months', label: '6 MONTHS', badge: '-40%' },
                { id: 'twelve_months', label: '12 MONTHS', badge: '-60%' },
              ] as { id: BillingCycle; label: string; badge: string }[]
            ).map((cycle) => {
              const active = selectedCycle === cycle.id;
              return (
                <button
                  key={cycle.id}
                  onClick={() => setSelectedCycle(cycle.id)}
                  className={`relative px-5 py-2.5 rounded-xl text-xs font-black tracking-wider uppercase transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                    active
                      ? 'bg-[#00e599] text-black shadow-lg shadow-[#00e599]/20 font-extrabold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>{cycle.label}</span>
                  {cycle.badge && (
                    <span
                      className={`text-[10px] px-1 py-0.2 rounded font-mono font-bold leading-none ${
                        active ? 'bg-black/20 text-black' : 'text-[#00e599] bg-[#00e599]/10'
                      }`}
                    >
                      {cycle.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Pricing Cards Grid (Creator Pro & Gamer Pack) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch max-w-4xl mx-auto">
          {/* 1. CREATOR PRO (Featured with Mint Glowing Border like screenshot) */}
          <div className="relative rounded-3xl bg-[#0c1018] border-2 border-[#00e599] p-8 shadow-[0_0_50px_rgba(0,229,153,0.18)] flex flex-col justify-between transform md:-translate-y-2">
            <div className="space-y-6">
              {/* Business Use Badge */}
              <div className="text-center">
                <span className="inline-block px-3.5 py-1 rounded-full bg-[#00e599]/20 text-[#00e599] border border-[#00e599]/30 text-[11px] font-black uppercase tracking-widest">
                  BUSINESS USE
                </span>
              </div>

              {/* Title & Clapperboard */}
              <div className="text-center space-y-1">
                <h3 className="text-2xl font-black text-white flex items-center justify-center gap-2 uppercase tracking-wide">
                  <span>CREATOR PRO</span>
                  <span>🎬</span>
                </h3>

                {/* Crossed Out & Countdown Badge */}
                <div className="flex items-center justify-center gap-2 pt-1">
                  <span className="text-slate-400 line-through text-lg font-bold">
                    ${pricingConfig.creatorPro.crossedOutPrice}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono text-emerald-400 font-bold uppercase">
                    <Clock className="w-3 h-3 text-emerald-400 animate-spin" style={{ animationDuration: '6s' }} />
                    <span>{pricingConfig.creatorPro.badge}</span>
                    <span className="text-white ml-0.5">
                      {timeLeft.hours}h {timeLeft.minutes}m
                    </span>
                  </span>
                </div>

                {/* Big Price Display */}
                <div className="pt-2 text-center">
                  <span className="text-5xl sm:text-6xl font-black text-[#00e599] tracking-tight">
                    {formatPrice(monthlyRate)}
                  </span>
                  <span className="text-slate-400 text-sm font-medium">/month</span>
                </div>

                <p className="text-xs text-slate-400 pt-1">
                  {selectedCycle === 'month'
                    ? 'No commitment. Cancel anytime.'
                    : `Billed as ${formatPrice(totalBilled)} every ${
                        selectedCycle === 'six_months' ? '6 months' : 'year'
                      }. Cancel anytime.`}
                </p>

                <p className="text-xs text-slate-300 italic pt-2 pb-2 border-b border-white/10 text-center max-w-sm mx-auto">
                  Ideal for creating satisfying videos for TikTok, Shorts, Reels and starting to make money with your audience.
                </p>
              </div>

              {/* Feature Bullets with ⚡ Lightning Icons */}
              <ul className="space-y-3.5 pt-2 text-xs text-slate-200">
                {pricingConfig.creatorPro.features.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <Zap className="w-4 h-4 text-[#00e599] shrink-0 mt-0.5 fill-[#00e599]/20" />
                    <span className="font-medium">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA Button */}
            <div className="pt-8 space-y-3 text-center">
              <button
                onClick={() => handleChoosePlan('creator_pro')}
                className="w-full py-4 rounded-2xl bg-[#00e599] hover:bg-[#05fca8] text-black font-black text-sm uppercase tracking-wider transition-all duration-200 shadow-xl shadow-[#00e599]/30 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                START NO COMMITMENT
              </button>
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Secure Payment • Instant Access</span>
              </div>
            </div>
          </div>

          {/* 2. GAMER PACK (Personal One-Time Plan) */}
          <div className="relative rounded-3xl bg-[#0c1018] border border-white/10 p-8 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Personal Use Badge */}
              <div className="text-center">
                <span className="inline-block px-3.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px] font-black uppercase tracking-widest">
                  PERSONAL USE
                </span>
              </div>

              {/* Title */}
              <div className="text-center space-y-1">
                <h3 className="text-2xl font-black text-white flex items-center justify-center gap-2 uppercase tracking-wide">
                  <span>GAMER PACK</span>
                  <span>🎮</span>
                </h3>

                <div className="flex items-center justify-center gap-2 pt-1">
                  <span className="text-slate-400 line-through text-lg font-bold">
                    ${pricingConfig.gamerPack.crossedOutPrice}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-[10px] font-mono text-blue-400 font-bold uppercase">
                    {pricingConfig.gamerPack.badge}
                  </span>
                </div>

                <div className="pt-2 text-center">
                  <span className="text-5xl sm:text-6xl font-black text-white tracking-tight">
                    {formatPrice(pricingConfig.gamerPack.price)}
                  </span>
                  <span className="text-slate-400 text-sm font-medium"> /1 year</span>
                </div>

                <p className="text-xs text-slate-400 pt-1">
                  One-time payment. Does not auto-renew.
                </p>

                <p className="text-xs text-slate-300 italic pt-2 pb-2 border-b border-white/10 text-center max-w-sm mx-auto">
                  For gaming physics enthusiasts who want all 47 modes for desktop fun without commercial video exports.
                </p>
              </div>

              {/* Feature Bullets */}
              <ul className="space-y-3.5 pt-2 text-xs text-slate-300">
                {pricingConfig.gamerPack.features.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <span className="font-medium">{feat}</span>
                  </li>
                ))}
                <li className="flex items-start gap-2.5 text-slate-500">
                  <Minus className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                  <span>Video Recording / 4K Export (Creator Pro only)</span>
                </li>
                <li className="flex items-start gap-2.5 text-slate-500">
                  <Minus className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                  <span>Commercial License (Creator Pro only)</span>
                </li>
              </ul>
            </div>

            {/* CTA Button */}
            <div className="pt-8 space-y-3 text-center">
              <button
                onClick={() => handleChoosePlan('gamer_pack')}
                className="w-full py-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-black text-sm uppercase tracking-wider transition-all duration-200 cursor-pointer"
              >
                GET GAMER PACK
              </button>
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Secure 256-bit Encrypted Checkout</span>
              </div>
            </div>
          </div>
        </div>

        {/* Member Bonus Strip matching user screenshot */}
        <div className="max-w-3xl mx-auto rounded-2xl bg-[#14151e] border border-amber-500/20 p-4 sm:p-5 flex items-center gap-4 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400">
            <DollarSign className="w-6 h-6" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
              MEMBER BONUS: AFFILIATE PROGRAM
            </h4>
            <p className="text-xs text-slate-300">
              Earn a <strong className="text-amber-400">30% recurring commission</strong> on every sale through your referral link.
            </p>
          </div>
        </div>

        {/* 4 Article Cards Grid matching user screenshot */}
        <div className="space-y-6 pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {articles.slice(0, 4).map((art) => (
              <div
                key={art.id}
                onClick={() => {
                  window.location.href = `/blog/${art.slug}`;
                }}
                className="p-5 rounded-2xl bg-[#0e121a] border border-white/5 hover:border-white/20 transition-all flex flex-col justify-between cursor-pointer group hover:bg-[#121622]"
              >
                <div className="space-y-3">
                  <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${art.categoryColor}`}>
                    {art.category}
                  </span>
                  <h4 className="text-sm font-black text-white group-hover:text-cyan-400 transition-colors uppercase leading-snug">
                    {art.title}
                  </h4>
                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                    {art.excerpt}
                  </p>
                </div>
                <div className="pt-4 flex items-center gap-1.5 text-xs text-pink-400 font-bold group-hover:text-pink-300">
                  <span>Read Article</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            ))}
          </div>

          <div className="text-center pt-2">
            <button
              onClick={() => {
                window.location.href = '/blog';
              }}
              className="text-xs text-slate-400 hover:text-white font-medium inline-flex items-center gap-1 transition-colors"
            >
              <span>Browse the full archive</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="pt-10 border-t border-white/10 max-w-3xl mx-auto space-y-6">
          <div className="text-center space-y-1">
            <h3 className="text-xl font-black uppercase text-white">Pricing &amp; License FAQ</h3>
            <p className="text-xs text-slate-400">Everything you need to know about our plans.</p>
          </div>

          <div className="space-y-3">
            {[
              {
                q: 'Can I cancel my Creator Pro subscription at any time?',
                a: 'Yes, with one click in your account portal. When you cancel, you retain full Creator Pro access until the end of your prepaid billing period.',
              },
              {
                q: 'What does the Commercial License cover?',
                a: 'The Commercial License allows you to monetize your exported 4K short-form videos on TikTok, YouTube Shorts, Instagram Reels, and brand sponsorships without royalty payments or copyright strikes.',
              },
              {
                q: 'Do I need a credit card to try the free demo?',
                a: 'No card is needed for the free demo. You can test physics simulations and preview exports with standard watermark directly in your browser.',
              },
              {
                q: 'How does the 30% affiliate program pay out?',
                a: 'Every member receives an instant referral link. Once your approved earnings reach $50, you can request a payout directly to PayPal, Bank Transfer, or Payoneer.',
              },
            ].map((faq, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                <h5 className="text-xs font-bold text-white flex items-center gap-2">
                  <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{faq.q}</span>
                </h5>
                <p className="text-xs text-slate-400 leading-relaxed pl-5.5">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
