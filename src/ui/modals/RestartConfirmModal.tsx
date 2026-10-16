import React from 'react';
import { useStudioStore } from '../../store/useStudioStore';
import { RotateCcw, X, AlertCircle } from 'lucide-react';

interface RestartConfirmModalProps {
  onConfirm: () => void;
}

export const RestartConfirmModal: React.FC<RestartConfirmModalProps> = ({ onConfirm }) => {
  const { isRestartConfirmOpen, setRestartConfirmOpen, seed } = useStudioStore();

  if (!isRestartConfirmOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-sm bg-[#0d0d16] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
          <RotateCcw className="w-6 h-6 stroke-[2.5]" />
        </div>

        <div>
          <h3 className="text-base font-extrabold text-white tracking-tight">Restart Simulation?</h3>
          <p className="text-xs text-neutral-400 mt-1">
            Reset time to <span className="font-mono text-cyan-400 font-bold">0.00s</span> keeping seed <span className="font-mono text-cyan-400 font-bold">#{seed}</span> and all current physics parameters.
          </p>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={() => setRestartConfirmOpen(false)}
            className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              setRestartConfirmOpen(false);
              onConfirm();
            }}
            className="flex-1 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-black tracking-wide transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)]"
          >
            Restart (R)
          </button>
        </div>
      </div>
    </div>
  );
};
