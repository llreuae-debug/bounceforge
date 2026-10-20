import React, { useEffect, useRef, useState } from 'react';
import type { StudioTrack } from '../../dropstudio/track';

interface Props {
  track: StudioTrack;
  beats: number[];
  downbeats: boolean[];
  impacts: Float64Array;
  tiers: Uint8Array;
  time: number;
  onSeek: (t: number) => void;
  /** Called with the full edited beat list */
  onBeats: (beats: number[]) => void;
}

const TIER_COLOR = ['#fff', '#f43f5e', '#22d3ee', '#a3e635'];
const H = 150;

/**
 * Waveform / note timeline with editable beat markers:
 * drag a marker to move it, double-click to add one, select + Delete (or the button) to remove,
 * click anywhere else to seek. The view follows the playhead.
 */
export const BeatTimeline: React.FC<Props> = ({ track, beats, downbeats, impacts, tiers, time, onSeek, onBeats }) => {
  const wrap = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(600);
  const [span, setSpan] = useState(12);
  const [start, setStart] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const drag = useRef<{ i: number; moved: boolean } | null>(null);
  const [draft, setDraft] = useState<number[] | null>(null);
  const list = draft ?? beats;

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(Math.max(260, el.clientWidth)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Follow the playhead
  useEffect(() => {
    if (time < start || time > start + span * 0.9) setStart(Math.max(0, Math.min(track.duration - span, time - span * 0.15)));
  }, [time, span, start, track.duration]);

  const tToX = (t: number) => ((t - start) / span) * width;
  const xToT = (x: number) => Math.max(0, Math.min(track.duration, start + (x / width) * span));

  useEffect(() => {
    const c = cv.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = width * dpr;
    c.height = H * dpr;
    const g = c.getContext('2d')!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#0b0f17';
    g.fillRect(0, 0, width, H);
    // Waveform (audio) or piano roll (MIDI)
    if (track.waveform && track.waveform.length) {
      g.fillStyle = 'rgba(56,189,248,0.35)';
      const n = track.waveform.length;
      for (let x = 0; x < width; x++) {
        const t = xToT(x);
        const v = track.waveform[Math.min(n - 1, Math.floor((t / track.duration) * n))] || 0;
        const hh = v * (H - 50);
        g.fillRect(x, 60 - hh / 2 + 15, 1, Math.max(1, hh));
      }
    } else {
      const ps = track.notes.map((n) => n.midi);
      const lo = Math.min(...ps, 48);
      const hi = Math.max(...ps, 84);
      for (const n of track.notes) {
        if (n.t + n.d < start || n.t > start + span) continue;
        g.fillStyle = n.lane === 0 ? 'rgba(244,114,182,0.85)' : n.isDrum ? 'rgba(250,204,21,0.5)' : 'rgba(56,189,248,0.45)';
        const y = 100 - ((n.midi - lo) / Math.max(12, hi - lo)) * 80;
        g.fillRect(tToX(n.t), y, Math.max(2, (n.d / span) * width), 3);
      }
    }
    // Beats
    list.forEach((t, i) => {
      const x = tToX(t);
      if (x < -5 || x > width + 5) return;
      const down = downbeats[i] && !draft;
      g.strokeStyle = i === selected ? '#facc15' : down ? 'rgba(226,232,240,0.85)' : 'rgba(148,163,184,0.45)';
      g.lineWidth = i === selected ? 3 : down ? 2 : 1;
      g.beginPath();
      g.moveTo(x + 0.5, 0);
      g.lineTo(x + 0.5, 112);
      g.stroke();
      g.fillStyle = g.strokeStyle;
      g.beginPath();
      g.moveTo(x - 5, 0);
      g.lineTo(x + 5, 0);
      g.lineTo(x, 8);
      g.fill();
    });
    // Impacts (by tier)
    for (let k = 0; k < impacts.length; k++) {
      const x = tToX(impacts[k]);
      if (x < -5 || x > width + 5) continue;
      g.fillStyle = TIER_COLOR[tiers[k]] ?? '#fff';
      g.beginPath();
      g.arc(x, 130, tiers[k] === 1 ? 6 : tiers[k] === 2 ? 4 : 2.5, 0, Math.PI * 2);
      g.fill();
    }
    // Playhead
    g.strokeStyle = '#ffffff';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(tToX(time), 0);
    g.lineTo(tToX(time), H);
    g.stroke();
  });

  const nearest = (x: number) => {
    let best = -1;
    let bd = 7;
    list.forEach((t, i) => {
      const d = Math.abs(tToX(t) - x);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    return best;
  };
  const localX = (e: React.PointerEvent | React.MouseEvent) => e.clientX - cv.current!.getBoundingClientRect().left;

  const remove = () => {
    if (selected === null) return;
    onBeats(list.filter((_, i) => i !== selected));
    setSelected(null);
  };

  return (
    <div ref={wrap} className="w-full">
      <canvas
        ref={cv}
        data-testid="beat-timeline"
        tabIndex={0}
        style={{ width: '100%', height: H, borderRadius: 12, cursor: 'crosshair', touchAction: 'none' }}
        onPointerDown={(e) => {
          const x = localX(e);
          const i = nearest(x);
          if (i >= 0) {
            setSelected(i);
            drag.current = { i, moved: false };
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
          } else {
            setSelected(null);
            onSeek(xToT(x));
          }
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const t = xToT(localX(e));
          const next = [...list];
          next[drag.current.i] = t;
          drag.current.moved = true;
          setDraft(next);
        }}
        onPointerUp={() => {
          if (drag.current?.moved && draft) onBeats(draft);
          drag.current = null;
          setDraft(null);
        }}
        onDoubleClick={(e) => {
          const t = xToT(localX(e));
          onBeats([...list, t].sort((a, b) => a - b));
        }}
        onKeyDown={(e) => {
          if (e.key === 'Delete' || e.key === 'Backspace') remove();
        }}
      />
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <span>View</span>
        {[60, 24, 12, 6].map((s) => (
          <button key={s} onClick={() => setSpan(Math.min(s, track.duration))} className={`rounded-lg px-2 py-0.5 border ${span === Math.min(s, track.duration) ? 'border-cyan-400 text-cyan-300' : 'border-white/10'}`}>
            {s}s
          </button>
        ))}
        <span data-testid="beat-count" className="font-mono text-slate-300">{list.length} beats</span>
        <button data-testid="beat-delete" disabled={selected === null} onClick={remove} className="rounded-lg px-2 py-0.5 border border-white/10 disabled:opacity-40">
          Delete beat
        </button>
        <span className="text-slate-500">Drag a beat to move · double-click to add · select + Delete to remove</span>
      </div>
    </div>
  );
};
