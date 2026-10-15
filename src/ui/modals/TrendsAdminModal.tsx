import React, { useState, useEffect } from 'react';
import { X, TrendingUp, Lock, Check, AlertCircle, Save } from 'lucide-react';
import { TrendsManager, TrendPackData } from '../../ai/trendsManager';
import { useStudioStore } from '../../store/useStudioStore';

interface TrendsAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TrendsAdminModal: React.FC<TrendsAdminModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useStudioStore();
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [keywordsText, setKeywordsText] = useState('');
  const [hashtagsText, setHashtagsText] = useState('');
  const [updatedDate, setUpdatedDate] = useState('');
  const [isOutdated, setIsOutdated] = useState(false);

  useEffect(() => {
    if (isOpen) {
      TrendsManager.getInstance().getTrends().then(({ data, isOutdated }) => {
        setKeywordsText(data.trendingKeywords.join(', '));
        setHashtagsText(data.trendingHashtags.join(' '));
        setUpdatedDate(data.updated);
        setIsOutdated(isOutdated);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAuthorize = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      showToast('please enter admin password');
      return;
    }
    // We allow user to view editor and verify on save
    setIsAuthorized(true);
  };

  const handleSave = async () => {
    setLoading(true);
    const keywords = keywordsText.split(',').map((s) => s.trim()).filter(Boolean);
    const hashtags = hashtagsText.split(/\s+/).map((s) => s.trim()).filter(Boolean);

    const data: TrendPackData = {
      updated: new Date().toISOString(),
      category: 'satisfying_physics_asmr',
      trendingKeywords: keywords,
      trendingHashtags: hashtags,
      hookStyles: ['curiosity', 'challenge', 'prediction', 'countdown', 'asmr'],
      popularFormats: ['60s countdown to 0.0', '100 rings speed cascade', 'prediction card start'],
    };

    const result = await TrendsManager.getInstance().saveTrends(password, data);
    setLoading(false);

    if (result.success) {
      showToast('trend pack updated successfully');
      setUpdatedDate(new Date().toISOString());
      setIsOutdated(false);
      onClose();
    } else {
      showToast(`error: ${result.error || 'invalid password'}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-[#0a0d14] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-pink-400" />
            <h2 className="text-xs font-black uppercase tracking-wider text-white">Trend Pack Admin</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 border-b border-white/5 pb-2">
            <span>Last Updated: {updatedDate ? new Date(updatedDate).toLocaleDateString() : 'Loading...'}</span>
            {isOutdated ? (
              <span className="text-amber-400 flex items-center gap-1 font-bold">
                <AlertCircle className="w-3 h-3" /> trends may be outdated (&gt;14 days)
              </span>
            ) : (
              <span className="text-emerald-400 flex items-center gap-1 font-bold">
                <Check className="w-3 h-3" /> fresh &amp; active
              </span>
            )}
          </div>

          {!isAuthorized ? (
            <form onSubmit={handleAuthorize} className="space-y-3 py-4">
              <p className="text-xs text-slate-300">
                Enter your admin password to edit the trending keywords and hashtag pack:
              </p>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Lock className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="ADMIN_PASSWORD"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white outline-none focus:border-pink-400"
                  />
                </div>
                <button
                  type="submit"
                  className="btn-3d-pink px-4 py-1.5 rounded-xl text-black font-black text-xs uppercase"
                >
                  unlock
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">
                  Trending Keywords (comma separated)
                </label>
                <textarea
                  value={keywordsText}
                  onChange={(e) => setKeywordsText(e.target.value)}
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">
                  Trending Hashtags (space separated)
                </label>
                <textarea
                  value={hashtagsText}
                  onChange={(e) => setHashtagsText(e.target.value)}
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-cyan-300 outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-3d-glass px-4 py-2 rounded-xl text-slate-300 text-xs font-bold"
                >
                  cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={loading}
                  className="btn-3d-lime px-4 py-2 rounded-xl text-black text-xs font-black uppercase flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{loading ? 'saving...' : 'save changes'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
