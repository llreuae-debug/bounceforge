import React from 'react';
import { useStudioStore } from '../../store/useStudioStore';
import { X, Keyboard } from 'lucide-react';

export const ShortcutsModal: React.FC = () => {
  const { isShortcutsOpen, setShortcutsOpen } = useStudioStore();

  if (!isShortcutsOpen) return null;

  const shortcuts = [
    { key: 'Space', desc: 'Play / Pause simulation', category: 'Playback' },
    { key: 'R', desc: 'Restart simulation from beginning (t=0)', category: 'Playback' },
    { key: 'N', desc: 'Randomize & load next seed', category: 'Physics' },
    { key: 'E', desc: 'Open Frame-Perfect 4K Video Export modal', category: 'Export' },
    { key: 'M', desc: 'Open MIDI Piano Roll Editor', category: 'Audio' },
    { key: 'S', desc: 'Launch Auto-Seed Finder Web Worker', category: 'Search' },
    { key: 'Esc', desc: 'Close any active modal / return to viewport', category: 'General' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-md bg-[#0d0d16] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-lime-400/10 border border-lime-400/30 text-[#CCFF00]">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white tracking-tight">Keyboard Shortcuts</h3>
              <p className="text-xs text-neutral-400">Power user workflow hotkeys</p>
            </div>
          </div>
          <button
            onClick={() => setShortcutsOpen(false)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {shortcuts.map((sc) => (
            <div
              key={sc.key}
              className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/15 transition-colors"
            >
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-white block">{sc.desc}</span>
                <span className="text-[10px] uppercase font-mono text-neutral-500 tracking-wider">
                  {sc.category}
                </span>
              </div>
              <kbd className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-700 font-mono text-xs font-extrabold text-[#CCFF00] shadow-inner">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-neutral-500 font-mono">
          <span>BounceForge Hotkeys</span>
          <button
            onClick={() => setShortcutsOpen(false)}
            className="text-[#CCFF00] font-bold hover:underline"
          >
            Got it (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
