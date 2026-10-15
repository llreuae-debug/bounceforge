import React, { useState, useEffect } from 'react';
import { useStudioStore } from '../../store/useStudioStore';
import { Header } from '../Header';
import { Footer } from '../Footer';
import {
  Mail,
  Send,
  MessageSquare,
  Sparkles,
  Bug,
  HelpCircle,
  Play,
  CheckCircle2,
} from 'lucide-react';
import { detectCapabilities, generateDiagnosticReport } from '../../platform/capabilities';

export const ContactPage: React.FC = () => {
  const { setRoute } = useStudioStore();
  const [subject, setSubject] = useState('Feedback & Feature Suggestion');
  const [message, setMessage] = useState('');
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    let bodyText = message;
    if (includeDiagnostics) {
      const caps = await detectCapabilities();
      const report = generateDiagnosticReport(caps);
      bodyText += `\n\n--- Hardware Diagnostics ---\n${report}`;
    }
    const mailtoUrl = `mailto:support@bounceforge.app?subject=${encodeURIComponent(
      `[BounceForge] ${subject}`
    )}&body=${encodeURIComponent(bodyText)}`;
    window.location.href = mailtoUrl;
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#050608] text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 w-full space-y-10">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-400 text-xs font-mono font-bold uppercase tracking-wider">
            <Mail className="w-3.5 h-3.5" /> creator support &amp; engineering feedback
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase">
            Contact &amp; Feedback
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl">
            Have a suggestion for a new simulation mode, spotted a bug, or need help with 4K offline video export? Send our engineering team a note.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Info Column */}
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 uppercase">
                <Mail className="w-4 h-4" /> Direct Email
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Reach our core engineering and support inbox directly:
              </p>
              <a
                href="mailto:support@bounceforge.app?subject=BounceForge%20Support%20Request"
                className="block text-xs font-mono font-bold text-[#CCFF00] hover:underline"
              >
                support@bounceforge.app
              </a>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-400 uppercase">
                <HelpCircle className="w-4 h-4" /> Common Answers
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Looking for answers about monetization, seeds, or MIDI?
              </p>
              <button
                onClick={() => setRoute('faq')}
                className="text-xs font-bold text-cyan-400 hover:underline"
              >
                Visit FAQ Knowledge Base →
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#FF2E93] uppercase">
                <Bug className="w-4 h-4" /> Diagnostics
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Need to verify GPU acceleration and WebCodecs support?
              </p>
              <button
                onClick={() => setRoute('diagnostics')}
                className="text-xs font-bold text-pink-400 hover:underline"
              >
                Run Hardware Diagnostics →
              </button>
            </div>
          </div>

          {/* Right Form Column */}
          <div className="md:col-span-2 p-6 sm:p-8 rounded-3xl bg-white/[0.02] border border-white/10 space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-cyan-400" /> Send a Message
            </h2>

            {submitted ? (
              <div className="p-6 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 space-y-3 animate-fadeIn">
                <div className="flex items-center gap-2 font-bold text-base">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Opening your email app!
                </div>
                <p className="text-xs leading-relaxed text-emerald-300">
                  Your default email client has been launched with your message pre-populated. Send it through and our team will get back to you shortly.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-xs font-bold"
                >
                  Write another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendEmail} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 uppercase font-mono">
                    Topic / Category
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Feedback & Feature Suggestion" className="bg-[#090b14]">
                      Feature Suggestion (New Mode / Audio / Visuals)
                    </option>
                    <option value="Bug Report" className="bg-[#090b14]">
                      Bug Report / Simulation Issue
                    </option>
                    <option value="Export & WebCodecs Help" className="bg-[#090b14]">
                      4K Video Export &amp; Encoding Question
                    </option>
                    <option value="Commercial Inquiry" className="bg-[#090b14]">
                      Commercial Licensing / Enterprise
                    </option>
                    <option value="Other" className="bg-[#090b14]">
                      Other General Feedback
                    </option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 uppercase font-mono">
                    Message Details
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your suggestion, the bug you encountered, or the simulation mode you'd like to see added..."
                    className="w-full p-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400 leading-relaxed"
                  />
                </div>

                <label className="flex items-center gap-2.5 text-xs text-slate-400 select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeDiagnostics}
                    onChange={(e) => setIncludeDiagnostics(e.target.checked)}
                    className="rounded bg-white/10 border-white/20 text-cyan-400 focus:ring-0"
                  />
                  <span>Attach anonymous hardware &amp; browser telemetry to help diagnose issues</span>
                </label>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setRoute('studio')}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Cancel &amp; return to Studio
                  </button>

                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-[#CCFF00] text-black font-extrabold text-xs uppercase tracking-wider hover:scale-105 transition-all shadow-lg shadow-lime-400/20"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Message via Email</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
