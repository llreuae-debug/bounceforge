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
      {DURATION_PRESETS.map((d) => (
        <button
          key={d}
          id={`duration-${d}s-${size}`}
          type="button"
          role="radio"
          aria-checked={value === d}
          disabled={disabled}
          onClick={() => onChange(d)}
          className={`${pad} font-bold font-mono rounded-md transition-all disabled:opacity-40 ${
            value === d
              ? 'bg-[#CCFF00] text-black shadow-sm shadow-[#CCFF00]/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          {d}s
        </button>
      ))}
    </div>
  );
};

/** Format seconds as MM:SS for timeline labels. */
export const formatClock = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};
