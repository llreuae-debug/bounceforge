export interface TrendPackData {
  updated: string;
  category: string;
  trendingKeywords: string[];
  trendingHashtags: string[];
  hookStyles: string[];
  popularFormats: string[];
  soundTrends?: string[];
}

export class TrendsManager {
  private static instance: TrendsManager;
  private cachedData: TrendPackData | null = null;
  private lastFetchTime: number = 0;

  static getInstance(): TrendsManager {
    if (!TrendsManager.instance) {
      TrendsManager.instance = new TrendsManager();
    }
    return TrendsManager.instance;
  }

  async getTrends(): Promise<{ data: TrendPackData; isOutdated: boolean }> {
    const now = Date.now();
    // Cache in memory for 10 minutes
    if (this.cachedData && now - this.lastFetchTime < 10 * 60 * 1000) {
      return {
        data: this.cachedData,
        isOutdated: this.isOlderThan14Days(this.cachedData.updated),
      };
    }

    try {
      const res = await fetch('/api/trends');
      if (res.ok) {
        const json = await res.json();
        this.cachedData = json;
        this.lastFetchTime = now;
        return {
          data: json,
          isOutdated: this.isOlderThan14Days(json.updated),
        };
      }
    } catch {
      // Fallback to static public/trends.json
      try {
        const res2 = await fetch('/trends.json');
        if (res2.ok) {
          const json = await res2.json();
          this.cachedData = json;
          this.lastFetchTime = now;
          return {
            data: json,
            isOutdated: this.isOlderThan14Days(json.updated),
          };
        }
      } catch {}
    }

    const fallback: TrendPackData = {
      updated: '2026-10-16T00:00:00.000Z',
      category: 'satisfying_physics_asmr',
      trendingKeywords: ['satisfying ball escape', 'asmr simulation', 'oddly satisfying', 'physics puzzle'],
      trendingHashtags: ['#satisfying', '#asmr', '#ballsimulation', '#oddlysatisfying', '#physics'],
      hookStyles: ['curiosity', 'challenge', 'prediction', 'countdown'],
      popularFormats: ['60s countdown to 0.0', '100 rings speed cascade', 'prediction card start'],
    };

    return { data: fallback, isOutdated: false };
  }

  isOlderThan14Days(dateString: string): boolean {
    try {
      const updatedDate = new Date(dateString).getTime();
      const diffMs = Date.now() - updatedDate;
      const days = diffMs / (1000 * 60 * 60 * 24);
      return days > 14;
    } catch {
      return false;
    }
  }

  async saveTrends(password: string, data: TrendPackData): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, data }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        this.cachedData = { ...data, updated: json.updated };
        this.lastFetchTime = Date.now();
        return { success: true };
      } else {
        return { success: false, error: json.error || 'Failed to save trends' };
      }
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}
