import React, { useState, useEffect } from 'react';
import {
  Copy,
  Check,
  Download,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  Clock,
  FileText,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { SeoPack, formatSeoPackAsText } from '../../ai/seoEngine';
import { TrendsManager } from '../../ai/trendsManager';
import { useStudioStore } from '../../store/useStudioStore';
import { copyText } from '../../platform/clipboard';

interface SeoPackViewerProps {
  seoPack: SeoPack;
  modeName: string;
  onOpenTrendsAdmin?: () => void;
  onApplyHookTweak?: (newHook: string) => void;
}

export const SeoPackViewer: React.FC<SeoPackViewerProps> = ({
  seoPack,
  modeName,
  onOpenTrendsAdmin,
  onApplyHookTweak,
}) => {
  const { showToast } = useStudioStore();
  const [platform, setPlatform] = useState<'tiktok' | 'reels' | 'shorts'>('tiktok');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [trendsUpdated, setTrendsUpdated] = useState<string>('');
  const [isTrendsOutdated, setIsTrendsOutdated] = useState(false);

  useEffect(() => {
    TrendsManager.getInstance().getTrends().then(({ data, isOutdated }) => {
      setTrendsUpdated(data.updated);
      setIsTrendsOutdated(isOutdated);
    });
  }, []);

  const handleCopy = async (key: string, text: string, maxLength?: number) => {
    if (maxLength && text.length > maxLength) {
      showToast(`cannot copy: exceeds ${maxLength} character limit`);
      return;
    }
    const ok = await copyText(text);
    setCopiedKey(key);
    showToast(ok ? 'copied to clipboard' : 'could not copy text automatically');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadTxt = () => {
    const text = formatSeoPackAsText(seoPack, modeName);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seo_${seoPack.common.fileName.replace('.mp4', '.txt')}`;
    a.click();
    showToast('seo pack downloaded as .txt');
  };

  return (
    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4 font-sans text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
              Platform SEO Pack
              {seoPack.isAi && (
                <span className="px-1.5 py-0.2 rounded-full bg-pink-500/20 text-pink-400 text-[9px] font-mono border border-pink-500/30">
                  ai
                </span>
              )}
            </h3>
            <span className="text-[10px] text-slate-400">Tuned for viral algorithmic reach</span>
          </div>
        </div>

        {/* Trends Status & Admin Trigger */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenTrendsAdmin}
            className="text-[10px] font-mono text-slate-400 hover:text-cyan-300 flex items-center gap-1 bg-white/5 px-2 py-1 rounded-md border border-white/5"
            title="Edit trending keywords"
          >
            <TrendingUp className="w-3 h-3 text-pink-400" />
            <span>trends: {trendsUpdated ? new Date(trendsUpdated).toLocaleDateString() : 'loading'}</span>
            {isTrendsOutdated && <span className="text-amber-400 font-bold ml-1">(!stale)</span>}
          </button>

          <button
            type="button"
            onClick={handleDownloadTxt}
            className="btn-3d-glass px-2.5 py-1 rounded-lg text-xs font-bold text-white flex items-center gap-1.5"
            title="Download full SEO pack as .txt"
          >
            <Download className="w-3 h-3 text-cyan-400" />
            <span>.txt pack</span>
          </button>
        </div>
      </div>

      {/* Outdated Trends Warning */}
      {isTrendsOutdated && (
        <div className="flex items-center gap-2 text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>trends updated &gt;14 days ago; suggestions may not reflect the latest platform shifts.</span>
        </div>
      )}

      {/* Platform Tabs */}
      <div className="flex rounded-xl bg-black/40 p-1 border border-white/5 gap-1">
        <button
          type="button"
          onClick={() => setPlatform('tiktok')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
            platform === 'tiktok'
              ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          TikTok
        </button>
        <button
          type="button"
          onClick={() => setPlatform('reels')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
            platform === 'reels'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Instagram Reels
        </button>
        <button
          type="button"
          onClick={() => setPlatform('shorts')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
            platform === 'shorts'
              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          YouTube Shorts
        </button>
      </div>

      {/* TIKTOK TAB */}
      {platform === 'tiktok' && (
        <div className="space-y-3">
          {/* On-screen keyword check */}
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {seoPack.tiktok.onscreenCheck.passes ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <div className="text-[11px]">
                <span className="font-bold text-white block">
                  {seoPack.tiktok.onscreenCheck.passes
                    ? `On-Screen Search Keyword: "${seoPack.tiktok.onscreenCheck.detectedKeyword}"`
                    : 'No searchable keyword found in hook'}
                </span>
                {!seoPack.tiktok.onscreenCheck.passes && seoPack.tiktok.onscreenCheck.suggestedTweak && (
                  <span className="text-slate-400 text-[10px]">
                    Suggestion: "{seoPack.tiktok.onscreenCheck.suggestedTweak}"
                  </span>
                )}
              </div>
            </div>

            {!seoPack.tiktok.onscreenCheck.passes &&
              seoPack.tiktok.onscreenCheck.suggestedTweak &&
              onApplyHookTweak && (
                <button
                  type="button"
                  onClick={() => onApplyHookTweak(seoPack.tiktok.onscreenCheck.suggestedTweak!)}
                  className="btn-3d-cyan px-2.5 py-1 rounded-lg text-[10px] font-bold text-black uppercase"
                >
                  apply tweak
                </button>
              )}
          </div>

          {/* Caption */}
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-400">TikTok Caption (Keywords First)</span>
              <span className="text-[10px] font-mono text-slate-500">{seoPack.tiktok.caption.length} chars</span>
            </div>
            <p className="text-xs text-white leading-relaxed">{seoPack.tiktok.caption}</p>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => handleCopy('tt_cap', seoPack.tiktok.caption)}
                className="btn-3d-glass px-2.5 py-1 rounded-lg text-xs font-bold text-cyan-300 flex items-center gap-1"
              >
                {copiedKey === 'tt_cap' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>copy caption</span>
              </button>
            </div>
          </div>

          {/* Hashtags */}
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-400">
                Hashtags ({seoPack.tiktok.hashtags.length})
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {seoPack.tiktok.hashtags.join(' ').length} chars
              </span>
            </div>
            <p className="text-xs text-cyan-300 font-mono">{seoPack.tiktok.hashtags.join(' ')}</p>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => handleCopy('tt_hash', seoPack.tiktok.hashtags.join(' '))}
                className="btn-3d-glass px-2.5 py-1 rounded-lg text-xs font-bold text-cyan-300 flex items-center gap-1"
              >
                {copiedKey === 'tt_hash' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>copy hashtags</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INSTAGRAM REELS TAB */}
      {platform === 'reels' && (
        <div className="space-y-3">
          {/* Caption */}
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-400">Reels Caption</span>
              <span className="text-[10px] font-mono text-slate-500">{seoPack.reels.caption.length} chars</span>
            </div>
            <p className="text-xs text-white leading-relaxed">{seoPack.reels.caption}</p>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => handleCopy('reels_cap', seoPack.reels.caption)}
                className="btn-3d-glass px-2.5 py-1 rounded-lg text-xs font-bold text-cyan-300 flex items-center gap-1"
              >
                {copiedKey === 'reels_cap' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>copy caption</span>
              </button>
            </div>
          </div>

          {/* Hashtags */}
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-400">
                Hashtags ({seoPack.reels.hashtags.length})
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {seoPack.reels.hashtags.join(' ').length} chars
              </span>
            </div>
            <p className="text-xs text-purple-300 font-mono">{seoPack.reels.hashtags.join(' ')}</p>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => handleCopy('reels_hash', seoPack.reels.hashtags.join(' '))}
                className="btn-3d-glass px-2.5 py-1 rounded-lg text-xs font-bold text-cyan-300 flex items-center gap-1"
              >
                {copiedKey === 'reels_hash' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>copy hashtags</span>
              </button>
            </div>
          </div>

          {/* Alt Text & Cover Text */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-slate-400">Accessibility Alt Text</span>
              </div>
              <p className="text-[11px] text-slate-300">{seoPack.reels.altText}</p>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => handleCopy('reels_alt', seoPack.reels.altText)}
                  className="btn-3d-glass px-2 py-0.5 rounded-md text-[10.5px] font-bold text-cyan-300 flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" /> copy alt text
                </button>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-slate-400">Cover Frame Text</span>
              </div>
              <p className="text-[11px] text-pink-300 font-bold">{seoPack.reels.coverText}</p>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => handleCopy('reels_cover', seoPack.reels.coverText)}
                  className="btn-3d-glass px-2 py-0.5 rounded-md text-[10.5px] font-bold text-cyan-300 flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" /> copy cover text
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* YOUTUBE SHORTS TAB */}
      {platform === 'shorts' && (
        <div className="space-y-3">
          {/* Title */}
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-400">Shorts Title (Max 100 chars)</span>
              <span
                className={`text-[10px] font-mono font-bold ${
                  seoPack.shorts.title.length > 100 ? 'text-red-400' : 'text-slate-400'
                }`}
              >
                {seoPack.shorts.title.length} / 100
              </span>
            </div>
            <p className="text-xs text-white font-medium">{seoPack.shorts.title}</p>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                disabled={seoPack.shorts.title.length > 100}
                onClick={() => handleCopy('sh_title', seoPack.shorts.title, 100)}
                className={`btn-3d-glass px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
                  seoPack.shorts.title.length > 100 ? 'opacity-50 cursor-not-allowed text-red-400' : 'text-cyan-300'
                }`}
              >
                {copiedKey === 'sh_title' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>copy title</span>
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-400">Description (With #shorts)</span>
              <span className="text-[10px] font-mono text-slate-500">{seoPack.shorts.description.length} chars</span>
            </div>
            <p className="text-xs text-slate-300 whitespace-pre-line">{seoPack.shorts.description}</p>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => handleCopy('sh_desc', seoPack.shorts.description)}
                className="btn-3d-glass px-2.5 py-1 rounded-lg text-xs font-bold text-cyan-300 flex items-center gap-1"
              >
                {copiedKey === 'sh_desc' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>copy description</span>
              </button>
            </div>
          </div>

          {/* Tags */}
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-400">YouTube Tags (Max 500 chars)</span>
              <span
                className={`text-[10px] font-mono font-bold ${
                  seoPack.shorts.tags.length > 500 ? 'text-red-400' : 'text-slate-400'
                }`}
              >
                {seoPack.shorts.tags.length} / 500
              </span>
            </div>
            <p className="text-xs text-cyan-300 font-mono truncate">{seoPack.shorts.tags}</p>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                disabled={seoPack.shorts.tags.length > 500}
                onClick={() => handleCopy('sh_tags', seoPack.shorts.tags, 500)}
                className={`btn-3d-glass px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
                  seoPack.shorts.tags.length > 500 ? 'opacity-50 cursor-not-allowed text-red-400' : 'text-cyan-300'
                }`}
              >
                {copiedKey === 'sh_tags' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>copy tags</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Common Metadata Across All Platforms */}
      <div className="p-3 rounded-xl bg-black/50 border border-white/5 space-y-2 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Recommended File Name</span>
          <button
            type="button"
            onClick={() => handleCopy('fn', seoPack.common.fileName)}
            className="text-[10.5px] font-mono text-cyan-300 hover:underline flex items-center gap-1"
          >
            <Copy className="w-3 h-3" /> copy
          </button>
        </div>
        <p className="font-mono text-slate-200 text-[11px] truncate">{seoPack.common.fileName}</p>

        <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Pinned Comment</span>
          <button
            type="button"
            onClick={() => handleCopy('pin', seoPack.common.pinnedComment)}
            className="text-[10.5px] font-mono text-cyan-300 hover:underline flex items-center gap-1"
          >
            <Copy className="w-3 h-3" /> copy
          </button>
        </div>
        <p className="text-slate-300 text-[11px] italic">"{seoPack.common.pinnedComment}"</p>

        <div className="pt-2 border-t border-white/5 text-[10.5px] font-mono text-emerald-400 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>{seoPack.common.bestPostingWindow}</span>
        </div>
      </div>
    </div>
  );
};
