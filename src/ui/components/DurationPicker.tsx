import React from 'react';
import { Timer } from 'lucide-react';
import { DURATION_PRESETS } from '../../engine/duration';

interface DurationPickerProps {
  value: number;
  onChange: (seconds: number) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

/** Segmented 15s / 30s / 45s / 60s control for the animation's target length. */
export const DurationPicker: React.FC<DurationPickerProps> = ({
  value,
  onChange,
  disabled = false,
  size = 'sm',
}) => {
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1.5 text-xs';

  return (
    <div
      className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10"
      role="radiogroup"
      aria-label="Animation duration"
      title="How long the animation runs before it completes"
    >
      <Timer className={`${size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-[#CCFF00] mx-1`} />
      {DURATION_PRESETS.map((d) => {
        const isReel = d === 56;
        const isSelected = value === d || (isReel && Math.abs(value - 56) <= 1.5);
        return (
          <button
            key={d}
            id={`duration-${d}s-${size}`}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onChange(d)}
            title={isReel ? '56s Optimal Viral Reel / Shorts Time' : `${d}s Target Duration`}
            className={`${pad} font-bold font-mono rounded-lg transition-all disabled:opacity-40 flex items-center gap-1 ${
              isSelected
                ? 'btn-3d-lime text-black shadow-sm'
                : 'btn-3d-glass text-slate-400 hover:text-white'
            }`}
          >
            <span>{d}s</span>
            {isReel && (
              <span
                className={`px-1 py-0.5 text-[7.5px] font-black uppercase tracking-wider rounded ${
                  isSelected ? 'bg-black/80 text-lime-400' : 'bg-lime-400/20 text-lime-300'
                }`}
              >
                Reel
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

/** Format seconds as MM:SS for timeline labels. */
export const formatClock = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};
