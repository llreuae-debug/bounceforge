import React from 'react';
import { useContentStore } from '../../content/contentStore';
import { Header } from '../Header';
import { Footer } from '../Footer';
import { Clock, ArrowLeft, ArrowRight, Share2, Sparkles, CheckCircle2 } from 'lucide-react';
import { useStudioStore } from '../../store/useStudioStore';

interface ArticlePageProps {
  slug?: string;
}

export const ArticlePage: React.FC<ArticlePageProps> = ({ slug }) => {
  const currentSlug = slug || window.location.pathname.replace('/blog/', '').replace(/\/$/, '');
  const { getArticleBySlug, articles } = useContentStore();
  const { showToast } = useStudioStore();

  const article = getArticleBySlug(currentSlug) || articles[0];

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    showToast('Article link copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-[#07090f] text-slate-100 flex flex-col font-sans select-none">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10 w-full">
        {/* Back Link */}
        <div>
          <a
            href="/blog"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Academy Archive</span>
          </a>
        </div>

        {/* Article Header */}
        <header className="space-y-4 border-b border-white/10 pb-8">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${article.categoryColor}`}>
              {article.category}
            </span>
            <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {article.readTimeMinutes} min read
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight leading-tight">
            {article.title}
          </h1>

          <p className="text-base text-slate-300 leading-relaxed font-normal">
            {article.excerpt}
          </p>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              <img src={article.author.avatar} alt="" className="w-10 h-10 rounded-full object-cover border border-white/20" />
              <div>
                <div className="text-xs font-bold text-white">{article.author.name}</div>
                <div className="text-[10px] text-slate-400">{article.author.role}</div>
              </div>
            </div>

            <button
              onClick={handleShare}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
          </div>
        </header>

        {/* Article Body Content */}
        <article className="prose prose-invert max-w-none space-y-6 text-sm text-slate-300 leading-relaxed">
          {article.content.split('\n\n').map((paragraph, idx) => {
            if (paragraph.startsWith('# ')) {
              return null; // Skip main title already shown
            }
            if (paragraph.startsWith('## ')) {
              return (
                <h2 key={idx} className="text-xl sm:text-2xl font-black text-white uppercase tracking-wide pt-4">
                  {paragraph.replace('## ', '')}
                </h2>
              );
            }
            if (paragraph.startsWith('---')) {
              return <hr key={idx} className="border-white/10 my-6" />;
            }
            return (
              <p key={idx} className="leading-relaxed">
                {paragraph}
              </p>
            );
          })}
        </article>

        {/* Call to Action Box */}
        <div className="p-8 rounded-3xl bg-gradient-to-r from-cyan-500/10 via-[#0e121a] to-purple-500/10 border border-cyan-500/30 text-center space-y-4 shadow-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold uppercase font-mono">
            <Sparkles className="w-3.5 h-3.5" />
            CREATE YOUR NEXT SHORT
          </div>
          <h3 className="text-2xl font-black text-white uppercase">Ready to make viral physics videos?</h3>
          <p className="text-xs text-slate-300 max-w-md mx-auto">
            Test all 47 simulation modes, tune procedural audio notes, and export in 4K UHD 60fps.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <a
              href="/studio"
              className="px-6 py-3 rounded-xl bg-[#00e599] hover:bg-[#05fca8] text-black font-black text-xs uppercase tracking-wider transition-all"
            >
              Launch Studio Free
            </a>
            <a
              href="/pricing"
              className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase transition-all"
            >
              View Creator Pro Plans
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
