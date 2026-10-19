/**
 * Drop Studio scenes are computed BACKWARDS from impact times with closed-form motion — never
 * simulated forward. Every ball is a list of keyframe segments; between two contacts it follows
 * an exact ballistic arc that leaves one contact point and reaches the next one at precisely the
 * impact time:
 *
 *   y(τ) = y0 + vy0·τ + ½·g·τ²,   vy0 = (y1 − y0)/Δ − ½·g·Δ     (same height: vy0 = −g·Δ/2)
 *   a fall from rest through height h takes Δ = √(2h/g)            (h = ½·g·t²)
 *
 * The scene is pure data (typed arrays), so rendering is a pure function of time: preview and
 * export are frame-identical, scrubbing is free and a scene builds in milliseconds.
 */

export const W = 1080;
export const H = 1920;

/** Segment kinds (stride SEG floats: kind, t0, t1, a, b, c, d, e) */
export const SEG = 8;
export const K_ARC = 0; // a=x0 b=y0 c=x1 d=y1 e=g
export const K_HOLD = 1; // a=x b=y
export const K_PENDULUM = 2; // a=pivotX b=pivotY c=length d=amplitude(rad, signed)
export const K_SPIRAL = 3; // a=cx b=yTop c=R d=yHole e=turns

export type PropKind =
  | 'floor'
  | 'ceiling'
  | 'step'
  | 'platform'
  | 'ring'
  | 'peg'
  | 'slot'
  | 'funnel'
  | 'pivot'
  | 'bowl'
  | 'wall'
  | 'stackBase';

export interface Prop {
  kind: PropKind;
  x: number;
  y: number;
  w?: number;
  h?: number;
  r?: number;
  angle?: number;
  /** Time the prop is hit / broken / passed (drives flashes and shatter) */
  t?: number;
  x2?: number;
  y2?: number;
  big?: boolean;
  /** Visible window (props of one Auto Mix section) */
  from?: number;
  to?: number;
}

export type CameraKind = 'static' | 'follow';
export type Focus = (s: Scene, t: number) => { x: number; y: number; zoom?: number };

export interface Scene {
  style: string;
  duration: number;
  segs: Float64Array;
  ballSeg0: Int32Array;
  ballSeg1: Int32Array;
  ballR: Float32Array;
  ballColor: Uint8Array;
  /** Ball fully visible between spawn and despawn (fades just outside) */
  ballSpawn: Float64Array;
  ballDespawn: Float64Array;
  /** Hits, sorted by time: one per impact (+ secondary contacts with tier 3) */
  hitT: Float64Array;
  hitX: Float32Array;
  hitY: Float32Array;
  hitTier: Uint8Array;
  hitBall: Int32Array;
  /** Index of the impact this hit realises (-1 for decorative secondary hits) */
  hitImpact: Int32Array;
  props: Prop[];
  camera: CameraKind;
  /** Camera centre samples at 30Hz (follow camera) */
  camX: Float32Array;
  camY: Float32Array;
  camZoom: Float32Array;
  /** Auto Mix: one sub-scene per song section (renderer switches on time) */
  parts?: { t0: number; t1: number; scene: Scene }[];
}

/** Gravity that makes an arc rise `apex` above its start and land `drop` lower, in exactly Δ seconds. */
export function gForApex(apex: number, drop: number, dt: number): number {
  const a = Math.max(0, apex, -drop + 4);
  const q = (Math.sqrt(2 * a) + Math.sqrt(Math.max(0, 2 * a + 2 * drop))) / dt;
  return q * q;
}

interface BallDraft {
  segs: number[];
  r: number;
  color: number;
  spawn: number;
  despawn: number;
  /** Last keyframe (time, x, y) */
  t: number;
  x: number;
  y: number;
}

/** Collects balls, segments, hits and props for one scene. */
export class SceneBuilder {
  balls: BallDraft[] = [];
  props: Prop[] = [];
  hits: { t: number; x: number; y: number; tier: number; ball: number; impact: number }[] = [];

  ball(r: number, color: number, t: number, x: number, y: number): number {
    this.balls.push({ segs: [], r, color, spawn: t, despawn: Infinity, t, x, y });
    return this.balls.length - 1;
  }

  private push(b: BallDraft, kind: number, t0: number, t1: number, a: number, bb: number, c: number, d: number, e: number) {
    if (t1 <= t0) return;
    b.segs.push(kind, t0, t1, a, bb, c, d, e);
  }

  /** Arc from the ball's last keyframe to (x, y) at time t; apex = rise above the higher end (px). */
  arcTo(i: number, t: number, x: number, y: number, apex: number, flip = false): void {
    const b = this.balls[i];
    const dt = t - b.t;
    if (dt <= 1e-6) {
      b.x = x;
      b.y = y;
      b.t = t;
      return;
    }
    const drop = flip ? b.y - y : y - b.y;
    const g = gForApex(apex, drop, dt) * (flip ? -1 : 1);
    this.push(b, K_ARC, b.t, t, b.x, b.y, x, y, g);
    b.t = t;
    b.x = x;
    b.y = y;
  }

  /** Arc with an explicit gravity (forward-placed motion such as glass platforms). */
  arcG(i: number, t: number, x: number, y: number, g: number): void {
    const b = this.balls[i];
    if (t - b.t <= 1e-6) return;
    this.push(b, K_ARC, b.t, t, b.x, b.y, x, y, g);
    b.t = t;
    b.x = x;
    b.y = y;
  }

  /** Fall from rest so the ball reaches (x, y) at time t; returns the release time. */
  fallTo(i: number, t: number, x: number, y: number, height: number, g: number): number {
    const b = this.balls[i];
    const dt = Math.sqrt((2 * height) / g);
    const t0 = t - dt;
    b.t = t0;
    b.x = x;
    b.y = y - height;
    b.spawn = Math.min(b.spawn, t0);
    this.push(b, K_ARC, t0, t, x, y - height, x, y, g);
    b.t = t;
    b.y = y;
    return t0;
  }

  hold(i: number, until: number): void {
    const b = this.balls[i];
    this.push(b, K_HOLD, b.t, until, b.x, b.y, 0, 0, 0);
    b.t = Math.max(b.t, until);
  }

  pendulum(i: number, t1: number, px: number, py: number, len: number, amp: number): void {
    const b = this.balls[i];
    this.push(b, K_PENDULUM, b.t, t1, px, py, len, amp, 0);
    b.t = t1;
    b.x = px;
    b.y = py + len;
  }

  spiral(i: number, t1: number, cx: number, yTop: number, R: number, yHole: number, turns: number): void {
    const b = this.balls[i];
    this.push(b, K_SPIRAL, b.t, t1, cx, yTop, R, yHole, turns);
    b.t = t1;
    b.x = cx;
    b.y = yHole;
  }

  hit(t: number, x: number, y: number, tier: number, ball: number, impact: number): void {
    this.hits.push({ t, x, y, tier, ball, impact });
  }

  end(i: number, despawn: number): void {
    this.balls[i].despawn = despawn;
  }

  build(style: string, duration: number, camera: CameraKind, focus: Focus): Scene {
    const n = this.balls.length;
    const total = this.balls.reduce((s, b) => s + b.segs.length, 0);
    const segs = new Float64Array(total);
    const s0 = new Int32Array(n);
    const s1 = new Int32Array(n);
    let k = 0;
    this.balls.forEach((b, i) => {
      s0[i] = k / SEG;
      segs.set(b.segs, k);
      k += b.segs.length;
      s1[i] = k / SEG;
    });
    const hits = [...this.hits].sort((a, b) => a.t - b.t);
    const scene: Scene = {
      style,
      duration,
      segs,
      ballSeg0: s0,
      ballSeg1: s1,
      ballR: Float32Array.from(this.balls.map((b) => b.r)),
      ballColor: Uint8Array.from(this.balls.map((b) => b.color)),
      ballSpawn: Float64Array.from(this.balls.map((b) => b.spawn)),
      ballDespawn: Float64Array.from(this.balls.map((b) => (Number.isFinite(b.despawn) ? b.despawn : duration + 1))),
      hitT: Float64Array.from(hits.map((h) => h.t)),
      hitX: Float32Array.from(hits.map((h) => h.x)),
      hitY: Float32Array.from(hits.map((h) => h.y)),
      hitTier: Uint8Array.from(hits.map((h) => h.tier)),
      hitBall: Int32Array.from(hits.map((h) => h.ball)),
      hitImpact: Int32Array.from(hits.map((h) => h.impact)),
      props: this.props,
      camera,
      camX: new Float32Array(0),
      camY: new Float32Array(0),
      camZoom: new Float32Array(0),
    };
    computeCamera(scene, focus);
    return scene;
  }
}

// ---------- Evaluation (hot path: no allocations) ----------

/** Writes the ball's position into out[0] (x), out[1] (y), out[3] (depth z) and visibility (0..1) into out[2]. */
export function ballAt(s: Scene, i: number, t: number, out: Float64Array): boolean {
  const spawn = s.ballSpawn[i];
  const despawn = s.ballDespawn[i];
  if (t < spawn - 0.15 || t > despawn + 0.35) return false;
  const a = s.ballSeg0[i];
  const b = s.ballSeg1[i];
  if (a >= b) return false;
  const segs = s.segs;
  // Binary search the last segment with t0 <= t
  let lo = a;
  let hi = b - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (segs[mid * SEG + 1] <= t) lo = mid;
    else hi = mid - 1;
  }
  const o = lo * SEG;
  const kind = segs[o];
  const t0 = segs[o + 1];
  const t1 = segs[o + 2];
  const tau = Math.min(Math.max(t - t0, 0), t1 - t0);
  const dt = t1 - t0;
  if (kind === K_ARC) {
    const x0 = segs[o + 3];
    const y0 = segs[o + 4];
    const x1 = segs[o + 5];
    const y1 = segs[o + 6];
    const g = segs[o + 7];
    const vy0 = (y1 - y0) / dt - 0.5 * g * dt;
    out[0] = x0 + (x1 - x0) * (tau / dt);
    out[1] = y0 + vy0 * tau + 0.5 * g * tau * tau;
  } else if (kind === K_HOLD) {
    out[0] = segs[o + 3];
    out[1] = segs[o + 4];
  } else if (kind === K_PENDULUM) {
    const th = segs[o + 6] * Math.sin((2 * Math.PI * tau) / dt);
    out[0] = segs[o + 3] + segs[o + 5] * Math.sin(th);
    out[1] = segs[o + 4] + segs[o + 5] * Math.cos(th);
  } else {
    const u = tau / dt;
    const r = segs[o + 5] * Math.pow(1 - u, 0.85);
    const phi = 2 * Math.PI * segs[o + 7] * Math.pow(u, 1.35);
    out[0] = segs[o + 3] + r * Math.cos(phi);
    out[1] = segs[o + 4] + (segs[o + 6] - segs[o + 4]) * Math.pow(u, 1.25);
    out[3] = r * Math.sin(phi);
  }
  if (kind !== K_SPIRAL) out[3] = 0;
  // Fade in over 0.15s before spawn is complete, fade out over 0.35s after despawn
  let vis = 1;
  if (t < spawn) vis = 1 - (spawn - t) / 0.15;
  else if (t > despawn) vis = 1 - (t - despawn) / 0.35;
  out[2] = Math.max(0, Math.min(1, vis));
  return out[2] > 0;
}

/** Is the ball on a pendulum at time t (renderer draws the string)? */
export function onPendulum(s: Scene, i: number, t: number): number {
  for (let k = s.ballSeg0[i]; k < s.ballSeg1[i]; k++) {
    const o = k * SEG;
    if (s.segs[o] === K_PENDULUM && t >= s.segs[o + 1] && t < s.segs[o + 2]) return o;
  }
  return -1;
}

/** First hit index with time >= t (binary search). */
export function hitIndexAt(s: Scene, t: number): number {
  let lo = 0;
  let hi = s.hitT.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (s.hitT[mid] < t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

const CAM_HZ = 30;

function computeCamera(s: Scene, focus: Focus): void {
  const n = Math.ceil(s.duration * CAM_HZ) + 2;
  s.camX = new Float32Array(n);
  s.camY = new Float32Array(n);
  s.camZoom = new Float32Array(n);
  // Critically damped follow (deterministic forward pass) so the camera glides, never snaps
  let x = W / 2;
  let y = H / 2;
  let vx = 0;
  let vy = 0;
  const f0 = focus(s, 0);
  if (s.camera === 'follow') {
    x = f0.x;
    y = f0.y;
  }
  const dt = 1 / CAM_HZ;
  const w = 5.5;
  for (let i = 0; i < n; i++) {
    const f = focus(s, i * dt);
    if (s.camera === 'follow') {
      const ax = w * w * (f.x - x) - 2 * w * vx;
      const ay = w * w * (f.y - y) - 2 * w * vy;
      vx += ax * dt;
      vy += ay * dt;
      x += vx * dt;
      y += vy * dt;
    }
    s.camX[i] = x;
    s.camY[i] = y;
    s.camZoom[i] = f.zoom ?? 1;
  }
}

export function cameraAt(s: Scene, t: number, out: Float64Array): void {
  const f = Math.max(0, Math.min(s.camX.length - 1.001, t * CAM_HZ));
  const i = Math.floor(f);
  const u = f - i;
  out[0] = s.camX[i] + (s.camX[i + 1] - s.camX[i]) * u;
  out[1] = s.camY[i] + (s.camY[i + 1] - s.camY[i]) * u;
  out[2] = s.camZoom[i] + (s.camZoom[i + 1] - s.camZoom[i]) * u;
}
