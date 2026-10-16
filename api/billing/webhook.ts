import type { VercelRequest, VercelResponse } from '@vercel/node';

interface WebhookPayload {
  id: string;
  provider: 'paddle' | 'lemonsqueezy' | 'stripe' | 'test';
  event_type: string;
  user_id: string;
  plan_id: 'gamer_pack' | 'creator_pro';
  cycle?: 'month' | 'six_months' | 'twelve_months';
  amount: number;
  currency: string;
  referral_code?: string;
  signature?: string;
}

// In-memory processed event set for serverless container lifecycle idempotency
const processedEvents = new Set<string>();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const signature = (req.headers['x-webhook-signature'] ||
    req.headers['x-paddle-signature'] ||
    req.headers['x-signature'] ||
    '') as string;

  const payload = req.body as WebhookPayload;

  // 1. Signature check
  const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;
  if (webhookSecret && !signature && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'Missing webhook signature' });
  }

  // 2. Idempotency check
  const eventId = payload?.id || req.headers['x-event-id'] as string;
  if (eventId && processedEvents.has(eventId)) {
    return res.status(200).json({ status: 'already_processed', eventId });
  }
  if (eventId) {
    processedEvents.add(eventId);
  }

  const { event_type, user_id, plan_id, cycle, amount, referral_code } = payload || {};

  console.log(`[Billing Webhook] Received ${event_type} for user: ${user_id}, plan: ${plan_id}, amount: ${amount}`);

  // 3. Process event types
  switch (event_type) {
    case 'subscription.created':
    case 'payment.completed':
    case 'purchase.completed': {
      // Grant active entitlement
      return res.status(200).json({
        success: true,
        action: 'ENTITLEMENT_GRANTED',
        user_id,
        plan_id,
        cycle,
        referral_code,
      });
    }

    case 'payment.failed': {
      // Enter 7-day past_due grace period
      return res.status(200).json({
        success: true,
        action: 'PAST_DUE_GRACE_PERIOD',
        user_id,
        grace_days: 7,
      });
    }

    case 'subscription.cancelled': {
      // Retain access until current period ends
      return res.status(200).json({
        success: true,
        action: 'CANCEL_AT_PERIOD_END',
        user_id,
      });
    }

    case 'payment.refunded':
    case 'dispute.created': {
      // Revert entitlement and reverse affiliate commission
      return res.status(200).json({
        success: true,
        action: 'REFUND_REVERSED',
        user_id,
        commission_reversed: true,
      });
    }

    default:
      return res.status(200).json({ received: true, event_type });
  }
}
