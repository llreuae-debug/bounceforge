import React from 'react';
import { useAuthStore } from '../../auth/useAuthStore';
import { useBillingStore } from '../../billing/billingStore';
import { useStudioStore } from '../../store/useStudioStore';
import { X, Lock, Check, ArrowRight } from 'lucide-react';

export const UpgradeModal: React.FC = () => {
  const { isUpgradeModalOpen, closeUpgradeModal, upgradeFeaturePrompt, currentUser, openAuthModal } =
    useAuthStore();
  const { startCheckout, pricingConfig, formatPrice, getMonthlyPriceForCreatorPro } = useBillingStore();
  const { showToast } = useStudioStore();

  if (!isUpgradeModalOpen) return null;

  const handleUpgrade = async (planId: 'gamer_pack' | 'creator_pro') => {
    if (!currentUser) {
      closeUpgradeModal();
      openAuthModal('signup', `/pricing?selectedPlan=${planId}`);
      return;
    }

    try {
      showToast('Opening checkout...');
      await startCheckout(planId, currentUser.id, currentUser.email);
      closeUpgradeModal();
    } catch (err: any) {
      showToast(err.message || 'Upgrade failed to initiate');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-xl bg-[#0d1017] border border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-cyan-500/20 space-y-6">
        <button
          onClick={closeUpgradeModal}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/30 text-xs font-mono font-bold text-pink-400 uppercase tracking-widest">
            <Lock className="w-3.5 h-3.5" />
            PREMIUM FEATURE LOCKED
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
            Unlock Full Creator Pro Access
          </h2>
          <p className="text-xs text-slate-300 max-w-md mx-auto">
            {upgradeFeaturePrompt
              ? `"${upgradeFeaturePrompt}" is an exclusive feature included with Creator Pro.`
              : 'Export in full 4K, remove watermarks, unlock all modes, and get unlimited Auto-Searches.'}
          </p>
        </div>

        {/* Plan comparison mini-cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Creator Pro */}
          <div className="p-5 rounded-2xl bg-[#121622] border-2 border-[#00e599] space-y-3 relative shadow-lg shadow-[#00e599]/15">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white uppercase">CREATOR PRO 🎬</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00e599]/20 text-[#00e599] font-bold">
                RECOMMENDED
              </span>
            </div>

            <div className="text-2xl font-black text-[#00e599]">
              {formatPrice(getMonthlyPriceForCreatorPro())}
              <span className="text-xs text-slate-400 font-normal"> /mo</span>
            </div>

            <ul className="space-y-1.5 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#00e599]" />
                <span>4K 60fps Video Export</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#00e599]" />
                <span>Commercial License</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#00e599]" />
                <span>Custom or No Watermark</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#00e599]" />
                <span>UNLIMITED Auto-Searches</span>
              </li>
            </ul>

            <button
              onClick={() => handleUpgrade('creator_pro')}
              className="w-full py-3 rounded-xl bg-[#00e599] hover:bg-[#05fca8] text-black font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-[#00e599]/20"
            >
              Upgrade to Creator Pro
            </button>
          </div>

          {/* Gamer Pack */}
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white uppercase">GAMER PACK 🎮</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold">
                PERSONAL
              </span>
            </div>

            <div className="text-2xl font-black text-white">
              {formatPrice(pricingConfig.gamerPack.price)}
              <span className="text-xs text-slate-400 font-normal"> /year</span>
            </div>

            <ul className="space-y-1.5 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-blue-400" />
                <span>All 47 2D Game Modes</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-blue-400" />
                <span>5 Auto-Searches / day</span>
              </li>
              <li className="flex items-center gap-2 text-slate-500">
                <span className="w-3.5 h-3.5 text-center leading-none">—</span>
                <span>No video exports</span>
              </li>
            </ul>

            <button
              onClick={() => handleUpgrade('gamer_pack')}
              className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              Get Gamer Pack ($29)
            </button>
          </div>
        </div>

        <div className="text-center">
          <a
            href="/pricing"
            onClick={(e) => {
              e.preventDefault();
              closeUpgradeModal();
              window.location.href = '/pricing';
            }}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-bold underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>View Full Pricing &amp; Feature Comparison</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
