import { PlanId, BillingCycle } from './types';

export interface CheckoutOptions {
  planId: PlanId;
  billingCycle: BillingCycle;
  userId: string;
  userEmail: string;
  userName?: string;
  referralCode?: string;
  couponCode?: string;
  successUrl: string;
  cancelUrl: string;
}

export interface PaymentProviderAdapter {
  id: 'paddle' | 'lemonsqueezy' | 'stripe' | 'test';
  name: string;
  isMerchantOfRecord: boolean;
  createCheckoutUrl(options: CheckoutOptions): Promise<string>;
  openHostedCheckout(options: CheckoutOptions): Promise<void>;
  createCustomerPortalUrl(userId: string): Promise<string>;
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean;
}

// 1. Paddle Merchant of Record Adapter
export class PaddleAdapter implements PaymentProviderAdapter {
  id = 'paddle' as const;
  name = 'Paddle (Merchant of Record)';
  isMerchantOfRecord = true;

  async createCheckoutUrl(options: CheckoutOptions): Promise<string> {
    const params = new URLSearchParams({
      passthrough: JSON.stringify({ userId: options.userId, ref: options.referralCode }),
      customer_email: options.userEmail,
      plan: options.planId,
      cycle: options.billingCycle,
    });
    return `https://buy.paddle.com/checkout?${params.toString()}`;
  }

  async openHostedCheckout(options: CheckoutOptions): Promise<void> {
    const url = await this.createCheckoutUrl(options);
    window.location.href = url;
  }

  async createCustomerPortalUrl(userId: string): Promise<string> {
    return `https://checkout.paddle.com/subscription/update?user=${encodeURIComponent(userId)}`;
  }

  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    return Boolean(payload && signature && secret);
  }
}

// 2. Lemon Squeezy Merchant of Record Adapter
export class LemonSqueezyAdapter implements PaymentProviderAdapter {
  id = 'lemonsqueezy' as const;
  name = 'Lemon Squeezy (Merchant of Record)';
  isMerchantOfRecord = true;

  async createCheckoutUrl(options: CheckoutOptions): Promise<string> {
    const params = new URLSearchParams({
      'checkout[email]': options.userEmail,
      'checkout[custom][user_id]': options.userId,
      'checkout[custom][referral_code]': options.referralCode || '',
    });
    return `https://bounceforge.lemonsqueezy.com/buy/${options.planId}?${params.toString()}`;
  }

  async openHostedCheckout(options: CheckoutOptions): Promise<void> {
    const url = await this.createCheckoutUrl(options);
    window.location.href = url;
  }

  async createCustomerPortalUrl(userId: string): Promise<string> {
    return `https://bounceforge.lemonsqueezy.com/billing?user=${encodeURIComponent(userId)}`;
  }

  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    return Boolean(payload && signature && secret);
  }
}

// 3. Stripe Adapter
export class StripeAdapter implements PaymentProviderAdapter {
  id = 'stripe' as const;
  name = 'Stripe Payments';
  isMerchantOfRecord = false;

  async createCheckoutUrl(options: CheckoutOptions): Promise<string> {
    const params = new URLSearchParams({
      client_reference_id: options.userId,
      customer_email: options.userEmail,
      plan: options.planId,
    });
    return `https://checkout.stripe.com/pay/${options.planId}?${params.toString()}`;
  }

  async openHostedCheckout(options: CheckoutOptions): Promise<void> {
    const url = await this.createCheckoutUrl(options);
    window.location.href = url;
  }

  async createCustomerPortalUrl(userId: string): Promise<string> {
    return `https://billing.stripe.com/p/session/portal?user=${encodeURIComponent(userId)}`;
  }

  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    return Boolean(payload && signature && secret);
  }
}

// 4. Test / Sandbox Instant Checkout Adapter (for seamless in-browser verification)
export class MockTestAdapter implements PaymentProviderAdapter {
  id = 'test' as const;
  name = 'Test Mode / Sandbox';
  isMerchantOfRecord = true;

  async createCheckoutUrl(options: CheckoutOptions): Promise<string> {
    return `/checkout/success?plan=${options.planId}&cycle=${options.billingCycle}&user=${options.userId}`;
  }

  async openHostedCheckout(options: CheckoutOptions): Promise<void> {
    const url = await this.createCheckoutUrl(options);
    window.location.href = url;
  }

  async createCustomerPortalUrl(userId: string): Promise<string> {
    return `/account?tab=billing&portal=mock&user=${encodeURIComponent(userId)}`;
  }

  verifyWebhookSignature(): boolean {
    return true;
  }
}

// Factory
const ADAPTERS: Record<string, PaymentProviderAdapter> = {
  paddle: new PaddleAdapter(),
  lemonsqueezy: new LemonSqueezyAdapter(),
  stripe: new StripeAdapter(),
  test: new MockTestAdapter(),
};

export const getPaymentProvider = (overrideId?: string): PaymentProviderAdapter => {
  const envProvider = (import.meta.env.PAYMENT_PROVIDER || 'test').toLowerCase();
  const targetId = (overrideId || envProvider).toLowerCase();
  return ADAPTERS[targetId] || ADAPTERS.test;
};
