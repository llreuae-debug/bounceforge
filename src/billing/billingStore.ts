import { create } from 'zustand';
import {
  BillingCycle,
  CurrencyCode,
  PricingConfig,
  PlanId,
  UserEntitlements,
  CouponCode,
} from './types';
import { entitlements } from './entitlements';
import { getPaymentProvider } from './provider';

const STORAGE_KEY_PRICING = 'bounceforge_db_pricing_config';
const STORAGE_KEY_COUPONS = 'bounceforge_db_coupons';

const DEFAULT_PRICING_CONFIG: PricingConfig = {
  gamerPack: {
    price: 29,
    crossedOutPrice: 49,
    badge: 'LAUNCH OFFER',
    durationDays: 365,
    features: [
      'Personal use, no subscription',
      'All 47 2D Simulation Modes',
      '5 Auto-Searches per day',
      'Basic procedural audio synthesizer',
      'Does not auto-renew (365 days access)',
    ],
  },
  creatorPro: {
    monthlyPrice: 19,
    crossedOutPrice: 39,
    sixMonthDiscountPercent: 40, // $11.40 / mo ($68.40 total)
    twelveMonthDiscountPercent: 60, // $7.60 / mo ($91.20 total)
    badge: 'LIMITED TIME OFFER',
    offerEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days countdown
    features: [
      'All Game Modes (including all fresh drops)',
      'UNLIMITED Auto-Searches',
      'Advanced Audio + Sound Design (all 26 instruments)',
      'Video Recording / Export up to 4K 60fps',
      'Commercial License included',
      'Custom Watermark (or none)',
      'AI Hooks + Short-Form SEO Pack Generator',
    ],
  },
  freeDemo: {
    features: [
      '3 simulation modes per category',
      '1 auto-search per day',
      '720p 15s preview export with fixed watermark',
      'Personal non-commercial use only',
    ],
  },
};

const CURRENCY_RATES: Record<CurrencyCode, { rate: number; symbol: string; label: string }> = {
  USD: { rate: 1, symbol: '$', label: 'USD' },
  PKR: { rate: 280, symbol: 'Rs.', label: 'PKR (approx.)' },
  INR: { rate: 86, symbol: '₹', label: 'INR (approx.)' },
  AED: { rate: 3.67, symbol: 'AED', label: 'AED (approx.)' },
  EUR: { rate: 0.92, symbol: '€', label: 'EUR (approx.)' },
  GBP: { rate: 0.79, symbol: '£', label: 'GBP (approx.)' },
};

const DEFAULT_COUPONS: CouponCode[] = [
  {
    code: 'VIRAL2026',
    discountPercent: 20,
    maxUses: 500,
    timesUsed: 42,
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    active: true,
  },
  {
    code: 'LAUNCHBOUNCE',
    discountFixedUsd: 5,
    maxUses: 200,
    timesUsed: 18,
    expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    active: true,
  },
];

interface BillingState {
  pricingConfig: PricingConfig;
  selectedCycle: BillingCycle;
  selectedCurrency: CurrencyCode;
  coupons: CouponCode[];
  activeCoupon: CouponCode | null;
  activeProviderId: string;

  // Actions
  setSelectedCycle: (cycle: BillingCycle) => void;
  setSelectedCurrency: (curr: CurrencyCode) => void;
  updatePricingConfig: (newConfig: Partial<PricingConfig>) => void;
  applyCoupon: (code: string) => boolean;
  removeCoupon: () => void;
  createCoupon: (coupon: CouponCode) => void;
  deleteCoupon: (code: string) => void;
  setActiveProvider: (id: string) => void;

  // Calculations
  getMonthlyPriceForCreatorPro: () => number;
  getTotalBilledForCreatorPro: () => number;
  formatPrice: (usdAmount: number) => string;
  startCheckout: (planId: PlanId, userId?: string, userEmail?: string, referralCode?: string) => Promise<void>;
  upgradeUserPlan: (userId: string, planId: PlanId, cycle?: BillingCycle) => UserEntitlements;
}

export const useBillingStore = create<BillingState>((set, get) => {
  // Load pricing config from localStorage or default
  let initialPricing = DEFAULT_PRICING_CONFIG;
  let initialCoupons = DEFAULT_COUPONS;
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PRICING);
      if (raw) initialPricing = { ...DEFAULT_PRICING_CONFIG, ...JSON.parse(raw) };
      const rawC = localStorage.getItem(STORAGE_KEY_COUPONS);
      if (rawC) initialCoupons = JSON.parse(rawC);
    } catch {}
  }

  return {
    pricingConfig: initialPricing,
    selectedCycle: 'month',
    selectedCurrency: 'USD',
    coupons: initialCoupons,
    activeCoupon: null,
    activeProviderId: import.meta.env.PAYMENT_PROVIDER || 'test',

    setSelectedCycle: (cycle) => set({ selectedCycle: cycle }),
    setSelectedCurrency: (curr) => set({ selectedCurrency: curr }),

    updatePricingConfig: (newConfig) => {
      const updated = { ...get().pricingConfig, ...newConfig };
      set({ pricingConfig: updated });
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_PRICING, JSON.stringify(updated));
      }
    },

    setActiveProvider: (id) => set({ activeProviderId: id }),

    applyCoupon: (code) => {
      const { coupons } = get();
      const found = coupons.find(
        (c) => c.code.toUpperCase() === code.trim().toUpperCase() && c.active
      );
      if (found) {
        set({ activeCoupon: found });
        return true;
      }
      return false;
    },

    removeCoupon: () => set({ activeCoupon: null }),

    createCoupon: (coupon) => {
      const updated = [...get().coupons, coupon];
      set({ coupons: updated });
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_COUPONS, JSON.stringify(updated));
      }
    },

    deleteCoupon: (code) => {
      const updated = get().coupons.filter((c) => c.code !== code);
      set({ coupons: updated });
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_COUPONS, JSON.stringify(updated));
      }
    },

    getMonthlyPriceForCreatorPro: () => {
      const { pricingConfig, selectedCycle } = get();
      const base = pricingConfig.creatorPro.monthlyPrice; // $19
      if (selectedCycle === 'six_months') {
        // -40% -> $11.40
        return base * (1 - pricingConfig.creatorPro.sixMonthDiscountPercent / 100);
      }
      if (selectedCycle === 'twelve_months') {
        // -60% -> $7.60
        return base * (1 - pricingConfig.creatorPro.twelveMonthDiscountPercent / 100);
      }
      return base;
    },

    getTotalBilledForCreatorPro: () => {
      const { selectedCycle } = get();
      const monthly = get().getMonthlyPriceForCreatorPro();
      if (selectedCycle === 'six_months') return monthly * 6; // $68.40
      if (selectedCycle === 'twelve_months') return monthly * 12; // $91.20
      return monthly; // $19.00
    },

    formatPrice: (usdAmount: number) => {
      const { selectedCurrency } = get();
      const curr = CURRENCY_RATES[selectedCurrency] || CURRENCY_RATES.USD;
      const converted = usdAmount * curr.rate;

      if (selectedCurrency === 'USD') {
        return `$${usdAmount.toFixed(usdAmount % 1 === 0 ? 0 : 2)}`;
      }
      if (selectedCurrency === 'PKR' || selectedCurrency === 'INR') {
        return `${curr.symbol} ${Math.round(converted).toLocaleString()} approx.`;
      }
      return `${curr.symbol}${converted.toFixed(2)} approx.`;
    },

    startCheckout: async (planId, userId, userEmail, referralCode) => {
      const { selectedCycle, activeCoupon, activeProviderId } = get();
      const provider = getPaymentProvider(activeProviderId);

      await provider.openHostedCheckout({
        planId,
        billingCycle: selectedCycle,
        userId: userId || 'guest_' + Math.random().toString(36).slice(2),
        userEmail: userEmail || 'guest@bounceforge.studio',
        referralCode,
        couponCode: activeCoupon?.code,
        successUrl: `${window.location.origin}/checkout/success?plan=${planId}&cycle=${selectedCycle}`,
        cancelUrl: `${window.location.origin}/pricing?cancelled=true`,
      });
    },

    upgradeUserPlan: (userId, planId, cycle = 'month') => {
      const ent = entitlements.getEntitlements(userId);
      const now = new Date();
      let durationDays = 30;
      if (planId === 'gamer_pack') durationDays = 365;
      else if (cycle === 'six_months') durationDays = 180;
      else if (cycle === 'twelve_months') durationDays = 365;

      const updated: UserEntitlements = {
        ...ent,
        planId,
        billingCycle: cycle,
        status: 'active',
        periodStart: now.toISOString(),
        periodEnd: new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString(),
      };

      entitlements.saveEntitlements(updated);
      return updated;
    },
  };
});
