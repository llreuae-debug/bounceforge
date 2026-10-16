export type PlanId = 'free' | 'gamer_pack' | 'creator_pro';

export type BillingCycle = 'month' | 'six_months' | 'twelve_months';

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'cancelled' | 'expired';

export type CurrencyCode = 'USD' | 'PKR' | 'INR' | 'AED' | 'EUR' | 'GBP';

export interface PlanFeatureItem {
  id: string;
  label: string;
  included: boolean;
  highlight?: boolean;
}

export interface PricingConfig {
  gamerPack: {
    price: number; // e.g. 29
    crossedOutPrice: number; // e.g. 49
    badge: string; // e.g. "LAUNCH OFFER"
    durationDays: number; // 365
    features: string[];
    hidden?: boolean;
  };
  creatorPro: {
    monthlyPrice: number; // e.g. 19
    crossedOutPrice: number; // e.g. 39
    sixMonthDiscountPercent: number; // 40 (-> $11.40/mo, $68.40 total)
    twelveMonthDiscountPercent: number; // 60 (-> $7.60/mo, $91.20 total)
    badge: string; // e.g. "LIMITED TIME OFFER"
    offerEndsAt: string; // real countdown ISO date
    features: string[];
    hidden?: boolean;
  };
  freeDemo: {
    features: string[];
  };
}

export interface UserEntitlements {
  userId: string;
  planId: PlanId;
  billingCycle?: BillingCycle;
  status: SubscriptionStatus;
  periodStart: string;
  periodEnd: string;
  cancelAtPeriodEnd: boolean;
  autoSearchesUsedToday: number;
  lastUsageDate: string; // YYYY-MM-DD
  exportCountTotal: number;
}

export interface CouponCode {
  code: string;
  discountPercent?: number;
  discountFixedUsd?: number;
  validForPlan?: PlanId;
  maxUses: number;
  timesUsed: number;
  expiresAt: string;
  active: boolean;
}

export interface PaymentWebhookEvent {
  id: string;
  provider: 'paddle' | 'lemonsqueezy' | 'stripe' | 'test';
  eventType:
    | 'subscription.created'
    | 'subscription.updated'
    | 'subscription.cancelled'
    | 'payment.completed'
    | 'payment.failed'
    | 'payment.refunded'
    | 'dispute.created';
  userId: string;
  planId: PlanId;
  billingCycle?: BillingCycle;
  amount: number;
  currency: string;
  referralCode?: string;
  signature?: string;
  timestamp: string;
}
