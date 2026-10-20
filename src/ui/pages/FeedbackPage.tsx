import React, { useState, useRef } from 'react';
import { Header } from '../Header';
import { Footer } from '../Footer';
import { useStudioStore } from '../../store/useStudioStore';
import { feedbackService, FeedbackType } from '../../feedback/feedbackService';
import {
  MessageSquare,
  Bug,
  Lightbulb,
  HelpCircle,
  Upload,
  CheckCircle2,
  Send,
  X,
} from 'lucide-react';
import { triggerHaptic } from '../../platform/haptics';

export const FeedbackPage: React.FC = () => {
  const { showToast } = useStudioStore();

  const [type, setType] = useState<FeedbackType>('idea');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Screenshot must be under 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setScreenshotUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      showToast('Please enter your feedback message');
      return;
    }

    setIsSubmitting(true);
    try {
      await feedbackService.submitFeedback({
        type,
        message: message.trim(),
        email: email.trim() || undefined,
        screenshotUrl: screenshotUrl || undefined,
      });

      triggerHaptic(20);
      setSubmitted(true);
      showToast('Thank you! Feedback received.');
    } catch {
      showToast('Failed to submit feedback. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setMessage('');
    setEmail('');
    setScreenshotUrl(null);
    setSubmitted(false);
  };

  return (
    <div className="min-h-screen bg-[#050608] text-white flex flex-col font-sans select-none">
      <Header />

      <main className="flex-1 max-w-2xl mx-auto px-6 py-14 space-y-8 w-full">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono text-cyan-300 uppercase tracking-widest">
            <MessageSquare className="w-3.5 h-3.5" />
            Direct to Engineering Team
          </div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white">
            Feedback &amp; Suggestions
          </h1>
          <p className="text-xs text-slate-400">
            Have an idea for a new simulation mode, spotted a physics glitch, or have questions? Tell us below.
          </p>
        </div>

        {submitted ? (
          <div className="p-8 rounded-3xl bg-white/[0.03] border border-cyan-500/30 text-center space-y-4 animate-fadeIn">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
            </div>
            <h2 className="text-xl font-extrabold text-white">Feedback Logged Successfully</h2>
            <p className="text-xs text-slate-300 max-w-sm mx-auto">
              Your note has been submitted to the BounceForge engineering dashboard. If you provided an email, our team may follow up with updates.
            </p>
            <button
              onClick={handleResetForm}
              className="btn-3d-cyan px-5 py-2.5 rounded-xl text-black font-extrabold text-xs uppercase tracking-wide inline-flex items-center gap-2 shadow-md shadow-cyan-500/20"
            >
              <span>Submit Another Note</span>
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="p-6 sm:p-8 rounded-3xl bg-white/[0.03] border border-white/10 space-y-5 shadow-2xl"
          >
            {/* Feedback Type Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                Feedback Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'bug' as FeedbackType, label: 'Bug Report', icon: Bug, color: 'text-red-400' },
                  { id: 'idea' as FeedbackType, label: 'Mode Idea', icon: Lightbulb, color: 'text-amber-400' },
                  { id: 'other' as FeedbackType, label: 'Other', icon: HelpCircle, color: 'text-cyan-400' },
                ].map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => setType(t.id)}
                      className={`py-2.5 px-3 rounded-2xl border text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all ${
                        type === t.id
                          ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-md shadow-cyan-500/20'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${t.color}`} />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Message Area */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                Your Message / Suggestion <span className="text-cyan-400">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your suggestion, physics request, or describe what happened..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400 resize-none transition-colors"
              />
            </div>

            {/* Optional Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                Email Address <span className="text-slate-500 text-[10px] lowercase font-normal">(optional, for replies)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="creator@studio.com"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400 transition-colors"
              />
            </div>

            {/* Optional Screenshot */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                Attach Screenshot <span className="text-slate-500 text-[10px] lowercase font-normal">(optional, max 5MB)</span>
              </label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleScreenshotChange}
                className="hidden"
              />
              {screenshotUrl ? (
                <div className="relative w-36 h-24 rounded-2xl overflow-hidden border border-cyan-400 shadow-md">
                  <img src={screenshotUrl} alt="Screenshot preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setScreenshotUrl(null)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white hover:bg-black"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-3d-glass py-2 px-4 rounded-xl text-xs font-bold text-slate-300 hover:text-white inline-flex items-center gap-2"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose Image...</span>
                </button>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-3d-lime w-full py-3 rounded-2xl text-black font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-lg shadow-lime-500/20"
            >
              <Send className="w-3.5 h-3.5 text-black" />
              <span>{isSubmitting ? 'Sending Note...' : 'Send Feedback'}</span>
            </button>
          </form>
        )}
      </main>

      <Footer />
    </div>
  );
};
