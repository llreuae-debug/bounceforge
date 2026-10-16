import React from 'react';
import { useStudioStore } from '../../store/useStudioStore';
import { RotateCcw, AlertTriangle, Sparkles, Check, X } from 'lucide-react';

export const GlobalToast: React.FC = () => {
  const { toast, dismissToast } = useStudioStore();

  if (!toast) return null;

  // Choose appropriate icon
  const isUndo = !!toast.undoAction;
  const isQuality = toast.message.includes('quality:') || toast.message.includes('frame drop');
  const isAi = toast.message.includes('hook') || toast.message.includes('ai');

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] pointer-events-auto px-4 py-2.5 rounded-2xl bg-[#090b12]/95 border border-[#CCFF00]/50 shadow-[0_12px_40px_rgba(0,0,0,0.85),0_0_20px_rgba(204,255,0,0.18)] backdrop-blur-xl flex items-center gap-3 transition-all duration-300 select-none font-sans max-w-[90vw]"
    >
      {isUndo ? (
        <RotateCcw className="w-4 h-4 text-[#CCFF00] shrink-0" />
      ) : isQuality ? (
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
      ) : isAi ? (
        <Sparkles className="w-4 h-4 text-pink-400 shrink-0" />
      ) : (
        <Check className="w-4 h-4 text-[#CCFF00] shrink-0" />
      )}

      <span className="text-xs font-bold text-white lowercase tracking-wide truncate max-w-xs sm:max-w-md">
        {toast.message}
      </span>

      {toast.undoAction && (
        <button
          onClick={toast.undoAction}
          className="px-3 py-1 rounded-xl bg-[#CCFF00] hover:bg-[#b5e600] text-black font-black text-xs uppercase tracking-wider transition-colors shadow-md shadow-[#CCFF00]/20 shrink-0"
        >
          undo
        </button>
      )}

      <button
        onClick={dismissToast}
        className="text-slate-400 hover:text-white text-xs p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0 ml-1"
        title="dismiss notification"
        aria-label="dismiss notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
