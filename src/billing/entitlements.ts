import { PlanId, UserEntitlements } from './types';

export type FeatureCapability =
  | 'export_4k'
  | 'export_video'
  | 'commercial_license'
  | 'custom_watermark'
  | 'unlimited_auto_search'
  | 'all_modes'
  | 'advanced_audio'
  | 'ai_growth_tools';

const STORAGE_KEY_ENTITLEMENTS = 'bounceforge_db_entitlements';

const getTodayString = () => new Date().toISOString().split('T')[0];

export class EntitlementsEngine {
  private static instance: EntitlementsEngine;

  private constructor() {}

  static getInstance(): EntitlementsEngine {
    if (!EntitlementsEngine.instance) {
      EntitlementsEngine.instance = new EntitlementsEngine();
    }
    return EntitlementsEngine.instance;
  }

  getEntitlements(userId: string): UserEntitlements {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY_ENTITLEMENTS}_${userId}`);
      if (raw) {
        const ent: UserEntitlements = JSON.parse(raw);
        // Reset daily usage if new day
        if (ent.lastUsageDate !== getTodayString()) {
          ent.autoSearchesUsedToday = 0;
          ent.lastUsageDate = getTodayString();
          this.saveEntitlements(ent);
        }
        return ent;
      }
    } catch {}

    // Default Free Demo Entitlements
    const defaultEnt: UserEntitlements = {
      userId,
      planId: 'free',
      status: 'active',
      periodStart: new Date().toISOString(),
      periodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
      autoSearchesUsedToday: 0,
      lastUsageDate: getTodayString(),
      exportCountTotal: 0,
    };
    this.saveEntitlements(defaultEnt);
    return defaultEnt;
  }

  saveEntitlements(ent: UserEntitlements): void {
    try {
      localStorage.setItem(`${STORAGE_KEY_ENTITLEMENTS}_${ent.userId}`, JSON.stringify(ent));
    } catch {}
  }

  can(userId: string | undefined | null, capability: FeatureCapability): boolean {
    if (!userId) {
      // Guests only have free access
      return false;
    }

    const ent = this.getEntitlements(userId);
    const isPlanActive = ent.status === 'active' || ent.status === 'trialing';
    if (!isPlanActive && ent.status !== 'past_due') {
      return false;
    }

    switch (capability) {
      case 'all_modes':
        return ent.planId === 'gamer_pack' || ent.planId === 'creator_pro';

      case 'unlimited_auto_search':
        return ent.planId === 'creator_pro';

      case 'export_video':
        // Free tier can do 720p 15s preview export; Creator Pro does full export
        return ent.planId === 'creator_pro' || ent.planId === 'free';

      case 'export_4k':
        return ent.planId === 'creator_pro';

      case 'commercial_license':
        return ent.planId === 'creator_pro';

      case 'custom_watermark':
        return ent.planId === 'creator_pro';

      case 'advanced_audio':
        return ent.planId === 'creator_pro';

      case 'ai_growth_tools':
        return ent.planId === 'creator_pro';

      default:
        return false;
    }
  }

  getAutoSearchDailyLimit(planId: PlanId): number {
    switch (planId) {
      case 'free':
        return 1;
      case 'gamer_pack':
        return 5;
      case 'creator_pro':
        return 999999; // Unlimited
    }
  }

  canPerformAutoSearch(userId: string | undefined | null): { allowed: boolean; remaining: number; max: number } {
    if (!userId) {
      return { allowed: false, remaining: 0, max: 1 };
    }
    const ent = this.getEntitlements(userId);
    const max = this.getAutoSearchDailyLimit(ent.planId);
    const used = ent.autoSearchesUsedToday || 0;
    const allowed = used < max;
    const remaining = Math.max(0, max - used);
    return { allowed, remaining, max };
  }

  consumeAutoSearch(userId: string): void {
    const ent = this.getEntitlements(userId);
    ent.autoSearchesUsedToday = (ent.autoSearchesUsedToday || 0) + 1;
    this.saveEntitlements(ent);
  }

  recordExport(userId: string): void {
    const ent = this.getEntitlements(userId);
    ent.exportCountTotal = (ent.exportCountTotal || 0) + 1;
    this.saveEntitlements(ent);
  }

  // Server-simulated HMAC-signed Entitlement Token for Export verification
  generateSignedExportToken(userId: string, resolution: string, duration: number): string {
    const timestamp = Date.now();
    const payload = `${userId}:${resolution}:${duration}:${timestamp}`;
    // Fast simulated signature hash
    let hash = 0;
    for (let i = 0; i < payload.length; i++) {
      hash = (hash << 5) - hash + payload.charCodeAt(i);
      hash |= 0;
    }
    const signature = Math.abs(hash).toString(36) + 'bf_sig';
    return btoa(JSON.stringify({ payload, signature, timestamp, userId }));
  }

  verifyExportToken(token: string): boolean {
    try {
      const decoded = JSON.parse(atob(token));
      // Expiration check: tokens valid for 15 minutes
      if (Date.now() - decoded.timestamp > 15 * 60 * 1000) return false;
      return true;
    } catch {
      return false;
    }
  }
}

export const entitlements = EntitlementsEngine.getInstance();
export const can = (userId: string | undefined | null, capability: FeatureCapability) =>
  entitlements.can(userId, capability);
