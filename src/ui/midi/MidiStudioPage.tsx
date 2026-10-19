import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Download,
  FileMusic,
  Loader2,
  Music,
  Pause,
  Play,
  RefreshCw,
  Repeat,
  Save,
  Sparkles,
  Square,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
  Wand2,
  X,
} from 'lucide-react';
import { Header } from '../Header';
import { analyzeMidi, MidiParseError } from '../../midi/analyzeMidi';
import { BUILTIN_MIDI_TRACKS, buildBuiltinMidi } from '../../midi/builtinMidi';
import { buildReelPlan, defaultReelOptions } from '../../midi/reelPlan';
import { dryRunReel, type ReelDryRun } from '../../midi/reelSimulation';
import { ReelPlayer, type PlayerState } from '../../midi/reelPlayer';
import { renderReelAudio } from '../../midi/reelAudio';
import { MidiDropMode } from '../../midi/midiDropMode';
import { OVERRIDE_SYNTHS, SYNTH_LABELS } from '../../midi/instrumentMap';
import {
  deleteMidiProject,
  listMidiProjects,
  loadMidiProject,
  saveMidiProject,
  type MidiReelProjectMeta,
} from '../../midi/projectStore';
import { verifyMp4, type Mp4Check } from '../../midi/verifyMp4';
import {
  DEFAULT_MIX,
  DEFAULT_PHYSICS,
  type DropKind,
  type FitMode,
  type MidiAnalysis,
  type PlannedNote,
  type ReelMix,
  type ReelOptions,
  type ReelPhysicsSettings,
  type ReelPlan,
  type SyncToggles,
} from '../../midi/types';
import { VideoExporter, checkGpu4KCapability, type ExportProgress } from '../../export/videoExporter';
import { WorldRenderer, type VisualSettings } from '../../render/renderer';
import { DEFAULT_OVERLAYS } from '../../render/overlays';
import type { PhysicsWorld } from '../../engine/world';
import type { InstrumentType } from '../../audio/types';
import { MidiTimeline, DROP_COLORS } from './MidiTimeline';

type Step = 1 | 2 | 3 | 4 | 5;

const STEPS: { id: Step; label: string }[] = [
  { id: 1, label: 'Select MIDI' },
  { id: 2, label: 'Analyze' },
  { id: 3, label: 'Generate' },
  { id: 4, label: 'Preview & sync' },
  { id: 5, label: 'Export' },
];

const TOGGLE_LABELS: { key: keyof SyncToggles; label: string; hint: string }[] = [
  { key: 'beats', label: 'Strong beats', hint: 'Downbeats release a major drop' },
  { key: 'kicks', label: 'Kick-like lows', hint: 'Kicks / low notes drop heavy marbles' },
  { key: 'snares', label: 'Snare-like accents', hint: 'Snares / accents hit the inner pads' },
  { key: 'highNotes', label: 'High notes', hint: 'Small bright marbles on the pegs' },
  { key: 'sustained', label: 'Sustained notes', hint: 'Roll down the ramps, spin the spinner' },
  { key: 'runs', label: 'Fast runs', hint: 'Cascades of small marbles' },
  { key: 'transitions', label: 'Transitions', hint: 'New colors + camera move at sections' },
  { key: 'velocity', label: 'Velocity', hint: 'Louder notes drop bigger, faster marbles' },
];

const KIND_LABELS: Record<DropKind, string> = {
  heavy: 'Heavy',
  accent: 'Accent',
  pulse: 'Beat',
  light: 'Light',
  cascade: 'Cascade',
  roll: 'Roll',
};

const PRESETS: { id: string; label: string; sensitivity: number; physics: Partial<ReelPhysicsSettings> }[] = [
  { id: 'calm', label: 'Calm', sensitivity: 0.35, physics: { gravity: 0.85, bounce: 0.6, ballScale: 1.1, simSpeed: 1 } },
  { id: 'balanced', label: 'Balanced', sensitivity: 0.6, physics: { gravity: 1, bounce: 0.72, ballScale: 1, simSpeed: 1 } },
  { id: 'energetic', label: 'Energetic', sensitivity: 0.85, physics: { gravity: 1.2, bounce: 0.82, ballScale: 0.9, simSpeed: 1 } },
];

const RESOLUTIONS = [
  { id: '4k', label: '4K vertical', w: 2160, h: 3840 },
  { id: '1440', label: '1440p', w: 1440, h: 2560 },
  { id: '1080', label: '1080p', w: 1080, h: 1920 },
];

function reelVisuals(p: ReelPhysicsSettings): VisualSettings {
  return {
    themeId: 'neon_night',
    bloomEnabled: true,
    bloomIntensity: 1,
    ballGlowEnabled: true,
    ballGlowIntensity: 0.8,
    wallGlowEnabled: true,
    wallGlowIntensity: 1,
    rainbowWallsMode: 'off',
    trailEnabled: p.trails,
    trailLength: 14,
    trailFade: 0.55,
    trailHueShift: false,
    reactiveBgEnabled: true,
    reactiveBgIntensity: 0.3,
    screenShakeIntensity: p.cameraMotion ? 0.35 : 0,
    slowMotionEnd: false,
    chromaticFlash: false,
    ringColorMode: 'theme',
  } as VisualSettings;
}

const fmt = (t: number) => {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, '0')}`;
};

export const MidiStudioPage: React.FC = () => {
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState<string | null>(null);

  // Source
  const [midiBytes, setMidiBytes] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState('');
  const [analysis, setAnalysis] = useState<MidiAnalysis | null>(null);
  const [projects, setProjects] = useState<MidiReelProjectMeta[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);

  // Settings
  const [options, setOptions] = useState<ReelOptions | null>(null);
  const [physics, setPhysics] = useState<ReelPhysicsSettings>({ ...DEFAULT_PHYSICS });
  const [mix, setMix] = useState<ReelMix>({ ...DEFAULT_MIX });
  const [mode, setMode] = useState<'auto' | 'custom'>('auto');
  const [dropEdits, setDropEdits] = useState<Record<number, { muted?: boolean; nudge?: number }>>({});
  const [selectedDrop, setSelectedDrop] = useState<number | null>(null);

  // Generated
  const [plan, setPlan] = useState<ReelPlan | null>(null);
  const [dry, setDry] = useState<ReelDryRun | null>(null);
  const [generating, setGenerating] = useState(false);

  // Playback
  const playerRef = useRef<ReelPlayer | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState>('idle');
  const [time, setTime] = useState(0);
  const [loopRange, setLoopRange] = useState<{ a: number; b: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef(new WorldRenderer());
  const lastUiUpdate = useRef(0);
  const [sfxCount, setSfxCount] = useState(0);

  // Export
  const [resolution, setResolution] = useState(RESOLUTIONS[0]);
  const [fps, setFps] = useState<30 | 60>(30);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [exportResult, setExportResult] = useState<{ url: string; filename: string; check: Mp4Check; codec: string } | null>(null);
  const exporterRef = useRef<VideoExporter | null>(null);
  const gpu = useMemo(() => {
    try {
      return checkGpu4KCapability();
    } catch {
      return { canDo4K: true, maxTextureSize: 0 };
    }
  }, []);

  // ---------- player wiring ----------
  const getPlayer = useCallback(() => {
    if (!playerRef.current) {
      const p = new ReelPlayer();
      p.onState = (s) => setPlayerState(s);
      p.onSfx = () => setSfxCount((c) => c + 1);
      playerRef.current = p;
    }
    return playerRef.current;
  }, []);

  useEffect(() => () => playerRef.current?.dispose(), []);
  useEffect(() => {
    listMidiProjects().then(setProjects);
  }, []);
  useEffect(() => {
    playerRef.current?.setMix(mix);
  }, [mix]);

  const drawWorld = useCallback(
    (world: PhysicsWorld | null) => {
      const c = canvasRef.current;
      if (!c || !world) return;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      rendererRef.current.render(ctx, world, reelVisuals(physics), { ...DEFAULT_OVERLAYS }, c.width, c.height, false);
    },
    [physics]
  );

  useEffect(() => {
    const p = getPlayer();
    p.onFrame = (world, t) => {
      drawWorld(world);
      const now = performance.now();
      if (now - lastUiUpdate.current > 80) {
        lastUiUpdate.current = now;
        setTime(t);
      }
    };
  }, [getPlayer, drawWorld]);

  // Draw the current frame as soon as the preview canvas appears
  useEffect(() => {
    if (step === 4) requestAnimationFrame(() => drawWorld(getPlayer().world));
  }, [step, plan, drawWorld, getPlayer]);

  // ---------- Step 1: load MIDI ----------
  const loadBytes = useCallback(
    (bytes: Uint8Array, name: string) => {
      setError(null);
      try {
        const a = analyzeMidi(bytes, name);
        setMidiBytes(bytes);
        setFileName(name);
        setAnalysis(a);
        const opts = defaultReelOptions(a);
        setOptions(opts);
        setPlan(null);
        setDry(null);
        setDropEdits({});
        setProjectId(null);
        setExportResult(null);
        loadMusicPreview(a, opts);
      } catch (e: any) {
        setAnalysis(null);
        setMidiBytes(null);
        setError(e instanceof MidiParseError ? e.message : `Could not read this file: ${e?.message || e}`);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    if (!/\.(mid|midi)$/i.test(file.name)) {
      setError('Please choose a MIDI file (.mid or .midi). Audio files like MP3 or WAV are not MIDI.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('This MIDI file is larger than 8 MB, which is unusual for MIDI. Please choose a smaller file.');
      return;
    }
    loadBytes(new Uint8Array(await file.arrayBuffer()), file.name);
  };

  const onBuiltin = (id: string) => {
    const built = buildBuiltinMidi(id);
    loadBytes(built.bytes, built.fileName);
  };

  const musicNotes = (a: MidiAnalysis, o: ReelOptions): PlannedNote[] =>
    a.notes
      .filter((n) => o.enabledTracks.includes(n.trackIndex) && n.time >= o.sectionStart && n.time < o.sectionEnd)
      .map((n) => ({ ...n, time: n.time - o.sectionStart }));

  const synthsFor = (a: MidiAnalysis, o: ReelOptions): Record<number, InstrumentType> => {
    const out: Record<number, InstrumentType> = {};
    for (const t of a.tracks) out[t.index] = o.instrumentOverrides[t.index] || t.synth;
    return out;
  };

  const loadMusicPreview = (a: MidiAnalysis, o: ReelOptions) => {
    const p = getPlayer();
    p.setMix(mix);
    p.loadMusic(musicNotes(a, o), synthsFor(a, o), Math.max(0.5, o.sectionEnd - o.sectionStart), 48);
    setTime(0);
  };

  // Rebuild the music preview when tracks / section / instruments change (before generating)
  useEffect(() => {
    if (analysis && options && !plan) loadMusicPreview(analysis, options);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options?.enabledTracks, options?.sectionStart, options?.sectionEnd, options?.instrumentOverrides]);

  // ---------- Step 3: generate ----------
  const applyEdits = (p: ReelPlan, edits: typeof dropEdits): ReelPlan => ({
    ...p,
    drops: p.drops.map((d) => (edits[d.id] ? { ...d, ...edits[d.id] } : d)),
  });

  const generate = async (opts = options, phys = physics, edits = dropEdits) => {
    if (!analysis || !opts) return;
    setGenerating(true);
    setError(null);
    await new Promise((r) => setTimeout(r, 30)); // let the spinner paint
    try {
      const base = buildReelPlan(analysis, opts);
      const p = applyEdits(base, edits);
      const d = dryRunReel(p, phys, opts.seed);
      setPlan(p);
      setDry(d);
      const player = getPlayer();
      player.setMix(mix);
      player.loadReel(p, phys, opts.seed);
      setTime(0);
      setLoopRange(null);
    } catch (e: any) {
      setError(`Could not generate the animation: ${e?.message || e}`);
    } finally {
      setGenerating(false);
    }
  };

  const regenerateNewSeed = () => {
    if (!options) return;
    const next = { ...options, seed: Math.floor(Math.random() * 900000) + 1000 };
    setOptions(next);
    generate(next);
  };

  // ---------- transport ----------
  const togglePlay = () => {
    const p = getPlayer();
    if (playerState === 'playing') p.pause();
    else p.play();
  };
  const stopPlayback = () => getPlayer().stop();
  const restart = () => getPlayer().play(loopRange?.a ?? 0);
  const seek = (t: number) => {
    getPlayer().seek(t);
    setTime(t);
  };

  // ---------- custom-mode drop editing ----------
  const editDrop = (id: number, patch: { muted?: boolean; nudge?: number }) => {
    const edits = { ...dropEdits, [id]: { ...dropEdits[id], ...patch } };
    setDropEdits(edits);
    generate(options, physics, edits);
  };

  // ---------- save / open ----------
  const saveProject = async () => {
    if (!midiBytes || !options || !analysis) return;
    const id = projectId || `p${Date.now().toString(36)}`;
    await saveMidiProject({
      id,
      name: analysis.name,
      fileName,
      midiBytes: midiBytes.slice().buffer,
      options,
      physics,
      mix,
      mode,
      dropEdits,
      savedAt: Date.now(),
    });
    setProjectId(id);
    setProjects(await listMidiProjects());
  };

  const openProject = async (id: string) => {
    const proj = await loadMidiProject(id);
    if (!proj) {
      setError('That project could not be found. It may have been removed.');
      return;
    }
    try {
      const bytes = new Uint8Array(proj.midiBytes);
      const a = analyzeMidi(bytes, proj.fileName);
      setMidiBytes(bytes);
      setFileName(proj.fileName);
      setAnalysis(a);
      setOptions(proj.options);
      setPhysics(proj.physics);
      setMix(proj.mix);
      setMode(proj.mode);
      setDropEdits(proj.dropEdits || {});
      setProjectId(proj.id);
      setStep(4);
      await generate(proj.options, proj.physics, proj.dropEdits || {});
    } catch (e: any) {
      setError(e instanceof MidiParseError ? e.message : `Could not open the project: ${e?.message || e}`);
    }
  };

  // ---------- export ----------
  const runExport = async () => {
    if (!plan || !options) return;
    getPlayer().pause();
    setExporting(true);
    setExportResult(null);
    setError(null);
    const exporter = new VideoExporter();
    exporterRef.current = exporter;
    try {
      const slug = (analysis?.name || 'reel').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
      const result = await exporter.exportVideo(
        {
          width: resolution.w,
          height: resolution.h,
          fps,
          duration: plan.duration,
          seed: options.seed,
          modeId: `midi-reel-${slug}`,
          modeSettings: { reelPlan: plan, physics },
          visuals: reelVisuals(physics),
          overlays: { ...DEFAULT_OVERLAYS },
          audioSettings: { masterVolume: 0.85, instrument: 'grandPiano', sfxVolume: 0.75, droneVolume: 0.2, reverbAmount: 0.3, pitchByVelocity: false, volumeByImpulse: true, selectedMelodyId: 'fur_elise' },
          reelSpeed: physics.simSpeed,
          modeOverride: MidiDropMode,
          // Effects come from this export's own physics events (the fallback recorder renders
          // audio before simulating, so it uses an identical dry run at the export frame rate)
          renderAudio: (events, duration) => {
            const simEvents = events.some((e) => e.extra?.midiReel === 'release') ? events : dryRunReel(plan, physics, options.seed, undefined, fps).events;
            return renderReelAudio(plan, simEvents, mix, duration);
          },
        },
        (p) => setProgress(p)
      );
      const check = await verifyMp4(result.blob, { width: resolution.w, height: resolution.h, duration: plan.duration });
      const url = URL.createObjectURL(result.blob);
      setExportResult({ url, filename: result.filename, check, codec: result.codecLabel });
      if (!check.ok) setError(`The export finished but failed verification: ${check.problems.join(' ')}`);
    } catch (e: any) {
      if (!/cancel/i.test(e?.message || '')) setError(`Export failed: ${e?.message || e}`);
    } finally {
      setExporting(false);
      exporterRef.current = null;
    }
  };

  // ---------- derived ----------
  const sectionLen = options ? options.sectionEnd - options.sectionStart : 0;
  const canGoTo = (s: Step) => s === 1 || (s === 2 && !!analysis) || (s === 3 && !!analysis) || (s >= 4 && !!plan);
  const dropCounts = useMemo(() => {
    const c: Partial<Record<DropKind, number>> = {};
    for (const d of plan?.drops || []) if (!d.muted) c[d.kind] = (c[d.kind] || 0) + 1;
    return c;
  }, [plan]);
  const collisionTimes = useMemo(() => (dry ? dry.events.filter((e) => !e.extra?.midiReel).map((e) => e.time) : []), [dry]);
  const selDrop = plan?.drops.find((d) => d.id === selectedDrop) || null;

  const goStep = (s: Step) => {
    if (!canGoTo(s)) return;
    if (s <= 2 && playerState === 'playing') getPlayer().pause();
    if (s === 4 && plan && getPlayer().world === null) getPlayer().loadReel(plan, physics, options!.seed);
    if (s <= 2 && analysis && options) {
      // Back to music-only preview
      setPlan(null);
      setDry(null);
      loadMusicPreview(analysis, options);
    }
    setStep(s);
  };

  // ======================================================================================
  return (
    <div className="min-h-screen bg-[#05070b] text-slate-100" data-testid="midi-studio">
      <Header />
      <main className="max-w-6xl mx-auto px-4 pb-24 pt-4">
        <div className="flex items-center gap-2 mb-1">
          <FileMusic className="w-5 h-5 text-cyan-300" />
          <h1 className="text-lg sm:text-xl font-black tracking-tight">MIDI → Reel Studio</h1>
        </div>
        <p className="text-xs text-slate-400 mb-4">Pick the music first. The ball-drop animation is generated to match it, with every major drop landing on the beat.</p>

        {/* Stepper */}
        <ol className="flex gap-1 sm:gap-2 mb-5 overflow-x-auto" aria-label="Progress">
          {STEPS.map((s) => {
            const done = s.id < step && canGoTo(s.id);
            const active = s.id === step;
            return (
              <li key={s.id} className="flex-1 min-w-[92px]">
                <button
                  onClick={() => goStep(s.id)}
                  disabled={!canGoTo(s.id)}
                  aria-current={active ? 'step' : undefined}
                  className={`w-full rounded-xl px-2 py-2 text-left border transition ${
                    active ? 'border-cyan-400 bg-cyan-400/10' : done ? 'border-lime-400/40 bg-lime-400/5' : 'border-white/10 bg-white/[0.02]'
                  } disabled:opacity-40`}
                >
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    {done && <Check className="w-3 h-3 text-lime-300" />}
                    <span>Step {s.id}</span>
                  </div>
                  <div className="text-xs font-bold truncate">{s.label}</div>
                </button>
              </li>
            );
          })}
        </ol>

        {error && (
          <div role="alert" className="mb-4 flex gap-2 items-start rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-100">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-rose-300" />
            <div className="flex-1">{error}</div>
            <button onClick={() => setError(null)} aria-label="Dismiss" className="text-rose-200 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ============ STEP 1: SELECT MIDI ============ */}
        {step === 1 && (
          <div className="grid lg:grid-cols-[1fr_340px] gap-4">
            <section className="space-y-4">
              <label
                className="block rounded-2xl border-2 border-dashed border-cyan-400/40 bg-cyan-400/[0.03] p-6 text-center cursor-pointer hover:bg-cyan-400/[0.06]"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  onUpload(e.dataTransfer.files?.[0]);
                }}
              >
                <Upload className="w-7 h-7 mx-auto text-cyan-300 mb-2" />
                <div className="font-bold">Upload a MIDI file</div>
                <div className="text-xs text-slate-400 mt-1">.mid or .midi · drag & drop or click to browse</div>
                <input data-testid="midi-upload" type="file" accept=".mid,.midi,audio/midi,audio/x-midi" className="hidden" onChange={(e) => onUpload(e.target.files?.[0])} />
              </label>

              <div>
                <h2 className="text-sm font-bold mb-2">Built-in tracks</h2>
                <div className="grid sm:grid-cols-2 gap-2">
                  {BUILTIN_MIDI_TRACKS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => onBuiltin(t.id)}
                      className={`text-left rounded-xl border p-3 hover:border-cyan-400/60 ${analysis?.fileName === `${t.id.replace(/^bi_/, '')}.mid` ? 'border-cyan-400 bg-cyan-400/10' : 'border-white/10 bg-white/[0.02]'}`}
                    >
                      <div className="text-sm font-bold flex items-center gap-1.5">
                        <Music className="w-3.5 h-3.5 text-pink-300" />
                        {t.name}
                      </div>
                      <div className="text-[11px] text-slate-400">{t.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {projects.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold mb-2">Saved projects</h2>
                  <ul className="space-y-1.5">
                    {projects.map((p) => (
                      <li key={p.id} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
                        <button className="flex-1 text-left" onClick={() => openProject(p.id)}>
                          <div className="text-sm font-semibold">{p.name}</div>
                          <div className="text-[11px] text-slate-500">
                            {p.fileName} · {p.targetDuration}s reel · {new Date(p.savedAt).toLocaleString()}
                          </div>
                        </button>
                        <button
                          aria-label={`Delete ${p.name}`}
                          onClick={async () => {
                            await deleteMidiProject(p.id);
                            setProjects(await listMidiProjects());
                          }}
                          className="text-slate-500 hover:text-rose-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <aside className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 h-fit">
              {!analysis ? (
                <div className="text-sm text-slate-400">Choose a track to see its tempo, length and notes, and to listen to it.</div>
              ) : (
                <div className="space-y-3" data-testid="track-summary">
                  <div>
                    <div className="text-xs text-slate-400">Selected</div>
                    <div className="font-bold">{analysis.name}</div>
                    <div className="text-[11px] text-slate-500">{analysis.fileName}</div>
                  </div>
                  <dl className="grid grid-cols-2 gap-2 text-xs">
                    <Stat label="Duration" value={fmt(analysis.duration)} />
                    <Stat label="Tempo" value={`${analysis.bpm.toFixed(0)} BPM${analysis.tempoChanges.length > 1 ? ' (varies)' : ''}`} testId="bpm" />
                    <Stat label="Time signature" value={analysis.timeSignature.join('/')} />
                    <Stat label="Notes" value={`${analysis.notes.length}`} />
                    <Stat label="Tracks" value={`${analysis.tracks.filter((t) => t.noteCount).length}`} />
                    <Stat label="Range" value={analysis.notes.length ? `${noteName(analysis.noteRange[0])}–${noteName(analysis.noteRange[1])}` : '—'} />
                  </dl>
                  <Transport state={playerState} time={time} duration={sectionLen} onToggle={togglePlay} onStop={stopPlayback} onRestart={() => getPlayer().play(0)} />
                  <Slider label="Music volume" value={mix.music} onChange={(v) => setMix({ ...mix, music: v })} />
                  {analysis.warnings.length > 0 && <Warnings items={analysis.warnings} />}
                  <button onClick={() => goStep(2)} className="w-full btn-3d-lime rounded-xl py-2.5 text-black font-black text-sm flex items-center justify-center gap-1">
                    Continue <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </aside>
          </div>
        )}

        {/* ============ STEP 2: ANALYZE ============ */}
        {step === 2 && analysis && options && (
          <div className="space-y-4">
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-300 mb-3">
                <span>
                  Tempo: <b>{analysis.tempoChanges.map((t) => `${t.bpm.toFixed(0)}`).join(' → ')} BPM</b>
                </span>
                <span>
                  Time signature: <b>{analysis.timeSignature.join('/')}</b>
                </span>
                <span>
                  Beats: <b>{analysis.beats.length}</b>
                </span>
                <span>
                  Phrases: <b>{analysis.phrases.length}</b>
                </span>
                <span>
                  Sections: <b>{analysis.sections.length}</b>
                </span>
                <span>
                  Percussion: <b>{analysis.hasPercussion ? 'yes' : 'no (inferred from rhythm & pitch)'}</b>
                </span>
              </div>
              <MidiTimeline
                label="Music · drag to choose the section for the reel"
                duration={analysis.duration}
                notes={analysis.notes.filter((n) => options.enabledTracks.includes(n.trackIndex))}
                beats={analysis.beats}
                sections={analysis.sections}
                range={{ a: options.sectionStart, b: options.sectionEnd }}
                playhead={options.sectionStart + time}
                onRange={(a, b) => setOptions({ ...options, sectionStart: a, sectionEnd: Math.max(a + 1, b) })}
                onSeek={(t) => seek(Math.max(0, t - options.sectionStart))}
              />
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                <NumberField label="Section start (s)" value={options.sectionStart} min={0} max={analysis.duration - 1} onChange={(v) => setOptions({ ...options, sectionStart: v })} />
                <NumberField label="Section end (s)" value={options.sectionEnd} min={options.sectionStart + 1} max={analysis.duration} onChange={(v) => setOptions({ ...options, sectionEnd: v })} />
                <label className="flex items-center gap-2">
                  Reel length
                  <select
                    data-testid="target-duration"
                    value={options.targetDuration}
                    onChange={(e) => setOptions({ ...options, targetDuration: Number(e.target.value) })}
                    className="bg-black/40 border border-white/10 rounded-lg px-2 py-1"
                  >
                    {[15, 30, 45, 60, 90].map((d) => (
                      <option key={d} value={d}>
                        {d}s
                      </option>
                    ))}
                  </select>
                </label>
                <Transport state={playerState} time={time} duration={sectionLen} onToggle={togglePlay} onStop={stopPlayback} onRestart={() => getPlayer().play(0)} compact />
              </div>
              {sectionLen < options.targetDuration - 0.05 ? (
                <fieldset className="mt-3 text-xs">
                  <legend className="text-slate-300 mb-1">
                    The section is {sectionLen.toFixed(1)}s, shorter than the {options.targetDuration}s reel:
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ['loop', 'Loop the music'],
                        ['extend', 'Extend (varied repeats)'],
                        ['shorten', 'Shorten the reel'],
                      ] as [FitMode, string][]
                    ).map(([id, label]) => (
                      <label key={id} className={`px-3 py-1.5 rounded-lg border cursor-pointer ${options.fitMode === id ? 'border-cyan-400 bg-cyan-400/10' : 'border-white/10'}`}>
                        <input type="radio" className="sr-only" checked={options.fitMode === id} onChange={() => setOptions({ ...options, fitMode: id })} />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : (
                sectionLen > options.targetDuration + 0.05 && (
                  <p className="mt-3 text-xs text-slate-400">
                    The section is longer than the reel, so it is trimmed to {options.sectionStart.toFixed(1)}s–{(options.sectionStart + options.targetDuration).toFixed(1)}s. Drag on the timeline to pick a different part.
                  </p>
                )
              )}
            </section>

            <div className="grid lg:grid-cols-2 gap-4">
              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <h2 className="text-sm font-bold mb-2">Tracks & instruments</h2>
                <ul className="space-y-1.5">
                  {analysis.tracks
                    .filter((t) => t.noteCount > 0)
                    .map((t) => (
                      <li key={t.index} className="rounded-xl border border-white/10 px-3 py-2 text-xs">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            aria-label={`Use ${t.name}`}
                            checked={options.enabledTracks.includes(t.index)}
                            onChange={(e) =>
                              setOptions({
                                ...options,
                                enabledTracks: e.target.checked ? [...options.enabledTracks, t.index] : options.enabledTracks.filter((i) => i !== t.index),
                              })
                            }
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold truncate">{t.name}</div>
                            <div className="text-slate-500 truncate">
                              {t.isDrum ? 'GM drum kit' : `${t.instrumentName} (GM ${t.program + 1})`} · {t.noteCount} notes
                            </div>
                          </div>
                          {!t.isDrum && (
                            <select
                              aria-label={`Sound for ${t.name}`}
                              value={options.instrumentOverrides[t.index] || t.synth}
                              onChange={(e) => setOptions({ ...options, instrumentOverrides: { ...options.instrumentOverrides, [t.index]: e.target.value as InstrumentType } })}
                              className="bg-black/40 border border-white/10 rounded-lg px-1.5 py-1"
                            >
                              {Array.from(new Set([t.synth, ...OVERRIDE_SYNTHS])).map((s) => (
                                <option key={s} value={s}>
                                  {SYNTH_LABELS[s] || s}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                        {t.fallbackNote && <div className="mt-1 text-amber-300/90">{t.fallbackNote}</div>}
                      </li>
                    ))}
                </ul>
                {analysis.warnings.length > 0 && <div className="mt-3"><Warnings items={analysis.warnings} /></div>}
              </section>

              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <h2 className="text-sm font-bold mb-2">Synchronization</h2>
                <div className="grid sm:grid-cols-2 gap-1.5">
                  {TOGGLE_LABELS.map((tg) => (
                    <label key={tg.key} className="flex gap-2 items-start rounded-lg border border-white/10 px-2.5 py-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={options.toggles[tg.key]}
                        onChange={(e) => setOptions({ ...options, toggles: { ...options.toggles, [tg.key]: e.target.checked } })}
                      />
                      <span>
                        <span className="font-semibold block">{tg.label}</span>
                        <span className="text-slate-500">{tg.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <div className="mt-3">
                  <Slider label={`Sensitivity (${Math.round(options.sensitivity * 100)}%) · how many musical events become drops`} value={options.sensitivity} onChange={(v) => setOptions({ ...options, sensitivity: v })} />
                </div>
                <div className="mt-3 flex gap-2 text-xs" role="radiogroup" aria-label="Mode">
                  {(['auto', 'custom'] as const).map((m) => (
                    <button key={m} onClick={() => setMode(m)} className={`flex-1 rounded-lg border px-3 py-2 ${mode === m ? 'border-cyan-400 bg-cyan-400/10' : 'border-white/10'}`}>
                      <b>{m === 'auto' ? 'Auto mode' : 'Custom mode'}</b>
                      <div className="text-slate-500">{m === 'auto' ? 'Generate everything from the music' : 'Adjust timing, physics, obstacles & effects'}</div>
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <div className="flex justify-end">
              <button
                data-testid="generate"
                onClick={async () => {
                  setStep(3);
                  await generate();
                }}
                disabled={options.enabledTracks.length === 0 && analysis.notes.length > 0}
                className="btn-3d-lime rounded-xl px-5 py-2.5 text-black font-black text-sm flex items-center gap-1 disabled:opacity-40"
              >
                <Wand2 className="w-4 h-4" /> Generate animation
              </button>
            </div>
          </div>
        )}

        {/* ============ STEP 3: GENERATE ============ */}
        {step === 3 && options && (
          <div className="grid lg:grid-cols-[1fr_360px] gap-4">
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              {generating || !plan || !dry ? (
                <div className="flex items-center gap-3 text-sm text-slate-300 py-10 justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-cyan-300" /> Building the drop plan and simulating the physics…
                </div>
              ) : (
                <div className="space-y-3" data-testid="generate-result">
                  <h2 className="text-sm font-bold">Animation generated</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <Stat label="Reel length" value={`${plan.duration.toFixed(1)}s`} />
                    <Stat label="Ball drops" value={`${plan.drops.filter((d) => !d.muted).length}`} />
                    <Stat label="Collisions" value={`${dry.collisions}`} />
                    <Stat label="Transitions" value={`${plan.transitions.length}`} />
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    {(Object.keys(dropCounts) as DropKind[]).map((k) => (
                      <span key={k} className="px-2 py-0.5 rounded-full border border-white/10" style={{ color: DROP_COLORS[k] }}>
                        {KIND_LABELS[k]}: {dropCounts[k]}
                      </span>
                    ))}
                  </div>
                  <div data-testid="alignment" className={`rounded-xl px-3 py-2 text-xs border ${dry.alignment.withinOneFrame >= dry.alignment.landed * 0.97 ? 'border-lime-400/40 bg-lime-400/5 text-lime-100' : 'border-amber-400/40 bg-amber-400/5 text-amber-100'}`}>
                    {dry.alignment.withinOneFrame} of {dry.alignment.landed} drops hit their target within one frame of the music (average {dry.alignment.meanErrorMs.toFixed(1)} ms, worst {dry.alignment.maxErrorMs.toFixed(1)} ms).
                  </div>
                  {plan.warnings.length > 0 && <Warnings items={plan.warnings} />}
                  <MidiTimeline
                    duration={plan.duration}
                    notes={plan.notes}
                    beats={plan.beats}
                    drops={plan.drops}
                    collisionTimes={collisionTimes}
                    transitions={plan.transitions}
                    playhead={0}
                  />
                  <div className="flex flex-wrap gap-2 justify-end">
                    <button onClick={regenerateNewSeed} className="rounded-xl border border-white/15 px-3 py-2 text-xs flex items-center gap-1 hover:border-cyan-400/60">
                      <RefreshCw className="w-3.5 h-3.5" /> Regenerate (same music)
                    </button>
                    <button data-testid="to-preview" onClick={() => goStep(4)} className="btn-3d-lime rounded-xl px-4 py-2 text-black font-black text-xs flex items-center gap-1">
                      Preview reel <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </section>
            <PhysicsPanel
              mode={mode}
              physics={physics}
              options={options}
              onPhysics={(p) => {
                setPhysics(p);
                generate(options, p);
              }}
              onOptions={(o) => {
                setOptions(o);
                generate(o, physics);
              }}
            />
          </div>
        )}

        {/* ============ STEP 4: PREVIEW ============ */}
        {step === 4 && plan && options && (
          <div className="grid lg:grid-cols-[minmax(0,380px)_1fr] gap-4">
            <section className="space-y-2">
              <div className="relative mx-auto w-full max-w-[380px] aspect-[9/16] rounded-2xl overflow-hidden border border-white/10 bg-black">
                <canvas ref={canvasRef} width={540} height={960} data-testid="reel-canvas" className="w-full h-full" />
                {playerState !== 'playing' && (
                  <button onClick={togglePlay} className="absolute inset-0 flex items-center justify-center bg-black/20" aria-label="Play reel">
                    <span className="rounded-full bg-black/60 p-4 border border-white/20">
                      <Play className="w-7 h-7" />
                    </span>
                  </button>
                )}
              </div>
              <Transport state={playerState} time={time} duration={plan.duration} onToggle={togglePlay} onStop={stopPlayback} onRestart={restart} />
              <p className="text-[11px] text-slate-500 text-center">Collision sounds played this session: {sfxCount}</p>
            </section>

            <section className="space-y-3 min-w-0">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <MidiTimeline
                  label="Click to scrub · drag to loop a section · click a drop (custom mode) to edit it"
                  duration={plan.duration}
                  notes={plan.notes}
                  beats={plan.beats}
                  drops={plan.drops}
                  collisionTimes={collisionTimes}
                  transitions={plan.transitions}
                  playhead={time}
                  range={loopRange}
                  selectedDropId={selectedDrop}
                  onSeek={seek}
                  onRange={(a, b) => {
                    setLoopRange({ a, b });
                    getPlayer().setLoop(a, b);
                    getPlayer().play(a);
                  }}
                  onDropClick={mode === 'custom' ? (id) => setSelectedDrop(id) : undefined}
                />
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                  {(Object.keys(DROP_COLORS) as DropKind[]).map((k) => (
                    <span key={k} className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ background: DROP_COLORS[k] }} /> {KIND_LABELS[k]}
                    </span>
                  ))}
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-0.5 bg-emerald-400" /> transition
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-0.5 h-2 bg-sky-400" /> collision
                  </span>
                  {loopRange && (
                    <button
                      onClick={() => {
                        setLoopRange(null);
                        getPlayer().setLoop(null);
                      }}
                      className="ml-auto flex items-center gap-1 text-lime-300"
                    >
                      <Repeat className="w-3 h-3" /> Looping {fmt(loopRange.a)}–{fmt(loopRange.b)} · clear
                    </button>
                  )}
                </div>
                {mode === 'custom' && selDrop && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs">
                    <span className="font-semibold" style={{ color: DROP_COLORS[selDrop.kind] }}>
                      {KIND_LABELS[selDrop.kind]} drop at {fmt(selDrop.time + (selDrop.nudge || 0))}
                    </span>
                    <button className="px-2 py-1 rounded border border-white/15" onClick={() => editDrop(selDrop.id, { nudge: (selDrop.nudge || 0) - 0.02 })}>
                      −20 ms
                    </button>
                    <button className="px-2 py-1 rounded border border-white/15" onClick={() => editDrop(selDrop.id, { nudge: (selDrop.nudge || 0) + 0.02 })}>
                      +20 ms
                    </button>
                    <button className="px-2 py-1 rounded border border-white/15" onClick={() => editDrop(selDrop.id, { muted: !selDrop.muted })}>
                      {selDrop.muted ? 'Enable drop' : 'Remove drop'}
                    </button>
                    <button className="ml-auto text-slate-400" onClick={() => setSelectedDrop(null)}>
                      Close
                    </button>
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold">Mixer</h2>
                    <button
                      onClick={() => setMix({ ...mix, muted: !mix.muted })}
                      className={`text-xs flex items-center gap-1 px-2 py-1 rounded-lg border ${mix.muted ? 'border-rose-400 text-rose-300' : 'border-white/15'}`}
                      aria-pressed={mix.muted}
                    >
                      {mix.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />} {mix.muted ? 'Muted' : 'Mute'}
                    </button>
                  </div>
                  <Slider label="Master" value={mix.master} onChange={(v) => setMix({ ...mix, master: v })} />
                  <Slider label="MIDI music" value={mix.music} onChange={(v) => setMix({ ...mix, music: v })} />
                  <Slider label="Ball drops" value={mix.drops} onChange={(v) => setMix({ ...mix, drops: v })} />
                  <Slider label="Collision effects" value={mix.collisions} onChange={(v) => setMix({ ...mix, collisions: v })} />
                  <Slider label="Ambient" value={mix.ambient} onChange={(v) => setMix({ ...mix, ambient: v })} />
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={mix.bassImpacts} onChange={(e) => setMix({ ...mix, bassImpacts: e.target.checked })} /> Bass impacts on heavy drops
                  </label>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 space-y-2">
                  <h2 className="text-sm font-bold">Animation</h2>
                  <div className="flex gap-1.5">
                    {PRESETS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          const phys = { ...physics, ...p.physics };
                          const o = { ...options, sensitivity: p.sensitivity };
                          setPhysics(phys);
                          setOptions(o);
                          generate(o, phys);
                        }}
                        className="flex-1 rounded-lg border border-white/15 px-2 py-1.5 text-xs hover:border-cyan-400/60"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <Slider
                    label={`Sync sensitivity (${Math.round(options.sensitivity * 100)}%)`}
                    value={options.sensitivity}
                    onChange={(v) => setOptions({ ...options, sensitivity: v })}
                    onCommit={(v) => generate({ ...options, sensitivity: v })}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button onClick={regenerateNewSeed} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs flex items-center gap-1">
                      <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                    </button>
                    <button onClick={saveProject} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs flex items-center gap-1" data-testid="save-project">
                      <Save className="w-3.5 h-3.5" /> {projectId ? 'Save changes' : 'Save project'}
                    </button>
                    <button onClick={() => setMode(mode === 'auto' ? 'custom' : 'auto')} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs">
                      {mode === 'auto' ? 'Switch to custom mode' : 'Switch to auto mode'}
                    </button>
                  </div>
                  {mode === 'custom' && (
                    <PhysicsPanel
                      embedded
                      mode={mode}
                      physics={physics}
                      options={options}
                      onPhysics={(p) => {
                        setPhysics(p);
                        generate(options, p);
                      }}
                      onOptions={(o) => {
                        setOptions(o);
                        generate(o, physics);
                      }}
                    />
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <button data-testid="to-export" onClick={() => goStep(5)} className="btn-3d-lime rounded-xl px-5 py-2.5 text-black font-black text-sm flex items-center gap-1">
                  Export reel <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ============ STEP 5: EXPORT ============ */}
        {step === 5 && plan && options && (
          <div className="grid lg:grid-cols-[1fr_380px] gap-4">
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-4">
              <div>
                <h2 className="text-sm font-bold mb-2">Video settings</h2>
                <div className="flex flex-wrap gap-2">
                  {RESOLUTIONS.map((r) => (
                    <button
                      key={r.id}
                      data-testid={`res-${r.id}`}
                      onClick={() => setResolution(r)}
                      className={`rounded-lg border px-3 py-2 text-xs ${resolution.id === r.id ? 'border-cyan-400 bg-cyan-400/10' : 'border-white/15'}`}
                    >
                      <b>{r.label}</b>
                      <div className="text-slate-400">
                        {r.w}×{r.h}
                      </div>
                    </button>
                  ))}
                </div>
                {resolution.id === '4k' && !gpu.canDo4K && (
                  <p className="mt-2 text-xs text-amber-300">This device may not be able to render 4K ({(gpu as any).reason || 'GPU limit'}). If the export fails, choose 1440p or 1080p.</p>
                )}
              </div>
              <div className="flex flex-wrap gap-4 text-xs">
                <label className="flex items-center gap-2">
                  Frame rate
                  <select value={fps} onChange={(e) => setFps(Number(e.target.value) as 30 | 60)} className="bg-black/40 border border-white/10 rounded-lg px-2 py-1">
                    <option value={30}>30 fps</option>
                    <option value={60}>60 fps</option>
                  </select>
                </label>
                <span>
                  Duration: <b>{plan.duration.toFixed(1)}s</b>
                </span>
                <span>
                  Format: <b>MP4 · H.264 + AAC</b>
                </span>
              </div>

              {!exporting ? (
                <button data-testid="start-export" onClick={runExport} className="btn-3d-lime rounded-xl px-5 py-3 text-black font-black text-sm flex items-center gap-2">
                  <Download className="w-4 h-4" /> Export {resolution.w}×{resolution.h} MP4
                </button>
              ) : (
                <div className="space-y-2" data-testid="export-progress">
                  <div className="flex justify-between text-xs">
                    <span>
                      {progress?.stage === 'video' ? 'Rendering frames' : progress?.stage === 'audio' ? 'Mixing soundtrack' : progress?.stage === 'muxing' ? 'Writing MP4 & verifying' : 'Preparing'}
                      {progress?.pausedMessage ? ` — ${progress.pausedMessage}` : ''}
                    </span>
                    <span className="font-mono">
                      {progress?.percent ?? 0}%{progress?.etaSeconds ? ` · ~${progress.etaSeconds}s left` : ''}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-cyan-400 transition-all" style={{ width: `${progress?.percent ?? 0}%` }} />
                  </div>
                  {progress?.codecChosen && <div className="text-[11px] text-slate-500">Encoder: {progress.codecChosen}</div>}
                  <button onClick={() => exporterRef.current?.cancel()} className="text-xs text-slate-400 hover:text-white">
                    Cancel export
                  </button>
                </div>
              )}

              {exportResult && (
                <div className="space-y-2" data-testid="export-result">
                  <div className={`rounded-xl border px-3 py-2 text-xs ${exportResult.check.ok ? 'border-lime-400/40 bg-lime-400/5' : 'border-amber-400/40 bg-amber-400/5'}`}>
                    <div className="font-bold mb-1">{exportResult.check.ok ? 'Verified MP4' : 'Export needs attention'}</div>
                    <ul className="space-y-0.5 text-slate-300">
                      <li data-testid="verify-dims">
                        Video: {exportResult.check.width}×{exportResult.check.height} · {exportResult.check.videoCodec} ({exportResult.codec})
                      </li>
                      <li data-testid="verify-duration">Duration: {exportResult.check.duration.toFixed(2)}s</li>
                      <li data-testid="verify-audio">
                        Audio: {exportResult.check.audioCodec ? `${exportResult.check.audioCodec}, ${exportResult.check.audioChannels} ch (MIDI music + collision effects)` : 'missing'}
                      </li>
                      <li>Size: {(exportResult.check.sizeBytes / 1024 / 1024).toFixed(1)} MB</li>
                      {exportResult.check.problems.map((p) => (
                        <li key={p} className="text-amber-300">
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <a href={exportResult.url} download={exportResult.filename} data-testid="download" className="btn-3d-lime rounded-xl px-5 py-2.5 text-black font-black text-sm inline-flex items-center gap-2">
                    <Download className="w-4 h-4" /> Download {exportResult.filename}
                  </a>
                </div>
              )}
            </section>
            <aside className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              {exportResult ? (
                <video src={exportResult.url} controls playsInline className="w-full rounded-xl aspect-[9/16] bg-black" />
              ) : progress?.previewDataUrl ? (
                <img src={progress.previewDataUrl} alt="Export preview frame" className="w-full rounded-xl" />
              ) : (
                <div className="text-xs text-slate-400 space-y-1">
                  <p>The export renders every frame at full resolution with WebCodecs (H.264) and mixes the synthesized MIDI with the collision effects from the same simulation (AAC 48 kHz stereo).</p>
                  <p>When it finishes, the file is read back to confirm its size, length and audio track before you download it.</p>
                </div>
              )}
            </aside>
          </div>
        )}
      </main>
    </div>
  );
};

// ---------------------------------------------------------------------------------------

const PhysicsPanel: React.FC<{
  mode: 'auto' | 'custom';
  physics: ReelPhysicsSettings;
  options: ReelOptions;
  embedded?: boolean;
  onPhysics: (p: ReelPhysicsSettings) => void;
  onOptions: (o: ReelOptions) => void;
}> = ({ mode, physics, options, embedded, onPhysics, onOptions }) => {
  const [draft, setDraft] = useState(physics);
  useEffect(() => setDraft(physics), [physics]);
  const commit = (p: ReelPhysicsSettings) => onPhysics(p);
  if (mode === 'auto' && !embedded) {
    return (
      <aside className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs text-slate-400 h-fit space-y-2">
        <div className="flex items-center gap-1.5 text-slate-200 font-bold text-sm">
          <Sparkles className="w-4 h-4 text-cyan-300" /> Auto mode
        </div>
        <p>Everything is generated from the music. Switch to custom mode in step 2 or 4 to adjust drop timing, physics, obstacles and effects.</p>
      </aside>
    );
  }
  const Toggle = ({ k, label }: { k: keyof ReelPhysicsSettings; label: string }) => (
    <label className="flex items-center gap-2 text-xs">
      <input type="checkbox" checked={draft[k] as boolean} onChange={(e) => commit({ ...draft, [k]: e.target.checked })} /> {label}
    </label>
  );
  return (
    <aside className={`${embedded ? '' : 'rounded-2xl border border-white/10 bg-white/[0.03] p-4 h-fit'} space-y-2`}>
      {!embedded && <h2 className="text-sm font-bold">Custom mode</h2>}
      <Slider label={`Gravity ×${draft.gravity.toFixed(2)}`} min={0.5} max={2} value={draft.gravity} onChange={(v) => setDraft({ ...draft, gravity: v })} onCommit={(v) => commit({ ...draft, gravity: v })} />
      <Slider label={`Bounce ${draft.bounce.toFixed(2)}`} min={0.3} max={0.95} value={draft.bounce} onChange={(v) => setDraft({ ...draft, bounce: v })} onCommit={(v) => commit({ ...draft, bounce: v })} />
      <Slider label={`Ball size ×${draft.ballScale.toFixed(2)}`} min={0.6} max={1.6} value={draft.ballScale} onChange={(v) => setDraft({ ...draft, ballScale: v })} onCommit={(v) => commit({ ...draft, ballScale: v })} />
      <Slider label={`Simulation speed ×${draft.simSpeed.toFixed(2)}`} min={0.5} max={1.5} value={draft.simSpeed} onChange={(v) => setDraft({ ...draft, simSpeed: v })} onCommit={(v) => commit({ ...draft, simSpeed: v })} />
      <Slider
        label={`Drop timing offset ${options.timingOffsetMs > 0 ? '+' : ''}${options.timingOffsetMs} ms`}
        min={-150}
        max={150}
        step={5}
        value={options.timingOffsetMs}
        onChange={(v) => onOptions({ ...options, timingOffsetMs: Math.round(v) })}
      />
      <div className="grid grid-cols-2 gap-1.5 pt-1">
        <Toggle k="pegs" label="Pegs" />
        <Toggle k="ramps" label="Ramps" />
        <Toggle k="spinner" label="Spinner" />
        <Toggle k="funnel" label="Funnel" />
        <Toggle k="trails" label="Neon trails" />
        <Toggle k="particles" label="Particle bursts" />
        <Toggle k="cameraMotion" label="Camera motion" />
      </div>
    </aside>
  );
};

const Stat: React.FC<{ label: string; value: string; testId?: string }> = ({ label, value, testId }) => (
  <div className="rounded-lg bg-black/30 border border-white/5 px-2 py-1.5">
    <dt className="text-[10px] text-slate-500">{label}</dt>
    <dd className="font-bold" data-testid={testId}>
      {value}
    </dd>
  </div>
);

const Warnings: React.FC<{ items: string[] }> = ({ items }) => (
  <ul className="space-y-1 text-[11px] text-amber-200/90" data-testid="warnings">
    {items.map((w) => (
      <li key={w} className="flex gap-1.5">
        <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" /> {w}
      </li>
    ))}
  </ul>
);

const Slider: React.FC<{
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
  onCommit?: (v: number) => void;
}> = ({ label, value, min = 0, max = 1, step = 0.01, onChange, onCommit }) => (
  <label className="block text-xs">
    <span className="text-slate-300">{label}</span>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={label}
      onChange={(e) => onChange(Number(e.target.value))}
      onPointerUp={(e) => onCommit?.(Number((e.target as HTMLInputElement).value))}
      onKeyUp={(e) => onCommit?.(Number((e.target as HTMLInputElement).value))}
      className="w-full accent-cyan-400"
    />
  </label>
);

const NumberField: React.FC<{ label: string; value: number; min: number; max: number; onChange: (v: number) => void }> = ({ label, value, min, max, onChange }) => (
  <label className="flex items-center gap-1.5">
    {label}
    <input
      type="number"
      step={0.5}
      min={min}
      max={max}
      value={Number(value.toFixed(2))}
      onChange={(e) => {
        const v = Number(e.target.value);
        if (Number.isFinite(v)) onChange(Math.max(min, Math.min(max, v)));
      }}
      className="w-20 bg-black/40 border border-white/10 rounded-lg px-2 py-1"
    />
  </label>
);

const Transport: React.FC<{
  state: PlayerState;
  time: number;
  duration: number;
  onToggle: () => void;
  onStop: () => void;
  onRestart: () => void;
  compact?: boolean;
}> = ({ state, time, duration, onToggle, onStop, onRestart, compact }) => (
  <div className={`flex items-center gap-1.5 ${compact ? '' : 'justify-center'}`} data-testid="transport">
    <button onClick={onToggle} data-testid="play-toggle" aria-label={state === 'playing' ? 'Pause' : 'Play'} className="rounded-lg bg-cyan-400 text-black p-2">
      {state === 'playing' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
    </button>
    <button onClick={onStop} aria-label="Stop" className="rounded-lg border border-white/15 p-2">
      <Square className="w-4 h-4" />
    </button>
    <button onClick={onRestart} aria-label="Restart" className="rounded-lg border border-white/15 p-2">
      <RefreshCw className="w-4 h-4" />
    </button>
    <span className="font-mono text-xs text-slate-300 ml-1" data-testid="clock">
      {fmt(time)} / {fmt(duration)}
    </span>
  </div>
);

function noteName(midi: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return `${names[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}
