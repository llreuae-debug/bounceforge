import React, { useState } from 'react';
import { useAuthStore } from '../../auth/useAuthStore';
import { useStudioStore } from '../../store/useStudioStore';
import { X, Mail, Lock, User, Sparkles, ArrowRight, CheckCircle2, Shield } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    authModalMode,
    openAuthModal,
    closeAuthModal,
    loginWithGoogle,
    loginWithEmail,
    signupWithEmail,
    loginWithMagicLink,
    switchToAdmin,
    postLoginRedirect,
  } = useAuthStore();

  const { showToast, setRoute } = useStudioStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isAuthModalOpen) return null;

  const handleGoogle = async () => {
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await loginWithGoogle();
      showToast('Welcome back! Signed in with Google.');
      closeAuthModal();
      if (postLoginRedirect) {
        window.location.href = postLoginRedirect;
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Google sign in failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      if (authModalMode === 'magic_link') {
        if (!email) throw new Error('Please enter your email address.');
        await loginWithMagicLink(email);
        setMagicLinkSent(true);
        showToast('Magic login link sent to your inbox!');
      } else if (authModalMode === 'signup') {
        if (!email || !password) throw new Error('Please fill in email and password.');
        await signupWithEmail(email, password, fullName);
        showToast('Account created successfully! Welcome to BounceForge.');
        closeAuthModal();
        if (postLoginRedirect) window.location.href = postLoginRedirect;
      } else {
        if (!email || !password) throw new Error('Please enter your email and password.');
        await loginWithEmail(email, password);
        showToast('Welcome back!');
        closeAuthModal();
        if (postLoginRedirect) window.location.href = postLoginRedirect;
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-md bg-[#0e121a] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black space-y-6">
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            BOUNCEFORGE ACCOUNTS
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">
            {authModalMode === 'signup'
              ? 'Create Your Account'
              : authModalMode === 'magic_link'
              ? 'Passwordless Login'
              : 'Sign In to BounceForge'}
          </h2>
          <p className="text-xs text-slate-400">
            {authModalMode === 'signup'
              ? 'Unlock physics simulations, 4K rendering, and creator tools.'
              : 'Continue your video creation workflow where you left off.'}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center font-medium">
            {errorMsg}
          </div>
        )}

        {/* 1. Continue with Google (One Tap) */}
        <button
          onClick={handleGoogle}
          disabled={isSubmitting}
          className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-3 transition-all shadow-lg shadow-white/5 cursor-pointer disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-white/10 w-full" />
          <span className="bg-[#0e121a] px-3 text-[10px] uppercase font-mono text-slate-500 tracking-wider">
            OR WITH EMAIL
          </span>
        </div>

        {magicLinkSent ? (
          <div className="p-5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-cyan-400 mx-auto" />
            <h4 className="text-sm font-bold text-white">Check Your Email</h4>
            <p className="text-xs text-slate-300">
              We sent a magic sign-in link to <strong className="text-white">{email}</strong>. Click the link to log in instantly.
            </p>
          </div>
        ) : (
          /* Form for Email / Password / Magic Link */
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {authModalMode === 'signup' && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Alex Vance"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="creator@bounceforge.studio"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {authModalMode !== 'magic_link' && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting
                ? 'Processing...'
                : authModalMode === 'signup'
                ? 'Create Free Account'
                : authModalMode === 'magic_link'
                ? 'Email Me Magic Link'
                : 'Sign In'}
            </button>
          </form>
        )}

        {/* Alternate Mode Toggles */}
        <div className="pt-2 text-center space-y-2 text-xs text-slate-400">
          {authModalMode === 'login' ? (
            <>
              <div>
                Don't have an account?{' '}
                <button
                  onClick={() => openAuthModal('signup', postLoginRedirect || undefined)}
                  className="text-cyan-400 font-bold hover:underline cursor-pointer"
                >
                  Sign Up Free
                </button>
              </div>
              <div>
                <button
                  onClick={() => openAuthModal('magic_link', postLoginRedirect || undefined)}
                  className="text-slate-400 hover:text-white underline cursor-pointer text-[11px]"
                >
                  Passwordless Magic Link
                </button>
              </div>
            </>
          ) : authModalMode === 'signup' ? (
            <div>
              Already have an account?{' '}
              <button
                onClick={() => openAuthModal('login', postLoginRedirect || undefined)}
                className="text-cyan-400 font-bold hover:underline cursor-pointer"
              >
                Sign In
              </button>
            </div>
          ) : (
            <div>
              Back to{' '}
              <button
                onClick={() => openAuthModal('login', postLoginRedirect || undefined)}
                className="text-cyan-400 font-bold hover:underline cursor-pointer"
              >
                Password Sign In
              </button>
            </div>
          )}

          {/* Quick Admin Test Switch */}
          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500">
            <span>Dev Admin Bypass:</span>
            <button
              onClick={() => {
                switchToAdmin();
                showToast('Switched to Master Admin Account!');
              }}
              className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono hover:bg-purple-500/30 cursor-pointer"
            >
              Log in as Admin
            </button>
          </div>
        </div>

        {/* Legal links under buttons */}
        <div className="text-[10px] text-center text-slate-500 space-x-2">
          <span>By continuing, you agree to our</span>
          <a href="/terms" className="underline hover:text-slate-400">
            Terms
          </a>
          <span>and</span>
          <a href="/privacy" className="underline hover:text-slate-400">
            Privacy Policy
          </a>
        </div>
      </div>
    </div>
  );
};
