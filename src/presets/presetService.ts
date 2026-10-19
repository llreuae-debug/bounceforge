import { get as getIDB, set as setIDB } from 'idb-keyval';
import { VisualSettings } from '../render/renderer';
import { OverlaySettings } from '../render/overlays';
import { AudioSettings } from '../audio/types';
import { AsmrMixSettings } from '../audio/asmrEngine';

export interface BallPhysicsSettings {
  speed: number;
  radius: number;
  gravity: number;
  restitution: number;
  color: string;
  maxSpeedCap: number;
  bounceBoostEnabled: boolean;
  bounceBoostRate: number;
  bounceBoostMax: number;
}

export { DEFAULT_BALL_PHYSICS } from '../engine/ballDefaults';

export interface WallControlsSettings {
  ringCount: number;
  gapWidthDeg: number;
  breakEffects: ('confetti' | 'glass_shatter' | 'shockwave' | 'sparks')[];
  spikesEnabled: boolean;
  spikeCount: number;
  spikeLength: number;
}

export interface CustomBallConfig {
  type: 'default' | 'emoji' | 'image';
  emoji?: string;
  dataUrl?: string;
}

export interface SavedPreset {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  userId?: string | null;
  modeId: string;
  modeSettings: Record<string, any>;
  seed: number;
  ballPhysics: BallPhysicsSettings;
  wallControls: WallControlsSettings;
  visuals: VisualSettings;
  overlays: OverlaySettings;
  audioSettings: AudioSettings;
  asmrSettings: AsmrMixSettings;
  customBall: CustomBallConfig;
  targetDuration: number;
  resolution: '1080' | '1440' | '4k' | 'square' | 'landscape';
  reelSpeed: number; // 0.25, 0.5, 0.75, 1.0, 1.25. DEFAULT = 0.5
  slowMoSoundFeel?: boolean;
  speedRampFinale?: boolean;
  marbleMelodySlowMoMode?: 'calm_tempo' | 'normal_tempo';
}

const STORAGE_KEY_LOCAL = 'bounceforge_user_presets';
const STORAGE_KEY_CLOUD_PREFIX = 'bounceforge_cloud_presets_';

export class PresetService {
  private static instance: PresetService;

  static getInstance(): PresetService {
    if (!PresetService.instance) {
      PresetService.instance = new PresetService();
    }
    return PresetService.instance;
  }

  /**
   * Load presets (local for guest, synced for user)
   * Migrates any existing saved presets to default reelSpeed = 0.5x
   */
  async getPresets(userId?: string | null): Promise<SavedPreset[]> {
    try {
      const rawList = userId
        ? (await getIDB<SavedPreset[]>(`${STORAGE_KEY_CLOUD_PREFIX}${userId}`)) || []
        : (await getIDB<SavedPreset[]>(STORAGE_KEY_LOCAL)) || [];

      // Migrate existing presets to default 0.5x reel speed
      return rawList.map((p) => ({
        ...p,
        reelSpeed: p.reelSpeed !== undefined ? p.reelSpeed : 0.5,
        slowMoSoundFeel: p.slowMoSoundFeel ?? false,
        speedRampFinale: p.speedRampFinale ?? false,
        marbleMelodySlowMoMode: p.marbleMelodySlowMoMode ?? 'calm_tempo',
      }));
    } catch (e) {
      console.warn('Could not read presets from IndexedDB:', e);
      return [];
    }
  }

  /**
   * Save a new preset
   */
  async savePreset(
    preset: Omit<SavedPreset, 'id' | 'createdAt' | 'updatedAt'>,
    userId?: string | null
  ): Promise<SavedPreset> {
    const newPreset: SavedPreset = {
      ...preset,
      id: 'preset_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      userId: userId || null,
    };

    const current = await this.getPresets(userId);
    const updated = [newPreset, ...current];

    if (userId) {
      await setIDB(`${STORAGE_KEY_CLOUD_PREFIX}${userId}`, updated);
    } else {
      await setIDB(STORAGE_KEY_LOCAL, updated);
    }

    return newPreset;
  }

  /**
   * Update / Rename an existing preset
   */
  async updatePreset(
    id: string,
    updates: Partial<SavedPreset>,
    userId?: string | null
  ): Promise<SavedPreset[]> {
    const current = await this.getPresets(userId);
    const updated = current.map((p) => {
      if (p.id === id) {
        return { ...p, ...updates, updatedAt: Date.now() };
      }
      return p;
    });

    if (userId) {
      await setIDB(`${STORAGE_KEY_CLOUD_PREFIX}${userId}`, updated);
    } else {
      await setIDB(STORAGE_KEY_LOCAL, updated);
    }

    return updated;
  }

  /**
   * Duplicate a preset
   */
  async duplicatePreset(id: string, userId?: string | null): Promise<SavedPreset[]> {
    const current = await this.getPresets(userId);
    const original = current.find((p) => p.id === id);
    if (!original) return current;

    const copy: SavedPreset = {
      ...original,
      id: 'preset_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: `${original.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updated = [copy, ...current];
    if (userId) {
      await setIDB(`${STORAGE_KEY_CLOUD_PREFIX}${userId}`, updated);
    } else {
      await setIDB(STORAGE_KEY_LOCAL, updated);
    }

    return updated;
  }

  /**
   * Delete a preset
   */
  async deletePreset(id: string, userId?: string | null): Promise<SavedPreset[]> {
    const current = await this.getPresets(userId);
    const updated = current.filter((p) => p.id !== id);

    if (userId) {
      await setIDB(`${STORAGE_KEY_CLOUD_PREFIX}${userId}`, updated);
    } else {
      await setIDB(STORAGE_KEY_LOCAL, updated);
    }

    return updated;
  }

  /**
   * Migrate guest presets into newly created or logged-in account
   */
  async migrateGuestWorkToAccount(userId: string): Promise<number> {
    try {
      const guestPresets = (await getIDB<SavedPreset[]>(STORAGE_KEY_LOCAL)) || [];
      if (guestPresets.length === 0) return 0;

      const userPresets = (await getIDB<SavedPreset[]>(`${STORAGE_KEY_CLOUD_PREFIX}${userId}`)) || [];
      const migrated = guestPresets.map((p) => ({ ...p, userId }));
      const merged = [...migrated, ...userPresets];

      await setIDB(`${STORAGE_KEY_CLOUD_PREFIX}${userId}`, merged);
      // Clean guest storage after successful migration
      await setIDB(STORAGE_KEY_LOCAL, []);
      return migrated.length;
    } catch (e) {
      console.warn('Error migrating guest presets:', e);
      return 0;
    }
  }

  /**
   * Export preset as downloadable JSON file
   */
  exportPresetToFile(preset: SavedPreset): void {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(preset, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `bounceforge_preset_${preset.name.toLowerCase().replace(/\s+/g, '_')}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
  }

  /**
   * Import preset from JSON file text
   */
  importPresetFromJson(jsonText: string): SavedPreset {
    const parsed = JSON.parse(jsonText);
    if (!parsed.modeId || !parsed.name) {
      throw new Error('Invalid BounceForge preset file format');
    }
    return {
      ...parsed,
      reelSpeed: parsed.reelSpeed !== undefined ? parsed.reelSpeed : 0.5,
      slowMoSoundFeel: parsed.slowMoSoundFeel ?? false,
      speedRampFinale: parsed.speedRampFinale ?? false,
      marbleMelodySlowMoMode: parsed.marbleMelodySlowMoMode ?? 'calm_tempo',
    } as SavedPreset;
  }

  /**
   * Generate sharable preset link
   */
  createShareLink(preset: SavedPreset): string {
    const payload = {
      m: preset.modeId,
      s: preset.seed,
      p: preset.ballPhysics,
      w: preset.wallControls,
      v: preset.visuals,
      o: preset.overlays,
      d: preset.targetDuration,
      rs: preset.reelSpeed ?? 0.5,
      sm: preset.slowMoSoundFeel ?? false,
      rf: preset.speedRampFinale ?? false,
      msm: preset.marbleMelodySlowMoMode ?? 'calm_tempo',
    };
    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    return `${window.location.origin}/studio#preset=${b64}`;
  }
}

export const presetService = PresetService.getInstance();
