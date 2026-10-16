import { AffiliateProfile, CommissionItem, PayoutRequest, PayoutMethod } from './types';

const STORAGE_KEY_AFFILIATES = 'bounceforge_db_affiliates';
const STORAGE_KEY_COMMISSIONS = 'bounceforge_db_commissions';
const STORAGE_KEY_PAYOUTS = 'bounceforge_db_payouts';
const COOKIE_KEY_ATTRIBUTION = 'bf_ref_code';

class AffiliateService {
  private static instance: AffiliateService;

  private constructor() {}

  static getInstance(): AffiliateService {
    if (!AffiliateService.instance) {
      AffiliateService.instance = new AffiliateService();
    }
    return AffiliateService.instance;
  }

  // 1. Attribution Cookie / Storage (60 days)
  trackClick(code: string): void {
    if (typeof window === 'undefined') return;
    const cleanCode = code.trim().toLowerCase();
    const expiry = Date.now() + 60 * 24 * 60 * 60 * 1000;
    try {
      localStorage.setItem(COOKIE_KEY_ATTRIBUTION, JSON.stringify({ code: cleanCode, expiry }));
    } catch {}

    // Increment clicks
    const affiliates = this.getAllAffiliates();
    const found = affiliates.find(
      (a) => a.code.toLowerCase() === cleanCode || (a.customCode && a.customCode.toLowerCase() === cleanCode)
    );
    if (found) {
      found.totalClicks = (found.totalClicks || 0) + 1;
      this.saveAllAffiliates(affiliates);
    }
  }

  getAttributedReferralCode(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(COOKIE_KEY_ATTRIBUTION);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (Date.now() > data.expiry) {
        localStorage.removeItem(COOKIE_KEY_ATTRIBUTION);
        return null;
      }
      return data.code;
    } catch {
      return null;
    }
  }

  // 2. Affiliate Profile
  getOrCreateProfile(userId: string, userEmail?: string): AffiliateProfile {
    const affiliates = this.getAllAffiliates();
    let profile = affiliates.find((a) => a.userId === userId);

    if (!profile) {
      const baseCode = (userEmail?.split('@')[0] || 'ref')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 10);
      const code = baseCode + Math.floor(100 + Math.random() * 900);

      profile = {
        userId,
        code,
        customCode: code,
        commissionRatePercent: 30, // 30% recurring
        totalClicks: 0,
        totalSignups: 0,
        activePayingCustomers: 0,
        pendingBalance: 0,
        approvedBalance: 0,
        paidEarningsTotal: 0,
        createdAt: new Date().toISOString(),
      };
      affiliates.push(profile);
      this.saveAllAffiliates(affiliates);
    }

    return profile;
  }

  updateCustomCode(userId: string, newCode: string): AffiliateProfile {
    const clean = newCode.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (clean.length < 3) throw new Error('Referral code must be at least 3 characters.');

    const affiliates = this.getAllAffiliates();
    const exists = affiliates.find(
      (a) => a.userId !== userId && (a.code.toLowerCase() === clean || a.customCode?.toLowerCase() === clean)
    );
    if (exists) throw new Error('This referral code is already taken. Try another!');

    const profile = affiliates.find((a) => a.userId === userId);
    if (!profile) throw new Error('Affiliate profile not found');

    profile.customCode = clean;
    this.saveAllAffiliates(affiliates);
    return profile;
  }

  savePayoutDetails(userId: string, method: PayoutMethod, rawAccount: string): AffiliateProfile {
    const affiliates = this.getAllAffiliates();
    const profile = affiliates.find((a) => a.userId === userId);
    if (!profile) throw new Error('Affiliate profile not found');

    const clean = rawAccount.trim();
    // Mask account details
    let masked = clean;
    if (clean.includes('@')) {
      const [u, d] = clean.split('@');
      masked = `${u.slice(0, 2)}***@${d}`;
    } else if (clean.length > 6) {
      masked = `****${clean.slice(-4)}`;
    }

    profile.payoutMethod = method;
    profile.payoutAccountMasked = masked;
    profile.payoutAccountEncrypted = btoa(clean); // Base64 simulated encryption
    this.saveAllAffiliates(affiliates);
    return profile;
  }

  // 3. Commissions
  recordPurchaseCommission(
    referredUserId: string,
    referredUserEmail: string,
    orderId: string,
    amountUsd: number,
    planName: string
  ): CommissionItem | null {
    const refCode = this.getAttributedReferralCode();
    if (!refCode) return null;

    const affiliates = this.getAllAffiliates();
    const affiliate = affiliates.find(
      (a) => a.code.toLowerCase() === refCode.toLowerCase() || a.customCode?.toLowerCase() === refCode.toLowerCase()
    );

    // Block self-referrals
    if (!affiliate || affiliate.userId === referredUserId) {
      return null;
    }

    const rate = affiliate.commissionRatePercent || 30;
    const commissionAmount = Number(((amountUsd * rate) / 100).toFixed(2));

    const emailParts = referredUserEmail.split('@');
    const maskedEmail = `${emailParts[0].slice(0, 2)}***@${emailParts[1] || 'domain.com'}`;

    const newCommission: CommissionItem = {
      id: 'comm_' + Math.random().toString(36).slice(2, 10),
      affiliateUserId: affiliate.userId,
      referredUserId,
      referredUserEmailMasked: maskedEmail,
      orderId,
      orderAmount: amountUsd,
      commissionAmount,
      planName,
      status: 'pending', // 30-day pending window
      createdAt: new Date().toISOString(),
    };

    const commissions = this.getAllCommissions();
    commissions.unshift(newCommission);
    this.saveAllCommissions(commissions);

    // Update balances
    affiliate.pendingBalance = Number(((affiliate.pendingBalance || 0) + commissionAmount).toFixed(2));
    affiliate.activePayingCustomers = (affiliate.activePayingCustomers || 0) + 1;
    this.saveAllAffiliates(affiliates);

    return newCommission;
  }

  reverseCommissionOnRefund(orderId: string): void {
    const commissions = this.getAllCommissions();
    const comm = commissions.find((c) => c.orderId === orderId);
    if (!comm || comm.status === 'reversed_refund') return;

    comm.status = 'reversed_refund';
    this.saveAllCommissions(commissions);

    // Reverse from affiliate balance
    const affiliates = this.getAllAffiliates();
    const affiliate = affiliates.find((a) => a.userId === comm.affiliateUserId);
    if (affiliate) {
      affiliate.pendingBalance = Math.max(0, (affiliate.pendingBalance || 0) - comm.commissionAmount);
      affiliate.approvedBalance = Math.max(0, (affiliate.approvedBalance || 0) - comm.commissionAmount);
      this.saveAllAffiliates(affiliates);
    }
  }

  requestPayout(userId: string, amount: number, userEmail: string): PayoutRequest {
    const affiliates = this.getAllAffiliates();
    const affiliate = affiliates.find((a) => a.userId === userId);
    if (!affiliate) throw new Error('Affiliate profile not found');

    if (!affiliate.payoutMethod || !affiliate.payoutAccountMasked) {
      throw new Error('Please configure your payout account details first.');
    }

    if (amount < 50) {
      throw new Error('Minimum payout request threshold is $50.00.');
    }

    if (affiliate.approvedBalance < amount) {
      throw new Error('Requested amount exceeds your available approved balance.');
    }

    // Deduct approved balance
    affiliate.approvedBalance = Number((affiliate.approvedBalance - amount).toFixed(2));
    this.saveAllAffiliates(affiliates);

    const payout: PayoutRequest = {
      id: 'payout_' + Math.random().toString(36).slice(2, 10),
      affiliateUserId: userId,
      affiliateEmail: userEmail,
      amount,
      method: affiliate.payoutMethod,
      accountDetailsMasked: affiliate.payoutAccountMasked,
      status: 'pending',
      requestedAt: new Date().toISOString(),
    };

    const payouts = this.getAllPayouts();
    payouts.unshift(payout);
    this.saveAllPayouts(payouts);

    return payout;
  }

  // Storage Helpers
  getAllAffiliates(): AffiliateProfile[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_AFFILIATES);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  saveAllAffiliates(list: AffiliateProfile[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_AFFILIATES, JSON.stringify(list));
    } catch {}
  }

  getAllCommissions(): CommissionItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_COMMISSIONS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  saveAllCommissions(list: CommissionItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_COMMISSIONS, JSON.stringify(list));
    } catch {}
  }

  getAllPayouts(): PayoutRequest[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PAYOUTS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  saveAllPayouts(list: PayoutRequest[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_PAYOUTS, JSON.stringify(list));
    } catch {}
  }
}

export const affiliateService = AffiliateService.getInstance();
