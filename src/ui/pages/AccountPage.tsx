import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../auth/useAuthStore';
import { useBillingStore } from '../../billing/billingStore';
import { useStudioStore } from '../../store/useStudioStore';
import { entitlements } from '../../billing/entitlements';
import { affiliateService } from '../../affiliates/affiliateService';
import { AffiliateProfile, PayoutMethod } from '../../affiliates/types';
import { Header } from '../Header';
import { Footer } from '../Footer';
import {
  User,
  CreditCard,
  Share2,
  Shield,
  Key,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  Zap,
  DollarSign,
  QrCode,
  Sparkles,
  ArrowRight,
  Clock,
  LogOut,
  AlertTriangle,
} from 'lucide-react';

export const AccountPage: React.FC = () => {
  const { currentUser, logout, updateCurrentUser, deleteCurrentUserAccount, openAuthModal } = useAuthStore();
  const { startCheckout, formatPrice } = useBillingStore();
  const { showToast, setRoute } = useStudioStore();

  const [activeTab, setActiveTab] = useState<'profile' | 'billing' | 'affiliate' | 'security'>('profile');

  // Profile Form
  const [name, setName] = useState(currentUser?.fullName || '');
  const [email, setEmail] = useState(currentUser?.email || '');

  // Affiliate State
  const [affiliateProfile, setAffiliateProfile] = useState<AffiliateProfile | null>(null);
  const [customCodeInput, setCustomCodeInput] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>('paypal');
  const [payoutAccountInput, setPayoutAccountInput] = useState('');
  const [payoutAmount, setPayoutAmount] = useState(50);
  const [showQrModal, setShowQrModal] = useState(false);

  // Security Form
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.fullName);
      setEmail(currentUser.email);
      const prof = affiliateService.getOrCreateProfile(currentUser.id, currentUser.email);
      setAffiliateProfile(prof);
      setCustomCodeInput(prof.customCode || prof.code);
    }
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#07090f] text-slate-100 flex flex-col font-sans select-none">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
          <User className="w-12 h-12 text-slate-500" />
          <h2 className="text-2xl font-black text-white uppercase">Please Sign In</h2>
          <p className="text-xs text-slate-400">You must be logged in to access your account dashboard.</p>
          <button
            onClick={() => openAuthModal('login', '/account')}
            className="btn-3d-lime px-6 py-3 rounded-xl text-black font-black text-xs uppercase"
          >
            Log In Now
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  const userEntitlements = entitlements.getEntitlements(currentUser.id);
  const referralUrl = `${window.location.origin}/r/${affiliateProfile?.customCode || affiliateProfile?.code || ''}`;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateCurrentUser({ fullName: name });
    showToast('Profile updated successfully!');
  };

  const handleUpdateReferralCode = () => {
    try {
      const updated = affiliateService.updateCustomCode(currentUser.id, customCodeInput);
      setAffiliateProfile(updated);
      showToast('Custom referral link updated!');
    } catch (err: any) {
      showToast(err.message || 'Failed to update code');
    }
  };

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopiedLink(true);
    showToast('Referral link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSavePayoutDetails = () => {
    if (!payoutAccountInput) return;
    try {
      const updated = affiliateService.savePayoutDetails(currentUser.id, payoutMethod, payoutAccountInput);
      setAffiliateProfile(updated);
      setPayoutAccountInput('');
      showToast('Payout account details saved!');
    } catch (err: any) {
      showToast(err.message || 'Error saving payout details');
    }
  };

  const handleRequestPayout = () => {
    try {
      affiliateService.requestPayout(currentUser.id, payoutAmount, currentUser.email);
      const prof = affiliateService.getOrCreateProfile(currentUser.id, currentUser.email);
      setAffiliateProfile(prof);
      showToast(`Payout request for $${payoutAmount.toFixed(2)} submitted successfully!`);
    } catch (err: any) {
      showToast(err.message || 'Payout request failed');
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await deleteCurrentUserAccount();
    showToast('Your account has been deleted.');
    setRoute('landing');
  };

  return (
    <div className="min-h-screen bg-[#07090f] text-slate-100 flex flex-col font-sans select-none">
      <Header />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-8 w-full">
        {/* User Card Header */}
        <div className="p-6 rounded-3xl bg-[#0e121a] border border-white/10 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 shadow-2xl">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.fullName}
              className="w-16 h-16 rounded-2xl border-2 border-white/20 object-cover"
            />
            <div className="space-y-1">
              <h1 className="text-xl font-black text-white">{currentUser.fullName}</h1>
              <p className="text-xs text-slate-400 font-mono">{currentUser.email}</p>
              <div className="flex items-center gap-2 pt-1 justify-center sm:justify-start">
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold uppercase tracking-wider">
                  {userEntitlements.planId.replace('_', ' ')}
                </span>
                {currentUser.role === 'admin' && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold uppercase tracking-wider">
                    MASTER ADMIN
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentUser.role === 'admin' && (
              <button
                onClick={() => (window.location.href = '/admin')}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-purple-600/20"
              >
                Admin Panel
              </button>
            )}
            <button
              onClick={() => {
                logout();
                showToast('Signed out of session');
                setRoute('landing');
              }}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/10 space-x-2 text-xs font-bold overflow-x-auto pb-1">
          {[
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'billing', label: 'Plan & Billing', icon: CreditCard },
            { id: 'affiliate', label: 'Affiliate Program (30%)', icon: DollarSign },
            { id: 'security', label: 'Security & Delete', icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-cyan-500/20 text-cyan-300 border-b-2 border-cyan-400 font-extrabold'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: PROFILE */}
        {activeTab === 'profile' && (
          <div className="p-6 rounded-3xl bg-[#0e121a] border border-white/10 space-y-6 max-w-2xl">
            <h3 className="text-base font-bold text-white uppercase">Profile Information</h3>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Email Address (Read-Only)</label>
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-slate-500 cursor-not-allowed"
                />
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Save Profile
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: BILLING & ENTITLEMENTS */}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-[#0e121a] border border-white/10 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-white uppercase">Current Subscription</h3>
                  <p className="text-xs text-slate-400">
                    Active Plan:{' '}
                    <strong className="text-cyan-400 font-bold uppercase">
                      {userEntitlements.planId.replace('_', ' ')}
                    </strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => (window.location.href = '/pricing')}
                    className="px-5 py-2.5 rounded-xl bg-[#00e599] hover:bg-[#05fca8] text-black font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-[#00e599]/20"
                  >
                    Change Plan
                  </button>
                  <button
                    onClick={() => showToast('Opening Customer Billing Portal...')}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Manage Billing Portal
                  </button>
                </div>
              </div>

              {/* Usage Meters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10">
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-xs text-slate-400">Auto-Searches Today</span>
                  <div className="text-2xl font-black text-white">
                    {userEntitlements.autoSearchesUsedToday || 0}{' '}
                    <span className="text-xs text-slate-400 font-normal">
                      / {userEntitlements.planId === 'creator_pro' ? 'Unlimited' : userEntitlements.planId === 'gamer_pack' ? '5' : '1'}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-xs text-slate-400">Total 4K Exports</span>
                  <div className="text-2xl font-black text-cyan-400">
                    {userEntitlements.exportCountTotal || 0}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-xs text-slate-400">Access Expiration</span>
                  <div className="text-sm font-bold text-white flex items-center gap-1.5 pt-1">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span>{new Date(userEntitlements.periodEnd).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: AFFILIATE PROGRAM (30%) */}
        {activeTab === 'affiliate' && affiliateProfile && (
          <div className="space-y-6">
            {/* Banner */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/20 via-[#14151e] to-purple-500/20 border border-amber-500/30 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-lg">
                  $
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase">Your Creator Referral Link</h3>
                  <p className="text-xs text-slate-300">
                    Earn a <strong className="text-amber-400">30% recurring commission</strong> on every paid customer you refer.
                  </p>
                </div>
              </div>

              {/* Referral Link Bar */}
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="w-full flex items-center px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-cyan-300 overflow-x-auto">
                  {referralUrl}
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleCopyReferral}
                    className="flex-1 sm:flex-none px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/20"
                  >
                    {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={() => setShowQrModal(true)}
                    className="px-3.5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                    title="View QR Code"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Custom Code Editor */}
              <div className="flex items-center gap-2 pt-1 text-xs">
                <span className="text-slate-400">Customize referral slug:</span>
                <input
                  type="text"
                  value={customCodeInput}
                  onChange={(e) => setCustomCodeInput(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white font-mono text-xs w-32"
                />
                <button
                  onClick={handleUpdateReferralCode}
                  className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>

            {/* Performance Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-[#0e121a] border border-white/10 space-y-1">
                <span className="text-[11px] text-slate-400 font-bold uppercase">Total Clicks</span>
                <div className="text-2xl font-black text-white">{affiliateProfile.totalClicks}</div>
              </div>
              <div className="p-4 rounded-2xl bg-[#0e121a] border border-white/10 space-y-1">
                <span className="text-[11px] text-slate-400 font-bold uppercase">Paying Customers</span>
                <div className="text-2xl font-black text-cyan-400">{affiliateProfile.activePayingCustomers}</div>
              </div>
              <div className="p-4 rounded-2xl bg-[#0e121a] border border-white/10 space-y-1">
                <span className="text-[11px] text-slate-400 font-bold uppercase">Pending (30 Days)</span>
                <div className="text-2xl font-black text-amber-400">${affiliateProfile.pendingBalance.toFixed(2)}</div>
              </div>
              <div className="p-4 rounded-2xl bg-[#0e121a] border border-white/10 space-y-1">
                <span className="text-[11px] text-slate-400 font-bold uppercase">Approved Balance</span>
                <div className="text-2xl font-black text-emerald-400">${affiliateProfile.approvedBalance.toFixed(2)}</div>
              </div>
            </div>

            {/* Payout Details & Request Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Account Config */}
              <div className="p-6 rounded-3xl bg-[#0e121a] border border-white/10 space-y-4">
                <h4 className="text-sm font-bold text-white uppercase">Payout Account Method</h4>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {(['paypal', 'bank', 'payoneer'] as PayoutMethod[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => setPayoutMethod(m)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                          payoutMethod === m
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={payoutAccountInput}
                    onChange={(e) => setPayoutAccountInput(e.target.value)}
                    placeholder={
                      payoutMethod === 'paypal'
                        ? 'PayPal Email'
                        : payoutMethod === 'bank'
                        ? 'IBAN / Account Number'
                        : 'Payoneer Email'
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />

                  {affiliateProfile.payoutAccountMasked && (
                    <p className="text-[11px] text-slate-400">
                      Saved Account:{' '}
                      <strong className="text-white font-mono">{affiliateProfile.payoutAccountMasked}</strong>
                    </p>
                  )}

                  <button
                    onClick={handleSavePayoutDetails}
                    className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Save Payout Details
                  </button>
                </div>
              </div>

              {/* Request Payout */}
              <div className="p-6 rounded-3xl bg-[#0e121a] border border-white/10 space-y-4">
                <h4 className="text-sm font-bold text-white uppercase">Request Payout</h4>
                <p className="text-xs text-slate-400">
                  Minimum withdrawal threshold is <strong>$50.00</strong>. Payouts are reviewed and dispatched within 48 business hours.
                </p>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs">
                    <span className="text-slate-400">Available to withdraw:</span>
                    <span className="text-base font-black text-emerald-400">
                      ${affiliateProfile.approvedBalance.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">$</span>
                    <input
                      type="number"
                      min={50}
                      step={5}
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white"
                    />
                  </div>

                  <button
                    onClick={handleRequestPayout}
                    disabled={affiliateProfile.approvedBalance < 50}
                    className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Request Payout
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SECURITY & DELETE */}
        {activeTab === 'security' && (
          <div className="space-y-6 max-w-2xl">
            <div className="p-6 rounded-3xl bg-[#0e121a] border border-white/10 space-y-4">
              <h3 className="text-base font-bold text-white uppercase">Change Password</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  showToast('Password updated successfully!');
                  setCurrentPass('');
                  setNewPass('');
                }}
                className="space-y-3"
              >
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Current Password</label>
                  <input
                    type="password"
                    value={currentPass}
                    onChange={(e) => setCurrentPass(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">New Password</label>
                  <input
                    type="password"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Update Password
                </button>
              </form>
            </div>

            {/* Delete Account */}
            <div className="p-6 rounded-3xl bg-rose-500/10 border border-rose-500/20 space-y-4">
              <div className="flex items-center gap-3 text-rose-400">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h3 className="text-base font-bold uppercase">Danger Zone: Delete Account</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Permanently delete your BounceForge account, saved presets, and referral stats. Anonymized transaction records required by financial tax regulations will be preserved.
              </p>
              <button
                onClick={handleDeleteAccount}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                {confirmDelete ? 'Click Again to Confirm Deletion' : 'Delete Account'}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="p-6 rounded-3xl bg-[#0e121a] border border-white/10 text-center space-y-4 max-w-xs w-full">
            <h4 className="text-sm font-bold text-white uppercase">Your Referral QR Code</h4>
            <div className="p-4 bg-white rounded-2xl inline-block">
              {/* Simulated QR Code SVG */}
              <svg className="w-40 h-40" viewBox="0 0 100 100">
                <rect width="100" height="100" fill="white" />
                <rect x="10" y="10" width="30" height="30" fill="black" />
                <rect x="15" y="15" width="20" height="20" fill="white" />
                <rect x="20" y="20" width="10" height="10" fill="black" />
                <rect x="60" y="10" width="30" height="30" fill="black" />
                <rect x="65" y="15" width="20" height="20" fill="white" />
                <rect x="70" y="20" width="10" height="10" fill="black" />
                <rect x="10" y="60" width="30" height="30" fill="black" />
                <rect x="15" y="65" width="20" height="20" fill="white" />
                <rect x="20" y="70" width="10" height="10" fill="black" />
                <rect x="50" y="50" width="10" height="10" fill="black" />
                <rect x="70" y="60" width="20" height="20" fill="black" />
              </svg>
            </div>
            <p className="text-[11px] text-slate-400 font-mono break-all">{referralUrl}</p>
            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};
