import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../auth/useAuthStore';
import { useBillingStore } from '../../billing/billingStore';
import { useContentStore } from '../../content/contentStore';
import { useStudioStore } from '../../store/useStudioStore';
import { authService } from '../../auth/authService';
import { UserProfile, AuditLogEntry } from '../../auth/types';
import { affiliateService } from '../../affiliates/affiliateService';
import { AffiliateProfile, PayoutRequest } from '../../affiliates/types';
import { Header } from '../Header';
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
  AlertCircle,
  CheckCircle2,
  Lock,
  Clock,
  Sparkles,
  Edit,
  Trash2,
  Eye,
  Key,
} from 'lucide-react';
import { PlanId } from '../../billing/types';

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
  const { articles, createArticle, updateArticle, deleteArticle } = useContentStore();
  const { showToast, setRoute } = useStudioStore();

  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'members' | 'pricing' | 'coupons' | 'affiliates' | 'content' | 'settings' | 'audit'
  >('dashboard');

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
              type="text"
              maxLength={6}
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              placeholder="000000"
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
        {/* Left Navigation Sidebar */}
        <aside className="w-full md:w-64 border-r border-white/10 bg-[#090c13] p-4 space-y-1.5 shrink-0">
          {[
            { id: 'dashboard', label: 'Dashboard & KPIs', icon: Activity },
            { id: 'members', label: 'Members Directory', icon: Users },
            { id: 'pricing', label: 'Plans & Pricing', icon: CreditCard },
            { id: 'coupons', label: 'Coupons & Promos', icon: Sparkles },
            { id: 'affiliates', label: 'Affiliates & Payouts', icon: DollarSign },
            { id: 'content', label: 'Blog & Content CMS', icon: FileText },
            { id: 'settings', label: 'Payment & System', icon: Settings },
            { id: 'audit', label: 'Security Audit Log', icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                  active
                    ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
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

              {/* Members Table */}
              <div className="rounded-2xl border border-white/10 bg-[#0e121a] overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.02] border-b border-white/10 text-slate-400 uppercase text-[10px] font-mono">
                    <tr>
                      <th className="p-3.5">User</th>
                      <th className="p-3.5">Role</th>
                      <th className="p-3.5">Provider</th>
                      <th className="p-3.5">Joined</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredUsers.map((u) => (
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
                        <td className="p-3.5 font-mono text-[11px] text-slate-400 capitalize">{u.provider}</td>
                        <td className="p-3.5 text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              showToast(`Inspecting member: ${u.email}`);
                            }}
                            className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-400 font-bold"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                        rel="noreferrer"
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

          {/* 7. SETTINGS TAB */}
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
        </main>
      </div>
    </div>
  );
};
