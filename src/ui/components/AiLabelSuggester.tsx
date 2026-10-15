import React, { useState } from 'react';
import { Sparkles, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { AiService } from '../../ai/aiService';
import { useStudioStore } from '../../store/useStudioStore';

interface AiLabelSuggesterProps {
  type: 'counter' | 'end_card_cta' | 'contestant_names';
  currentValue: string;
  onApply: (value: string) => void;
  modeName: string;
  category: string;
  labelTitle?: string;
}

export const AiLabelSuggester: React.FC<AiLabelSuggesterProps> = ({
  type,
  currentValue,
  onApply,
  modeName,
  category,
  labelTitle = 'ai suggest',
}) => {
  const { showToast } = useStudioStore();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const [isAi, setIsAi] = useState(false);

  const fetchOptions = async () => {
    setLoading(true);
    const res = await AiService.getInstance().generateLabels(type, modeName, category);
    setOptions(res.options);
    setIsAi(res.isAi);
    setLoading(false);
  };

  const handleToggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next && options.length === 0) {
      fetchOptions();
    }
  };

  const handleSelect = (val: string) => {
    onApply(val);
    showToast(`applied: "${val}"`);
  };

  return (
    <div className="space-y-1.5 font-sans">
      <button
        type="button"
        onClick={handleToggle}
        className="text-[10.5px] font-bold text-pink-300 hover:text-white flex items-center gap-1 transition-colors"
      >
        <Sparkles className="w-3 h-3 text-pink-400 stroke-[2.2]" />
        <span>{labelTitle}</span>
        {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {isOpen && (
        <div className="p-2.5 rounded-xl bg-black/60 border border-white/10 space-y-2 animate-fade-in">
          <div className="flex items-center justify-between border-b border-white/5 pb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">
              {type.replace(/_/g, ' ')} options
            </span>
            {isAi && (
              <span className="px-1.5 py-0.2 rounded-full bg-pink-500/20 text-pink-400 text-[9px] font-mono">
                ai
              </span>
            )}
          </div>

          {loading ? (
            <div className="space-y-1 py-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-6 rounded-lg bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-1">
              {options.map((opt, i) => {
                const isSelected = currentValue === opt;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={`min-h-[32px] px-2.5 py-1 rounded-lg text-left text-xs transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 font-bold'
                        : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="truncate">{opt}</span>
                    {isSelected && <Check className="w-3 h-3 text-pink-400 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
