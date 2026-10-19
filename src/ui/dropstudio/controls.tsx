import React from 'react';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

export const Panel: React.FC<{ title?: string; children: React.ReactNode; className?: string; right?: React.ReactNode }> = ({ title, children, className = '', right }) => (
  <section className={`rounded-2xl border border-white/10 bg-white/[0.03] p-4 ${className}`}>
    {title && (
      <div className="flex items-center justify-between mb-3 gap-2">
        <h3 className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-300">{title}</h3>
        {right}
      </div>
    )}
    {children}
  </section>
);

export function Seg<T extends string | number>({
  value,
  options,
  onChange,
  testId,
  label,
}: {
  value: T;
  options: { value: T; label: string; title?: string }[];
  onChange: (v: T) => void;
  testId?: string;
  label?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} data-testid={testId} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          role="radio"
          aria-checked={o.value === value}
          title={o.title}
          data-testid={testId ? `${testId}-${o.value}` : undefined}
          onClick={() => onChange(o.value)}
          className={`rounded-xl px-3 py-1.5 text-xs font-bold border ${
            o.value === value ? 'bg-cyan-400 text-slate-950 border-cyan-300' : 'bg-white/[0.04] text-slate-300 border-white/10 hover:border-cyan-400/50'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const Slider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  testId?: string;
}> = ({ label, value, min, max, step, onChange, format, testId }) => (
  <label className="block">
    <div className="flex justify-between text-xs text-slate-300 mb-1">
      <span>{label}</span>
      <span className="font-mono text-cyan-300">{format ? format(value) : value}</span>
    </div>
    <input
      type="range"
      aria-label={label}
      data-testid={testId}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full accent-cyan-400"
    />
  </label>
);

export const Toggle: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void; testId?: string; hint?: string }> = ({ label, checked, onChange, testId, hint }) => (
  <label className="flex items-center justify-between gap-3 text-xs text-slate-300 cursor-pointer select-none">
    <span>
      {label}
      {hint && <span className="block text-[10px] text-slate-500">{hint}</span>}
    </span>
    <input type="checkbox" data-testid={testId} checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 accent-cyan-400" />
  </label>
);

export const SafeBadge: React.FC = () => (
  <span data-testid="badge-safe" className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 px-2 py-0.5 text-[10px] font-bold whitespace-nowrap">
    <ShieldCheck className="w-3 h-3" /> Copyright Safe
  </span>
);

export const UserBadge: React.FC = () => (
  <span data-testid="badge-user" className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 border border-amber-300/40 text-amber-200 px-2 py-0.5 text-[10px] font-bold whitespace-nowrap">
    <AlertTriangle className="w-3 h-3" /> User Provided — your responsibility
  </span>
);

export const fmtTime = (t: number) => {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, '0')}`;
};
