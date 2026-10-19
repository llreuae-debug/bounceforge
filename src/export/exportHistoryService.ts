import { get as getIDB, set as setIDB } from 'idb-keyval';

export interface ExportedVideoRecord {
  id: string;
  title: string;
  modeId: string;
  presetName?: string;
  createdAt: number;
  duration: number;
  resolution: string;
  fps: number;
  downloadUrl?: string;
  thumbnailUrl?: string;
  seoPack?: {
    title: string;
    caption: string;
    hashtags: string[];
  };
}

const STORAGE_KEY_EXPORTS = 'bounceforge_exported_videos';

export const exportHistoryService = {
  async getAll(): Promise<ExportedVideoRecord[]> {
    if (typeof window === 'undefined') return [];
    try {
      const records = (await getIDB<ExportedVideoRecord[]>(STORAGE_KEY_EXPORTS)) || [];
      return records.sort((a, b) => b.createdAt - a.createdAt);
    } catch (e) {
      console.warn('Failed to load export history', e);
      return [];
    }
  },

  async addRecord(record: Omit<ExportedVideoRecord, 'id' | 'createdAt'>): Promise<ExportedVideoRecord> {
    const fullRecord: ExportedVideoRecord = {
      ...record,
      id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: Date.now(),
    };
    try {
      const list = await this.getAll();
      const updated = [fullRecord, ...list].slice(0, 50); // Keep last 50 exports
      await setIDB(STORAGE_KEY_EXPORTS, updated);
    } catch (e) {
      console.warn('Failed to save export record', e);
    }
    return fullRecord;
  },

  async deleteRecord(id: string): Promise<void> {
    try {
      const list = await this.getAll();
      const updated = list.filter((r) => r.id !== id);
      await setIDB(STORAGE_KEY_EXPORTS, updated);
    } catch (e) {
      console.warn('Failed to delete export record', e);
    }
  },

  async clearAll(): Promise<void> {
    try {
      await setIDB(STORAGE_KEY_EXPORTS, []);
    } catch (e) {
      console.warn('Failed to clear export history', e);
    }
  },
};
