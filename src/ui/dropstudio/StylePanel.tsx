import React, { useEffect, useMemo, useRef } from 'react';
import { libraryTrack } from '../../dropstudio/library/compile';
import { computeImpacts, DEFAULT_SYNC } from '../../dropstudio/sync';
import { buildScene, DEFAULT_STYLE_OPTIONS, STYLES, type StyleId, type StyleOptions } from '../../dropstudio/styles';
import { DropRenderer3D } from '../../dropstudio/render3d';
import { renderFrame, type CameraMode, type Material, type Palette, type RenderOptions } from '../../dropstudio/render';
import type { Scene } from '../../dropstudio/scene';
import { Panel, Seg, Slider, Toggle } from './controls';

const TW = 180;
const TH = 320;
const LOOP = 8;

let thumbScenes: Map<StyleId, Scene> | null = null;
function demoScenes(): Map<StyleId, Scene> {
  if (thumbScenes) return thumbScenes;
  const track = libraryTrack('bf_satisfying_marimba');
  const imp = computeImpacts(track, { ...DEFAULT_SYNC, mode: 'beat', frequency: 'bar' });
  thumbScenes = new Map(STYLES.map((s) => [s.id, buildScene(s.id, imp, { ...DEFAULT_STYLE_OPTIONS, ballCount: 2, slowMo: 0.55 }, track)]));
  return thumbScenes;
}

interface Props {
  style: StyleId;
  onStyle: (s: StyleId) => void;
  styleOpts: StyleOptions;
  onStyleOpts: (o: StyleOptions) => void;
  look: Pick<RenderOptions, 'material' | 'palette' | 'trail' | 'camera'>;
  onLook: (l: Pick<RenderOptions, 'material' | 'palette' | 'trail' | 'camera'>) => void;
}

/** Drop Style grid with looping thumbnails (one shared WebGL renderer, cards drawn round-robin). */
export const StylePanel: React.FC<Props> = ({ style, onStyle, styleOpts, onStyleOpts, look, onLook }) => {
  const cards = useRef<(HTMLCanvasElement | null)[]>([]);
  const lookRef = useRef(look);
  lookRef.current = look;
  const scenes = useMemo(demoScenes, []);

  useEffect(() => {
    let r3d: DropRenderer3D | null = null;
    if (DropRenderer3D.supported()) {
      try {
        const c = document.createElement('canvas');
        c.width = TW;
        c.height = TH;
        r3d = new DropRenderer3D(c, TW, TH, { shadows: false, antialias: true, maxCached: 16 });
      } catch {
        r3d = null;
      }
    }
    let raf = 0;
    let next = 0;
    const visible = new Set<number>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const i = Number((e.target as HTMLElement).dataset.idx);
        if (e.isIntersecting) visible.add(i);
        else visible.delete(i);
      }
    });
    cards.current.forEach((c) => c && io.observe(c));
    const t0 = performance.now();
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (document.hidden || !visible.size) return;
      const t = (((performance.now() - t0) / 1000) % LOOP) + 2;
      const ids = [...visible].sort((a, b) => a - b);
      for (let k = 0; k < 2; k++) {
        const i = ids[next++ % ids.length];
        const c = cards.current[i];
        const sc = scenes.get(STYLES[i].id);
        if (!c || !sc) continue;
        const ctx = c.getContext('2d')!;
        const o: RenderOptions = { ...lookRef.current, camera: lookRef.current.camera === 'follow' ? 'static' : lookRef.current.camera, syncCheck: false, watermark: false };
        if (r3d) r3d.composite(ctx, sc, t, o);
        else renderFrame(ctx, sc, t, TW, TH, o);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      r3d?.dispose();
    };
  }, [scenes]);

  const set = (patch: Partial<StyleOptions>) => onStyleOpts({ ...styleOpts, ...patch });
  const setLook = (patch: Partial<Props['look']>) => onLook({ ...look, ...patch });

  return (
    <div className="space-y-4">
      <Panel title="Drop Style">
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-2" data-testid="style-grid">
          {STYLES.map((s, i) => (
            <button
              key={s.id}
              data-testid={`style-${s.id}`}
              aria-pressed={style === s.id}
              title={s.blurb}
              onClick={() => onStyle(s.id)}
              className={`no-3d flex flex-col items-stretch rounded-xl overflow-hidden border text-left transition ${
                style === s.id ? 'border-cyan-300 ring-2 ring-cyan-400/60' : 'border-white/10 hover:border-cyan-400/50'
              }`}
            >
              <canvas ref={(el) => {
                  cards.current[i] = el;
                }} data-idx={i} width={TW} height={TH} className="w-full aspect-[9/16] bg-black" />
              <span className="px-1.5 py-1 text-[10px] font-bold leading-tight bg-black/60 truncate">{s.name}</span>
            </button>
          ))}
        </div>
      </Panel>
      <Panel title="Balls & look">
        <div className="space-y-3">
          <Slider label="Ball count" value={styleOpts.ballCount} min={1} max={10} step={1} onChange={(v) => set({ ballCount: v })} testId="ball-count" />
          <Slider label="Ball size" value={styleOpts.size} min={0.5} max={2} step={0.05} onChange={(v) => set({ size: v })} format={(v) => `${v.toFixed(2)}×`} testId="ball-size" />
          <div>
            <div className="text-xs text-slate-400 mb-1">Material (instant, no re-timing)</div>
            <Seg<Material>
              testId="material"
              label="Material"
              value={look.material}
              onChange={(v) => setLook({ material: v })}
              options={[
                { value: 'glossy', label: 'Glossy' },
                { value: 'glass', label: 'Glass' },
                { value: 'metal', label: 'Metal' },
                { value: 'neon', label: 'Neon' },
                { value: 'rubber', label: 'Rubber' },
              ]}
            />
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">Colour palette</div>
            <Seg<Palette>
              testId="palette"
              label="Palette"
              value={look.palette}
              onChange={(v) => setLook({ palette: v })}
              options={[
                { value: 'neon', label: 'Neon' },
                { value: 'pastel', label: 'Pastel' },
                { value: 'gold', label: 'Gold' },
                { value: 'softGold', label: 'Soft gold' },
                { value: 'ocean', label: 'Ocean' },
                { value: 'sunset', label: 'Sunset' },
                { value: 'mono', label: 'Mono' },
              ]}
            />
          </div>
          <Toggle label="Trails" checked={look.trail} onChange={(v) => setLook({ trail: v })} testId="trail" />
          <div>
            <div className="text-xs text-slate-400 mb-1">Camera</div>
            <Seg<CameraMode>
              testId="camera"
              label="Camera"
              value={look.camera}
              onChange={(v) => {
                setLook({ camera: v });
                if ((v === 'follow') !== styleOpts.follow) set({ follow: v === 'follow' });
              }}
              options={[
                { value: 'static', label: 'Static' },
                { value: 'orbit', label: 'Slow orbit' },
                { value: 'follow', label: 'Follow' },
              ]}
            />
          </div>
        </div>
      </Panel>
    </div>
  );
};
