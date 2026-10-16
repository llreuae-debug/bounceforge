import React, { useMemo, useState } from 'react';
import { useAuthStore } from '../../auth/useAuthStore';
import { useStudioStore } from '../../store/useStudioStore';
import { X, Mail, Lock, User, Sparkles, CheckCircle2, ExternalLink, MoreHorizontal } from 'lucide-react';
import { detectInAppBrowser, openInExternalBrowser } from '../../platform/inAppBrowser';
import { copyText } from '../../platform/clipboard';
import { useModalBehavior } from '../../platform/useModalBehavior';

// Dev-only admin shortcut. Never compiled into production builds.
const SHOW_DEV_ADMIN_BYPASS = import.meta.env.DEV;

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

  const { showToast } = useStudioStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [showIosHelp, setShowIosHelp] = useState(false);

  const inApp = useMemo(() => detectInAppBrowser(), []);
  const sheetRef = useModalBehavior<HTMLDivElement>(isAuthModalOpen, closeAuthModal);

  if (!isAuthModalOpen) return null;

  const finishLogin = (msg: string) => {
    showToast(msg);
    closeAuthModal();
    // Return to exactly where the user was. postLoginRedirect is only set
    // when a gated action (checkout/export) explicitly asked for a new page.
    if (postLoginRedirect && postLoginRedirect !== window.location.pathname + window.location.search) {
      window.location.href = postLoginRedirect;
    }
  };

  const handleGoogle = async () => {
    if (inApp.isInApp) {
      // Google blocks OAuth in embedded webviews; don't send users into an error page.
      setFieldErrors({ form: `google login is blocked inside ${inApp.label}. open in ur browser, or use email below.` });
      return;
    }
    setIsSubmitting(true);
    setFieldErrors({});
    try {
      await loginWithGoogle();
      finishLogin('welcome back! signed in with google.');
    } catch (err: any) {
      setFieldErrors({ form: err.message || 'google sign in failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenInBrowser = async () => {
    const attempted = openInExternalBrowser(window.location.href);
    if (!attempted) {
      // iOS: no programmatic escape. Copy the link and show instructions.
      const ok = await copyText(window.location.href);
      setShowIosHelp(true);
      if (ok) showToast('link copied — paste it in safari if needed');
    }
  };

  const validate = (): boolean => {
    const errs: typeof fieldErrors = {};
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) errs.email = 'enter a valid email address';
    if (authModalMode !== 'magic_link') {
      if (!password) errs.password = 'enter your password';
      else if (authModalMode === 'signup' && password.length < 8) errs.password = 'use at least 8 characters';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);

    try {
      if (authModalMode === 'magic_link') {
        await loginWithMagicLink(email);
        setMagicLinkSent(true);
        showToast('magic login link sent to your inbox!');
      } else if (authModalMode === 'signup') {
        await signupWithEmail(email, password, fullName);
        finishLogin('account created! welcome to bounceforge.');
      } else {
        await loginWithEmail(email, password);
        finishLogin('welcome back!');
      }
    } catch (err: any) {
      setFieldErrors({ form: err.message || 'authentication failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls = (hasErr?: boolean) =>
    `w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border text-base text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 ${
      hasErr ? 'border-rose-400/70' : 'border-white/10'
    }`;

  const title =
    authModalMode === 'signup' ? 'Create Your Account' : authModalMode === 'magic_link' ? 'Passwordless Login' : 'Sign In to BounceForge';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none"
      onClick={(e) => e.target === e.currentTarget && closeAuthModal()}
    >
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="relative w-full sm:max-w-md max-h-[92dvh] overflow-y-auto overscroll-contain bg-[#0e121a] border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black space-y-5"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        {/* Mobile grab handle (swipe down to close) */}
        <div className="sm:hidden mx-auto -mt-2 mb-1 h-1.5 w-12 rounded-full bg-white/20" aria-hidden="true" />

        <button
          onClick={closeAuthModal}
          aria-label="Close"
          className="no-3d absolute top-4 right-4 w-11 h-11 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-mono text-cyan-300 uppercase tracking-widest font-bold">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            BOUNCEFORGE ACCOUNTS
          </div>
          <h2 id="auth-modal-title" className="text-2xl font-black text-white uppercase tracking-tight">
            {title}
          </h2>
          <p className="text-sm text-slate-300">
            {authModalMode === 'signup'
              ? 'Unlock physics simulations, 4K rendering, and creator tools.'
              : 'Continue your video creation workflow where you left off.'}
          </p>
        </div>

        {/* In-app browser banner (TikTok / Instagram / Facebook / etc.) */}
        {inApp.isInApp && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-400/40 space-y-3" role="status">
            <p className="text-sm font-bold text-amber-200">open in ur browser for google login</p>
            <p className="text-xs text-amber-100/80 leading-relaxed">
              {inApp.label}'s built-in browser blocks google sign-in. email + password and magic link still work right here.
            </p>
            <button
              onClick={handleOpenInBrowser}
              className="no-3d w-full min-h-11 px-4 rounded-xl bg-amber-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
              {inApp.isAndroid ? 'open in chrome' : 'open in browser'}
            </button>
            {(showIosHelp || inApp.isIOS) && !inApp.isAndroid && (
              <div className="flex items-start gap-2 text-xs text-amber-100/90">
                <MoreHorizontal className="w-4 h-4 shrink-0 mt-0.5 animate-bounce" aria-hidden="true" />
                <span>
                  tap the <strong>•••</strong> (or share) button in the {inApp.label} corner, then choose <strong>"open in browser"</strong> /{' '}
                  <strong>"open in safari"</strong>.
                </span>
              </div>
            )}
          </div>
        )}

        {fieldErrors.form && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-200 text-sm text-center font-medium" role="alert">
            {fieldErrors.form}
          </div>
        )}

        {/* Continue with Google — disabled-looking + explained inside in-app browsers */}
        <button
          onClick={handleGoogle}
          disabled={isSubmitting}
          aria-describedby={inApp.isInApp ? 'google-blocked-note' : undefined}
          className={`no-3d w-full min-h-12 px-4 rounded-xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-3 transition-all cursor-pointer disabled:opacity-50 ${
            inApp.isInApp ? 'bg-white/10 text-slate-300 border border-white/15' : 'bg-white hover:bg-slate-100 text-black shadow-lg shadow-white/5'
          }`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
          </svg>
          <span>Continue with Google</span>
        </button>
        {inApp.isInApp && (
          <p id="google-blocked-note" className="text-[11px] text-center text-slate-400 -mt-2">
            needs a real browser (chrome / safari)
          </p>
        )}

        <div className="relative flex items-center justify-center" aria-hidden="true">
          <div className="border-t border-white/10 w-full" />
          <span className="absolute bg-[#0e121a] px-3 text-[11px] uppercase font-mono text-slate-400 tracking-wider">OR WITH EMAIL</span>
        </div>

        {magicLinkSent ? (
          <div className="p-5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-center space-y-2" role="status">
            <CheckCircle2 className="w-8 h-8 text-cyan-300 mx-auto" aria-hidden="true" />
            <h3 className="text-sm font-bold text-white">Check Your Email</h3>
            <p className="text-sm text-slate-300">
              We sent a sign-in link to <strong className="text-white">{email}</strong>. You can open it on any device or browser — it will log you in
              there.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {authModalMode === 'signup' && (
              <div className="space-y-1">
                <label htmlFor="auth-name" className="text-xs font-bold text-slate-200">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
                  <input
                    id="auth-name"
                    type="text"
                    name="name"
                    autoComplete="name"
                    enterKeyHint="next"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Alex Vance"
                    className={inputCls()}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="auth-email" className="text-xs font-bold text-slate-200">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  id="auth-email"
                  type="email"
                  name="email"
                  inputMode="email"
                  autoComplete={authModalMode === 'signup' ? 'email' : 'username'}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint={authModalMode === 'magic_link' ? 'send' : 'next'}
                  required
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? 'auth-email-err' : undefined}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="creator@bounceforge.studio"
                  className={inputCls(!!fieldErrors.email)}
                />
              </div>
              {fieldErrors.email && (
                <p id="auth-email-err" className="text-xs text-rose-300" role="alert">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {authModalMode !== 'magic_link' && (
              <div className="space-y-1">
                <label htmlFor="auth-password" className="text-xs font-bold text-slate-200">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
                  <input
                    id="auth-password"
                    type="password"
                    name="password"
                    autoComplete={authModalMode === 'signup' ? 'new-password' : 'current-password'}
                    enterKeyHint="go"
                    required
                    minLength={authModalMode === 'signup' ? 8 : undefined}
                    aria-invalid={!!fieldErrors.password}
                    aria-describedby={fieldErrors.password ? 'auth-password-err' : undefined}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className={inputCls(!!fieldErrors.password)}
                  />
                </div>
                {fieldErrors.password && (
                  <p id="auth-password-err" className="text-xs text-rose-300" role="alert">
                    {fieldErrors.password}
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="no-3d w-full min-h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
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

        <div className="pt-1 text-center space-y-2 text-sm text-slate-300">
          {authModalMode === 'login' ? (
            <>
              <div>
                Don't have an account?{' '}
                <button
                  onClick={() => openAuthModal('signup', postLoginRedirect || undefined)}
                  className="no-3d min-h-11 px-1 text-cyan-300 font-bold underline-offset-2 hover:underline cursor-pointer"
                >
                  Sign Up Free
                </button>
              </div>
              <button
                onClick={() => openAuthModal('magic_link', postLoginRedirect || undefined)}
                className="no-3d min-h-11 px-2 text-slate-300 hover:text-white underline cursor-pointer text-sm"
              >
                email me a magic link
              </button>
            </>
          ) : authModalMode === 'signup' ? (
            <div>
              Already have an account?{' '}
              <button
                onClick={() => openAuthModal('login', postLoginRedirect || undefined)}
                className="no-3d min-h-11 px-1 text-cyan-300 font-bold hover:underline cursor-pointer"
              >
                Sign In
              </button>
            </div>
          ) : (
            <div>
              Back to{' '}
              <button
                onClick={() => openAuthModal('login', postLoginRedirect || undefined)}
                className="no-3d min-h-11 px-1 text-cyan-300 font-bold hover:underline cursor-pointer"
              >
                Password Sign In
              </button>
            </div>
          )}

          {SHOW_DEV_ADMIN_BYPASS && (
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
              <span>Local dev only:</span>
              <button
                onClick={() => {
                  switchToAdmin();
                  showToast('Switched to dev admin account');
                }}
                className="no-3d min-h-9 px-2 rounded bg-purple-500/20 text-purple-200 border border-purple-500/30 font-mono hover:bg-purple-500/30 cursor-pointer"
              >
                Log in as Admin
              </button>
            </div>
          )}
        </div>

        <p className="text-xs text-center text-slate-400">
          By continuing, you agree to our{' '}
          <a href="/terms" className="underline hover:text-white">
            Terms
          </a>{' '}
          and{' '}
          <a href="/privacy" className="underline hover:text-white">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
};
