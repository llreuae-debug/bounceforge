import React, { useMemo, useState } from 'react';
import { Heart, Pause, Play, Search, Upload } from 'lucide-react';
import { LIBRARY_SONGS, type LibraryInstrument, type Mood } from '../../dropstudio/library/songs';
import credits from '../../dropstudio/library/credits.json';
import { libraryTrack } from '../../dropstudio/library/compile';
import { INSTRUMENTS, previewNotes, type DropMix, type DropPlayer } from '../../dropstudio/audio';
import type { StudioTrack, TrackCredit } from '../../dropstudio/track';
import { Panel, SafeBadge, Seg, Slider, Toggle, UserBadge } from './controls';

const MOODS: Mood[] = ['Calm', 'Epic', 'Sad', 'Happy', 'Festive', 'Dark'];
type Tempo = 'all' | 'slow' | 'medium' | 'fast';
const FAV_KEY = 'dropstudio:favorites';

function loadFavs(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

interface Props {
  track: StudioTrack | null;
  onPick: (id: string) => void;
  onUpload: (file: File) => void;
  uploadBusy: string | null;
  uploadProgress: number;
  analysisMs?: number;
  uploadError: string | null;
  startAt: number;
  onStartAt: (t: number) => void;
  sourceDuration: number | null;
  instrument: LibraryInstrument;
  onInstrument: (i: LibraryInstrument) => void;
  mix: DropMix;
  onMix: (m: DropMix) => void;
  libPlayer: DropPlayer;
}

export const LibraryPanel: React.FC<Props> = (p) => {
  const [q, setQ] = useState('');
  const [mood, setMood] = useState<Mood | 'All'>('All');
  const [tempo, setTempo] = useState<Tempo>('all');
  const [favOnly, setFavOnly] = useState(false);
  const [favs, setFavs] = useState<Set<string>>(loadFavs);
  const [playing, setPlaying] = useState<string | null>(null);
  const [rights, setRights] = useState(false);

  const songs = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return LIBRARY_SONGS.filter((s) => {
      const c = (credits as TrackCredit[]).find((x) => x.id === s.id);
      if (ql && !`${s.title} ${c?.composer ?? ''}`.toLowerCase().includes(ql)) return false;
      if (mood !== 'All' && s.mood !== mood) return false;
      const bpm = s.accel ? (s.accel[0] + s.accel[1]) / 2 : s.bpm;
      if (tempo === 'slow' && bpm >= 90) return false;
      if (tempo === 'medium' && (bpm < 90 || bpm > 130)) return false;
      if (tempo === 'fast' && bpm <= 130) return false;
      if (favOnly && !favs.has(s.id)) return false;
      return true;
    });
  }, [q, mood, tempo, favOnly, favs]);

  const toggleFav = (id: string) => {
    const next = new Set(favs);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setFavs(next);
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify([...next]));
    } catch {
      /* private mode */
    }
  };

  const preview = async (id: string) => {
    if (playing === id) {
      p.libPlayer.stop();
      setPlaying(null);
      return;
    }
    p.libPlayer.onEnded = () => setPlaying(null);
    setPlaying(id);
    await previewNotes(p.libPlayer, libraryTrack(id));
  };

  return (
    <div className="space-y-4">
      <Panel title="MIDI Library" right={<span className="text-[10px] text-slate-500">{LIBRARY_SONGS.length} built-in songs</span>}>
        <div className="relative mb-2">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
          <input
            data-testid="lib-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title or composer"
            className="w-full rounded-xl bg-black/40 border border-white/10 pl-8 pr-3 py-2 text-xs outline-none focus:border-cyan-400"
          />
        </div>
        <div className="space-y-2 mb-3">
          <Seg<Mood | 'All'> testId="mood" label="Mood" value={mood} onChange={setMood} options={[{ value: 'All', label: 'All' }, ...MOODS.map((m) => ({ value: m, label: m }))]} />
          <div className="flex flex-wrap items-center gap-2">
            <Seg<Tempo>
              testId="tempo"
              label="Tempo"
              value={tempo}
              onChange={setTempo}
              options={[
                { value: 'all', label: 'Any tempo' },
                { value: 'slow', label: 'Slow' },
                { value: 'medium', label: 'Medium' },
                { value: 'fast', label: 'Fast' },
              ]}
            />
            <button
              data-testid="fav-only"
              onClick={() => setFavOnly(!favOnly)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold border flex items-center gap-1 ${favOnly ? 'bg-pink-500/20 border-pink-400 text-pink-200' : 'border-white/10 text-slate-300'}`}
            >
              <Heart className="w-3 h-3" /> Favorites
            </button>
          </div>
        </div>
        <ul className="space-y-1.5 max-h-[46vh] overflow-y-auto pr-1" data-testid="lib-list">
          {songs.map((s) => {
            const c = (credits as TrackCredit[]).find((x) => x.id === s.id);
            const active = p.track?.id === s.id;
            const bpm = Math.round(s.accel ? (s.accel[0] + s.accel[1]) / 2 : s.bpm);
            return (
              <li key={s.id} data-testid={`song-${s.id}`} className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 ${active ? 'border-cyan-400 bg-cyan-400/10' : 'border-white/10 bg-white/[0.02]'}`}>
                <button
                  aria-label={playing === s.id ? `Stop ${s.title}` : `Preview ${s.title}`}
                  data-testid={`preview-${s.id}`}
                  onClick={() => preview(s.id)}
                  className="shrink-0 w-8 h-8 rounded-full bg-white/10 grid place-items-center hover:bg-cyan-400 hover:text-black"
                >
                  {playing === s.id ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => p.onPick(s.id)} data-testid={`use-${s.id}`} className="no-3d flex-1 min-w-0 flex flex-col items-start text-left">
                  <span className="text-xs font-bold truncate max-w-full">{s.title}</span>
                  <span className="text-[10px] text-slate-400 truncate max-w-full">
                    {c?.composer} · {s.mood} · {bpm} BPM
                  </span>
                </button>
                <SafeBadge />
                <button aria-label={favs.has(s.id) ? 'Unfavorite' : 'Favorite'} onClick={() => toggleFav(s.id)} className="no-3d shrink-0 p-1">
                  <Heart className={`w-4 h-4 ${favs.has(s.id) ? 'fill-pink-400 text-pink-400' : 'text-slate-500'}`} />
                </button>
              </li>
            );
          })}
          {!songs.length && <li className="text-xs text-slate-500 py-4 text-center">No songs match these filters.</li>}
        </ul>
      </Panel>

      <Panel title="Instrument">
        <Seg<LibraryInstrument> testId="instrument" label="Instrument" value={p.instrument} onChange={p.onInstrument} options={INSTRUMENTS.map((i) => ({ value: i.id, label: i.name }))} />
        <div className="mt-3 space-y-2">
          <Toggle label="Reverb" checked={p.mix.reverb} onChange={(v) => p.onMix({ ...p.mix, reverb: v })} testId="reverb" />
          <Toggle label="Echo" checked={p.mix.echo} onChange={(v) => p.onMix({ ...p.mix, echo: v })} testId="echo" />
        </div>
      </Panel>

      <Panel title="Your own music">
        <label className="flex items-start gap-2 text-xs text-slate-200 mb-3 cursor-pointer">
          <input type="checkbox" data-testid="rights-checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} className="mt-0.5 w-4 h-4 accent-amber-400" />
          <span>
            I own this music or have the rights to use it. <span className="text-slate-500">(required)</span>
          </span>
        </label>
        <label
          className={`flex items-center justify-center gap-2 rounded-xl border-2 border-dashed px-3 py-4 text-xs font-bold ${
            rights ? 'border-amber-300/60 text-amber-100 cursor-pointer hover:bg-amber-300/5' : 'border-white/10 text-slate-500 cursor-not-allowed'
          }`}
        >
          <Upload className="w-4 h-4" />
          {p.uploadBusy ?? (rights ? 'Upload .mid / .midi / .mp3 / .wav' : 'Tick the rights box to upload')}
          <input
            type="file"
            data-testid="upload-input"
            disabled={!rights}
            accept=".mid,.midi,.mp3,.wav,audio/midi,audio/mpeg,audio/wav"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f && rights) p.onUpload(f);
            }}
          />
        </label>
        {p.uploadBusy && (
          <div className="mt-2" data-testid="upload-progress" role="progressbar" aria-valuenow={Math.round(p.uploadProgress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={p.uploadBusy}>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-300 to-lime-300 transition-[width]" style={{ width: `${Math.max(5, p.uploadProgress * 100)}%` }} />
            </div>
          </div>
        )}
        {!p.uploadBusy && p.track && !p.track.copyrightSafe && p.analysisMs !== undefined && (
          <div className="mt-2 text-[11px] text-slate-400" data-testid="analysis-time">
            Analysed in {(p.analysisMs / 1000).toFixed(2)}s · {Math.round(p.track.bpm)} BPM · {p.track.beats.length} beats
          </div>
        )}
        {p.uploadError && (
          <div role="alert" className="mt-2 text-xs text-rose-300">
            {p.uploadError}
          </div>
        )}
        {p.track && !p.track.copyrightSafe && (
          <div className="mt-3 space-y-2">
            <div className="text-xs font-bold truncate">{p.track.title}</div>
            <UserBadge />
            {p.sourceDuration !== null && p.sourceDuration > 61 && (
              <Slider
                label="Start the reel at"
                value={p.startAt}
                min={0}
                max={Math.max(0, p.sourceDuration - 10)}
                step={0.5}
                onChange={p.onStartAt}
                format={(v) => `${v.toFixed(1)}s`}
                testId="start-at"
              />
            )}
          </div>
        )}
      </Panel>
    </div>
  );
};
