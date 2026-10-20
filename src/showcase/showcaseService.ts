import { get as getIDB, set as setIDB } from 'idb-keyval';

export interface ShowcaseItem {
  id: string;
  title: string;
  modeId: string;
  modeName: string;
  seed: number;
  videoUrl: string;
  posterUrl: string;
  views: string;
  likes: string;
  sound: string;
  createdAt: number;
}

const STORAGE_KEY = 'bounceforge_showcase_items';

const DEFAULT_SHOWCASE_ITEMS: ShowcaseItem[] = [
  {
    id: 'sc-1',
    title: 'Can it break through 12 sequence rings??',
    modeId: 'sequence_break',
    modeName: 'Sequence Break',
    seed: 74218,
    videoUrl: '/showcase/sc-1.mp4',
    posterUrl: '/showcase/sc-1.jpg',
    views: '4.8M',
    likes: '620K',
    sound: 'Numbered Impact ASMR',
    createdAt: Date.now() - 86400000 * 2,
  },
  {
    id: 'sc-2',
    title: 'Color matching lock escape in 59.8s',
    modeId: 'color_lock',
    modeName: 'Color Lock',
    seed: 39182,
    videoUrl: '/showcase/sc-2.mp4',
    posterUrl: '/showcase/sc-2.jpg',
    views: '3.1M',
    likes: '410K',
    sound: 'Harmonic Chord Match',
    createdAt: Date.now() - 86400000 * 4,
  },
  {
    id: 'sc-3',
    title: 'Portal wear breakdown: 5-use limit!',
    modeId: 'portal_rings',
    modeName: 'Portal Rings',
    seed: 88204,
    videoUrl: '/showcase/sc-3.mp4',
    posterUrl: '/showcase/sc-3.jpg',
    views: '2.5M',
    likes: '345K',
    sound: 'Glass Pop & Shard Burst',
    createdAt: Date.now() - 86400000 * 6,
  },
  {
    id: 'sc-4',
    title: 'Freeze timer stacking: 1 ball remaining!',
    modeId: 'accumulation',
    modeName: 'Accumulation',
    seed: 62019,
    videoUrl: '/showcase/sc-4.mp4',
    posterUrl: '/showcase/sc-4.jpg',
    views: '1.9M',
    likes: '280K',
    sound: 'Crystal Chime & Wood Click',
    createdAt: Date.now() - 86400000 * 8,
  },
  {
    id: 'sc-5',
    title: 'Rainbow Flow Speed Run: Bounce Boost +4%',
    modeId: 'sand_fill',
    modeName: 'Sand Fill',
    seed: 51204,
    videoUrl: '/showcase/sc-5.mp4',
    posterUrl: '/showcase/sc-5.jpg',
    views: '5.2M',
    likes: '710K',
    sound: 'Kalimba Dream Melodies',
    createdAt: Date.now() - 86400000 * 10,
  },
  {
    id: 'sc-6',
    title: 'Grand Piano 240Hz Harmonic Resonance',
    modeId: 'pendulum_wave',
    modeName: 'Pendulum Wave',
    seed: 90124,
    videoUrl: '/showcase/sc-6.mp4',
    posterUrl: '/showcase/sc-6.jpg',
    views: '3.7M',
    likes: '512K',
    sound: 'Acoustic Grand Piano',
    createdAt: Date.now() - 86400000 * 12,
  },
];

export class ShowcaseService {
  private static instance: ShowcaseService;

  static getInstance(): ShowcaseService {
    if (!this.instance) this.instance = new ShowcaseService();
    return this.instance;
  }

  async getShowcaseItems(): Promise<ShowcaseItem[]> {
    try {
      const items = await getIDB<ShowcaseItem[]>(STORAGE_KEY);
      if (items && items.length > 0) {
        // Older saved copies pointed the built-in entries at hotlinked stock clips: use our own renders
        const fixed = items.map((it) => {
          const def = DEFAULT_SHOWCASE_ITEMS.find((d) => d.id === it.id);
          return def && /mixkit\.co|unsplash\.com/.test(`${it.videoUrl} ${it.posterUrl}`) ? { ...it, videoUrl: def.videoUrl, posterUrl: def.posterUrl } : it;
        });
        if (fixed.some((it, i) => it !== items[i])) await setIDB(STORAGE_KEY, fixed);
        return fixed;
      }
      await setIDB(STORAGE_KEY, DEFAULT_SHOWCASE_ITEMS);
      return DEFAULT_SHOWCASE_ITEMS;
    } catch {
      return DEFAULT_SHOWCASE_ITEMS;
    }
  }

  async addItem(item: Omit<ShowcaseItem, 'id' | 'createdAt'>): Promise<ShowcaseItem[]> {
    const current = await this.getShowcaseItems();
    const newItem: ShowcaseItem = {
      ...item,
      id: `sc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: Date.now(),
    };
    const updated = [newItem, ...current];
    await setIDB(STORAGE_KEY, updated);
    return updated;
  }

  async removeItem(id: string): Promise<ShowcaseItem[]> {
    const current = await this.getShowcaseItems();
    const updated = current.filter((item) => item.id !== id);
    await setIDB(STORAGE_KEY, updated);
    return updated;
  }
}

export const showcaseService = ShowcaseService.getInstance();
