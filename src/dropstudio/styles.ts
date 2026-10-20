import { Mulberry32 } from '../engine/prng';
import { ballAt, H, SceneBuilder, W, type Focus, type Scene } from './scene';
import type { Impacts } from './sync';
import type { SectionKind, StudioTrack } from './track';

export type StyleId =
  | 'classic'
  | 'staircase'
  | 'rain'
  | 'pendulum'
  | 'funnel'
  | 'glass'
  | 'rings'
  | 'pegboard'
  | 'stack'
  | 'gravityflip'
  | 'split'
  | 'bowl'
  | 'maze'
  | 'automix';

export interface StyleInfo {
  id: StyleId;
  name: string;
  blurb: string;
  /** World scrolls with the ball (camera always follows vertically) */
  scrolls: boolean;
}

export const STYLES: StyleInfo[] = [
  { id: 'classic', name: 'Classic Drop', blurb: 'One ball, decaying bounces in place', scrolls: false },
  { id: 'staircase', name: 'Staircase Cascade', blurb: 'One step per beat down a spiral staircase', scrolls: true },
  { id: 'rain', name: 'Rain Drop', blurb: 'Balls fall one by one from different heights', scrolls: false },
  { id: 'pendulum', name: 'Pendulum Release', blurb: 'Swings, releases, lands on the beat', scrolls: false },
  { id: 'funnel', name: 'Funnel Spiral', blurb: 'Rolls down a funnel, drops through the centre', scrolls: false },
  { id: 'glass', name: 'Glass Platforms', blurb: 'One shatter per beat', scrolls: true },
  { id: 'rings', name: 'Ring Pass', blurb: 'Through rotating rings, big impact on drops', scrolls: true },
  { id: 'pegboard', name: 'Pegboard', blurb: 'Pegs on beats, slot on the downbeat', scrolls: false },
  { id: 'stack', name: 'Stack Builder', blurb: 'Balls stack up, one per beat', scrolls: false },
  { id: 'gravityflip', name: 'Gravity Flip', blurb: 'Falls down, then up, every beat', scrolls: false },
  { id: 'split', name: 'Split & Multiply', blurb: 'Each major drop splits 1→2→4→8', scrolls: false },
  { id: 'bowl', name: 'Bowl Settle', blurb: 'Drops into a bowl, soft secondary hits', scrolls: false },
  { id: 'maze', name: 'Maze Fall', blurb: 'Zigzag maze, one wall hit per note', scrolls: true },
  { id: 'automix', name: 'Auto Mix', blurb: 'A style per section: intro / build / drop', scrolls: false },
];

export interface StyleOptions {
  ballCount: number;
  /** Ball size multiplier (1 = 40px radius in the 1080x1920 world) */
  size: number;
  slowMo: number;
  freezeFrames: 0 | 2 | 3;
  seed: number;
  /** Camera: follow zooms in on the action; static/orbit keep the frame (scrolling styles always track) */
  follow: boolean;
}

export const DEFAULT_STYLE_OPTIONS: StyleOptions = { ballCount: 1, size: 1, slowMo: 0.4, freezeFrames: 0, seed: 1337, follow: false };

const FLOOR = 1500;
const BASE_G = 2600;

interface Ctx {
  imp: Impacts;
  o: StyleOptions;
  rng: () => number;
  /** Free-fall gravity (slow-mo scales it: lower = longer, floatier falls) */
  g: number;
  R: number;
  duration: number;
  freeze: number;
  from: number;
  to: number;
}

function ctxFor(imp: Impacts, o: StyleOptions, duration: number, salt: number, from = 0, to = Infinity): Ctx {
  const prng = new Mulberry32((o.seed * 7919 + salt) >>> 0);
  return {
    imp,
    o,
    rng: () => prng.next(),
    g: BASE_G * o.slowMo * o.slowMo,
    R: 40 * o.size,
    duration,
    freeze: o.freezeFrames / 60,
    from,
    to,
  };
}

/** Impact indices inside the context's time window. */
function idx(c: Ctx): number[] {
  const out: number[] = [];
  for (let i = 0; i < c.imp.t.length; i++) if (c.imp.t[i] >= c.from && c.imp.t[i] < c.to) out.push(i);
  return out;
}

/** Bounce height toward an impact of this tier (slow-mo lowers it → slower, floatier arcs). */
function apexFor(c: Ctx, tier: number, decay = 1): number {
  const base = tier === 1 ? 720 : tier === 2 ? 250 : 80;
  return base * (0.55 + 0.45 * c.o.slowMo) * decay;
}

/** Hold for the Tier 1 freeze, keeping the next arc's arrival time exact. */
function freezeAfter(sb: SceneBuilder, c: Ctx, ball: number, tier: number, t: number, next: number | undefined): void {
  if (tier !== 1 || c.freeze <= 0) return;
  const until = Math.min(t + c.freeze, next !== undefined ? t + (next - t) * 0.5 : t + c.freeze);
  sb.hold(ball, until);
}

const staticFocus: Focus = () => ({ x: W / 2, y: H / 2 });

/** Camera target: the lowest (or the only) visible ball. */
function followBalls(yBias: number, zoom = 1): Focus {
  const out = new Float64Array(4);
  return (s: Scene, t: number) => {
    let bx = W / 2;
    let by = -Infinity;
    for (let i = 0; i < s.ballR.length; i++) {
      if (t < s.ballSpawn[i] - 0.05 || t > s.ballDespawn[i]) continue;
      if (ballAt(s, i, t, out) && out[1] > by) {
        by = out[1];
        bx = out[0];
      }
    }
    if (!Number.isFinite(by)) return { x: W / 2, y: H / 2, zoom };
    return { x: W / 2 + (bx - W / 2) * 0.35, y: by + yBias, zoom };
  };
}

function zoomFocus(c: Ctx): Focus {
  return c.o.follow ? followBalls(-120, 1.25) : staticFocus;
}

// ------------------------------------------------------------------------------------------
// Styles
// ------------------------------------------------------------------------------------------

function classic(sb: SceneBuilder, c: Ctx): void {
  const list = idx(c);
  if (!list.length) return;
  const n = Math.max(1, Math.min(10, c.o.ballCount));
  const gapX = Math.min(170, 860 / n);
  sb.props.push({ kind: 'floor', x: W / 2, y: FLOOR, from: c.from, to: c.to });
  for (let b = 0; b < n; b++) {
    const x = W / 2 + (b - (n - 1) / 2) * gapX;
    const r = c.R * (n > 6 ? 0.6 : n > 3 ? 0.8 : 1);
    const ball = sb.ball(r, b, c.imp.t[list[0]], x, FLOOR - r);
    let since = 0;
    list.forEach((k, j) => {
      const t = c.imp.t[k];
      const tier = c.imp.tier[k];
      if (j === 0) sb.fallTo(ball, t, x, FLOOR - r, Math.min(1150, 0.5 * c.g * Math.min(t, 2.4) ** 2 + 200), c.g);
      else sb.arcTo(ball, t, x, FLOOR - r, apexFor(c, tier, Math.pow(0.86, since)));
      since = tier === 1 ? 0 : since + 1;
      sb.hit(t, x, FLOOR, tier, ball, b === 0 ? k : -1);
      freezeAfter(sb, c, ball, tier, t, c.imp.t[list[j + 1]]);
    });
    sb.hold(ball, c.to === Infinity ? c.duration : c.to);
    if (c.to !== Infinity) sb.end(ball, c.to);
  }
}

function staircase(sb: SceneBuilder, c: Ctx): void {
  const list = idx(c);
  if (!list.length) return;
  const ball = sb.ball(c.R, 0, c.imp.t[list[0]], W / 2, 0);
  const stepDy = 150;
  list.forEach((k, j) => {
    const t = c.imp.t[k];
    const tier = c.imp.tier[k];
    const th = j * 0.85;
    const x = W / 2 + 250 * Math.sin(th);
    const y = 560 + j * stepDy;
    sb.props.push({ kind: 'step', x, y, w: 230, angle: th, t, big: tier === 1, from: c.from, to: c.to });
    if (j === 0) sb.fallTo(ball, t, x, y - c.R, 650, c.g);
    else sb.arcTo(ball, t, x, y - c.R, apexFor(c, tier) * 0.6);
    sb.hit(t, x, y, tier, ball, k);
    freezeAfter(sb, c, ball, tier, t, c.imp.t[list[j + 1]]);
  });
  sb.hold(ball, c.to === Infinity ? c.duration : c.to);
}

function rain(sb: SceneBuilder, c: Ctx): void {
  const list = idx(c);
  sb.props.push({ kind: 'floor', x: W / 2, y: FLOOR + 120, from: c.from, to: c.to });
  const lanes = Math.max(3, Math.min(12, c.o.ballCount * 3));
  list.forEach((k, j) => {
    const t = c.imp.t[k];
    const tier = c.imp.tier[k];
    const r = c.R * (tier === 1 ? 1.35 : tier === 2 ? 1 : 0.65);
    const lane = Math.floor(c.rng() * lanes);
    const x = 150 + ((lane + 0.5) / lanes) * 780 + (c.rng() - 0.5) * 30;
    const floor = FLOOR + 120 - r;
    const ball = sb.ball(r, j, t, x, floor);
    sb.fallTo(ball, t, x, floor, 450 + c.rng() * 750, c.g);
    sb.hit(t, x, FLOOR + 120, tier, ball, k);
    sb.arcTo(ball, t + 0.3, x + (c.rng() - 0.5) * 70, floor, 30 + 50 * (tier === 1 ? 1 : 0.4));
    sb.hold(ball, t + 0.55);
    sb.end(ball, t + 0.45);
  });
}

function pendulum(sb: SceneBuilder, c: Ctx): void {
  const list = idx(c);
  const px = W / 2;
  const py = 300;
  const L = 520;
  sb.props.push({ kind: 'pivot', x: px, y: py, r: L, from: c.from, to: c.to });
  sb.props.push({ kind: 'floor', x: W / 2, y: FLOOR, from: c.from, to: c.to });
  let prevRelease = Math.max(0, c.from);
  list.forEach((k, j) => {
    const t = c.imp.t[k];
    const tier = c.imp.tier[k];
    const prevT = j > 0 ? c.imp.t[list[j - 1]] : c.from;
    const fall = Math.max(0.12, Math.min(0.55 / (0.45 + c.o.slowMo), 0.8 * (t - prevT), t - c.from - 0.05));
    const release = t - fall;
    const start = Math.max(prevRelease, release - 2.4);
    const P = Math.max(0.2, release - start);
    const dir = j % 2 === 0 ? 1 : -1;
    const amp = Math.min(0.85, (300 * P) / (fall * 2 * Math.PI * L));
    const vx = (dir * L * amp * 2 * Math.PI) / P;
    const r = c.R * (tier === 1 ? 1.2 : 1);
    const ball = sb.ball(r, j, start, px, py + L);
    sb.pendulum(ball, release, px, py, L, dir * amp);
    const lx = px + vx * fall;
    const ly = FLOOR - r;
    sb.arcG(ball, t, lx, ly, (2 * (ly - (py + L))) / (fall * fall));
    sb.hit(t, lx, FLOOR, tier, ball, k);
    sb.arcTo(ball, t + 0.32, lx + dir * 40, ly, 45);
    sb.hold(ball, t + 0.6);
    sb.end(ball, t + 0.5);
    prevRelease = release;
  });
}

function funnel(sb: SceneBuilder, c: Ctx): void {
  const list = idx(c);
  const cx = W / 2;
  const yTop = 470;
  const R = 380;
  const yHole = 820;
  const pad = 1380;
  sb.props.push({ kind: 'funnel', x: cx, y: yTop, r: R, y2: yHole, from: c.from, to: c.to });
  sb.props.push({ kind: 'floor', x: W / 2, y: pad, from: c.from, to: c.to });
  list.forEach((k, j) => {
    const t = c.imp.t[k];
    const tier = c.imp.tier[k];
    const r = c.R * (tier === 1 ? 1.1 : 0.85);
    const fall = Math.sqrt((2 * (pad - r - yHole)) / c.g);
    const spin = 1.6 + c.rng() * 1.2 + (1 - c.o.slowMo);
    const tExit = t - fall;
    const tEnter = tExit - spin;
    const ball = sb.ball(r, j, tEnter, cx + R, yTop);
    sb.spiral(ball, tExit, cx, yTop, R - r, yHole, 2 + Math.floor(c.rng() * 2) + 0.5);
    sb.arcG(ball, t, cx, pad - r, c.g);
    sb.hit(t, cx, pad, tier, ball, k);
    const side = c.rng() < 0.5 ? -1 : 1;
    sb.arcTo(ball, t + 0.35, cx + side * 160, pad - r, 70);
    sb.arcTo(ball, t + 0.7, cx + side * 420, pad + 500, 10);
    sb.end(ball, t + 0.6);
  });
}

/** Forward-placed fall: obstacles sit wherever the ball is at each impact time. */
function fallThrough(
  sb: SceneBuilder,
  c: Ctx,
  kind: 'platform' | 'ring' | 'maze'
): void {
  const list = idx(c);
  if (!list.length) return;
  const g = c.g;
  const t0 = c.imp.t[list[0]];
  // Run-up before the first contact (may start before a section boundary; the part only renders from its start)
  const startT = t0 - Math.max(0.5, Math.min(t0 - c.from, 1.4));
  let x = W / 2;
  let y = 420;
  let vy = 0;
  let side = -1;
  const ball = sb.ball(c.R, 0, startT, x, y);
  sb.hold(ball, startT);
  let tPrev = startT;
  list.forEach((k, j) => {
    const t = c.imp.t[k];
    const tier = c.imp.tier[k];
    const dt = t - tPrev;
    const ny = y + vy * dt + 0.5 * g * dt * dt;
    let nx = x;
    if (kind === 'maze') {
      side = -side;
      nx = W / 2 + side * (230 - c.R);
    } else nx = W / 2 + (c.rng() - 0.5) * 120;
    sb.arcG(ball, t, nx, ny, g);
    sb.hit(t, nx, ny + (kind === 'ring' ? 0 : c.R), tier, ball, k);
    if (kind === 'platform') sb.props.push({ kind: 'platform', x: nx, y: ny + c.R, w: tier === 1 ? 460 : tier === 2 ? 360 : 240, t, big: tier === 1, from: c.from, to: c.to });
    else if (kind === 'ring') sb.props.push({ kind: 'ring', x: nx, y: ny, r: tier === 1 ? 210 : 150, t, big: tier === 1, angle: j * 0.7, from: c.from, to: c.to });
    else sb.props.push({ kind: 'wall', x: nx + side * c.R, y: ny, angle: side, t, big: tier === 1, from: c.from, to: c.to });
    // Speed after the contact: platforms absorb a lot, rings a little, walls bounce it back up a bit
    const vIn = vy + g * dt;
    vy = kind === 'ring' ? vIn * (tier === 1 ? 0.45 : 0.82) : kind === 'platform' ? vIn * (tier === 1 ? 0.25 : 0.4) : vIn * 0.55;
    vy = Math.min(vy, 1400);
    freezeAfter(sb, c, ball, tier, t, c.imp.t[list[j + 1]]);
    x = nx;
    y = ny;
    tPrev = sb.balls[ball].t;
  });
  const tail = (c.to === Infinity ? c.duration : c.to) - tPrev;
  if (tail > 0) sb.arcG(ball, tPrev + tail, x, y + vy * tail + 0.5 * g * tail * tail, g);
}

function pegboard(sb: SceneBuilder, c: Ctx): void {
  const list = idx(c);
  const top = 330;
  const rows = 12;
  const rowDy = 92;
  const colDx = 96;
  const slotY = 1560;
  sb.props.push({ kind: 'slot', x: W / 2, y: slotY, from: c.from, to: c.to });
  for (let r = 0; r < rows; r++) {
    for (let col = -5; col <= 5; col++) {
      const x = W / 2 + col * colDx + (r % 2 ? colDx / 2 : 0);
      if (x < 70 || x > W - 70) continue;
      sb.props.push({ kind: 'peg', x, y: top + r * rowDy, r: 12, from: c.from, to: c.to });
    }
  }
  // Groups: everything after a major drop up to and including the next major drop (the slot landing)
  const groups: number[][] = [];
  let cur: number[] = [];
  for (const k of list) {
    cur.push(k);
    if (c.imp.tier[k] === 1) {
      groups.push(cur);
      cur = [];
    }
  }
  if (cur.length) groups.push(cur);
  const slotFill = new Map<number, number>();
  groups.forEach((gk, gi) => {
    const pegs = gk.slice(0, -1);
    const land = gk[gk.length - 1];
    const ball = sb.ball(c.R * 0.75, gi, c.imp.t[gk[0]], W / 2, top - 120);
    let px = W / 2;
    let first = true;
    pegs.forEach((k, j) => {
      const t = c.imp.t[k];
      const row = Math.min(rows - 1, Math.round(((j + 1) * rows) / (pegs.length + 1)));
      // Nearest real peg on this row, half a column left or right of where the ball is
      const want = first ? px : px + (c.rng() < 0.5 ? -colDx / 2 : colDx / 2);
      const off = row % 2 ? colDx / 2 : 0;
      const m = Math.max(-5, Math.min(4, Math.round((want - W / 2 - off) / colDx)));
      const pegX = Math.max(70 + colDx / 2, Math.min(W - 70 - colDx / 2, W / 2 + m * colDx + off));
      px = pegX;
      const y = top + row * rowDy - 12 - c.R * 0.75;
      if (first) sb.fallTo(ball, t, pegX, y, Math.max(60, y - (top - 140)), c.g * 1.4);
      else sb.arcTo(ball, t, pegX, y, 28);
      sb.hit(t, pegX, y + c.R * 0.75, c.imp.tier[k], ball, k);
      first = false;
    });
    const t = c.imp.t[land];
    const slot = Math.round((sb.balls[ball].x - W / 2) / 120);
    const fill = slotFill.get(slot) ?? 0;
    slotFill.set(slot, fill + 1);
    const lx = W / 2 + slot * 120;
    const ly = slotY - c.R * 0.75 - (fill % 4) * c.R * 1.4;
    if (first) sb.fallTo(ball, t, lx, ly, 700, c.g);
    else sb.arcTo(ball, t, lx, ly, 40);
    sb.hit(t, lx, ly + c.R * 0.75, c.imp.tier[land], ball, land);
    freezeAfter(sb, c, ball, c.imp.tier[land], t, undefined);
    sb.hold(ball, t + 6);
    sb.end(ball, groups[gi + 3] ? c.imp.t[groups[gi + 3][0]] : t + 6);
  });
}

function stack(sb: SceneBuilder, c: Ctx): void {
  const list = idx(c);
  const r = c.R * 1.05;
  const base = 1560;
  const perRow = 7;
  const slots: { x: number; y: number }[] = [];
  for (let row = 0; row < perRow; row++) {
    const n = perRow - row;
    for (let i = 0; i < n; i++) slots.push({ x: W / 2 + (i - (n - 1) / 2) * 2 * r, y: base - r - row * r * Math.sqrt(3) });
  }
  sb.props.push({ kind: 'stackBase', x: W / 2, y: base, w: perRow * 2 * r + 40, from: c.from, to: c.to });
  let cycle: number[] = [];
  list.forEach((k, j) => {
    const t = c.imp.t[k];
    const slot = j % slots.length;
    if (slot === 0 && cycle.length) {
      for (const b of cycle) sb.end(b, t - 0.25);
      cycle = [];
    }
    const p = slots[slot];
    const ball = sb.ball(r, j, t, p.x, p.y);
    sb.fallTo(ball, t, p.x, p.y, 520 + c.rng() * 300, c.g);
    sb.hit(t, p.x, p.y + r, c.imp.tier[k], ball, k);
    sb.hold(ball, c.duration);
    cycle.push(ball);
  });
}

function gravityflip(sb: SceneBuilder, c: Ctx): void {
  const list = idx(c);
  if (!list.length) return;
  const floor = 1560;
  const ceil = 360;
  sb.props.push({ kind: 'floor', x: W / 2, y: floor, from: c.from, to: c.to });
  sb.props.push({ kind: 'ceiling', x: W / 2, y: ceil, from: c.from, to: c.to });
  const ball = sb.ball(c.R, 0, c.imp.t[list[0]], W / 2, floor - c.R);
  let up = false;
  list.forEach((k, j) => {
    const t = c.imp.t[k];
    const tier = c.imp.tier[k];
    const x = W / 2 + 200 * Math.sin(j * 0.7);
    const dt = j ? t - sb.balls[ball].t : 1;
    // Flip on most beats; very short gaps stay on the same surface with a small hop
    if (j > 0 && dt >= 0.3) up = !up;
    const y = up ? ceil + c.R : floor - c.R;
    if (j === 0) sb.fallTo(ball, t, x, y, 700, c.g);
    else if (dt >= 0.3 && ((up && sb.balls[ball].y > y) || (!up && sb.balls[ball].y < y))) sb.arcTo(ball, t, x, y, 30, up);
    else sb.arcTo(ball, t, x, y, apexFor(c, 3), up);
    sb.hit(t, x, up ? ceil : floor, tier, ball, k);
    freezeAfter(sb, c, ball, tier, t, c.imp.t[list[j + 1]]);
  });
  sb.hold(ball, c.duration);
}

/** Slot order that keeps a parent's children next to each other. */
function slotPos(j: number, n: number): number {
  if (n <= 1) return 0;
  const h = n / 2;
  return 2 * slotPos(j % h, h) + (j >= h ? 1 : 0);
}

function split(sb: SceneBuilder, c: Ctx): void {
  const list = idx(c);
  if (!list.length) return;
  const maxGen = Math.max(1, Math.min(3, Math.round(Math.log2(Math.max(2, c.o.ballCount * 8)))));
  const maxN = 1 << maxGen;
  sb.props.push({ kind: 'floor', x: W / 2, y: FLOOR, from: c.from, to: c.to });
  const xOf = (j: number, n: number) => W / 2 + (slotPos(j, n) - (n - 1) / 2) * Math.min(230, 860 / n);
  const rOf = (n: number) => c.R * (n <= 2 ? 1 : n <= 4 ? 0.85 : 0.7);
  let n = 1;
  let alive: number[] = [sb.ball(rOf(1), 0, c.imp.t[list[0]], W / 2, FLOOR - c.R)];
  let since = 0;
  let firstMajorSeen = false;
  list.forEach((k, j) => {
    const t = c.imp.t[k];
    const tier = c.imp.tier[k];
    alive.forEach((b, jj) => {
      const r = sb.balls[b].r;
      const x = xOf(jj, n);
      if (j === 0) sb.fallTo(b, t, x, FLOOR - r, 900, c.g);
      else sb.arcTo(b, t, x, FLOOR - r, apexFor(c, tier, Math.pow(0.88, since)));
      sb.hit(t, x, FLOOR, tier, b, jj === 0 ? k : -1);
      freezeAfter(sb, c, b, tier, t, c.imp.t[list[j + 1]]);
    });
    since = tier === 1 ? 0 : since + 1;
    if (tier === 1) {
      if (!firstMajorSeen) firstMajorSeen = true;
      else if (n < maxN) {
        // Split: each ball's child emerges from it
        const kids: number[] = [];
        alive.forEach((b, jj) => {
          const p = sb.balls[b];
          const kid = sb.ball(rOf(n * 2), (jj + n) % 8, p.t, p.x, p.y);
          sb.hold(kid, p.t);
          kids.push(kid);
        });
        alive = [...alive, ...kids];
        n *= 2;
      } else {
        // Reset to one ball: the others burst away
        alive.slice(1).forEach((b) => sb.end(b, t + 0.05));
        alive = alive.slice(0, 1);
        n = 1;
      }
    }
  });
  for (const b of alive) sb.hold(b, c.duration);
}

function bowl(sb: SceneBuilder, c: Ctx): void {
  const list = idx(c);
  const cx = W / 2;
  const cy = 1000;
  const RB = 440;
  sb.props.push({ kind: 'bowl', x: cx, y: cy, r: RB, from: c.from, to: c.to });
  const at = (a: number, r: number) => ({ x: cx + (RB - r) * Math.sin(a), y: cy + (RB - r) * Math.cos(a) });
  let ball = -1;
  let alpha = 0;
  let hop = 0;
  list.forEach((k, j) => {
    const t = c.imp.t[k];
    const tier = c.imp.tier[k];
    const r = c.R;
    if (ball < 0 || tier === 1) {
      if (ball >= 0) sb.end(ball, t - 0.3);
      alpha = (j % 2 ? -1 : 1) * (0.32 + c.rng() * 0.12);
      const p = at(alpha, r);
      ball = sb.ball(r, j, t, p.x, p.y);
      sb.fallTo(ball, t, p.x, p.y, 760, c.g);
      hop = 0;
    } else {
      alpha = -Math.sign(alpha || 1) * Math.max(0.05, Math.abs(alpha) * 0.74);
      const p = at(alpha, r);
      sb.arcTo(ball, t, p.x, p.y, 16 + 70 * Math.pow(0.78, hop));
      hop++;
    }
    const p = at(alpha, 0);
    sb.hit(t, p.x, p.y, tier, ball, k);
    freezeAfter(sb, c, ball, tier, t, c.imp.t[list[j + 1]]);
  });
  if (ball >= 0) sb.hold(ball, c.duration);
}

// ------------------------------------------------------------------------------------------

const BUILDERS: Record<Exclude<StyleId, 'automix'>, (sb: SceneBuilder, c: Ctx) => void> = {
  classic,
  staircase,
  rain,
  pendulum,
  funnel,
  glass: (sb, c) => fallThrough(sb, c, 'platform'),
  rings: (sb, c) => fallThrough(sb, c, 'ring'),
  pegboard,
  stack,
  gravityflip,
  split,
  bowl,
  maze: (sb, c) => fallThrough(sb, c, 'maze'),
};

/** Auto Mix picks a style per section from the song's mood. */
export function autoMixPlan(track: Pick<StudioTrack, 'mood'>): Record<SectionKind, Exclude<StyleId, 'automix'>> {
  if (track.mood === 'Calm' || track.mood === 'Sad') return { intro: 'bowl', build: 'staircase', drop: 'rain' };
  if (track.mood === 'Dark') return { intro: 'pendulum', build: 'maze', drop: 'glass' };
  if (track.mood === 'Festive') return { intro: 'classic', build: 'rings', drop: 'split' };
  return { intro: 'classic', build: 'pegboard', drop: 'split' };
}

function buildOne(style: Exclude<StyleId, 'automix'>, imp: Impacts, o: StyleOptions, duration: number, from = 0, to = Infinity): Scene {
  const sb = new SceneBuilder();
  const c = ctxFor(imp, o, duration, style.length * 131 + Math.round(from * 10), from, to);
  BUILDERS[style](sb, c);
  const info = STYLES.find((s) => s.id === style)!;
  const camera = info.scrolls || o.follow ? 'follow' : 'static';
  const focus = info.scrolls ? followBalls(-260) : zoomFocus(c);
  return sb.build(style, duration, camera, focus);
}

/** Builds the full scene for a style. Pure and deterministic for (impacts, options). */
export function buildScene(style: StyleId, imp: Impacts, o: StyleOptions, track: Pick<StudioTrack, 'mood' | 'sections' | 'duration'>): Scene {
  if (style !== 'automix') return buildOne(style, imp, o, track.duration);
  const plan = autoMixPlan(track);
  const secs = track.sections.length ? track.sections : [{ t: 0, kind: 'intro' as const }];
  const parts = secs.map((s, i) => {
    const t0 = i === 0 ? 0 : s.t;
    const t1 = i + 1 < secs.length ? secs[i + 1].t : track.duration;
    return { t0, t1, scene: buildOne(plan[s.kind], imp, o, track.duration, t0, t1) };
  });
  // The composite exposes every part's hits (audio, verification); rendering switches per part
  const sb = new SceneBuilder();
  for (const p of parts) {
    const s = p.scene;
    for (let i = 0; i < s.hitT.length; i++) sb.hit(s.hitT[i], s.hitX[i], s.hitY[i], s.hitTier[i], -1, s.hitImpact[i]);
  }
  const composite = sb.build('automix', track.duration, 'static', staticFocus);
  composite.parts = parts;
  return composite;
}
