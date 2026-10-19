import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { DropAction, DropKind } from '../../midi/types';

export interface TimelineNote {
  time: number;
  duration: number;
  midi: number;
  trackIndex: number;
}

interface MidiTimelineProps {
  duration: number;
  notes: TimelineNote[];
  beats: { time: number; isDownbeat: boolean }[];
  drops?: DropAction[];
  collisionTimes?: number[];
  transitions?: { time: number }[];
  sections?: { time: number }[];
  playhead?: number;
  /** Highlighted range: the music section (Screen 2) or the loop region (Screen 4) */
  range?: { a: number; b: number } | null;
  selectedDropId?: number | null;
  height?: number;
  onSeek?: (t: number) => void;
  onRange?: (a: number, b: number) => void;
  onDropClick?: (id: number) => void;
  label?: string;
}

export const DROP_COLORS: Record<DropKind, string> = {
  heavy: '#f43f5e',
  accent: '#fb923c',
  pulse: '#22d3ee',
  light: '#facc15',
  cascade: '#a3e635',
  roll: '#c084fc',
};

const TRACK_COLORS = ['#38bdf8', '#f472b6', '#a3e635', '#facc15', '#c084fc', '#fb923c', '#2dd4bf'];

/**
 * Canvas timeline: beat grid, piano roll, section/transition markers, drop markers,
 * collision ticks and the playhead. Click = seek, drag = select a range,
 * click a drop marker = select that drop (custom mode).
 */
export const MidiTimeline: React.FC<MidiTimelineProps> = ({
  duration,
  notes,
  beats,
  drops,
  collisionTimes,
  transitions,
  sections,
  playhead = 0,
  range,
  selectedDropId,
  height = 170,
  onSeek,
  onRange,
  onDropClick,
  label,
}) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(600);
  const drag = useRef<{ x0: number; t0: number; moved: boolean } | null>(null);
  const [dragRange, setDragRange] = useState<{ a: number; b: number } | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(Math.max(240, el.clientWidth)));
    ro.observe(el);
    setWidth(Math.max(240, el.clientWidth));
    return () => ro.disconnect();
  }, []);

  const hasDrops = !!drops;
  const hasCollisions = !!collisionTimes;
  const layout = {
    markers: 14,
    roll: [18, height - (hasDrops ? 34 : 0) - (hasCollisions ? 14 : 0) - 4] as [number, number],
    drops: height - (hasCollisions ? 14 : 0) - 32,
    collisions: height - 12,
  };

  const tToX = useCallback((t: number) => (duration > 0 ? (t / duration) * width : 0), [duration, width]);
  const xToT = useCallback((x: number) => Math.max(0, Math.min(duration, (x / width) * duration)), [duration, width]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(width * dpr);
    c.height = Math.round(height * dpr);
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0b0f17';
    ctx.fillRect(0, 0, width, height);

    // Beat grid
    const pxPerBeat = beats.length > 1 ? tToX(beats[1].time) - tToX(beats[0].time) : 999;
    for (const b of beats) {
      if (!b.isDownbeat && pxPerBeat < 4) continue;
      const x = Math.round(tToX(b.time)) + 0.5;
      ctx.strokeStyle = b.isDownbeat ? 'rgba(148,163,184,0.35)' : 'rgba(148,163,184,0.12)';
      ctx.beginPath();
      ctx.moveTo(x, layout.markers);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Piano roll
    const [rTop, rBottom] = layout.roll;
    const pitches = notes.map((n) => n.midi);
    const lo = pitches.length ? Math.min(...pitches) - 1 : 48;
    const hi = pitches.length ? Math.max(...pitches) + 1 : 84;
    const rowH = Math.max(1, (rBottom - rTop) / Math.max(12, hi - lo));
    for (const n of notes) {
      const x = tToX(n.time);
      const w = Math.max(1.5, tToX(n.time + n.duration) - x);
      const y = rBottom - (n.midi - lo) * rowH;
      ctx.fillStyle = TRACK_COLORS[n.trackIndex % TRACK_COLORS.length];
      ctx.globalAlpha = 0.85;
      ctx.fillRect(x, y - rowH, w, Math.max(1.5, rowH - 0.5));
    }
    ctx.globalAlpha = 1;

    // Section + transition markers (top strip)
    ctx.setLineDash([3, 3]);
    for (const s of sections || []) {
      const x = tToX(s.time);
      ctx.strokeStyle = 'rgba(192,132,252,0.7)';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (const tr of transitions || []) {
      const x = tToX(tr.time);
      ctx.strokeStyle = 'rgba(52,211,153,0.8)';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      ctx.fillStyle = '#34d399';
      ctx.fillRect(x - 3, 2, 6, 6);
    }
    ctx.setLineDash([]);

    // Drop markers
    if (drops) {
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fillRect(0, layout.drops - 2, width, 30);
      for (const d of drops) {
        const x = tToX(d.time + (d.nudge || 0));
        const big = d.kind === 'heavy' || d.kind === 'pulse' || d.kind === 'accent';
        const r = big ? 5 : 3;
        const y = layout.drops + (big ? 8 : 20);
        ctx.fillStyle = d.muted ? '#475569' : DROP_COLORS[d.kind];
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        if (d.id === selectedDropId) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, r + 3, 0, Math.PI * 2);
          ctx.stroke();
          ctx.lineWidth = 1;
        }
      }
    }

    // Collision ticks (density per pixel column)
    if (collisionTimes) {
      const cols = new Uint16Array(Math.ceil(width) + 1);
      for (const t of collisionTimes) cols[Math.min(cols.length - 1, Math.floor(tToX(t)))]++;
      for (let x = 0; x < cols.length; x++) {
        if (!cols[x]) continue;
        const h = Math.min(10, 2 + Math.log2(cols[x] + 1) * 2);
        ctx.fillStyle = 'rgba(56,189,248,0.75)';
        ctx.fillRect(x, layout.collisions + 10 - h, 1, h);
      }
    }

    // Range
    const r = dragRange || range;
    if (r) {
      ctx.fillStyle = 'rgba(204,255,0,0.12)';
      ctx.fillRect(tToX(r.a), 0, tToX(r.b) - tToX(r.a), height);
      ctx.strokeStyle = '#ccff00';
      ctx.strokeRect(tToX(r.a) + 0.5, 0.5, tToX(r.b) - tToX(r.a) - 1, height - 1);
    }

    // Playhead
    const px = Math.round(tToX(playhead)) + 0.5;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, height);
    ctx.stroke();
    ctx.lineWidth = 1;
  }, [width, height, notes, beats, drops, collisionTimes, transitions, sections, playhead, range, dragRange, selectedDropId, duration, tToX, layout.drops, layout.collisions, layout.markers, layout.roll]);

  const localX = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return e.clientX - rect.left;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const x = localX(e);
    const rect = canvasRef.current!.getBoundingClientRect();
    const y = e.clientY - rect.top;
    if (drops && onDropClick && y >= layout.drops - 4 && y <= layout.drops + 30) {
      let best: DropAction | null = null;
      let bestD = 8;
      for (const d of drops) {
        const dx = Math.abs(tToX(d.time + (d.nudge || 0)) - x);
        if (dx < bestD) {
          bestD = dx;
          best = d;
        }
      }
      if (best) {
        onDropClick(best.id);
        return;
      }
    }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x0: x, t0: xToT(x), moved: false };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const x = localX(e);
    if (Math.abs(x - drag.current.x0) > 4) drag.current.moved = true;
    if (drag.current.moved && onRange) {
      const t = xToT(x);
      setDragRange({ a: Math.min(t, drag.current.t0), b: Math.max(t, drag.current.t0) });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const x = localX(e);
    const t = xToT(x);
    if (drag.current.moved && onRange) onRange(Math.min(t, drag.current.t0), Math.max(t, drag.current.t0));
    else onSeek?.(t);
    drag.current = null;
    setDragRange(null);
  };

  return (
    <div ref={wrapRef} className="w-full select-none">
      {label && <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{label}</div>}
      <canvas
        ref={canvasRef}
        data-testid="midi-timeline"
        style={{ width: '100%', height, touchAction: 'none', cursor: 'crosshair', borderRadius: 10 }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
    </div>
  );
};
