import { create } from 'zustand';
import { Article, INITIAL_ARTICLES } from './articles';

const STORAGE_KEY_ARTICLES = 'bounceforge_db_articles';

interface ContentState {
  articles: Article[];
  
  // Actions
  getArticleBySlug: (slug: string) => Article | undefined;
  getFeaturedArticles: () => Article[];
  createArticle: (article: Omit<Article, 'id'>) => Article;
  updateArticle: (id: string, updates: Partial<Article>) => void;
  deleteArticle: (id: string) => void;
}

export const useContentStore = create<ContentState>((set, get) => {
  let initial = INITIAL_ARTICLES;
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ARTICLES);
      if (raw) initial = JSON.parse(raw);
      else localStorage.setItem(STORAGE_KEY_ARTICLES, JSON.stringify(INITIAL_ARTICLES));
    } catch {}
  }

  return {
    articles: initial,

    getArticleBySlug: (slug) => {
      return get().articles.find((a) => a.slug === slug);
    },

    getFeaturedArticles: () => {
      return get().articles.filter((a) => a.featured).slice(0, 4);
    },

    createArticle: (articleData) => {
      const newArticle: Article = {
        ...articleData,
        id: 'art_' + Math.random().toString(36).slice(2, 10),
      };
      const updated = [newArticle, ...get().articles];
      set({ articles: updated });
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_ARTICLES, JSON.stringify(updated));
      }
      return newArticle;
    },

    updateArticle: (id, updates) => {
      const updated = get().articles.map((a) => (a.id === id ? { ...a, ...updates } : a));
      set({ articles: updated });
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_ARTICLES, JSON.stringify(updated));
      }
    },

    deleteArticle: (id) => {
      const updated = get().articles.filter((a) => a.id !== id);
      set({ articles: updated });
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_ARTICLES, JSON.stringify(updated));
      }
    },
  };
});
