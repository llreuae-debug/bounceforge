import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bug, Pause, Play, RotateCcw, Shuffle, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { Header } from '../Header';
import { libraryTrack } from '../../dropstudio/library/compile';
import { findSong, type LibraryInstrument } from '../../dropstudio/library/songs';
import { computeImpacts, defaultSyncFor, type DropFrequency, type SyncMode, type SyncSettings } from '../../dropstudio/sync';
import { buildScene, DEFAULT_STYLE_OPTIONS, STYLES, type StyleId, type StyleOptions } from '../../dropstudio/styles';
import { buildAudioEvents, DEFAULT_MIX, DropPlayer, type DropMix, type PlayerSource } from '../../dropstudio/audio';
import { maxSyncErrorFrames, type RenderOptions } from '../../dropstudio/render';
import { VIRAL_PRESETS, type ViralPreset } from '../../dropstudio/presets';
import { analyzeAudioUpload, analyzeMidiUpload, audioToTrack, isAudioFile, isMidiFile, midiToTrack, type AudioUpload } from '../../dropstudio/uploads';
import type { MidiAnalysis } from '../../midi/types';
import type { StudioTrack } from '../../dropstudio/track';
import { PreviewStage, type PreviewQuality } from './PreviewStage';
import { DropRenderer3D } from '../../dropstudio/render3d';
import { LibraryPanel } from './LibraryPanel';
import { StylePanel } from './StylePanel';
import { ExportPanel } from './ExportPanel';
import { BeatTimeline } from './BeatTimeline';
import { fmtTime, Panel, SafeBadge, Seg, Slider, Toggle, UserBadge } from './controls';

type Tab = 'library' | 'style' | 'sync' | 'export';
type Uploaded = { kind: 'midi'; analysis: MidiAnalysis } | { kind: 'audio'; up: AudioUpload; name: string };
type Look = Pick<RenderOptions, 'material' | 'palette' | 'trail' | 'camera'>;

const SAVE_KEY = 'dropstudio:settings:v1';
interface Saved {
  trackId: string;
  style: StyleId;
  styleOpts: StyleOptions;
  look: Look;
  sync: SyncSettings;
  mix: DropMix;
  instrument: LibraryInstrument;
  quality: PreviewQuality;
}
function loadSaved(): Partial<Saved> {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    const v = raw ? (JSON.parse(raw) as Partial<Saved>) : {};
    if (v.trackId && !findSong(v.trackId)) delete v.trackId;
    if (v.style && !STYLES.some((s) => s.id === v.style)) delete v.style;
    return v;
  } catch {
    return {};
  }
}
const DEBUG = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1';

const TABS: { id: Tab; label: string }[] = [
  { id: 'library', label: 'MIDI Library' },
  { id: 'style', label: 'Drop Style' },
  { id: 'sync', label: 'Beat Sync' },
  { id: 'export', label: 'Export' },
];

/**
 * BounceForge 3D Drop Studio: pick a copyright-safe song (or your own), pick a drop style, and the
 * animation is generated backwards from the beat — every impact lands on its note or beat.
 */
export const DropStudioPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>(() => {
    const path = typeof window !== 'undefined' ? window.location.pathname.replace(/\/+$/, '') : '';
    if (/\/(drop-styles|styles)$/.test(path)) return 'style';
    if (/\/export$/.test(path)) return 'export';
    return 'library';
  });
  const saved = useMemo(loadSaved, []);
  const [trackId, setTrackId] = useState(saved.trackId ?? 'moonlight_sonata');
  const [uploaded, setUploaded] = useState<Uploaded | null>(null);
  const [startAt, setStartAt] = useState(0);
  const [uploadBusy, setUploadBusy] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [analysisMs, setAnalysisMs] = useState<number | undefined>(undefined);

  const track: StudioTrack = useMemo(() => {
    if (uploaded?.kind === 'midi') return midiToTrack(uploaded.analysis, startAt);
    if (uploaded?.kind === 'audio') return audioToTrack(uploaded.name, uploaded.up, startAt);
    return libraryTrack(trackId);
  }, [uploaded, startAt, trackId]);

  const [sync, setSync] = useState<SyncSettings>(() => ({ ...defaultSyncFor(libraryTrack(saved.trackId ?? 'moonlight_sonata')), ...saved.sync, beatOverride: null }));
  const [style, setStyle] = useState<StyleId>(saved.style ?? 'classic');
  const [styleOpts, setStyleOpts] = useState<StyleOptions>({ ...DEFAULT_STYLE_OPTIONS, ...saved.styleOpts });
  const [look, setLook] = useState<Look>({ material: 'glass', palette: 'ocean', trail: true, camera: 'static', ...saved.look });
  const [instrument, setInstrument] = useState<LibraryInstrument>(saved.instrument ?? 'piano');
  const [mix, setMix] = useState<DropMix>({ ...DEFAULT_MIX, ...saved.mix });
  const [syncCheck, setSyncCheck] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [quality, setQuality] = useState<PreviewQuality>(saved.quality ?? 'fast');
  const [loop, setLoop] = useState(true);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);

  const player = useMemo(() => new DropPlayer(), []);
  const libPlayer = useMemo(() => new DropPlayer(), []);
  useEffect(() => () => {
    player.dispose();
    libPlayer.dispose();
  }, [player, libPlayer]);

  // Settings persist across reloads (per browser)
  useEffect(() => {
    try {
      const v: Saved = { trackId, style, styleOpts, look, sync: { ...sync, beatOverride: null }, mix, instrument, quality };
      localStorage.setItem(SAVE_KEY, JSON.stringify(v));
    } catch {
      /* storage unavailable */
    }
  }, [trackId, style, styleOpts, look, sync, mix, instrument, quality]);
  useEffect(() => {
    player.loop = loop;
  }, [player, loop]);

  // New song → its default sync mode and instrument (unless a preset just set them)
  const skipReset = useRef(saved.trackId !== undefined);
  useEffect(() => {
    if (skipReset.current) {
      skipReset.current = false;
      return;
    }
    const d = defaultSyncFor(track);
    setSync((s) => ({ ...s, mode: d.mode, beatOverride: null }));
    setInstrument(track.instrument);
    // Only on song identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track.id]);

  // ---- Generation: impacts → scene → audio events (pure, a few ms) ----
  const gen = useMemo(() => {
    const t0 = performance.now();
    const impacts = computeImpacts(track, sync);
    const scene = buildScene(style, impacts, { ...styleOpts, slowMo: sync.slowMo, freezeFrames: sync.freezeFrames }, track);
    const events = buildAudioEvents(track, impacts, sync.mode, scene);
    const ms = performance.now() - t0;
    return { impacts, scene, events, ms, syncErr: maxSyncErrorFrames(scene, impacts.t) };
  }, [track, sync, style, styleOpts]);

  // ?debug=1: expose the current scene for QA tooling (preview/export frame comparison)
  useEffect(() => {
    if (DEBUG) (window as any).__dropStudio = { scene: gen.scene, impacts: gen.impacts, player, DropRenderer3D };
  }, [gen, player]);

  const audioSrc: PlayerSource = useMemo(
    () => ({ events: gen.events, instrument, duration: track.duration, audio: track.audio ?? null, audioOffset: track.audioOffset ?? 0 }),
    [gen.events, instrument, track]
  );
  useEffect(() => player.setSource(audioSrc), [player, audioSrc]);
  useEffect(() => player.setMix(mix), [player, mix]);
  useEffect(() => libPlayer.setMix({ ...mix, muted: false }), [libPlayer, mix]);

  const renderOpts: RenderOptions = useMemo(
    () => ({ ...look, syncCheck, watermark: true, beats: gen.impacts.beats, impacts: gen.impacts.t }),
    [look, syncCheck, gen.impacts]
  );

  const togglePlay = async () => {
    libPlayer.stop();
    if (player.playing) {
      player.pause();
      setPlaying(false);
    } else {
      await player.play();
      setPlaying(true);
    }
  };

  const applyPreset = (p: ViralPreset) => {
    skipReset.current = trackId !== p.songId || !!uploaded;
    setUploaded(null);
    setTrackId(p.songId);
    setStyle(p.style);
    setLook({ material: p.material, palette: p.palette, camera: p.camera, trail: p.trail });
    setStyleOpts((o) => ({ ...o, ballCount: p.ballCount, follow: p.camera === 'follow' }));
    setSync((s) => ({ ...s, mode: p.mode, frequency: p.frequency, slowMo: p.slowMo, beatOverride: null }));
    setInstrument(findSong(p.songId)?.instrument ?? 'piano');
    player.seek(0);
  };

  const onUpload = async (file: File) => {
    setUploadError(null);
    try {
      if (isMidiFile(file.name)) {
        setUploadBusy('Reading MIDI…');
        setUploadProgress(0.5);
        const { analysis, ms } = await analyzeMidiUpload(file);
        setAnalysisMs(ms);
        setStartAt(0);
        setUploaded({ kind: 'midi', analysis });
      } else if (isAudioFile(file.name)) {
        setUploadBusy('Reading file…');
        const up = await analyzeAudioUpload(file, (label, f) => {
          setUploadBusy(label);
          setUploadProgress(f);
        });
        setAnalysisMs(up.ms);
        setStartAt(0);
        setUploaded({ kind: 'audio', up, name: file.name });
      } else {
        throw new Error('Unsupported file. Upload a .mid, .midi, .mp3 or .wav file.');
      }
      player.seek(0);
    } catch (e: any) {
      setUploadError(e?.message || String(e));
    } finally {
      setUploadBusy(null);
      setUploadProgress(0);
    }
  };

  const styleInfo = STYLES.find((s) => s.id === style)!;
  const sourceDuration = uploaded?.kind === 'audio' ? uploaded.up.analysis.duration : uploaded?.kind === 'midi' ? uploaded.analysis.duration : null;

  return (
    <div className="min-h-screen bg-[#050608] text-white">
      <Header />
      <main className="max-w-[1500px] mx-auto px-4 py-5">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-lime-300" /> BounceForge 3D — Drop Studio
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl">Pick a song, pick a drop style. The animation is built backwards from the beat, so every impact lands on its note — in preview and in the export.</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold truncate max-w-[220px]" data-testid="current-track">
              {track.title}
            </span>
            {track.copyrightSafe ? <SafeBadge /> : <UserBadge />}
          </div>
        </div>

        {/* Viral presets */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4" data-testid="presets">
          {VIRAL_PRESETS.map((p) => (
            <button key={p.id} data-testid={`preset-${p.id}`} onClick={() => applyPreset(p)} className="btn-3d-glass shrink-0 rounded-xl px-3 py-2 text-xs font-bold whitespace-nowrap">
              <span className="mr-1">{p.emoji}</span>
              {p.name}
            </button>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
          {/* Controls */}
          <div className="order-2 lg:order-1 min-w-0">
            <div role="tablist" className="grid grid-cols-4 gap-1.5 mb-3">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={tab === t.id}
                  data-testid={`tab-${t.id}`}
                  onClick={() => setTab(t.id)}
                  className={`rounded-xl py-2 text-[11px] sm:text-xs font-black border ${tab === t.id ? 'bg-cyan-400 text-slate-950 border-cyan-300' : 'bg-white/[0.04] border-white/10 text-slate-300'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'library' && (
              <LibraryPanel
                track={track}
                onPick={(id) => {
                  setUploaded(null);
                  setTrackId(id);
                  player.seek(0);
                }}
                onUpload={onUpload}
                uploadBusy={uploadBusy}
                uploadProgress={uploadProgress}
                analysisMs={analysisMs}
                uploadError={uploadError}
                startAt={startAt}
                onStartAt={setStartAt}
                sourceDuration={sourceDuration}
                instrument={instrument}
                onInstrument={setInstrument}
                mix={mix}
                onMix={setMix}
                libPlayer={libPlayer}
              />
            )}
            {tab === 'style' && <StylePanel style={style} onStyle={setStyle} styleOpts={styleOpts} onStyleOpts={setStyleOpts} look={look} onLook={setLook} />}
            {tab === 'sync' && (
              <div className="space-y-4">
                <Panel title="MIDI sync mode">
                  <Seg<SyncMode>
                    testId="sync-mode"
                    label="Sync mode"
                    value={sync.mode}
                    onChange={(mode) => setSync({ ...sync, mode })}
                    options={[
                      { value: 'note', label: 'Note Mode', title: 'Each impact plays the next note of the melody' },
                      { value: 'beat', label: 'Beat Mode', title: 'Impacts on beats, the song plays as backing' },
                      { value: 'major', label: 'Major Drops Only', title: 'Big impacts on downbeats only' },
                      { value: 'veryslow', label: 'Very Slow', title: 'Fast runs become single slow drops' },
                    ]}
                  />
                  {sync.mode === 'note' && !track.notes.length && <p className="mt-2 text-[11px] text-amber-200">Recordings have no notes: Note Mode follows the beats instead.</p>}
                </Panel>
                <Panel title="Drops">
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Drop frequency (major drops)</div>
                      <Seg<DropFrequency>
                        testId="frequency"
                        label="Drop frequency"
                        value={sync.frequency}
                        onChange={(frequency) => setSync({ ...sync, frequency })}
                        options={[
                          { value: 'beat', label: 'Every beat' },
                          { value: '2beats', label: 'Every 2 beats' },
                          { value: 'bar', label: 'Every bar' },
                          { value: '2bars', label: 'Every 2 bars' },
                          { value: 'major', label: 'Major only' },
                        ]}
                      />
                    </div>
                    <Toggle label="Off-beat micro-bounces (Tier 3)" checked={sync.offbeats} onChange={(offbeats) => setSync({ ...sync, offbeats })} testId="offbeats" />
                    <Slider label="Slow-Mo" value={sync.slowMo} min={0.25} max={1} step={0.05} onChange={(slowMo) => setSync({ ...sync, slowMo })} format={(v) => `${v.toFixed(2)}x`} testId="slowmo" />
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Freeze on major drops</div>
                      <Seg<0 | 2 | 3>
                        testId="freeze"
                        label="Freeze frames"
                        value={sync.freezeFrames}
                        onChange={(freezeFrames) => setSync({ ...sync, freezeFrames })}
                        options={[
                          { value: 0, label: 'Off' },
                          { value: 2, label: '2 frames' },
                          { value: 3, label: '3 frames' },
                        ]}
                      />
                    </div>
                    <Slider label="Sync offset" value={sync.offsetMs} min={-200} max={200} step={5} onChange={(offsetMs) => setSync({ ...sync, offsetMs })} format={(v) => `${v > 0 ? '+' : ''}${v} ms`} testId="offset" />
                    <Toggle label="Sync Check (flash on every beat & impact)" checked={syncCheck} onChange={setSyncCheck} testId="sync-check" />
                  </div>
                </Panel>
                <Panel
                  title="Beat markers"
                  right={
                    sync.beatOverride ? (
                      <button onClick={() => setSync({ ...sync, beatOverride: null })} className="text-[11px] rounded-lg border border-white/15 px-2 py-0.5">
                        Reset beats
                      </button>
                    ) : null
                  }
                >
                  <BeatTimeline
                    track={track}
                    beats={gen.impacts.beats}
                    downbeats={gen.impacts.downbeats}
                    impacts={gen.impacts.t}
                    tiers={gen.impacts.tier}
                    time={time}
                    onSeek={(t) => player.seek(t)}
                    onBeats={(beats) => setSync({ ...sync, beatOverride: beats })}
                  />
                </Panel>
              </div>
            )}
            {tab === 'export' && <ExportPanel scene={gen.scene} render={renderOpts} audio={audioSrc} mix={mix} track={track} styleName={styleInfo.name} styleId={style} seed={styleOpts.seed} />}
          </div>

          {/* Preview */}
          <div className="order-1 lg:order-2 min-w-0 lg:sticky lg:top-4 self-start space-y-3">
            <PreviewStage
              scene={gen.scene}
              opts={renderOpts}
              player={player}
              quality={quality}
              showDebug={showDebug}
              debug={{ genMs: gen.ms, impacts: gen.impacts.t.length, syncErrFrames: gen.syncErr, analysisMs }}
              onTime={(t) => {
                setTime(t);
                if (playing !== player.playing) setPlaying(player.playing);
              }}
            />
            <div className="mx-auto max-w-[520px] space-y-2">
              <div className="flex items-center gap-2">
                <button data-testid="play" aria-label={playing ? 'Pause' : 'Play'} onClick={togglePlay} className="btn-3d-cyan rounded-xl p-2.5 text-black">
                  {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                <button
                  aria-label="Restart"
                  onClick={async () => {
                    await player.play(0);
                    setPlaying(true);
                  }}
                  className="rounded-xl p-2.5 border border-white/15"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  aria-label={loop ? 'Loop on' : 'Loop off'}
                  aria-pressed={loop}
                  data-testid="loop"
                  onClick={() => setLoop(!loop)}
                  className={`rounded-xl px-2.5 py-2 text-xs font-bold border ${loop ? 'border-cyan-400 text-cyan-300' : 'border-white/15 text-slate-400'}`}
                >
                  Loop
                </button>
                <button
                  aria-label="Regenerate with a new seed"
                  data-testid="regenerate"
                  onClick={() => setStyleOpts((o) => ({ ...o, seed: Math.floor(Math.random() * 900000) + 1000 }))}
                  className="rounded-xl p-2.5 border border-white/15"
                  title="Regenerate (new random layout, same timing)"
                >
                  <Shuffle className="w-4 h-4" />
                </button>
                <input
                  type="range"
                  aria-label="Scrub"
                  data-testid="scrub"
                  min={0}
                  max={track.duration}
                  step={0.01}
                  value={time}
                  onChange={(e) => {
                    const t = parseFloat(e.target.value);
                    player.seek(t);
                    setTime(t);
                  }}
                  className="flex-1 accent-cyan-400"
                />
                <span className="font-mono text-xs w-24 text-right" data-testid="clock">
                  {fmtTime(time)} / {fmtTime(track.duration)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Slider label="Master" value={mix.master} min={0} max={1} step={0.01} onChange={(master) => setMix({ ...mix, master })} format={(v) => `${Math.round(v * 100)}%`} />
                <Slider label="Music" value={mix.music} min={0} max={1} step={0.01} onChange={(music) => setMix({ ...mix, music })} format={(v) => `${Math.round(v * 100)}%`} />
                <Slider label="Impacts" value={mix.impacts} min={0} max={1} step={0.01} onChange={(impacts) => setMix({ ...mix, impacts })} format={(v) => `${Math.round(v * 100)}%`} />
              </div>
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <Seg<PreviewQuality>
                  testId="quality"
                  label="Preview quality"
                  value={quality}
                  onChange={setQuality}
                  options={[
                    { value: 'fast', label: 'Fast 720p' },
                    { value: 'balanced', label: 'Balanced' },
                    { value: 'full', label: 'Full' },
                  ]}
                />
                <div className="flex gap-1.5">
                  <button data-testid="mute" onClick={() => setMix({ ...mix, muted: !mix.muted })} className="rounded-xl px-3 py-1.5 text-xs border border-white/15 flex items-center gap-1">
                    {mix.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />} {mix.muted ? 'Muted' : 'Mute'}
                  </button>
                  {DEBUG && (
                  <button data-testid="debug-toggle" onClick={() => setShowDebug(!showDebug)} className={`rounded-xl px-3 py-1.5 text-xs border flex items-center gap-1 ${showDebug ? 'border-lime-400 text-lime-300' : 'border-white/15'}`}>
                    <Bug className="w-3.5 h-3.5" /> Debug
                  </button>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-slate-500 text-center" data-testid="gen-stats">
                {styleInfo.name} · seed {styleOpts.seed} · {gen.impacts.t.length} impacts · generated in {gen.ms.toFixed(1)} ms · max sync error {gen.syncErr.toFixed(2)} frames
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
