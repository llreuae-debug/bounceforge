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
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-spiral-of-colored-particles-41199-large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=600&auto=format&fit=crop&q=80',
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
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-colorful-neon-lights-in-motion-42521-large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
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
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-abstract-laser-lights-background-animation-42523-large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80',
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
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-futuristic-circuits-and-technological-lights-42520-large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1519751138087-5bf79df62d5b?w=600&auto=format&fit=crop&q=80',
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
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-glowing-lines-on-a-black-background-42522-large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600&auto=format&fit=crop&q=80',
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
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-movement-of-colored-particles-in-the-dark-41198-large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
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
      if (items && items.length > 0) return items;
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
