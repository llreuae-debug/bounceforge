import React, { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Copy, Download, Loader2, X } from 'lucide-react';
import { EXPORT_PRESETS, estimateExportSeconds, exportDropVideo, type ExportPreset, type ExportProgress, type ExportResult } from '../../dropstudio/exporter';
import type { DropMix, PlayerSource } from '../../dropstudio/audio';
import type { RenderOptions } from '../../dropstudio/render';
import type { Scene } from '../../dropstudio/scene';
import type { StudioTrack } from '../../dropstudio/track';
import { videoDescription } from '../../dropstudio/presets';
import { DropRenderer3D } from '../../dropstudio/render3d';
import { Panel, Seg } from './controls';

interface Props {
  scene: Scene | null;
  render: RenderOptions;
  audio: PlayerSource | null;
  mix: DropMix;
  track: StudioTrack | null;
  styleName: string;
}

export const ExportPanel: React.FC<Props> = ({ scene, render, audio, mix, track, styleName }) => {
  const [preset, setPreset] = useState<ExportPreset>('4k');
  const [fps, setFps] = useState<30 | 60>(30);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const duration = audio?.duration ?? 60;
  const busy = !!progress;
  const description = track ? videoDescription(track, styleName) : '';

  const start = async () => {
    if (!scene || !audio || !track) return;
    if (result) URL.revokeObjectURL(result.url);
    setResult(null);
    setError(null);
    const ac = new AbortController();
    abort.current = ac;
    setProgress({ percent: 0, etaSeconds: estimateExportSeconds(preset, fps, duration), stage: 'audio' });
    try {
      const r = await exportDropVideo({
        scene,
        // Exports always carry the BounceForge 3D watermark and never the debug overlay
        render: { ...render, syncCheck: false, watermark: true },
        audio,
        mix,
        preset,
        fps,
        name: track.title,
        use3d: DropRenderer3D.supported(),
        onProgress: setProgress,
        signal: ac.signal,
      });
      setResult(r);
    } catch (e: any) {
      if (e?.name !== 'AbortError') setError(e?.message || String(e));
    } finally {
      setProgress(null);
      abort.current = null;
    }
  };

  return (
    <div className="space-y-4">
      <Panel title="Export 9:16 video">
        <div className="space-y-3">
          <Seg<ExportPreset>
            testId="export-preset"
            label="Resolution"
            value={preset}
            onChange={setPreset}
            options={(Object.keys(EXPORT_PRESETS) as ExportPreset[]).map((k) => ({ value: k, label: `${EXPORT_PRESETS[k].label} · ${EXPORT_PRESETS[k].width}×${EXPORT_PRESETS[k].height}` }))}
          />
          <Seg<30 | 60> testId="export-fps" label="Frame rate" value={fps} onChange={setFps} options={[{ value: 30, label: '30 fps' }, { value: 60, label: '60 fps' }]} />
          <p className="text-[11px] text-slate-400">
            {duration.toFixed(0)}s · MP4 (H.264 + AAC) · BounceForge 3D watermark · estimated ~{estimateExportSeconds(preset, fps, duration)}s (refined live while exporting)
          </p>
          {track && !track.copyrightSafe && (
            <div data-testid="copyright-reminder" className="flex gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 p-2.5 text-[11px] text-amber-100">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-300" />
              Copyrighted music may get your video claimed or muted on YouTube/TikTok.
            </div>
          )}
          {!busy ? (
            <button data-testid="export-start" disabled={!scene} onClick={start} className="btn-3d-lime w-full rounded-xl py-3 text-black font-black text-sm disabled:opacity-40">
              Export {EXPORT_PRESETS[preset].label}
            </button>
          ) : (
            <div className="space-y-2" data-testid="export-progress">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-300" />
                  {progress!.stage === 'audio' ? 'Rendering audio…' : progress!.stage === 'video' ? 'Rendering frames…' : progress!.stage === 'verifying' ? 'Verifying file…' : 'Finishing…'}
                </span>
                <span className="font-mono" data-testid="export-percent">
                  {Math.round(progress!.percent)}% · ETA {progress!.etaSeconds}s{progress!.fps ? ` · ${progress!.fps.toFixed(0)} fps` : ''}
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-400 to-lime-300 transition-[width]" style={{ width: `${progress!.percent}%` }} />
              </div>
              <button data-testid="export-cancel" onClick={() => abort.current?.abort()} className="w-full rounded-xl border border-white/15 py-2 text-xs flex items-center justify-center gap-1">
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
              <p className="text-[10px] text-slate-500">Exporting runs in the background: you can keep editing while it renders.</p>
            </div>
          )}
          {error && (
            <div role="alert" className="text-xs text-rose-300">
              Export failed: {error}
            </div>
          )}
        </div>
      </Panel>

      {result && (
        <Panel title="Your video">
          <div className="space-y-2 text-xs" data-testid="export-result">
            {result.verification ? (
              <>
                <div className={`flex items-center gap-1.5 font-bold ${result.verification.ok ? 'text-lime-300' : 'text-amber-300'}`}>
                  {result.verification.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  {result.verification.ok ? 'Verified MP4' : 'Exported with warnings'}
                </div>
                <div data-testid="verify-dims">Video: {result.verification.width}×{result.verification.height} · {result.verification.videoCodec}</div>
                <div data-testid="verify-duration">Duration: {result.verification.duration.toFixed(2)}s</div>
                <div data-testid="verify-audio">Audio: {result.verification.audioCodec ?? 'none'}</div>
                <div data-testid="verify-drift">Audio/video drift: {result.verification.driftMs.toFixed(1)} ms</div>
                {result.verification.problems.map((p) => (
                  <div key={p} className="text-amber-300">
                    {p}
                  </div>
                ))}
              </>
            ) : (
              <div className="text-amber-200">Recorded in real time ({result.mime}) — this browser has no WebCodecs encoder.</div>
            )}
            <div className="text-slate-400">
              {(result.blob.size / 1e6).toFixed(1)} MB · made in {(result.ms / 1000).toFixed(1)}s
            </div>
            <video src={result.url} controls playsInline className="w-full rounded-xl border border-white/10 max-h-80 bg-black" />
            <a data-testid="export-download" href={result.url} download={result.filename} className="btn-3d-lime rounded-xl px-4 py-2.5 text-black font-black text-sm inline-flex items-center gap-2">
              <Download className="w-4 h-4" /> Download
            </a>
          </div>
        </Panel>
      )}

      {track && (
        <Panel
          title="Description"
          right={
            <button
              onClick={() => {
                void navigator.clipboard?.writeText(description);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
              }}
              className="rounded-lg px-2 py-1 text-[11px] border border-white/15 flex items-center gap-1"
            >
              <Copy className="w-3 h-3" /> {copied ? 'Copied' : 'Copy'}
            </button>
          }
        >
          <textarea readOnly data-testid="description" value={description} rows={7} className="w-full rounded-xl bg-black/40 border border-white/10 p-2 text-[11px] font-mono" />
        </Panel>
      )}
    </div>
  );
};
