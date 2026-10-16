import React from 'react';
import { Header } from '../Header';
import { Footer } from '../Footer';
import { ShieldCheck } from 'lucide-react';

export const RefundPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#07090f] text-slate-100 flex flex-col font-sans select-none">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-16 space-y-8">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">
            <ShieldCheck className="w-3.5 h-3.5" />
            SATISFACTION COMMITMENT
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">
            Refund &amp; Cancellation Policy
          </h1>
          <p className="text-xs text-slate-400">Effective Date: January 1, 2026</p>
        </div>

        <div className="prose prose-invert max-w-none text-xs sm:text-sm text-slate-300 leading-relaxed space-y-6">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white uppercase">1. 14-Day Money-Back Guarantee</h2>
            <p>
              We want you to be completely delighted with BounceForge. If you purchase Creator Pro or Gamer Pack and determine that the platform does not meet your creative workflow needs, you may request a full 100% refund within 14 calendar days of your initial purchase date.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white uppercase">2. Subscription Cancellation</h2>
            <p>
              You can cancel your subscription at any time with a single click inside your Account Billing Portal. When you cancel, your account remains active with full Creator Pro benefits until the expiration date of your current prepaid billing cycle (whether monthly, 6-month, or 12-month). You will not be billed again.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white uppercase">3. How to Request a Refund</h2>
            <p>
              To request a refund, simply send an email from your registered account address to <strong>support@bounceforge.studio</strong> or contact us via our Contact Page. Please include your order confirmation ID or transaction reference. Refunds are processed through Paddle, Lemon Squeezy, or Stripe back to your original payment method within 3 to 5 business days.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};
