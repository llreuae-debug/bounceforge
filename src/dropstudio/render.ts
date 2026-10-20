import { ballAt, cameraAt, H, hitIndexAt, onPendulum, SEG, W, type Prop, type Scene } from './scene';

export type Material = 'glossy' | 'glass' | 'metal' | 'neon' | 'rubber';
export type Palette = 'neon' | 'pastel' | 'gold' | 'ocean' | 'sunset' | 'mono' | 'softGold';
export type CameraMode = 'static' | 'orbit' | 'follow';

export interface RenderOptions {
  material: Material;
  palette: Palette;
  trail: boolean;
  camera: CameraMode;
  /** Flash on every beat and every impact (debug) */
  syncCheck: boolean;
  watermark: boolean;
  beats?: number[];
  impacts?: Float64Array;
}

export const PALETTES: Record<Palette, { balls: string[]; bgTop: string; bgBottom: string; accent: string; surface: string }> = {
  neon: { balls: ['#22d3ee', '#f472b6', '#a3e635', '#facc15', '#c084fc', '#fb923c'], bgTop: '#070b18', bgBottom: '#160a2a', accent: '#22d3ee', surface: '#1e293b' },
  pastel: { balls: ['#f9a8d4', '#a5f3fc', '#bbf7d0', '#fde68a', '#ddd6fe', '#fecaca'], bgTop: '#1a1630', bgBottom: '#2b1f3d', accent: '#f9a8d4', surface: '#3b3352' },
  gold: { balls: ['#fbbf24', '#f59e0b', '#fde68a', '#d97706', '#fcd34d', '#b45309'], bgTop: '#0c0905', bgBottom: '#22160a', accent: '#fbbf24', surface: '#3a2a12' },
  softGold: { balls: ['#f5d08a', '#e9c27a', '#f8e2b0', '#d9b26a', '#fbe7c0', '#caa25e'], bgTop: '#14110c', bgBottom: '#2a2116', accent: '#f5d08a', surface: '#3d3222' },
  ocean: { balls: ['#38bdf8', '#2dd4bf', '#818cf8', '#22d3ee', '#a5b4fc', '#5eead4'], bgTop: '#03111f', bgBottom: '#062a3f', accent: '#38bdf8', surface: '#0c3248' },
  sunset: { balls: ['#fb7185', '#f97316', '#facc15', '#f472b6', '#fda4af', '#fdba74'], bgTop: '#1a0b1e', bgBottom: '#3b1225', accent: '#fb7185', surface: '#4a1d2e' },
  mono: { balls: ['#f8fafc', '#cbd5e1', '#94a3b8', '#e2e8f0', '#f1f5f9', '#64748b'], bgTop: '#050505', bgBottom: '#161616', accent: '#f8fafc', surface: '#262626' },
};

type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;

function makeCanvas(w: number, h: number): AnyCanvas {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// ---------- Ball sprites (cached per material / colour / pixel radius: no per-frame gradients) ----------

const spriteCache = new Map<string, { c: AnyCanvas; pad: number }>();

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f))));
  return `rgb(${ch((n >> 16) & 255)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}

function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function ballSprite(material: Material, color: string, rPx: number): { c: AnyCanvas; pad: number } {
  const r = Math.max(2, Math.round(rPx));
  const key = `${material}|${color}|${r}`;
  const hit = spriteCache.get(key);
  if (hit) return hit;
  if (spriteCache.size > 400) spriteCache.clear();
  const pad = material === 'neon' ? Math.ceil(r * 0.9) : 2;
  const size = 2 * (r + pad);
  const c = makeCanvas(size, size);
  const g = c.getContext('2d') as Ctx2D;
  const cx = r + pad;
  const cy = r + pad;
  if (material === 'neon') {
    for (let i = 4; i >= 1; i--) {
      g.fillStyle = rgba(color, 0.07 * i);
      g.beginPath();
      g.arc(cx, cy, r + pad * (i / 4), 0, Math.PI * 2);
      g.fill();
    }
    const core = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    core.addColorStop(0, '#ffffff');
    core.addColorStop(0.45, shade(color, 0.5));
    core.addColorStop(1, color);
    g.fillStyle = core;
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();
  } else if (material === 'glass') {
    const body = g.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
    body.addColorStop(0, rgba(color, 0.18));
    body.addColorStop(0.75, rgba(color, 0.32));
    body.addColorStop(1, rgba(color, 0.75));
    g.fillStyle = body;
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();
    // Caustic glow at the bottom, rim, specular
    const caustic = g.createRadialGradient(cx + r * 0.2, cy + r * 0.55, 0, cx + r * 0.2, cy + r * 0.55, r * 0.55);
    caustic.addColorStop(0, 'rgba(255,255,255,0.55)');
    caustic.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = caustic;
    g.fillRect(0, 0, size, size);
    g.strokeStyle = rgba(color, 0.9);
    g.lineWidth = Math.max(1, r * 0.08);
    g.beginPath();
    g.arc(cx, cy, r - g.lineWidth / 2, 0, Math.PI * 2);
    g.stroke();
    specular(g, cx, cy, r, 0.95);
  } else if (material === 'metal') {
    const body = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    body.addColorStop(0, shade(color, 0.75));
    body.addColorStop(0.3, shade(color, -0.25));
    body.addColorStop(0.5, shade(color, 0.55));
    body.addColorStop(0.7, shade(color, -0.45));
    body.addColorStop(1, shade(color, 0.2));
    g.fillStyle = body;
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();
    const rim = g.createRadialGradient(cx, cy, r * 0.7, cx, cy, r);
    rim.addColorStop(0, 'rgba(0,0,0,0)');
    rim.addColorStop(1, 'rgba(0,0,0,0.45)');
    g.fillStyle = rim;
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();
    specular(g, cx, cy, r, 1);
  } else {
    const body = g.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.05, cx, cy, r);
    body.addColorStop(0, shade(color, material === 'rubber' ? 0.25 : 0.65));
    body.addColorStop(0.55, color);
    body.addColorStop(1, shade(color, material === 'rubber' ? -0.35 : -0.55));
    g.fillStyle = body;
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();
    if (material === 'glossy') specular(g, cx, cy, r, 0.9);
  }
  const out = { c, pad };
  spriteCache.set(key, out);
  return out;
}

function specular(g: Ctx2D, cx: number, cy: number, r: number, a: number): void {
  const s = g.createRadialGradient(cx - r * 0.38, cy - r * 0.42, 0, cx - r * 0.38, cy - r * 0.42, r * 0.42);
  s.addColorStop(0, `rgba(255,255,255,${a})`);
  s.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = s;
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fill();
}

// ---------- Deterministic hash for particles (no state, no allocation) ----------

function hash(a: number, b: number): number {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// ---------- Background (cached per size/palette) ----------

const bgCache = new Map<string, AnyCanvas>();
function background(w: number, h: number, palette: Palette): AnyCanvas {
  const key = `${w}x${h}|${palette}`;
  const hit = bgCache.get(key);
  if (hit) return hit;
  const p = PALETTES[palette];
  const c = makeCanvas(w, h);
  const g = c.getContext('2d') as Ctx2D;
  const lin = g.createLinearGradient(0, 0, 0, h);
  lin.addColorStop(0, p.bgTop);
  lin.addColorStop(1, p.bgBottom);
  g.fillStyle = lin;
  g.fillRect(0, 0, w, h);
  const glow = g.createRadialGradient(w / 2, h * 0.42, 0, w / 2, h * 0.42, w * 0.9);
  glow.addColorStop(0, rgba(p.accent, 0.12));
  glow.addColorStop(1, rgba(p.accent, 0));
  g.fillStyle = glow;
  g.fillRect(0, 0, w, h);
  const vig = g.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.55)');
  g.fillStyle = vig;
  g.fillRect(0, 0, w, h);
  if (bgCache.size > 8) bgCache.clear();
  bgCache.set(key, c);
  return c;
}

// ---------- Frame ----------

const tmp = new Float64Array(4);
const cam = new Float64Array(3);

/** Draws one frame of the scene at time t. Pure function of (scene, t, options). */
export function renderFrame(ctx: Ctx2D, scene: Scene, t: number, width: number, height: number, o: RenderOptions): void {
  const part = scene.parts ? scene.parts.find((p) => t >= p.t0 && t < p.t1) ?? scene.parts[scene.parts.length - 1] : null;
  const s = part ? part.scene : scene;
  const pal = PALETTES[o.palette];
  const k = width / W;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.drawImage(background(width, height, o.palette) as CanvasImageSource, 0, 0);

  // Camera: scene follow path + orbit wobble + Tier 1 shake
  cameraAt(s, t, cam);
  let cx = cam[0];
  let cy = cam[1];
  let zoom = cam[2] || 1;
  let rot = 0;
  if (o.camera === 'orbit') {
    rot = 0.045 * Math.sin((2 * Math.PI * t) / 13);
    zoom *= 1.05 + 0.03 * Math.sin((2 * Math.PI * t) / 9);
    cx += 30 * Math.sin((2 * Math.PI * t) / 11);
  }
  let shakeX = 0;
  let shakeY = 0;
  for (let h = hitIndexAt(s, t - 0.5); h < s.hitT.length && s.hitT[h] <= t; h++) {
    if (s.hitTier[h] !== 1) continue;
    const d = t - s.hitT[h];
    const a = 16 * Math.exp(-9 * d);
    shakeX += a * Math.sin(d * 70 + h);
    shakeY += a * Math.cos(d * 63 + h * 1.7);
  }

  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.translate(W / 2 + shakeX, H / 2 + shakeY);
  ctx.rotate(rot);
  ctx.scale(zoom, zoom);
  ctx.translate(-cx, -cy);

  const viewTop = cy - H / (2 * zoom) - 300;
  const viewBottom = cy + H / (2 * zoom) + 300;
  let floorY = Infinity;
  let pivot: Prop | null = null;

  // Scrolling backdrop: faint depth lines that move with the camera
  ctx.strokeStyle = rgba(pal.accent, 0.06);
  ctx.lineWidth = 2;
  const gridStart = Math.floor(viewTop / 240) * 240;
  for (let y = gridStart; y < viewBottom; y += 240) {
    ctx.beginPath();
    ctx.moveTo(-400, y);
    ctx.lineTo(W + 400, y);
    ctx.stroke();
  }

  for (const p of s.props) {
    if (p.kind === 'floor') floorY = Math.min(floorY, p.y);
    if (p.kind === 'pivot') pivot = p;
    const y2 = p.kind === 'funnel' ? p.y2 ?? p.y : p.y;
    if (y2 < viewTop - 400 || p.y > viewBottom + 400) continue;
    drawProp(ctx, p, t, pal);
  }

  // Balls (trails first)
  const nBalls = s.ballR.length;
  if (o.trail) {
    for (let i = 0; i < nBalls; i++) {
      const color = pal.balls[s.ballColor[i] % pal.balls.length];
      for (let j = 7; j >= 1; j--) {
        if (!ballAt(s, i, t - j * 0.024, tmp)) continue;
        tmp[1] += 0.26 * tmp[3];
        if (tmp[1] < viewTop || tmp[1] > viewBottom) continue;
        ctx.globalAlpha = tmp[2] * 0.32 * (1 - j / 8);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(tmp[0], tmp[1], s.ballR[i] * (1 - j * 0.07), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  for (let i = 0; i < nBalls; i++) {
    if (!ballAt(s, i, t, tmp)) continue;
    const x = tmp[0];
    const y = tmp[1] + 0.26 * tmp[3];
    const vis = tmp[2];
    if (y < viewTop || y > viewBottom) continue;
    const r = s.ballR[i];
    const color = pal.balls[s.ballColor[i] % pal.balls.length];

    if (pivot && onPendulum(s, i, t) >= 0) {
      ctx.strokeStyle = 'rgba(226,232,240,0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pivot.x, pivot.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    // Contact shadow
    if (floorY < Infinity && y < floorY) {
      const d = Math.max(0, floorY - y - r);
      const sa = Math.max(0, 0.45 - d / 1400) * vis;
      if (sa > 0.01) {
        ctx.fillStyle = `rgba(0,0,0,${sa})`;
        ctx.beginPath();
        ctx.ellipse(x, floorY + 4, r * (1.1 + d / 900), r * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Squash & stretch around this ball's contacts
    let squash = 0;
    for (let h = hitIndexAt(s, t - 0.08); h < s.hitT.length && s.hitT[h] <= t + 0.08; h++) {
      if (s.hitBall[h] !== i) continue;
      const amt = (s.hitTier[h] === 1 ? 0.32 : s.hitTier[h] === 2 ? 0.2 : 0.1) * Math.exp(-Math.abs(t - s.hitT[h]) / 0.03);
      if (amt > squash) squash = amt;
    }
    const sp = ballSprite(o.material, color, r * k * zoom);
    const drawR = r + (sp.pad * r) / Math.max(1, Math.round(r * k * zoom));
    ctx.globalAlpha = vis;
    if (squash > 0.01) {
      ctx.save();
      ctx.translate(x, y + r);
      ctx.scale(1 + squash, 1 - squash);
      ctx.drawImage(sp.c as CanvasImageSource, -drawR, -r - drawR, drawR * 2, drawR * 2);
      ctx.restore();
    } else {
      ctx.drawImage(sp.c as CanvasImageSource, x - drawR, y - drawR, drawR * 2, drawR * 2);
    }
    ctx.globalAlpha = 1;
  }

  // Impact effects: glow rings + particles (closed form from hit time)
  for (let h = hitIndexAt(s, t - 0.9); h < s.hitT.length && s.hitT[h] <= t; h++) {
    const d = t - s.hitT[h];
    const tier = s.hitTier[h];
    const hx = s.hitX[h];
    const hy = s.hitY[h];
    if (hy < viewTop || hy > viewBottom) continue;
    const life = tier === 1 ? 0.75 : tier === 2 ? 0.4 : 0.22;
    if (d < life) {
      const u = d / life;
      const maxR = tier === 1 ? 240 : tier === 2 ? 100 : 45;
      ctx.strokeStyle = rgba(pal.accent, (1 - u) * (tier === 1 ? 0.9 : 0.6));
      ctx.lineWidth = (tier === 1 ? 10 : 5) * (1 - u) + 1;
      ctx.beginPath();
      ctx.ellipse(hx, hy, maxR * (0.15 + 0.85 * Math.sqrt(u)), maxR * 0.32 * (0.15 + 0.85 * Math.sqrt(u)), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    const count = tier === 1 ? 18 : tier === 2 ? 7 : 0;
    for (let q = 0; q < count; q++) {
      const pl = 0.5 + hash(h, q * 3) * 0.4;
      if (d > pl) continue;
      const ang = Math.PI + hash(h, q * 3 + 1) * Math.PI;
      const spd = (tier === 1 ? 650 : 380) * (0.4 + 0.6 * hash(h, q * 3 + 2));
      const px = hx + Math.cos(ang) * spd * d;
      const py = hy + Math.sin(ang) * spd * d + 0.5 * 1400 * d * d;
      ctx.globalAlpha = 1 - d / pl;
      ctx.fillStyle = pal.balls[q % pal.balls.length];
      const sz = tier === 1 ? 7 : 5;
      ctx.fillRect(px - sz / 2, py - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1;
  }

  renderOverlays(ctx, scene, t, width, o);
}

/** Screen-space layer shared by the 2D and 3D renderers: Tier 1 flash, section flash, Sync Check, watermark. */
export function renderOverlays(ctx: Ctx2D, scene: Scene, t: number, width: number, o: RenderOptions): void {
  const part = scene.parts ? scene.parts.find((p) => t >= p.t0 && t < p.t1) ?? scene.parts[scene.parts.length - 1] : null;
  const s = part ? part.scene : scene;
  const k = width / W;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.globalAlpha = 1;
  for (let h = hitIndexAt(s, t - 0.25); h < s.hitT.length && s.hitT[h] <= t; h++) {
    if (s.hitTier[h] !== 1) continue;
    ctx.fillStyle = `rgba(255,255,255,${0.045 * Math.exp(-12 * (t - s.hitT[h]))})`;
    ctx.fillRect(0, 0, W, H);
    break;
  }
  if (part && t - part.t0 < 0.35 && part.t0 > 0) {
    ctx.fillStyle = `rgba(255,255,255,${0.5 * (1 - (t - part.t0) / 0.35)})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (o.syncCheck) drawSyncCheck(ctx, t, o);
  if (o.watermark) drawWatermark(ctx);
  drawDither(ctx, t);
}

// ---------- Dither (anti-banding) ----------
// ±1-2 levels of fine, frame-varying grain: removes colour banding in the dark gradients and gives
// the encoder real detail (clean CG otherwise compresses to almost nothing). Deterministic per frame.
const DITHER_TILES: AnyCanvas[] = [];
function ditherTile(i: number): AnyCanvas {
  if (DITHER_TILES[i]) return DITHER_TILES[i];
  const size = 256;
  const c = makeCanvas(size, size);
  const g = c.getContext('2d') as Ctx2D;
  const img = g.createImageData(size, size);
  let seed = 0x9e3779b9 ^ (i * 2654435761);
  for (let p = 0; p < img.data.length; p += 4) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    const v = 128 + ((seed >>> 0) % 33) - 16;
    img.data[p] = img.data[p + 1] = img.data[p + 2] = v;
    img.data[p + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  DITHER_TILES[i] = c;
  return c;
}

function drawDither(ctx: Ctx2D, t: number): void {
  const frame = Math.round(t * 60);
  const tile = ditherTile(frame % 4);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.09;
  const pat = ctx.createPattern(tile as CanvasImageSource, 'repeat');
  if (pat) {
    // Shift the tile each frame so the grain is temporal, not a fixed screen pattern
    const ox = (frame * 97) % 256;
    const oy = (frame * 61) % 256;
    ctx.translate(-ox, -oy);
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, ctx.canvas.width + 256, ctx.canvas.height + 256);
  }
  ctx.restore();
}

function flashAt(t: number, list: ArrayLike<number> | undefined, win: number): number {
  if (!list || !list.length) return 0;
  let lo = 0;
  let hi = list.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (list[mid] < t - win) lo = mid + 1;
    else hi = mid;
  }
  return lo < list.length && list[lo] <= t + 1e-9 ? 1 - (t - list[lo]) / win : 0;
}

function drawSyncCheck(ctx: Ctx2D, t: number, o: RenderOptions): void {
  const beat = flashAt(t, o.beats, 0.1);
  const imp = flashAt(t, o.impacts, 1 / 30);
  if (beat > 0) {
    ctx.strokeStyle = `rgba(34,211,238,${beat})`;
    ctx.lineWidth = 26;
    ctx.strokeRect(13, 13, W - 26, H - 26);
  }
  if (imp > 0) {
    ctx.fillStyle = `rgba(244,63,94,${0.35 * imp})`;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.font = 'bold 34px ui-monospace, Menlo, monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = beat > 0 ? '#22d3ee' : 'rgba(148,163,184,0.6)';
  ctx.fillText('● BEAT', 40, 80);
  ctx.fillStyle = imp > 0 ? '#f43f5e' : 'rgba(148,163,184,0.6)';
  ctx.fillText('● IMPACT', 40, 128);
  ctx.fillStyle = 'rgba(226,232,240,0.85)';
  ctx.fillText(`t=${t.toFixed(3)}s`, 40, 176);
}

/** BounceForge 3D logo, bottom centre, 60% opacity. */
export function drawWatermark(ctx: Ctx2D): void {
  ctx.save();
  ctx.globalAlpha = 0.6;
  const y = H - 120;
  ctx.font = '800 44px "Helvetica Neue", Helvetica, Arial, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const text = 'BounceForge 3D';
  const tw = ctx.measureText(text).width;
  const iconR = 24;
  const total = iconR * 2 + 16 + tw;
  const x0 = W / 2 - total / 2;
  const icon = ctx.createRadialGradient(x0 + iconR - 8, y - 8, 2, x0 + iconR, y, iconR);
  icon.addColorStop(0, '#ffffff');
  icon.addColorStop(0.35, '#ccff00');
  icon.addColorStop(1, '#4d7c0f');
  ctx.fillStyle = icon;
  ctx.beginPath();
  ctx.arc(x0 + iconR, y, iconR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 8;
  ctx.fillText(text, x0 + iconR * 2 + 16, y + 2);
  ctx.restore();
}

// ---------- Props ----------

function drawProp(ctx: Ctx2D, p: Prop, t: number, pal: (typeof PALETTES)[Palette]): void {
  const since = p.t !== undefined ? t - p.t : Infinity;
  const flash = since >= 0 && since < 0.4 ? 1 - since / 0.4 : 0;
  switch (p.kind) {
    case 'floor': {
      const g = ctx.createLinearGradient(0, p.y, 0, p.y + 500);
      g.addColorStop(0, rgba(pal.accent, 0.35));
      g.addColorStop(0.04, pal.surface);
      g.addColorStop(1, 'rgba(0,0,0,0.9)');
      ctx.fillStyle = g;
      ctx.fillRect(-600, p.y, W + 1200, 900);
      ctx.strokeStyle = rgba(pal.accent, 0.8);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-600, p.y);
      ctx.lineTo(W + 600, p.y);
      ctx.stroke();
      break;
    }
    case 'ceiling': {
      ctx.fillStyle = pal.surface;
      ctx.fillRect(-600, p.y - 900, W + 1200, 900);
      ctx.strokeStyle = rgba(pal.accent, 0.8);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-600, p.y);
      ctx.lineTo(W + 600, p.y);
      ctx.stroke();
      break;
    }
    case 'step': {
      const depth = 0.65 + 0.35 * Math.cos(p.angle ?? 0);
      const w = (p.w ?? 220) * depth;
      // Central column segment
      ctx.fillStyle = 'rgba(148,163,184,0.08)';
      ctx.fillRect(W / 2 - 26, p.y - 150, 52, 150);
      ctx.fillStyle = shade(pal.surface, 0.15 + 0.25 * depth);
      ctx.fillRect(p.x - w / 2, p.y, w, 22);
      ctx.fillStyle = shade(pal.surface, -0.2);
      ctx.fillRect(p.x - w / 2, p.y + 22, w, 26);
      ctx.fillStyle = rgba(pal.accent, 0.4 + 0.6 * flash);
      ctx.fillRect(p.x - w / 2, p.y - 3, w, 5);
      break;
    }
    case 'platform': {
      const w = p.w ?? 360;
      if (since < 0) {
        ctx.fillStyle = rgba(pal.accent, p.big ? 0.32 : 0.22);
        ctx.fillRect(p.x - w / 2, p.y, w, 26);
        ctx.strokeStyle = rgba('#ffffff', 0.7);
        ctx.lineWidth = 3;
        ctx.strokeRect(p.x - w / 2, p.y, w, 26);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(p.x - w / 2 + 8, p.y + 5, w * 0.4, 4);
      } else if (since < 1.2) {
        // Shards: deterministic fly-apart
        const n = p.big ? 12 : 8;
        for (let i = 0; i < n; i++) {
          const fx = (i + 0.5) / n - 0.5;
          const vx = fx * 520 + (hash(p.x | 0, i) - 0.5) * 160;
          const vy = -120 - hash(i, p.y | 0) * 260;
          const x = p.x + fx * w + vx * since;
          const y = p.y + vy * since + 0.5 * 2400 * since * since;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(since * (4 + i));
          ctx.globalAlpha = Math.max(0, 1 - since / 1.2);
          ctx.fillStyle = rgba(pal.accent, 0.55);
          ctx.fillRect(-w / n / 2, -8, w / n, 16);
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }
      break;
    }
    case 'ring': {
      const r = p.r ?? 150;
      const spin = (p.angle ?? 0) + t * 1.6;
      const squeeze = 0.22 + 0.18 * Math.abs(Math.sin(spin));
      const burst = p.big && since >= 0 ? Math.min(1, since / 0.5) : 0;
      if (p.big && since > 0.5) break;
      const scale = 1 + (since >= 0 && since < 0.3 ? 0.25 * (1 - since / 0.3) : 0) + burst * 1.2;
      ctx.globalAlpha = 1 - burst;
      ctx.strokeStyle = since >= 0 && since < 0.4 ? '#ffffff' : pal.accent;
      ctx.lineWidth = p.big ? 16 : 10;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, r * scale, r * squeeze * scale, Math.sin(spin * 0.5) * 0.25, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      break;
    }
    case 'peg': {
      ctx.fillStyle = shade(pal.accent, 0.3);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r ?? 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.arc(p.x - 3, p.y - 3, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'slot': {
      ctx.strokeStyle = rgba(pal.accent, 0.6);
      ctx.lineWidth = 6;
      for (let s = -4; s <= 4; s++) {
        const x = W / 2 + (s + 0.5) * 120 - 60;
        ctx.beginPath();
        ctx.moveTo(x, p.y - 200);
        ctx.lineTo(x, p.y);
        ctx.stroke();
      }
      ctx.fillStyle = pal.surface;
      ctx.fillRect(-100, p.y, W + 200, 600);
      ctx.fillStyle = rgba(pal.accent, 0.7);
      ctx.fillRect(-100, p.y, W + 200, 5);
      break;
    }
    case 'funnel': {
      const R = p.r ?? 380;
      const yHole = p.y2 ?? p.y + 350;
      const g = ctx.createLinearGradient(0, p.y, 0, yHole);
      g.addColorStop(0, rgba(pal.accent, 0.08));
      g.addColorStop(1, rgba(pal.accent, 0.3));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(p.x - R, p.y);
      ctx.lineTo(p.x - 44, yHole);
      ctx.lineTo(p.x + 44, yHole);
      ctx.lineTo(p.x + R, p.y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = rgba(pal.accent, 0.35);
      ctx.lineWidth = 2;
      for (let i = 1; i <= 4; i++) {
        const u = i / 5;
        const rr = R * (1 - u) + 44 * u;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + (yHole - p.y) * u, rr, rr * 0.26, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.strokeStyle = rgba(pal.accent, 0.9);
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, R, R * 0.26, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(p.x, yHole, 44, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'pivot': {
      ctx.strokeStyle = rgba(pal.accent, 0.18);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r ?? 520, Math.PI * 0.18, Math.PI * 0.82);
      ctx.stroke();
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = pal.surface;
      ctx.fillRect(p.x - 160, p.y - 34, 320, 18);
      break;
    }
    case 'bowl': {
      const R = p.r ?? 440;
      const g = ctx.createRadialGradient(p.x, p.y + R * 0.5, R * 0.2, p.x, p.y, R);
      g.addColorStop(0, rgba(pal.accent, 0.25));
      g.addColorStop(1, rgba(pal.accent, 0.05));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, R, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = rgba(pal.accent, 0.9);
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, R, 0, Math.PI);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, R - 14, Math.PI * 0.62, Math.PI * 0.9);
      ctx.stroke();
      break;
    }
    case 'wall': {
      const side = p.angle ?? 1;
      ctx.strokeStyle = flash > 0 ? '#ffffff' : rgba(pal.accent, 0.85);
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x + side * 8, p.y - 110);
      ctx.lineTo(p.x + side * 8, p.y + 110);
      ctx.lineTo(p.x - side * 120, p.y + 190);
      ctx.stroke();
      ctx.lineCap = 'butt';
      break;
    }
    case 'stackBase': {
      const w = p.w ?? 560;
      ctx.fillStyle = pal.surface;
      ctx.fillRect(p.x - w / 2, p.y, w, 40);
      ctx.fillStyle = rgba(pal.accent, 0.8);
      ctx.fillRect(p.x - w / 2, p.y, w, 5);
      ctx.fillStyle = rgba(pal.accent, 0.15);
      ctx.fillRect(p.x - w / 2 - 10, p.y - 520, 10, 520);
      ctx.fillRect(p.x + w / 2, p.y - 520, 10, 520);
      break;
    }
  }
}

/** Debug: worst distance (in frames) between an impact and the ball's contact keyframe. */
export function maxSyncErrorFrames(scene: Scene, impacts: Float64Array, fps = 60): number {
  const parts = scene.parts ? scene.parts.map((p) => p.scene) : [scene];
  let worst = 0;
  for (const s of parts) {
    for (let h = 0; h < s.hitT.length; h++) {
      const imp = s.hitImpact[h];
      if (imp < 0) continue;
      const b = s.hitBall[h];
      let best = Infinity;
      for (let q = s.ballSeg0[b]; q < s.ballSeg1[b]; q++) best = Math.min(best, Math.abs(s.segs[q * SEG + 2] - impacts[imp]));
      worst = Math.max(worst, best * fps);
    }
  }
  return worst;
}
