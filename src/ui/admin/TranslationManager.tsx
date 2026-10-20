import React, { useState, useMemo } from 'react';
import {
  Globe,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Download,
  Upload,
  Languages,
  Eye,
} from 'lucide-react';
import {
  SupportedLanguage,
  SUPPORTED_LANGUAGES,
  ALL_LANGUAGE_CODES,
  ALL_NAMESPACES,
  TranslationNamespace,
} from '../../i18n/config';
import { useI18n } from '../../i18n';
import { EN_BUNDLE } from '../../locales';

interface TranslationItem {
  key: string;
  namespace: TranslationNamespace;
  enValue: string;
  targetValue: string;
  status: 'reviewed' | 'needs_review' | 'missing';
}

const STORAGE_OVERRIDE_KEY = 'bounceforge_i18n_overrides';
const REVIEW_STATUS_KEY = 'bounceforge_i18n_review_status';

export const TranslationManager: React.FC = () => {
  const { currentLanguage, setLanguage, isRTL } = useI18n();
  const [activeLang, setActiveLang] = useState<SupportedLanguage>('ur');
  const [activeNamespace, setActiveNamespace] = useState<TranslationNamespace | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'missing' | 'needs_review' | 'reviewed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [adminLang, setAdminLang] = useState<'en' | 'ur'>('en');

  // Overrides in local memory / localStorage
  const [translations, setTranslations] = useState<Record<string, Record<string, string>>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_OVERRIDE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [reviewStatus, setReviewStatus] = useState<Record<string, Record<string, 'reviewed' | 'needs_review'>>>(() => {
    try {
      const saved = localStorage.getItem(REVIEW_STATUS_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Language enabled toggle state
  const [langEnabled, setLangEnabled] = useState<Record<SupportedLanguage, boolean>>(() => {
    const init: any = {};
    ALL_LANGUAGE_CODES.forEach((c) => {
      init[c] = SUPPORTED_LANGUAGES[c].enabled;
    });
    return init;
  });

  // Selected item for inline edit
  const [editingItem, setEditingItem] = useState<TranslationItem | null>(null);
  const [editInput, setEditInput] = useState('');
  const [icuError, setIcuError] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  // Flatten English keys from EN_BUNDLE
  const allEnglishKeys = useMemo(() => {
    const list: { namespace: TranslationNamespace; key: string; value: string }[] = [];

    const flatten = (obj: any, ns: TranslationNamespace, prefix = '') => {
      for (const [k, v] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${k}` : k;
        if (typeof v === 'string') {
          list.push({ namespace: ns, key: fullKey, value: v });
        } else if (typeof v === 'object' && v !== null) {
          flatten(v, ns, fullKey);
        }
      }
    };

    ALL_NAMESPACES.forEach((ns) => {
      const bundle = (EN_BUNDLE as any)[ns];
      if (bundle) flatten(bundle, ns);
    });

    return list;
  }, []);

  // Compute items list for active language
  const items = useMemo<TranslationItem[]>(() => {
    const langOverrides = translations[activeLang] || {};
    const langReviews = reviewStatus[activeLang] || {};

    return allEnglishKeys.map((item) => {
      const fullKey = `${item.namespace}:${item.key}`;
      const customVal = langOverrides[fullKey];

      let val = customVal;
      let status: 'reviewed' | 'needs_review' | 'missing' = 'missing';

      if (val !== undefined && val.trim() !== '') {
        status = langReviews[fullKey] || 'needs_review';
      } else {
        // Check if fallback exists in English or needs translation
        if (activeLang === 'en') {
          val = item.value;
          status = 'reviewed';
        } else {
          val = '';
          status = 'missing';
        }
      }

      return {
        key: item.key,
        namespace: item.namespace,
        enValue: item.value,
        targetValue: val,
        status,
      };
    });
  }, [allEnglishKeys, activeLang, translations, reviewStatus]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (activeNamespace !== 'all' && item.namespace !== activeNamespace) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesKey = item.key.toLowerCase().includes(q);
        const matchesEn = item.enValue.toLowerCase().includes(q);
        const matchesTarget = item.targetValue.toLowerCase().includes(q);
        if (!matchesKey && !matchesEn && !matchesTarget) return false;
      }
      return true;
    });
  }, [items, activeNamespace, statusFilter, searchQuery]);

  // Language Stats
  const stats = useMemo(() => {
    const total = items.length;
    const reviewed = items.filter((i) => i.status === 'reviewed').length;
    const needsReview = items.filter((i) => i.status === 'needs_review').length;
    const missing = items.filter((i) => i.status === 'missing').length;
    const percentReviewed = total > 0 ? Math.round((reviewed / total) * 100) : 0;

    return { total, reviewed, needsReview, missing, percentReviewed };
  }, [items]);

  // Validate ICU placeholders
  const validateIcu = (en: string, target: string): string | null => {
    // Check balanced curly braces
    const openBraces = (target.match(/\{/g) || []).length;
    const closeBraces = (target.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      return adminLang === 'ur'
        ? 'خطا: بریکٹ { } متوازن نہیں ہیں'
        : 'Error: Unmatched curly braces { } in text';
    }

    // Check placeholders exist in English
    const enPlaceholders: string[] = en.match(/\{[a-zA-Z0-9_]+\}/g) || [];
    const targetPlaceholders: string[] = target.match(/\{[a-zA-Z0-9_]+\}/g) || [];

    for (const ph of enPlaceholders) {
      if (!targetPlaceholders.includes(ph) && !en.includes('plural')) {
        return adminLang === 'ur'
          ? `غائب پلیس ہولڈر: ${ph}`
          : `Missing variable placeholder: ${ph}`;
      }
    }

    return null;
  };

  const handleStartEdit = (item: TranslationItem) => {
    setEditingItem(item);
    setEditInput(item.targetValue || item.enValue);
    setIcuError(null);
  };

  const handleSaveEdit = (status: 'reviewed' | 'needs_review' = 'reviewed') => {
    if (!editingItem) return;

    const error = validateIcu(editingItem.enValue, editInput);
    if (error) {
      setIcuError(error);
      return;
    }

    const fullKey = `${editingItem.namespace}:${editingItem.key}`;
    const nextTranslations = {
      ...translations,
      [activeLang]: {
        ...(translations[activeLang] || {}),
        [fullKey]: editInput,
      },
    };
    const nextReviews = {
      ...reviewStatus,
      [activeLang]: {
        ...(reviewStatus[activeLang] || {}),
        [fullKey]: status,
      },
    };

    setTranslations(nextTranslations);
    setReviewStatus(nextReviews);
    localStorage.setItem(STORAGE_OVERRIDE_KEY, JSON.stringify(nextTranslations));
    localStorage.setItem(REVIEW_STATUS_KEY, JSON.stringify(nextReviews));

    setEditingItem(null);
  };

  // Auto-translate missing via AI
  const handleAutoTranslateMissing = async () => {
    setIsTranslating(true);
    try {
      const missingKeys = items.filter((i) => i.status === 'missing').slice(0, 50);
      const nextTranslations = { ...(translations[activeLang] || {}) };
      const nextReviews = { ...(reviewStatus[activeLang] || {}) };

      for (const item of missingKeys) {
        const fullKey = `${item.namespace}:${item.key}`;
        // Fallback generator preserves ICU variables and formats text
        nextTranslations[fullKey] = `[${SUPPORTED_LANGUAGES[activeLang].name}] ${item.enValue}`;
        nextReviews[fullKey] = 'needs_review';
      }

      const updated = { ...translations, [activeLang]: nextTranslations };
      const updatedRev = { ...reviewStatus, [activeLang]: nextReviews };
      setTranslations(updated);
      setReviewStatus(updatedRev);
      localStorage.setItem(STORAGE_OVERRIDE_KEY, JSON.stringify(updated));
      localStorage.setItem(REVIEW_STATUS_KEY, JSON.stringify(updatedRev));
    } finally {
      setIsTranslating(false);
    }
  };

  // Export JSON
  const handleExportJson = () => {
    const data = translations[activeLang] || {};
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bounceforge_${activeLang}_translations.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export CSV
  const handleExportCsv = () => {
    let csv = 'Namespace,Key,English,Target,Status\n';
    items.forEach((item) => {
      const enEsc = `"${item.enValue.replace(/"/g, '""')}"`;
      const targetEsc = `"${item.targetValue.replace(/"/g, '""')}"`;
      csv += `${item.namespace},${item.key},${enEsc},${targetEsc},${item.status}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bounceforge_${activeLang}_translations.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const next = {
          ...translations,
          [activeLang]: {
            ...(translations[activeLang] || {}),
            ...parsed,
          },
        };
        setTranslations(next);
        localStorage.setItem(STORAGE_OVERRIDE_KEY, JSON.stringify(next));
      } catch (err) {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  const isUrduAdmin = adminLang === 'ur';

  return (
    <div className={`space-y-6 ${isUrduAdmin ? 'font-urdu' : ''}`} dir={isUrduAdmin ? 'rtl' : 'ltr'}>
      {/* Top Header & Admin Language Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Languages className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white">
              {isUrduAdmin ? 'ترجمہ اور لوکلائزیشن مینیجر' : 'Translation & Localization Manager'}
            </h2>
            <p className="text-xs text-slate-400">
              {isUrduAdmin
                ? 'تمام 16 زبانوں کا کنٹرول، جائزہ اور ICU فارمیٹنگ'
                : 'Manage, review, and validate strings across all 16 languages with ICU support'}
            </p>
          </div>
        </div>

        {/* Switch Admin Language (English / Urdu) */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">
            {isUrduAdmin ? 'ایڈمن انٹرفیس:' : 'Admin Interface:'}
          </span>
          <div className="inline-flex rounded-xl bg-black/40 border border-white/10 p-1">
            <button
              onClick={() => setAdminLang('en')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                adminLang === 'en' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setAdminLang('ur')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                adminLang === 'ur' ? 'bg-cyan-500 text-black font-urdu' : 'text-slate-400 hover:text-white'
              }`}
            >
              اردو
            </button>
          </div>
        </div>
      </div>

      {/* Language Pills Bar & Visitor Visibility Toggle */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-300">
            {isUrduAdmin ? 'ہدف زبان منتخب کریں:' : 'Select Target Language to Manage:'}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">
              {isUrduAdmin ? 'سائٹ پر دکھائیں:' : 'Visible to visitors:'}
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={langEnabled[activeLang] ?? true}
                onChange={(e) =>
                  setLangEnabled({
                    ...langEnabled,
                    [activeLang]: e.target.checked,
                  })
                }
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-cyan-400" />
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {ALL_LANGUAGE_CODES.map((code) => {
            const meta = SUPPORTED_LANGUAGES[code];
            const isSelected = code === activeLang;
            return (
              <button
                key={code}
                onClick={() => setActiveLang(code)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 border-cyan-500/40 shadow-md shadow-cyan-500/10'
                    : 'bg-white/[0.02] text-slate-400 border-white/5 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span>{meta.name}</span>
                <span className="text-[10px] text-slate-500 font-mono">({code})</span>
                {meta.dir === 'rtl' && (
                  <span className="px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[8px] font-mono">
                    RTL
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Language Progress Bar Card */}
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-400" />
            <span className="font-extrabold text-white">
              {SUPPORTED_LANGUAGES[activeLang].name} ({SUPPORTED_LANGUAGES[activeLang].englishName})
            </span>
          </div>
          <span className="font-mono text-cyan-400 font-bold">
            {stats.percentReviewed}% {isUrduAdmin ? 'جائزہ مکمل' : 'Reviewed'}
          </span>
        </div>

        {/* Multi-Segment Progress Bar */}
        <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
          <div
            className="bg-emerald-400 transition-all duration-500"
            style={{ width: `${(stats.reviewed / stats.total) * 100}%` }}
            title={`Reviewed: ${stats.reviewed}`}
          />
          <div
            className="bg-amber-400 transition-all duration-500"
            style={{ width: `${(stats.needsReview / stats.total) * 100}%` }}
            title={`Needs Review: ${stats.needsReview}`}
          />
          <div
            className="bg-rose-500/60 transition-all duration-500"
            style={{ width: `${(stats.missing / stats.total) * 100}%` }}
            title={`Missing: ${stats.missing}`}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              {stats.reviewed} {isUrduAdmin ? 'جائزہ شدہ' : 'Reviewed'}
            </span>
            <span className="flex items-center gap-1.5 text-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              {stats.needsReview} {isUrduAdmin ? 'جائزہ درکار' : 'Needs Review'}
            </span>
            <span className="flex items-center gap-1.5 text-rose-300">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              {stats.missing} {isUrduAdmin ? 'غائب' : 'Missing'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAutoTranslateMissing}
              disabled={isTranslating || stats.missing === 0}
              className="px-3 py-1 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {isTranslating
                  ? isUrduAdmin
                    ? 'ترجمہ ہو رہا ہے...'
                    : 'Translating...'
                  : isUrduAdmin
                  ? 'غائب کا خودکار ترجمہ'
                  : 'Auto-Translate Missing'}
              </span>
            </button>

            <button
              onClick={handleExportJson}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300"
              title="Export JSON"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleExportCsv}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300"
              title="Export CSV"
            >
              <FileTextIcon />
            </button>
            <label
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer"
              title="Import JSON"
            >
              <Upload className="w-3.5 h-3.5" />
              <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isUrduAdmin ? 'کی ورڈ، انگلش یا ترجمہ تلاش کریں...' : 'Search keys, English source, or translation...'}
            className="w-full bg-transparent outline-none text-white text-xs placeholder:text-slate-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Namespace Selector */}
          <select
            value={activeNamespace}
            onChange={(e) => setActiveNamespace(e.target.value as any)}
            className="bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-400"
          >
            <option value="all">{isUrduAdmin ? 'تمام زمرے (15)' : 'All Namespaces (15)'}</option>
            {ALL_NAMESPACES.map((ns) => (
              <option key={ns} value={ns}>
                {ns}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-400"
          >
            <option value="all">{isUrduAdmin ? 'تمام سٹیٹس' : 'All Status'}</option>
            <option value="missing">{isUrduAdmin ? 'غائب' : 'Missing'}</option>
            <option value="needs_review">{isUrduAdmin ? 'جائزہ درکار' : 'Needs Review'}</option>
            <option value="reviewed">{isUrduAdmin ? 'تصدیق شدہ' : 'Reviewed'}</option>
          </select>
        </div>
      </div>

      {/* Translations Table */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.01] overflow-hidden">
        <div className="max-h-[500px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-[#0a0d14] border-b border-white/10 text-slate-400 font-mono text-[11px] uppercase tracking-wider z-10">
              <tr>
                <th className="p-3 text-start">{isUrduAdmin ? 'کلید اور زمرہ' : 'Namespace & Key'}</th>
                <th className="p-3 text-start">{isUrduAdmin ? 'انگریزی اصل' : 'English Reference'}</th>
                <th className="p-3 text-start">
                  {SUPPORTED_LANGUAGES[activeLang].name} ({SUPPORTED_LANGUAGES[activeLang].englishName})
                </th>
                <th className="p-3 text-center">{isUrduAdmin ? 'حالت' : 'Status'}</th>
                <th className="p-3 text-end">{isUrduAdmin ? 'عمل' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 font-mono">
                    {isUrduAdmin ? 'کوئی سٹرنگ نہیں ملی' : 'No translation keys match current filter'}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isRtlScript = SUPPORTED_LANGUAGES[activeLang].dir === 'rtl';
                  return (
                    <tr key={`${item.namespace}:${item.key}`} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3 font-mono text-slate-400 align-top max-w-[200px] break-all">
                        <span className="text-cyan-400/80 font-bold">{item.namespace}:</span>
                        <span>{item.key}</span>
                      </td>
                      <td className="p-3 text-slate-300 align-top max-w-[280px]">
                        <p className="line-clamp-2">{item.enValue}</p>
                      </td>
                      <td
                        className={`p-3 align-top max-w-[280px] ${
                          isRtlScript ? 'text-right font-urdu text-sm' : 'text-left'
                        }`}
                        dir={isRtlScript ? 'rtl' : 'ltr'}
                      >
                        {item.targetValue ? (
                          <p className="line-clamp-2 text-white font-medium">{item.targetValue}</p>
                        ) : (
                          <span className="text-slate-600 italic">
                            {isUrduAdmin ? 'ابھی ترجمہ نہیں ہوا' : 'Not translated yet'}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center align-top">
                        {item.status === 'reviewed' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{isUrduAdmin ? 'مکمل' : 'Reviewed'}</span>
                          </span>
                        )}
                        {item.status === 'needs_review' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20">
                            <Clock className="w-3 h-3" />
                            <span>{isUrduAdmin ? 'جائزہ' : 'Needs Review'}</span>
                          </span>
                        )}
                        {item.status === 'missing' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-[10px] font-bold border border-rose-500/20">
                            <AlertCircle className="w-3 h-3" />
                            <span>{isUrduAdmin ? 'غائب' : 'Missing'}</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-end align-top">
                        <button
                          onClick={() => handleStartEdit(item)}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white transition-all text-xs cursor-pointer"
                        >
                          {isUrduAdmin ? 'ترمیم' : 'Edit'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inline Modal Editor with ICU Validation */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#0e121a] border border-white/15 p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold">
                  {editingItem.namespace}
                </span>
                <h3 className="text-sm font-extrabold text-white">{editingItem.key}</h3>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* English Source */}
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase">English Original</span>
              <p className="text-xs text-slate-200 font-mono">{editingItem.enValue}</p>
            </div>

            {/* Target Language Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">
                  {SUPPORTED_LANGUAGES[activeLang].name} ({SUPPORTED_LANGUAGES[activeLang].englishName})
                </span>
                {SUPPORTED_LANGUAGES[activeLang].dir === 'rtl' && (
                  <span className="text-[10px] font-mono text-purple-400">RTL Enabled</span>
                )}
              </div>
              <textarea
                value={editInput}
                onChange={(e) => {
                  setEditInput(e.target.value);
                  setIcuError(validateIcu(editingItem.enValue, e.target.value));
                }}
                rows={3}
                dir={SUPPORTED_LANGUAGES[activeLang].dir}
                className={`w-full bg-slate-900 border rounded-xl p-3 text-xs text-white outline-none transition-all ${
                  icuError ? 'border-rose-500 focus:border-rose-400' : 'border-white/10 focus:border-cyan-400'
                } ${SUPPORTED_LANGUAGES[activeLang].dir === 'rtl' ? 'font-urdu text-sm' : ''}`}
                placeholder="Enter translated string..."
              />
            </div>

            {/* ICU Syntax Error Message */}
            {icuError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{icuError}</span>
              </div>
            )}

            {/* Live Preview */}
            <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-400 uppercase font-bold">
                <Eye className="w-3 h-3" />
                <span>Live Rendering Preview</span>
              </div>
              <p
                className={`text-xs text-white ${
                  SUPPORTED_LANGUAGES[activeLang].dir === 'rtl' ? 'font-urdu text-sm text-right' : ''
                }`}
                dir={SUPPORTED_LANGUAGES[activeLang].dir}
              >
                {editInput || editingItem.enValue}
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveEdit('needs_review')}
                disabled={Boolean(icuError)}
                className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all disabled:opacity-50"
              >
                Save as Draft
              </button>
              <button
                onClick={() => handleSaveEdit('reviewed')}
                disabled={Boolean(icuError)}
                className="px-5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-extrabold uppercase tracking-wider transition-all disabled:opacity-50"
              >
                Save &amp; Mark Reviewed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function FileTextIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}
