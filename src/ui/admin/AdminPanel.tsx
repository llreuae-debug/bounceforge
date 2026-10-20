import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../auth/useAuthStore';
import { useBillingStore } from '../../billing/billingStore';
import { useContentStore } from '../../content/contentStore';
import { useStudioStore } from '../../store/useStudioStore';
import { authService } from '../../auth/authService';
import { UserProfile, AuditLogEntry } from '../../auth/types';
import { affiliateService } from '../../affiliates/affiliateService';
import { AffiliateProfile, PayoutRequest } from '../../affiliates/types';
import { feedbackService, FeedbackItem } from '../../feedback/feedbackService';
import { showcaseService, ShowcaseItem } from '../../showcase/showcaseService';
import {
  Users,
  CreditCard,
  DollarSign,
  FileText,
  Settings,
  Shield,
  Activity,
  Search,
  Plus,
  RefreshCw,
  Download,
  Lock,
  Sparkles,
  Trash2,
  Eye,
  Key,
  X,
  MessageSquare,
  Film,
  Languages,
} from 'lucide-react';
import { PlanId } from '../../billing/types';
import { entitlements } from '../../billing/entitlements';
import { TranslationManager } from './TranslationManager';

export const AdminPanel: React.FC = () => {
  const { currentUser, isAdmin } = useAuthStore();
  const {
    pricingConfig,
    updatePricingConfig,
    coupons,
    createCoupon,
    deleteCoupon,
    activeProviderId,
    setActiveProvider,
  } = useBillingStore();
  const { articles, createArticle, deleteArticle } = useContentStore();
  const { showToast, setRoute } = useStudioStore();

  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'members' | 'pricing' | 'coupons' | 'affiliates' | 'content' | 'feedback' | 'showcase' | 'settings' | 'audit' | 'translations'
  >('dashboard');

  // Feedback & Showcase CMS state
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [showcaseList, setShowcaseList] = useState<ShowcaseItem[]>([]);
  const [newShowcaseTitle, setNewShowcaseTitle] = useState('');
  const [newShowcaseMode, setNewShowcaseMode] = useState('sequence_break');
  const [newShowcaseSeed, setNewShowcaseSeed] = useState(42069);
  const [newShowcaseVideoUrl, setNewShowcaseVideoUrl] = useState('');
  const [newShowcasePosterUrl, setNewShowcasePosterUrl] = useState('');
  const [newShowcaseSound, setNewShowcaseSound] = useState('Numbered Impact ASMR');
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

  // 2FA TOTP verification state
  const [totpVerified, setTotpVerified] = useState(false);
  const [totpCode, setTotpCode] = useState('');

  // Members state
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // New Member Modal State
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberPlan, setNewMemberPlan] = useState<PlanId>('creator_pro');

  // Affiliates state
  const [affiliatesList, setAffiliatesList] = useState<AffiliateProfile[]>([]);
  const [payoutsList, setPayoutsList] = useState<PayoutRequest[]>([]);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // Pricing Form State
  const [gamerPrice, setGamerPrice] = useState(pricingConfig.gamerPack.price);
  const [creatorPrice, setCreatorPrice] = useState(pricingConfig.creatorPro.monthlyPrice);
  const [sixMoDiscount, setSixMoDiscount] = useState(pricingConfig.creatorPro.sixMonthDiscountPercent);
  const [twelveMoDiscount, setTwelveMoDiscount] = useState(pricingConfig.creatorPro.twelveMonthDiscountPercent);

  // Coupon Form State
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState(20);

  // Maintenance mode
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  useEffect(() => {
    setUsersList(authService.getAllUsers());
    setAffiliatesList(affiliateService.getAllAffiliates());
    setPayoutsList(affiliateService.getAllPayouts());
    setAuditLogs(authService.getAuditLogs());
    feedbackService.getFeedback().then(setFeedbackList);
    showcaseService.getShowcaseItems().then(setShowcaseList);
  }, []);

  // Access check
  if (!currentUser || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#07090f] text-slate-100 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-black text-white uppercase">403 Access Denied</h1>
        <p className="text-xs text-slate-400 max-w-md">
          The BounceForge Admin Console is restricted to verified administrators and support staff.
        </p>
        <button
          onClick={() => setRoute('landing')}
          className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase"
        >
          Return to App
        </button>
      </div>
    );
  }

  // 2FA Prompt
  if (!totpVerified) {
    return (
      <div className="min-h-screen bg-[#07090f] text-slate-100 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-full max-w-sm bg-[#0e121a] border border-purple-500/30 rounded-3xl p-8 space-y-6 shadow-2xl shadow-purple-500/10">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
            <Key className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-black text-white uppercase">Admin 2FA Security</h2>
            <p className="text-xs text-slate-400">
              Enter your 6-digit Authenticator TOTP code to enter the command console.
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setTotpVerified(true);
              showToast('Admin TOTP identity verified.');
            }}
            className="space-y-4"
          >
            <input
              id="admin-totp-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              maxLength={6}
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              aria-label="6-digit two-factor authentication code"
              className="w-full py-3 text-center tracking-[0.5em] text-lg font-mono rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-400"
            />
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-purple-600/30 cursor-pointer"
            >
              Verify &amp; Unlock Console
            </button>
          </form>
          <p className="text-[10px] text-slate-500 font-mono">Simulated master code: any 6 digits</p>
        </div>
      </div>
    );
  }

  const filteredUsers = usersList.filter(
    (u) =>
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSavePrices = () => {
    updatePricingConfig({
      gamerPack: {
        ...pricingConfig.gamerPack,
        price: gamerPrice,
      },
      creatorPro: {
        ...pricingConfig.creatorPro,
        monthlyPrice: creatorPrice,
        sixMonthDiscountPercent: sixMoDiscount,
        twelveMonthDiscountPercent: twelveMoDiscount,
      },
    });

    authService.logAction({
      adminId: currentUser.id,
      adminEmail: currentUser.email,
      action: 'UPDATE_PRICES',
      details: { gamerPrice, creatorPrice, sixMoDiscount, twelveMoDiscount },
    });

    setAuditLogs(authService.getAuditLogs());
    showToast('Plan pricing and discount rates updated live in database!');
  };

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode) return;
    createCoupon({
      code: newCouponCode.toUpperCase().trim(),
      discountPercent: newCouponDiscount,
      maxUses: 500,
      timesUsed: 0,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      active: true,
    });
    setNewCouponCode('');
    showToast(`Coupon ${newCouponCode.toUpperCase()} created successfully!`);
  };

  const handleExportCsv = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['ID,Name,Email,Role,Provider,Joined']
        .concat(
          usersList.map((u) => `${u.id},"${u.fullName}",${u.email},${u.role},${u.provider},${u.createdAt}`)
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'bounceforge_members.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Member CSV exported.');
  };

  return (
    <div className="min-h-screen bg-[#07090f] text-slate-100 flex flex-col font-sans select-none">
      {/* Top Admin Header */}
      <header className="h-16 border-b border-white/10 bg-[#0a0d14] px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 rounded-lg bg-purple-600/20 text-purple-300 border border-purple-500/30 text-xs font-mono font-bold tracking-wider">
            ADMIN CONSOLE
          </span>
          <h1 className="text-sm font-black text-white uppercase tracking-tight hidden sm:inline">
            BounceForge Operational Hub
          </h1>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={() => (window.location.href = '/pricing')}
            className="text-slate-400 hover:text-white flex items-center gap-1 font-medium"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Live Pricing Preview</span>
          </button>
          <div className="h-4 w-[1px] bg-white/10" />
          <button
            onClick={() => setRoute('studio')}
            className="px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold"
          >
            Back to Studio
          </button>
        </div>
      </header>

      {/* Main Admin Workspace */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Navigation Sidebar (Scrollable tabs on mobile/tablet, vertical sidebar on desktop) */}
        <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/10 bg-[#090c13] p-2 sm:p-3 md:p-4 shrink-0 overflow-x-auto md:overflow-x-visible">
          <div className="flex md:flex-col gap-1.5 min-w-max md:min-w-0">
            {[
              { id: 'dashboard', label: 'Dashboard', fullLabel: 'Dashboard & KPIs', icon: Activity },
              { id: 'members', label: 'Members', fullLabel: 'Members Directory', icon: Users },
              { id: 'pricing', label: 'Pricing', fullLabel: 'Plans & Pricing', icon: CreditCard },
              { id: 'coupons', label: 'Coupons', fullLabel: 'Coupons & Promos', icon: Sparkles },
              { id: 'affiliates', label: 'Affiliates', fullLabel: 'Affiliates & Payouts', icon: DollarSign },
              { id: 'content', label: 'CMS', fullLabel: 'Blog & Content CMS', icon: FileText },
              { id: 'feedback', label: 'Feedback', fullLabel: 'User Feedback & Bugs', icon: MessageSquare },
              { id: 'showcase', label: 'Showcase', fullLabel: 'Showcase Videos CMS', icon: Film },
              { id: 'settings', label: 'Settings', fullLabel: 'Payment & System', icon: Settings },
              { id: 'audit', label: 'Audit', fullLabel: 'Security Audit Log', icon: Shield },
              { id: 'translations', label: 'i18n', fullLabel: 'Translations & i18n', icon: Languages },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-3 py-2 md:px-3.5 md:py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer whitespace-nowrap min-h-[40px] ${
                    active
                      ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="hidden md:inline">{tab.fullLabel}</span>
                  <span className="md:hidden">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Admin Content Area */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6">
          {/* 1. DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-white uppercase">Operational Metrics</h2>
                <span className="text-xs text-slate-400 font-mono">Refreshed real-time</span>
              </div>

              {/* KPI Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-[#0e121a] border border-white/10 space-y-1">
                  <span className="text-[11px] text-slate-400 font-bold uppercase">Monthly Recurring Revenue</span>
                  <div className="text-3xl font-black text-emerald-400">$6,840</div>
                  <span className="text-[10px] text-emerald-500 font-bold">+28% this month</span>
                </div>

                <div className="p-5 rounded-2xl bg-[#0e121a] border border-white/10 space-y-1">
                  <span className="text-[11px] text-slate-400 font-bold uppercase">Active Creator Pro</span>
                  <div className="text-3xl font-black text-white">412</div>
                  <span className="text-[10px] text-slate-400">Total paying creators</span>
                </div>

                <div className="p-5 rounded-2xl bg-[#0e121a] border border-white/10 space-y-1">
                  <span className="text-[11px] text-slate-400 font-bold uppercase">Gamer Pack Passes</span>
                  <div className="text-3xl font-black text-blue-400">188</div>
                  <span className="text-[10px] text-blue-400">1-year personal license</span>
                </div>

                <div className="p-5 rounded-2xl bg-[#0e121a] border border-white/10 space-y-1">
                  <span className="text-[11px] text-slate-400 font-bold uppercase">Affiliate Owed</span>
                  <div className="text-3xl font-black text-amber-400">$840.00</div>
                  <span className="text-[10px] text-amber-500 font-bold">3 pending payouts</span>
                </div>
              </div>

              {/* Simulated Chart Bars */}
              <div className="p-6 rounded-3xl bg-[#0e121a] border border-white/10 space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  New Signups (Last 7 Days)
                </h3>
                <div className="h-36 flex items-end justify-between gap-2 pt-6">
                  {[45, 62, 85, 94, 110, 134, 158].map((val, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-purple-600 to-cyan-400"
                        style={{ height: `${(val / 160) * 100}%` }}
                      />
                      <span className="text-[10px] font-mono text-slate-400">Day {idx + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 2. MEMBERS TAB */}
          {activeTab === 'members' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleExportCsv}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>CSV Export</span>
                  </button>
                  <button
                    onClick={() => setShowAddMember(true)}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-purple-600/20"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Member</span>
                  </button>
                </div>
              </div>

              {/* Members Table (Desktop & Tablet) */}
              <div className="hidden sm:block rounded-2xl border border-white/10 bg-[#0e121a] overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.02] border-b border-white/10 text-slate-400 uppercase text-[10px] font-mono">
                    <tr>
                      <th className="p-3.5">User</th>
                      <th className="p-3.5">Role</th>
                      <th className="p-3.5">Plan</th>
                      <th className="p-3.5">Provider</th>
                      <th className="p-3.5">Joined</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredUsers.map((u) => {
                      const ent = entitlements.getEntitlements(u.id);
                      return (
                        <tr key={u.id} className="hover:bg-white/[0.02]">
                          <td className="p-3.5 flex items-center gap-3">
                            <img src={u.avatarUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
                            <div>
                              <div className="font-bold text-white">{u.fullName}</div>
                              <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                u.role === 'admin'
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  : 'bg-white/5 text-slate-300'
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                              {ent.planId.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono text-[11px] text-slate-400 capitalize">{u.provider}</td>
                          <td className="p-3.5 text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => {
                                setSelectedUser(u);
                                showToast(`Managing member: ${u.email}`);
                              }}
                              className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-400 font-bold cursor-pointer"
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Members Card List View (Phones < 640px) */}
              <div className="sm:hidden space-y-3">
                {filteredUsers.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">No members match your search.</div>
                ) : (
                  filteredUsers.map((u) => {
                    const ent = entitlements.getEntitlements(u.id);
                    return (
                      <div
                        key={u.id}
                        className="p-4 rounded-2xl bg-[#0e121a] border border-white/10 space-y-3"
                      >
                        <div className="flex items-center gap-3">
                          <img src={u.avatarUrl} alt="" className="w-10 h-10 rounded-xl object-cover border border-white/10" />
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-white text-sm truncate">{u.fullName}</div>
                            <div className="text-xs text-slate-400 font-mono truncate">{u.email}</div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                          <span
                            className={`px-2 py-0.5 rounded font-bold uppercase ${
                              u.role === 'admin'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : 'bg-white/5 text-slate-300'
                            }`}
                          >
                            {u.role}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 uppercase font-bold">
                            {ent.planId.replace('_', ' ')}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-white/5 text-slate-400 capitalize">
                            {u.provider}
                          </span>
                          <span className="text-slate-500 ml-auto">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUser(u);
                              showToast(`Managing member: ${u.email}`);
                            }}
                            className="w-full min-h-[44px] rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/30 text-xs font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Settings className="w-3.5 h-3.5" />
                            <span>Manage Member &amp; Plan</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* 3. PLANS & PRICING TAB */}
          {activeTab === 'pricing' && (
            <div className="space-y-6 max-w-2xl">
              <div className="p-6 rounded-3xl bg-[#0e121a] border border-white/10 space-y-4">
                <h3 className="text-base font-black text-white uppercase">Live Plan &amp; Pricing Editor</h3>
                <p className="text-xs text-slate-400">
                  Changes save directly to the pricing database and update the live pricing page immediately.
                </p>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Creator Pro Monthly Price ($)</label>
                    <input
                      type="number"
                      value={creatorPrice}
                      onChange={(e) => setCreatorPrice(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Gamer Pack One-Time Price ($)</label>
                    <input
                      type="number"
                      value={gamerPrice}
                      onChange={(e) => setGamerPrice(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">6-Month Discount (%)</label>
                    <input
                      type="number"
                      value={sixMoDiscount}
                      onChange={(e) => setSixMoDiscount(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">12-Month Discount (%)</label>
                    <input
                      type="number"
                      value={twelveMoDiscount}
                      onChange={(e) => setTwelveMoDiscount(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSavePrices}
                  className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  Save &amp; Publish Prices
                </button>
              </div>
            </div>
          )}

          {/* 4. COUPONS TAB */}
          {activeTab === 'coupons' && (
            <div className="space-y-6 max-w-3xl">
              <div className="p-6 rounded-3xl bg-[#0e121a] border border-white/10 space-y-4">
                <h3 className="text-base font-black text-white uppercase">Create Coupon Promo</h3>
                <form onSubmit={handleCreateCoupon} className="flex gap-3">
                  <input
                    type="text"
                    value={newCouponCode}
                    onChange={(e) => setNewCouponCode(e.target.value)}
                    placeholder="e.g. FLASH30"
                    className="w-48 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white font-mono uppercase"
                  />
                  <input
                    type="number"
                    min={5}
                    max={90}
                    value={newCouponDiscount}
                    onChange={(e) => setNewCouponDiscount(Number(e.target.value))}
                    className="w-24 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase"
                  >
                    Add Coupon
                  </button>
                </form>
              </div>

              {/* Coupons List */}
              <div className="rounded-2xl border border-white/10 bg-[#0e121a] overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.02] border-b border-white/10 text-slate-400 uppercase text-[10px] font-mono">
                    <tr>
                      <th className="p-3">Code</th>
                      <th className="p-3">Discount</th>
                      <th className="p-3">Usage</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {coupons.map((c) => (
                      <tr key={c.code}>
                        <td className="p-3 font-bold text-white">{c.code}</td>
                        <td className="p-3 text-emerald-400">{c.discountPercent}% OFF</td>
                        <td className="p-3 text-slate-400">
                          {c.timesUsed} / {c.maxUses}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
                            ACTIVE
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => deleteCoupon(c.code)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. AFFILIATES TAB */}
          {activeTab === 'affiliates' && (
            <div className="space-y-6">
              <h3 className="text-base font-black text-white uppercase">Affiliate Partners &amp; Payouts</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-[#0e121a] border border-white/10 space-y-1">
                  <span className="text-xs text-slate-400 font-bold">Total Affiliates</span>
                  <div className="text-2xl font-black text-white">{affiliatesList.length}</div>
                </div>
                <div className="p-4 rounded-2xl bg-[#0e121a] border border-white/10 space-y-1">
                  <span className="text-xs text-slate-400 font-bold">Standard Commission</span>
                  <div className="text-2xl font-black text-amber-400">30% Recurring</div>
                </div>
                <div className="p-4 rounded-2xl bg-[#0e121a] border border-white/10 space-y-1">
                  <span className="text-xs text-slate-400 font-bold">Pending Withdrawal Requests</span>
                  <div className="text-2xl font-black text-emerald-400">{payoutsList.length}</div>
                </div>
              </div>
            </div>
          )}

          {/* 6. CONTENT / BLOG CMS TAB */}
          {activeTab === 'content' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-white uppercase">Published Blog Articles ({articles.length})</h3>
                <button
                  onClick={() => {
                    createArticle({
                      slug: 'new-viral-breakthrough-' + Date.now().toString().slice(-4),
                      title: 'NEW EXPERIMENTAL PHYSICS RETENTION STRATEGY',
                      category: 'INSIGHTS',
                      categoryColor: 'bg-emerald-600 text-white',
                      excerpt: 'Fresh insights into viewer engagement algorithms for physics creators.',
                      content: '# New Strategy\n\nContent details here.',
                      readTimeMinutes: 4,
                      publishedAt: new Date().toISOString(),
                      featured: true,
                      author: {
                        name: currentUser.fullName,
                        avatar: currentUser.avatarUrl,
                        role: 'Editor',
                      },
                    });
                    showToast('New draft article created!');
                  }}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Article</span>
                </button>
              </div>

              <div className="space-y-3">
                {articles.map((art) => (
                  <div
                    key={art.id}
                    className="p-4 rounded-2xl bg-[#0e121a] border border-white/10 flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${art.categoryColor}`}>
                        {art.category}
                      </span>
                      <h4 className="text-sm font-bold text-white uppercase">{art.title}</h4>
                      <p className="text-xs text-slate-400 line-clamp-1">{art.excerpt}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={`/blog/${art.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-400 text-xs font-bold"
                      >
                        Preview
                      </a>
                      <button
                        onClick={() => deleteArticle(art.id)}
                        className="p-2 rounded-lg text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. USER FEEDBACK & BUGS TAB */}
          {activeTab === 'feedback' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-white uppercase">User Feedback & Bug Reports ({feedbackList.length})</h3>
                  <p className="text-xs text-slate-400">Incoming tickets from /feedback, categorized by status and urgency</p>
                </div>
                <button
                  onClick={() => feedbackService.getFeedback().then(setFeedbackList)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Status overview cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-[#0e121a] border border-amber-500/20">
                  <div className="text-[10px] font-mono uppercase text-amber-400 font-bold">New Submissions</div>
                  <div className="text-2xl font-black text-amber-400">
                    {feedbackList.filter((f) => f.status === 'new').length}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-[#0e121a] border border-cyan-500/20">
                  <div className="text-[10px] font-mono uppercase text-cyan-400 font-bold">In Review</div>
                  <div className="text-2xl font-black text-cyan-400">
                    {feedbackList.filter((f) => f.status === 'reviewing').length}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-[#0e121a] border border-emerald-500/20">
                  <div className="text-[10px] font-mono uppercase text-emerald-400 font-bold">Resolved / Done</div>
                  <div className="text-2xl font-black text-emerald-400">
                    {feedbackList.filter((f) => f.status === 'done').length}
                  </div>
                </div>
              </div>

              {/* Feedback List */}
              <div className="space-y-3">
                {feedbackList.length === 0 ? (
                  <div className="p-10 rounded-2xl bg-[#0e121a] border border-white/5 text-center text-slate-500 text-xs">
                    No feedback items received yet.
                  </div>
                ) : (
                  feedbackList.map((item) => (
                    <div
                      key={item.id}
                      className="p-5 rounded-2xl bg-[#0e121a] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase font-mono ${
                              item.type === 'bug'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : item.type === 'idea'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}
                          >
                            {item.type}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500">
                            {new Date(item.createdAt).toLocaleDateString()} at{' '}
                            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {item.email && (
                            <span className="text-[11px] text-slate-300 font-mono bg-white/5 px-2 py-0.5 rounded">
                              {item.email}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-200 leading-relaxed font-sans">{item.message}</p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {item.screenshotUrl && (
                          <button
                            type="button"
                            onClick={() => setSelectedScreenshot(item.screenshotUrl || null)}
                            className="relative group w-12 h-12 rounded-xl overflow-hidden border border-white/10 bg-black/40 cursor-pointer shrink-0"
                            title="Click to view screenshot"
                          >
                            <img src={item.screenshotUrl} alt="Screenshot" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye className="w-4 h-4 text-white" />
                            </div>
                          </button>
                        )}

                        {/* Status Dropdown */}
                        <select
                          value={item.status}
                          onChange={async (e) => {
                            const updated = await feedbackService.updateStatus(item.id, e.target.value as any);
                            setFeedbackList(updated);
                            showToast(`Updated status to "${e.target.value}"`);
                          }}
                          className={`text-xs font-bold uppercase rounded-xl px-3 py-2 border font-mono cursor-pointer ${
                            item.status === 'new'
                              ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                              : item.status === 'reviewing'
                              ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                              : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                          }`}
                        >
                          <option value="new" className="bg-[#0e121a] text-amber-300">New</option>
                          <option value="reviewing" className="bg-[#0e121a] text-cyan-300">Reviewing</option>
                          <option value="done" className="bg-[#0e121a] text-emerald-300">Done</option>
                        </select>

                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={async () => {
                            if (window.confirm('Delete this feedback item?')) {
                              const updated = await feedbackService.deleteFeedback(item.id);
                              setFeedbackList(updated);
                              showToast('Feedback item removed');
                            }
                          }}
                          className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete ticket"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 8. SHOWCASE VIDEOS CMS TAB */}
          {activeTab === 'showcase' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-white uppercase">Showcase Videos CMS ({showcaseList.length})</h3>
                  <p className="text-xs text-slate-400">Curated community & viral creations displayed on /showcase</p>
                </div>
                <button
                  onClick={() => showcaseService.getShowcaseItems().then(setShowcaseList)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Add New Showcase Form */}
              <div className="p-6 rounded-3xl bg-[#0e121a] border border-purple-500/20 space-y-4">
                <h4 className="text-xs font-black uppercase text-purple-300 tracking-wider font-mono flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Add Showcase Video Entry
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1">Title / Hook</label>
                    <input
                      type="text"
                      placeholder="e.g. 100-Ball Sequence Break Finale"
                      value={newShowcaseTitle}
                      onChange={(e) => setNewShowcaseTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-600 focus:border-purple-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1">Mode</label>
                    <select
                      value={newShowcaseMode}
                      onChange={(e) => setNewShowcaseMode(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:border-purple-400 focus:outline-none"
                    >
                      <option value="sequence_break">Sequence Break</option>
                      <option value="color_lock">Color Lock</option>
                      <option value="portal_rings">Portal Rings</option>
                      <option value="accumulation">Accumulation</option>
                      <option value="sand_fill">Sand Fill</option>
                      <option value="pendulum_wave">Pendulum Wave</option>
                      <option value="fibonacci_spiral">Fibonacci Spiral</option>
                      <option value="merge">Merge Balls</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1">Seed Number</label>
                    <input
                      type="number"
                      value={newShowcaseSeed}
                      onChange={(e) => setNewShowcaseSeed(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white font-mono focus:border-purple-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1">Video URL (MP4 / WebM)</label>
                    <input
                      type="url"
                      placeholder="https://assets.mixkit.co/videos/preview/..."
                      value={newShowcaseVideoUrl}
                      onChange={(e) => setNewShowcaseVideoUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white font-mono placeholder-slate-600 focus:border-purple-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1">Poster Image URL</label>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/..."
                      value={newShowcasePosterUrl}
                      onChange={(e) => setNewShowcasePosterUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white font-mono placeholder-slate-600 focus:border-purple-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1">Audio Mix / Sound</label>
                    <input
                      type="text"
                      placeholder="e.g. Numbered Impact ASMR"
                      value={newShowcaseSound}
                      onChange={(e) => setNewShowcaseSound(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-600 focus:border-purple-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!newShowcaseTitle.trim() || !newShowcaseVideoUrl.trim() || !newShowcasePosterUrl.trim()) {
                        showToast('Please fill in title, video URL, and poster URL.');
                        return;
                      }
                      const modeNames: Record<string, string> = {
                        sequence_break: 'Sequence Break',
                        color_lock: 'Color Lock',
                        portal_rings: 'Portal Rings',
                        accumulation: 'Accumulation',
                        sand_fill: 'Sand Fill',
                        pendulum_wave: 'Pendulum Wave',
                        fibonacci_spiral: 'Fibonacci Spiral',
                        merge: 'Merge Balls',
                      };
                      const updated = await showcaseService.addItem({
                        title: newShowcaseTitle.trim(),
                        modeId: newShowcaseMode,
                        modeName: modeNames[newShowcaseMode] || newShowcaseMode,
                        seed: newShowcaseSeed,
                        videoUrl: newShowcaseVideoUrl.trim(),
                        posterUrl: newShowcasePosterUrl.trim(),
                        views: '1.2M',
                        likes: '140K',
                        sound: newShowcaseSound.trim() || 'Custom ASMR Mix',
                      });
                      setShowcaseList(updated);
                      setNewShowcaseTitle('');
                      setNewShowcaseVideoUrl('');
                      setNewShowcasePosterUrl('');
                      showToast('Showcase video added to live gallery!');
                    }}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase flex items-center gap-2 cursor-pointer transition-all shadow-lg shadow-purple-600/30"
                  >
                    <Plus className="w-4 h-4" /> Publish to Showcase
                  </button>
                </div>
              </div>

              {/* Showcase items grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {showcaseList.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl bg-[#0e121a] border border-white/10 overflow-hidden flex flex-col group"
                  >
                    <div className="relative aspect-[9/16] max-h-48 overflow-hidden bg-black/60">
                      <img src={item.posterUrl} alt={item.title} className="w-full h-full object-cover" />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-mono font-bold text-white border border-white/10">
                        {item.modeName}
                      </span>
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-purple-500/80 text-[10px] font-mono font-bold text-white">
                        Seed #{item.seed}
                      </span>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-black text-white line-clamp-1">{item.title}</h4>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">{item.sound}</p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <span className="text-[10px] text-slate-500 font-mono">
                          {item.views} views • {item.likes} likes
                        </span>
                        <button
                          type="button"
                          onClick={async () => {
                            if (window.confirm(`Delete "${item.title}" from showcase?`)) {
                              const updated = await showcaseService.removeItem(item.id);
                              setShowcaseList(updated);
                              showToast('Showcase entry deleted');
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                          title="Delete entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 9. SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-2xl">
              <div className="p-6 rounded-3xl bg-[#0e121a] border border-white/10 space-y-4">
                <h3 className="text-base font-black text-white uppercase">Payment Gateway Provider</h3>
                <p className="text-xs text-slate-400">
                  Select which active checkout adapter handles customer purchases.
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'paddle', name: 'Paddle (MoR)', desc: 'Global tax & EU VAT compliant' },
                    { id: 'lemonsqueezy', name: 'Lemon Squeezy (MoR)', desc: 'Automated global payouts' },
                    { id: 'stripe', name: 'Stripe', desc: 'Direct credit card processing' },
                    { id: 'test', name: 'Test Sandbox Mode', desc: 'Instant mock test checkouts' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setActiveProvider(p.id);
                        showToast(`Switched payment provider to: ${p.name}`);
                      }}
                      className={`p-3 rounded-xl border text-left text-xs transition-all ${
                        activeProviderId === p.id
                          ? 'border-purple-400 bg-purple-500/20 text-white font-bold'
                          : 'border-white/5 bg-white/[0.02] text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="font-bold text-white">{p.name}</div>
                      <div className="text-[10px] text-slate-400">{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 8. AUDIT LOG TAB */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <h3 className="text-base font-black text-white uppercase">Immutable Security Audit Trail</h3>
              <div className="rounded-2xl border border-white/10 bg-[#0e121a] overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.02] border-b border-white/10 text-slate-400 uppercase text-[10px] font-mono">
                    <tr>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Admin</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="p-3 text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</td>
                        <td className="p-3 text-purple-300">{log.adminEmail}</td>
                        <td className="p-3 font-bold text-white">{log.action}</td>
                        <td className="p-3 text-slate-300 truncate max-w-xs">{JSON.stringify(log.details)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 9. TRANSLATIONS TAB */}
          {activeTab === 'translations' && (
            <div className="space-y-4">
              <TranslationManager />
            </div>
          )}
        </main>
      </div>

      {/* Selected Member Details & Plan Management Modal */}
      {selectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={(e) => e.target === e.currentTarget && setSelectedUser(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="member-modal-title"
            className="w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto overscroll-contain bg-[#0e121a] border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 space-y-5 shadow-2xl"
            style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
          >
            {/* Grab handle for touch swipe down */}
            <div className="sm:hidden mx-auto -mt-2 mb-1 h-1.5 w-12 rounded-full bg-white/20" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <img src={selectedUser.avatarUrl} alt="" className="w-12 h-12 rounded-2xl object-cover border border-white/10 shrink-0" />
                <div className="min-w-0">
                  <h3 id="member-modal-title" className="text-base font-black text-white truncate">{selectedUser.fullName}</h3>
                  <p className="text-xs text-slate-400 font-mono truncate">{selectedUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Plan Switcher */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase font-mono">Assigned Membership Plan</label>
              <div className="grid grid-cols-3 gap-2">
                {(['free', 'gamer_pack', 'creator_pro'] as PlanId[]).map((plan) => {
                  const currentPlan = entitlements.getEntitlements(selectedUser.id).planId;
                  const isCurrent = currentPlan === plan;
                  return (
                    <button
                      key={plan}
                      type="button"
                      onClick={() => {
                        entitlements.updateUserPlan(selectedUser.id, plan);
                        showToast(`Updated ${selectedUser.fullName} to ${plan.replace('_', ' ')}`);
                        setUsersList([...authService.getAllUsers()]);
                      }}
                      className={`min-h-[44px] p-2.5 rounded-xl border text-xs font-bold capitalize transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/30'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {plan.replace('_', ' ')}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Extend Subscription */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <label className="text-xs font-bold text-slate-300 uppercase font-mono">Extend Entitlement Period</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const curPlan = entitlements.getEntitlements(selectedUser.id).planId;
                    entitlements.updateUserPlan(selectedUser.id, curPlan, 30);
                    showToast(`Extended ${selectedUser.fullName} access by 30 days`);
                  }}
                  className="flex-1 min-h-[44px] py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 cursor-pointer"
                >
                  +30 Days
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const curPlan = entitlements.getEntitlements(selectedUser.id).planId;
                    entitlements.updateUserPlan(selectedUser.id, curPlan, 365);
                    showToast(`Extended ${selectedUser.fullName} access by 1 Year`);
                  }}
                  className="flex-1 min-h-[44px] py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 cursor-pointer"
                >
                  +1 Year
                </button>
              </div>
            </div>

            {/* Destructive Action with Confirmation */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <label className="text-xs font-bold text-rose-400 uppercase font-mono">Danger Zone</label>
              <button
                type="button"
                onClick={async () => {
                  if (window.confirm(`Are you sure you want to revoke access and delete member ${selectedUser.email}? This action cannot be undone.`)) {
                    await authService.deleteUserByAdmin(selectedUser.id, currentUser.id, currentUser.email);
                    setUsersList([...authService.getAllUsers()]);
                    setSelectedUser(null);
                    showToast(`Member removed.`);
                  }
                }}
                className="w-full min-h-[44px] py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Revoke &amp; Delete Member</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Screenshot Lightbox Modal */}
      {selectedScreenshot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn"
          onClick={() => setSelectedScreenshot(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-[#0e121a] border border-white/20 rounded-2xl p-2 shadow-2xl overflow-hidden">
            <button
              onClick={() => setSelectedScreenshot(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedScreenshot}
              alt="Feedback Screenshot"
              className="w-full h-auto max-h-[85vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
