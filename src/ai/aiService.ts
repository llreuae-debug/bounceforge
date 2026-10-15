import { get, set } from 'idb-keyval';
import {
  generateOfflineHooks,
  generateOfflineLabels,
  HookGenerationOptions,
  HookStyle,
  SupportedLanguage,
} from './offlineEngine';
import { generateSeoPack, SeoPack } from './seoEngine';

export interface PerformanceLogEntry {
  id: string;
  date: string;
  modeId: string;
  hookText: string;
  duration: number;
  platform: 'tiktok' | 'reels' | 'shorts';
  views: number;
  likes: number;
  comments: number;
  shares: number;
  avgWatchPercent: number;
}

export interface WhatNextCard {
  id: string;
  type: 'next_video' | 'part_2' | 'ab_test' | 'remix' | 'batch_idea' | 'series_plan';
  title: string;
  reason: string;
  modeId: string;
  preset?: string;
  themeId?: string;
  hookText?: string;
  partNumber?: number;
  seed?: number;
  seriesDays?: Array<{ day: number; modeId: string; title: string; hook: string; time: string }>;
}

const MY_HOOKS_STORAGE_KEY = 'bounceforge_my_hooks';
const PERFORMANCE_LOG_KEY = 'bounceforge_performance_logs';
const AI_SETTINGS_STORAGE_KEY = 'bounceforge_ai_settings';

export interface AiUserSettings {
  enabled: boolean;
  language: SupportedLanguage;
  styles: HookStyle[];
  emoji: boolean;
  casing: 'as_written' | 'lowercase' | 'uppercase';
}

export const DEFAULT_AI_SETTINGS: AiUserSettings = {
  enabled: true,
  language: 'en',
  styles: ['curiosity', 'challenge'],
  emoji: true,
  casing: 'as_written',
};

export class AiService {
  private static instance: AiService;

  static getInstance(): AiService {
    if (!AiService.instance) {
      AiService.instance = new AiService();
    }
    return AiService.instance;
  }

  // --- MY HOOKS PERSISTENCE ---
  getMyHooks(): string[] {
    try {
      const stored = localStorage.getItem(MY_HOOKS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  saveHook(hook: string): boolean {
    const hooks = this.getMyHooks();
    if (!hooks.includes(hook)) {
      hooks.unshift(hook);
      localStorage.setItem(MY_HOOKS_STORAGE_KEY, JSON.stringify(hooks.slice(0, 50)));
      return true;
    }
    return false;
  }

  removeHook(hook: string): void {
    const hooks = this.getMyHooks().filter((h) => h !== hook);
    localStorage.setItem(MY_HOOKS_STORAGE_KEY, JSON.stringify(hooks));
  }

  isHookSaved(hook: string): boolean {
    return this.getMyHooks().includes(hook);
  }

  // --- AI SETTINGS ---
  getSettings(): AiUserSettings {
    try {
      const stored = localStorage.getItem(AI_SETTINGS_STORAGE_KEY);
      return stored ? { ...DEFAULT_AI_SETTINGS, ...JSON.parse(stored) } : DEFAULT_AI_SETTINGS;
    } catch {
      return DEFAULT_AI_SETTINGS;
    }
  }

  updateSettings(updates: Partial<AiUserSettings>): void {
    const current = this.getSettings();
    const updated = { ...current, ...updates };
    localStorage.setItem(AI_SETTINGS_STORAGE_KEY, JSON.stringify(updated));
  }

  // --- PERFORMANCE LOGS ---
  async getPerformanceLogs(): Promise<PerformanceLogEntry[]> {
    try {
      const logs = await get(PERFORMANCE_LOG_KEY);
      return logs || [];
    } catch {
      return [];
    }
  }

  async addPerformanceLog(entry: Omit<PerformanceLogEntry, 'id' | 'date'>): Promise<void> {
    const logs = await this.getPerformanceLogs();
    const newEntry: PerformanceLogEntry = {
      ...entry,
      id: `perf_${Date.now()}`,
      date: new Date().toISOString(),
    };
    logs.unshift(newEntry);
    await set(PERFORMANCE_LOG_KEY, logs.slice(0, 100));
  }

  async getPerformanceInsights(): Promise<{
    bestMode?: string;
    bestHookStyle?: string;
    bestLength?: number;
    totalTracked: number;
  }> {
    const logs = await this.getPerformanceLogs();
    if (logs.length === 0) return { totalTracked: 0 };

    const modeViews: Record<string, number> = {};
    for (const log of logs) {
      modeViews[log.modeId] = (modeViews[log.modeId] || 0) + (log.views || 0);
    }

    const sortedModes = Object.entries(modeViews).sort((a, b) => b[1] - a[1]);

    return {
      bestMode: sortedModes[0]?.[0],
      totalTracked: logs.length,
    };
  }

  // --- GENERATE HOOKS ---
  async generateHooks(options: HookGenerationOptions): Promise<{ hooks: string[]; isAi: boolean }> {
    const settings = this.getSettings();
    if (!settings.enabled) {
      return {
        hooks: generateOfflineHooks(options),
        isAi: false,
      };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_hooks',
          modeName: options.modeName,
          category: options.category,
          endingType: options.endingType || 'escape',
          preset: options.preset || 'viral',
          duration: options.duration || 60,
          contestants: options.contestants,
          styles: options.styles || settings.styles,
          language: options.language || settings.language,
          emoji: options.emoji !== undefined ? options.emoji : settings.emoji,
          casing: options.casing || settings.casing,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) {
        const json = await res.json();
        if (json.isAi && json.data?.hooks && Array.isArray(json.data.hooks) && json.data.hooks.length > 0) {
          return {
            hooks: json.data.hooks.slice(0, 6),
            isAi: true,
          };
        }
      }
    } catch (e) {
      console.warn('AI hook fetch failed or timed out; utilizing offline fallback engine', e);
    }

    // Offline fallback
    return {
      hooks: generateOfflineHooks(options),
      isAi: false,
    };
  }

  // --- GENERATE LABELS ---
  async generateLabels(
    type: 'counter' | 'end_card_cta' | 'contestant_names',
    modeName: string,
    category: string
  ): Promise<{ options: string[]; isAi: boolean }> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_labels', type, modeName, category }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      if (res.ok) {
        const json = await res.json();
        if (json.isAi && json.data?.options && Array.isArray(json.data.options)) {
          return { options: json.data.options.slice(0, 6), isAi: true };
        }
      }
    } catch {}

    return {
      options: generateOfflineLabels(type, modeName),
      isAi: false,
    };
  }

  // --- GENERATE SEO PACK ---
  async generateSeo(params: {
    modeName: string;
    modeId: string;
    category: string;
    hookText: string;
    duration?: number;
    seed?: number;
    resolution?: string;
    variationIndex?: number;
  }): Promise<SeoPack> {
    const offlinePack = generateSeoPack(params);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_seo',
          modeName: params.modeName,
          category: params.category,
          hookText: params.hookText,
          duration: params.duration || 60,
          seed: params.seed || 1337,
          resolution: params.resolution || '1080',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) {
        const json = await res.json();
        if (json.isAi && json.data) {
          return {
            ...offlinePack,
            tiktok: { ...offlinePack.tiktok, ...(json.data.tiktok || {}) },
            reels: { ...offlinePack.reels, ...(json.data.reels || {}) },
            shorts: { ...offlinePack.shorts, ...(json.data.shorts || {}) },
            common: { ...offlinePack.common, ...(json.data.common || {}) },
            isAi: true,
          };
        }
      }
    } catch {}

    return offlinePack;
  }

  // --- WHAT NEXT SUGGESTIONS ---
  async getWhatNextSuggestions(currentModeId: string): Promise<{
    suggestions: WhatNextCard[];
    isAi: boolean;
  }> {
    const offlineCards: WhatNextCard[] = [
      {
        id: 's_battle',
        type: 'next_video',
        title: "Try 'Pick Ur Color' Next",
        reason: 'Battle modes drive 2.4x more comments than solo escapes on TikTok and Reels.',
        modeId: 'pick_ur_color',
        preset: 'viral',
        themeId: 'neon_night',
        hookText: 'pick a color before it starts',
      },
      {
        id: 's_part2',
        type: 'part_2',
        title: 'Make Part 2 with Sequel Seed',
        reason: 'Serial parts double completion rates and profile follow-throughs.',
        modeId: currentModeId,
        partNumber: 2,
        seed: 1337 + 7919,
        hookText: 'part 2: can it beat the record??',
      },
      {
        id: 's_ab_test',
        type: 'ab_test',
        title: 'A/B Test High-Tension Hook',
        reason: 'Curiosity vs challenge A/B testing reveals what hooks your specific viewers.',
        modeId: currentModeId,
        hookText: 'this one took 412 attempts...',
      },
      {
        id: 's_remix',
        type: 'remix',
        title: 'Hundred Rings Turbo Cascade',
        reason: 'Accelerating speed runs keep average watch time above 92%.',
        modeId: 'hundred_rings',
        preset: 'viral',
        hookText: 'can it clear all 100 rings??',
      },
      {
        id: 's_batch',
        type: 'batch_idea',
        title: 'Make 5 Variations For The Week',
        reason: 'Automate your entire weekly posting queue with variation guard.',
        modeId: 'countdown_escape',
        hookText: 'escapes exactly at 0.0s',
      },
      {
        id: 's_series',
        type: 'series_plan',
        title: '7-Day Physics Mastery Rollout',
        reason: 'Scheduled episodic series trigger the recommendation algorithm cluster.',
        modeId: 'soap_cube_cut',
        hookText: 'pure soap slicing tingles',
        seriesDays: [
          { day: 1, modeId: 'countdown_escape', title: 'Day 1: Countdown Escape', hook: 'escapes exactly at 0.0s', time: '12:30 PM' },
          { day: 2, modeId: 'near_miss_hell', title: 'Day 2: Near Miss Hell', hook: 'this took 412 attempts...', time: '7:30 PM' },
          { day: 3, modeId: 'pick_ur_color', title: 'Day 3: Pick Ur Color', hook: 'pick a color before it starts', time: '1:00 PM' },
          { day: 4, modeId: 'soap_cube_cut', title: 'Day 4: Soap Cube Cut ASMR', hook: 'pure soap slicing tingles', time: '8:00 PM' },
          { day: 5, modeId: 'hundred_rings', title: 'Day 5: 100 Rings Cascade', hook: 'can it clear all 100 rings??', time: '2:00 PM' },
          { day: 6, modeId: 'bass_drop_escape', title: 'Day 6: Bass Drop Climax', hook: 'headphones on for the drop', time: '7:00 PM' },
          { day: 7, modeId: 'chaos_to_order', title: 'Day 7: Chaos to Order', hook: 'wait for the perfect snap', time: '6:30 PM' },
        ],
      },
    ];

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'what_next', currentModeId }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) {
        const json = await res.json();
        if (json.isAi && json.data?.suggestions && Array.isArray(json.data.suggestions)) {
          return {
            suggestions: json.data.suggestions,
            isAi: true,
          };
        }
      }
    } catch {}

    return {
      suggestions: offlineCards,
      isAi: false,
    };
  }
}
