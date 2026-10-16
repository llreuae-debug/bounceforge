import { get as getIDB, set as setIDB } from 'idb-keyval';

export type FeedbackType = 'bug' | 'idea' | 'other';
export type FeedbackStatus = 'new' | 'reviewing' | 'done';

export interface FeedbackItem {
  id: string;
  type: FeedbackType;
  message: string;
  email?: string;
  screenshotUrl?: string;
  status: FeedbackStatus;
  createdAt: number;
}

const STORAGE_KEY = 'bounceforge_feedback_entries';

const INITIAL_FEEDBACK: FeedbackItem[] = [
  {
    id: 'fb-1',
    type: 'idea',
    message: 'Love the new Sequence Break mode! Could we get an option to customize the font of the numbers on the segments?',
    email: 'creator@studio.io',
    status: 'reviewing',
    createdAt: Date.now() - 86400000 * 1,
  },
  {
    id: 'fb-2',
    type: 'bug',
    message: 'On mobile Safari iOS 17, when switching apps and coming back, the audio takes 1 tap to re-synchronize.',
    email: 'alex.m@gmail.com',
    status: 'done',
    createdAt: Date.now() - 86400000 * 3,
  },
  {
    id: 'fb-3',
    type: 'other',
    message: 'Is it possible to add a high-contrast theme for recording against brighter green-screen backgrounds?',
    email: 'vfx.artist@meta.tv',
    status: 'new',
    createdAt: Date.now() - 3600000 * 4,
  },
];

export class FeedbackService {
  private static instance: FeedbackService;

  static getInstance(): FeedbackService {
    if (!this.instance) this.instance = new FeedbackService();
    return this.instance;
  }

  async getFeedback(): Promise<FeedbackItem[]> {
    try {
      const items = await getIDB<FeedbackItem[]>(STORAGE_KEY);
      if (items && items.length > 0) return items;
      await setIDB(STORAGE_KEY, INITIAL_FEEDBACK);
      return INITIAL_FEEDBACK;
    } catch {
      return INITIAL_FEEDBACK;
    }
  }

  async submitFeedback(item: {
    type: FeedbackType;
    message: string;
    email?: string;
    screenshotUrl?: string;
  }): Promise<FeedbackItem> {
    const current = await this.getFeedback();
    const entry: FeedbackItem = {
      id: `fb-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: item.type,
      message: item.message,
      email: item.email || undefined,
      screenshotUrl: item.screenshotUrl || undefined,
      status: 'new',
      createdAt: Date.now(),
    };
    const updated = [entry, ...current];
    await setIDB(STORAGE_KEY, updated);
    return entry;
  }

  async updateStatus(id: string, status: FeedbackStatus): Promise<FeedbackItem[]> {
    const current = await this.getFeedback();
    const updated = current.map((f) => (f.id === id ? { ...f, status } : f));
    await setIDB(STORAGE_KEY, updated);
    return updated;
  }

  async deleteFeedback(id: string): Promise<FeedbackItem[]> {
    const current = await this.getFeedback();
    const updated = current.filter((f) => f.id !== id);
    await setIDB(STORAGE_KEY, updated);
    return updated;
  }
}

export const feedbackService = FeedbackService.getInstance();
