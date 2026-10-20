import React, { useEffect, useMemo, useRef } from 'react';
import type { DropRenderer3D } from '../../dropstudio/render3d';
import { loadRenderer3D, webglSupported } from '../../dropstudio/webgl';
import { renderFrame, renderOverlays, type RenderOptions } from '../../dropstudio/render';
import type { Scene } from '../../dropstudio/scene';
import type { DropPlayer } from '../../dropstudio/audio';
import { startWhenIdleAndVisible } from '../hooks/deferredStart';

export type PreviewQuality = 'fast' | 'balanced' | 'full';
export const QUALITY_SIZE: Record<PreviewQuality, [number, number]> = {
  fast: [720, 1280],
  balanced: [1080, 1920],
  full: [1440, 2560],
};

interface Props {
  scene: Scene | null;
  opts: RenderOptions;
  player: DropPlayer;
  quality: PreviewQuality;
  showDebug: boolean;
  debug: { genMs: number; impacts: number; syncErrFrames: number; analysisMs?: number };
  onTime: (t: number) => void;
}

/**
 * The live 9:16 stage. Every frame reads the audio clock and renders the scene at that exact
 * time, so the picture can never drift from the sound. Rendering pauses while the tab is hidden.
 */
export const PreviewStage: React.FC<Props> = ({ scene, opts, player, quality, showDebug, debug, onTime }) => {
  const glRef = useRef<HTMLCanvasElement>(null);
  const ovRef = useRef<HTMLCanvasElement>(null);
  const r3d = useRef<DropRenderer3D | null>(null);
  const glFailed = useRef(false);
  const use3d = useMemo(() => webglSupported(), []);
  const sceneRef = useRef(scene);
  const optsRef = useRef(opts);
  const debugRef = useRef(debug);
  const dbgEl = useRef<HTMLDivElement>(null);
  const onTimeRef = useRef(onTime);
  sceneRef.current = scene;
  optsRef.current = opts;
  debugRef.current = debug;
  onTimeRef.current = onTime;
  const [w, h] = QUALITY_SIZE[quality];

  useEffect(() => {
    const gl = glRef.current;
    if (!gl || !use3d) return;
    // Build the WebGL renderer (shader compilation) once the page is idle, so the studio UI is
    // interactive first; the stage shows black for that moment
    let disposed = false;
    let started = false;
    const create = () => {
      if (started || disposed) return;
      started = true;
      if (!r3d.current) {
        loadRenderer3D()
          .then(({ DropRenderer3D }) => {
            if (disposed || r3d.current) return;
            r3d.current = new DropRenderer3D(gl, w, h, { shadowSize: quality === 'fast' ? 1024 : 2048 });
          })
          .catch(() => {
            r3d.current = null;
            glFailed.current = true;
          });
      }
    };
    // Until the 3D renderer is up the stage shows the 2D renderer's picture; 3D starts a few
    // seconds after load (or at the first interaction), keeping page load responsive
    const stop = startWhenIdleAndVisible(gl, () => {
      create();
      return () => {};
    }, 3500);
    const early = () => create();
    window.addEventListener('pointerdown', early, { once: true });
    window.addEventListener('keydown', early, { once: true });
    return () => {
      disposed = true;
      window.removeEventListener('pointerdown', early);
      window.removeEventListener('keydown', early);
      stop();
      r3d.current?.dispose();
      r3d.current = null;
    };
    // Recreate only when the canvas resolution changes
  }, [w, h, quality, use3d]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let fps = 60;
    let lastReport = 0;
    let wasPlaying = false;
    const lastDrawn: { t: number; s: Scene | null; o: RenderOptions | null; gl: boolean } = { t: -1, s: null, o: null, gl: false };
    const onVis = () => {
      if (document.hidden) {
        wasPlaying = player.playing;
        if (wasPlaying) player.pause();
      } else if (wasPlaying) {
        void player.play();
        wasPlaying = false;
      }
    };
    document.addEventListener('visibilitychange', onVis);
    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      const now = performance.now();
      fps = fps * 0.92 + (1000 / Math.max(1, now - last)) * 0.08;
      last = now;
      const s = sceneRef.current;
      const ov = ovRef.current;
      if (!s || !ov) return;
      const t = player.time();
      // Paused and nothing changed: the last frame is still correct, don't redraw it
      const same = !player.playing && t === lastDrawn.t && s === lastDrawn.s && optsRef.current === lastDrawn.o && lastDrawn.gl === !!r3d.current;
      if (!same) {
      lastDrawn.t = t;
      lastDrawn.s = s;
      lastDrawn.o = optsRef.current;
      lastDrawn.gl = !!r3d.current;
      const ctx = ov.getContext('2d')!;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (r3d.current) {
        r3d.current.render(s, t, optsRef.current);
        ctx.clearRect(0, 0, ov.width, ov.height);
        renderOverlays(ctx, s, t, ov.width, optsRef.current);
      } else {
        // 2D picture while the 3D renderer loads (or if WebGL is unavailable)
        renderFrame(ctx, s, t, ov.width, ov.height, optsRef.current);
      }
      }
      if (now - lastReport > 90) {
        lastReport = now;
        onTimeRef.current(t);
        if (dbgEl.current) {
          const d = debugRef.current;
          dbgEl.current.textContent = `${fps.toFixed(0)} fps · ${r3d.current ? 'WebGL 3D' : '2D'} ${w}×${h}\ngenerate ${d.genMs.toFixed(1)} ms · ${d.impacts} impacts\nsync error ≤ ${d.syncErrFrames.toFixed(2)} frames\nactive voices ${player.activeVoices()}${d.analysisMs !== undefined ? `\nanalysis ${d.analysisMs.toFixed(0)} ms` : ''}`;
        }
      }
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [player, w, h]);

  return (
    <div className="relative mx-auto rounded-[22px] overflow-hidden border border-white/10 bg-black shadow-[0_20px_60px_-20px_rgba(34,211,238,0.35)]" style={{ aspectRatio: '9 / 16', height: 'min(74vh, 900px)', maxWidth: '100%' }}>
      {use3d && <canvas ref={glRef} width={w} height={h} className="absolute inset-0 w-full h-full" data-testid="drop-canvas-3d" />}
      <canvas ref={ovRef} width={w} height={h} className="absolute inset-0 w-full h-full" data-testid="drop-canvas" />
      {showDebug && (
        <div ref={dbgEl} data-testid="debug-overlay" className="absolute top-2 right-2 whitespace-pre text-xs leading-tight font-mono bg-black/70 text-lime-300 rounded-lg px-2 py-1 pointer-events-none" />
      )}
    </div>
  );
};
