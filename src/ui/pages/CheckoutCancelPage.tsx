import React from 'react';
import { Header } from '../Header';
import { Footer } from '../Footer';
import { ArrowLeft, HelpCircle } from 'lucide-react';

export const CheckoutCancelPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#07090f] text-slate-100 flex flex-col font-sans select-none">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-6">
        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
          <HelpCircle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">
            No Worries At All
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your checkout was cancelled and no charges were made. You can continue creating with the free demo or explore other plans whenever you're ready.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 w-full">
          <a
            href="/pricing"
            className="flex-1 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Pricing</span>
          </a>
          <a
            href="/studio"
            className="flex-1 px-5 py-3 rounded-xl bg-[#00e599] hover:bg-[#05fca8] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center"
          >
            Launch Studio Free
          </a>
        </div>
      </main>

      <Footer />
    </div>
  );
};
