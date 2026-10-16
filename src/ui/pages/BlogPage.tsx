import React, { useState } from 'react';
import { useContentStore } from '../../content/contentStore';
import { Header } from '../Header';
import { Footer } from '../Footer';
import { ArticleCategory } from '../../content/articles';
import { Sparkles, ArrowRight, Clock, User, Search } from 'lucide-react';

export const BlogPage: React.FC = () => {
  const { articles } = useContentStore();
  const [selectedCat, setSelectedCat] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const categories = ['ALL', 'TUTORIAL', 'TIPS & TRICKS', 'INSIGHTS'];

  const filtered = articles.filter((art) => {
    const matchCat = selectedCat === 'ALL' || art.category === selectedCat;
    const matchSearch =
      art.title.toLowerCase().includes(search.toLowerCase()) ||
      art.excerpt.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="min-h-screen bg-[#07090f] text-slate-100 flex flex-col font-sans select-none">
      <Header />

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-16 space-y-12 w-full">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-xs font-mono font-bold text-purple-400 uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            CREATOR ACADEMY &amp; ARCHIVE
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
            Viral Physics Mastery
          </h1>
          <p className="text-sm text-slate-300">
            Battle-tested strategies, neuroscience insights, and monetization tactics for high-retention short-form videos.
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer whitespace-nowrap ${
                  selectedCat === cat
                    ? 'bg-purple-600 text-white font-extrabold shadow-md shadow-purple-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search articles..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
            />
          </div>
        </div>

        {/* Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((art) => (
            <div
              key={art.id}
              onClick={() => {
                window.location.href = `/blog/${art.slug}`;
              }}
              className="p-6 rounded-3xl bg-[#0e121a] border border-white/10 hover:border-purple-500/40 transition-all flex flex-col justify-between cursor-pointer group hover:bg-[#121622] space-y-4"
            >
              <div className="space-y-3">
                <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${art.categoryColor}`}>
                  {art.category}
                </span>
                <h3 className="text-base font-black text-white group-hover:text-cyan-400 transition-colors uppercase leading-snug">
                  {art.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                  {art.excerpt}
                </p>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1 font-mono text-[11px]">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  {art.readTimeMinutes} min read
                </span>
                <span className="text-pink-400 font-bold group-hover:text-pink-300 flex items-center gap-1">
                  Read Article
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
};
