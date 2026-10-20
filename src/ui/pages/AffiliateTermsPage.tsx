import React from 'react';
import { Header } from '../Header';
import { Footer } from '../Footer';
import { DollarSign } from 'lucide-react';

export const AffiliateTermsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#07090f] text-slate-100 flex flex-col font-sans select-none">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-16 space-y-8">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
            <DollarSign className="w-3.5 h-3.5" />
            PARTNER PROGRAM
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">
            Affiliate Partner Terms &amp; Agreement
          </h1>
          <p className="text-xs text-slate-400">Effective Date: January 1, 2026</p>
        </div>

        <div className="prose prose-invert max-w-none text-xs sm:text-sm text-slate-300 leading-relaxed space-y-6">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white uppercase">1. Program Overview &amp; Commissions</h2>
            <p>
              By participating in the BounceForge Affiliate Partner Program, you agree to these Terms. You receive an individual referral link formatted as <code>https://bounceforge.vercel.app/r/[code]</code>. When a new customer clicks your link and purchases a paid Creator Pro subscription or Gamer Pack within 60 days, you earn a <strong>30% recurring commission</strong> on all subscription renewals for as long as the referred customer remains subscribed, and 30% on one-time purchases.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white uppercase">2. 30-Day Refund Hold &amp; Commission Reversals</h2>
            <p>
              All newly earned commissions are held in a "Pending" status for exactly 30 days to correspond with our customer refund window. If a customer receives a refund, initiates a chargeback, or has fraudulent payment activity, the associated commission is automatically reversed and deducted from your pending balance.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white uppercase">3. Payout Threshold &amp; Methods</h2>
            <p>
              Affiliates may request a payout once their "Approved" balance reaches or exceeds <strong>$50.00 USD</strong>. Payouts are dispatched via PayPal, International Bank Wire Transfer, or Payoneer. All recipient details are stored encrypted and masked.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white uppercase">4. Prohibited Activities &amp; Self-Referrals</h2>
            <p>
              Self-referrals (purchasing your own subscription via your personal affiliate link) are strictly prohibited and automatically blocked by our fingerprinting and account detection engine. Paid bidding on branded keywords (e.g. "BounceForge", "BounceForge coupon") on Google Ads or search engines without prior written authorization will result in immediate termination of partner access and forfeiture of unpaid balances.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};
