import type { SimulationMode } from '../modes/types';
import type { PhysicsWorld } from '../engine/world';
import type { CollisionEvent, LineSegment, Peg } from '../engine/types';
import type { DropAction, DropKind, ReelPhysicsSettings, ReelPlan } from './types';
import { DEFAULT_PHYSICS } from './types';
import { Mulberry32 } from '../engine/prng';
import { drawReelForeground } from './reelRender';

/**
 * MIDI ball-drop mode. Every planned drop is released early by exactly its fall time so the
 * marble HITS its target (drum pad, peg or ramp) on the musical event. After that it bounces
 * through pegs, rolls down ramps, hits the spinner and leaves through the funnel.
 * Pure physics + timing: no DOM access, so it runs headless for tests and dry runs.
 */

export const REEL_PALETTES = [
  { pad: '#22d3ee', peg: '#a78bfa', ramp: '#38bdf8', marbles: ['#22d3ee', '#f472b6', '#facc15', '#a3e635'] },
  { pad: '#f472b6', peg: '#fb7185', ramp: '#f9a8d4', marbles: ['#f472b6', '#c084fc', '#fde047', '#67e8f9'] },
  { pad: '#a3e635', peg: '#34d399', ramp: '#86efac', marbles: ['#a3e635', '#22d3ee', '#fb923c', '#f0abfc'] },
  { pad: '#facc15', peg: '#fb923c', ramp: '#fde68a', marbles: ['#facc15', '#f87171', '#60a5fa', '#c4b5fd'] },
  { pad: '#c084fc', peg: '#818cf8', ramp: '#a5b4fc', marbles: ['#c084fc', '#2dd4bf', '#fda4af', '#bef264'] },
];

const W = 1080;
const H = 1920;
const BASE_GRAVITY = 1500;
const PAD_Y = 640;
const PAD_LEN = 120;
const PAD_TILT = 0.3;
const PAD_RESTITUTION = 0.42;
const PAD_XS = [210, 430, 650, 870];
/** First peg row sits in the gaps between pads, so light notes never clip a pad on the way down */
const PEG_ROW0_XS = [320, 540, 760];
/** Peg-free channels along both walls: sustained-note drops fall here onto the ramp tops */
const ROLL_XS = [90, W - 90];
const PEG_FIELD_MIN_X = 180;
const PEG_FIELD_MAX_X = W - 180;
const PEG_ROW0_Y = 840;
const PEG_SPACING = 96;
const PEG_ROWS = 5;
const STALL_SECONDS = 1.0;
const PEG_R = 8;
const SPINNER = { x: 540, y: 1560, r: 120 };

export interface PadInfo {
  index: number;
  x: number;
  y: number;
  tilt: number;
  line: LineSegment;
  flash: number;
}

export interface ReelImpact {
  dropId: number;
  kind: DropKind;
  planned: number;
  actual: number;
  target: 'pad' | 'peg' | 'ramp';
}

interface PendingDrop {
  drop: DropAction;
  impactTime: number;
  spawnTime: number;
  x: number;
  y0: number;
  vy0: number;
  radius: number;
  target: 'pad' | 'peg' | 'ramp';
  targetIndex: number;
}

export function reelPhysics(settings: Record<string, any>): ReelPhysicsSettings {
  return { ...DEFAULT_PHYSICS, ...(settings.physics || {}) };
}

export const MidiDropMode: SimulationMode = {
  id: 'midi_drop',
  name: 'MIDI Ball Drop',
  category: 'fresh_drops',
  description: 'Ball drops generated from a MIDI track: every major drop lands on the beat.',
  defaultSettings: {},
  presets: [],
  asmrProfile: 'crystal',

  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    // Sparks get their own random stream: a headless dry run can skip them and stay identical to preview/export
    world.fxPrng = new Mulberry32(seed ^ 0x5f3759df);
    // The layout is in 1080x1920 world units; exports at 4K render this scaled up
    world.width = W;
    world.height = H;
    world.config.width = W;
    world.config.height = H;
    const plan: ReelPlan | undefined = settings.reelPlan;
    const phys = reelPhysics(settings);
    world.config.gravity = { x: 0, y: BASE_GRAVITY * phys.gravity };
    world.config.airDrag = 0;
    world.config.restitution = phys.bounce;
    world.config.antiStallMinSpeed = 0; // never nudge balls: drop timing must stay exact
    world.config.maxSpeedCap = 4000;
    world.targetDuration = plan?.duration ?? world.targetDuration;

    const palette = REEL_PALETTES[0];

    // Side walls keep everything on screen
    world.lines.push(line(6, 0, 6, H, 'rgba(148,163,184,0.15)', phys.bounce));
    world.lines.push(line(W - 6, 0, W - 6, H, 'rgba(148,163,184,0.15)', phys.bounce));

    // Drum pads (major drops land here on the beat)
    const pads: PadInfo[] = PAD_XS.map((x, i) => {
      // All pads slope toward the centre so balls roll off into the peg field, not back up
      const tilt = i < 2 ? PAD_TILT : -PAD_TILT;
      const dx = (Math.cos(tilt) * PAD_LEN) / 2;
      const dy = (Math.sin(tilt) * PAD_LEN) / 2;
      const l = line(x - dx, PAD_Y - dy, x + dx, PAD_Y + dy, palette.pad, PAD_RESTITUTION);
      l.thickness = 10;
      world.lines.push(l);
      return { index: i, x, y: PAD_Y, tilt, line: l, flash: 0 };
    });

    // Peg field
    const pegs: Peg[] = [];
    if (phys.pegs) {
      for (const x of PEG_ROW0_XS) {
        pegs.push({ id: pegs.length + 1, x, y: PEG_ROW0_Y, radius: PEG_R, score: 0, color: palette.peg, bounciness: 0.85 });
      }
      for (let r = 1; r < PEG_ROWS; r++) {
        const y = PEG_ROW0_Y + r * PEG_SPACING;
        const offset = r % 2 === 0 ? 0 : PEG_SPACING / 2;
        for (let x = PEG_FIELD_MIN_X + offset; x <= PEG_FIELD_MAX_X; x += PEG_SPACING) {
          pegs.push({ id: pegs.length + 1, x, y, radius: PEG_R, score: 0, color: palette.peg, bounciness: 0.85 });
        }
      }
      world.pegs.push(...pegs);
    }

    // Ramps (sustained notes roll here)
    const ramps: LineSegment[] = [];
    if (phys.ramps) {
      ramps.push(line(70, 1290, 470, 1420, palette.ramp, 0.35));
      ramps.push(line(W - 70, 1330, W - 470, 1460, palette.ramp, 0.35));
      ramps.forEach((r) => (r.thickness = 8));
      world.lines.push(...ramps);
    }

    // Spinner: three rotating blades
    const blades: LineSegment[] = [];
    if (phys.spinner) {
      for (let i = 0; i < 3; i++) {
        const l = line(0, 0, 0, 0, palette.pad, phys.bounce);
        l.thickness = 8;
        blades.push(l);
      }
      world.lines.push(...blades);
    }

    // Funnel to the exit
    if (phys.funnel) {
      world.lines.push(line(20, 1660, 460, 1800, palette.ramp, 0.5));
      world.lines.push(line(W - 20, 1660, W - 460, 1800, palette.ramp, 0.5));
    }

    world.customState = {
      isMidiReel: true,
      palette,
      paletteIndex: 0,
      pads,
      pegs,
      ramps,
      blades,
      spinnerAngle: 0,
      spinnerSpeed: 0.9,
      pending: plan ? planSpawns(plan, phys, pads, pegs, ramps, world) : [],
      nextPending: 0,
      nextTransition: 0,
      dropByBall: new Map<number, PendingDrop>(),
      impacts: [] as ReelImpact[],
      camera: { zoom: 1, cx: W / 2, cy: H / 2, punch: 0 },
      rollingUntil: 0,
      stillSince: new Map<number, number>(),
      // Drawn by the engine renderer after its own layers (browser only)
      onRenderFg: (ctx: CanvasRenderingContext2D, w: PhysicsWorld) => drawReelForeground(ctx, w),
    };
    positionBlades(world);
  },

  step: (world: PhysicsWorld, dt: number, settings: Record<string, any>) => {
    const cs = world.customState;
    const plan: ReelPlan | undefined = settings.reelPlan;
    const phys = reelPhysics(settings);
    const speed = Math.max(0.05, world.getEffectiveSpeed());
    const videoDt = dt / speed;
    const tNow = world.videoTime;

    // Release every drop whose release time falls before the end of this frame. Its state is
    // placed exactly on its trajectory for the current time, so the impact lands on schedule.
    const pending: PendingDrop[] = cs.pending || [];
    while (cs.nextPending < pending.length && pending[cs.nextPending].spawnTime < tNow + videoDt) {
      const p = pending[cs.nextPending++];
      const tau = (tNow - p.spawnTime) * speed; // physics seconds since release (may be slightly negative)
      const g = world.config.gravity.y;
      const color = cs.palette.marbles[p.drop.id % cs.palette.marbles.length];
      const ball = world.addBall({
        x: p.x,
        y: p.y0 + p.vy0 * tau + 0.5 * g * tau * tau,
        vx: 0,
        vy: p.vy0 + g * tau,
        radius: p.radius,
        mass: (p.radius / 14) ** 2,
        restitution: phys.bounce,
        airDrag: 0,
        maxSpeed: 4000,
        color,
        glowColor: color,
        tag: `drop:${p.drop.id}`,
      });
      // In flight it ignores other balls, so nothing knocks it off its musical timing
      ball.ghost = true;
      cs.dropByBall.set(ball.id, p);
      world.eventBus.emit({
        id: Math.floor(world.prng.next() * 1e9),
        time: Math.max(tNow, p.spawnTime),
        type: 'roll_start',
        position: { x: p.x, y: Math.max(0, p.y0) },
        velocity: { x: 0, y: p.vy0 },
        impulse: 40 + p.drop.velocity * 60,
        ballId: ball.id,
        noteIndex: p.drop.id,
        extra: { midiReel: 'release', dropId: p.drop.id, kind: p.drop.kind, midi: p.drop.midi, radius: p.radius },
      });
    }

    // Musical transitions: new palette, spinner direction, camera move
    const transitions = plan?.transitions || [];
    while (cs.nextTransition < transitions.length && transitions[cs.nextTransition].time <= tNow) {
      const tr = transitions[cs.nextTransition++];
      applyPalette(world, REEL_PALETTES[tr.paletteIndex % REEL_PALETTES.length]);
      cs.spinnerSpeed = -cs.spinnerSpeed;
      if (phys.cameraMotion) cs.camera.punch = Math.max(cs.camera.punch, 0.6);
      world.eventBus.emit({
        id: Math.floor(world.prng.next() * 1e9),
        time: tr.time,
        type: 'portal',
        position: { x: W / 2, y: H / 2 },
        velocity: { x: 0, y: 0 },
        impulse: 120,
        ballId: 0,
        noteIndex: tr.paletteIndex,
        extra: { midiReel: 'transition', paletteIndex: tr.paletteIndex },
      });
    }

    // Spinner: faster while a sustained note rolls
    const boost = tNow < cs.rollingUntil ? 2.2 : 1;
    cs.spinnerAngle += cs.spinnerSpeed * boost * dt;
    positionBlades(world);

    // Despawn balls that left the screen or came to rest; cap how many are alive
    const stillSince: Map<number, number> = cs.stillSince;
    let alive = 0;
    for (let i = world.balls.length - 1; i >= 0; i--) {
      const b = world.balls[i];
      if (!b.isAlive) continue;
      if (b.y > H + 80 || b.x < -100 || b.x > W + 100) {
        b.isAlive = false;
        continue;
      }
      if (!b.ghost && Math.hypot(b.vx, b.vy) < 40) {
        const since = stillSince.get(b.id) ?? tNow;
        stillSince.set(b.id, since);
        if (tNow - since > STALL_SECONDS) {
          b.isAlive = false;
          world.spawnExplosion(b.x, b.y, b.color, 8, 120);
          continue;
        }
      } else {
        stillSince.delete(b.id);
      }
      alive++;
      if (alive > 70) b.isAlive = false;
    }

    // Camera: gentle drift toward the action, impact punches decay
    const cam = cs.camera;
    if (phys.cameraMotion) {
      cam.punch *= 0.9;
      cam.zoom = 1 + cam.punch * 0.06;
    } else {
      cam.zoom = 1;
      cam.punch = 0;
    }
    for (const pad of cs.pads as PadInfo[]) pad.flash *= 0.85;
    if (!phys.particles) world.particles.length = 0;
  },

  onCollision: (world: PhysicsWorld, event: CollisionEvent, settings: Record<string, any>) => {
    const cs = world.customState;
    if (event.extra?.midiReel) return;
    const p: PendingDrop | undefined = cs.dropByBall?.get(event.ballId);
    if (!p) return;
    const phys = reelPhysics(settings);
    // First contact with anything ends the ghost flight
    const ball = world.balls[event.ballId - 1];
    if (ball) ball.ghost = false;
    const target = classifyHit(world, event);
    if (!target) return;

    // First contact with its own target = the musical impact
    if (!cs.impacts.some((i: ReelImpact) => i.dropId === p.drop.id) && target === p.target) {
      cs.impacts.push({ dropId: p.drop.id, kind: p.drop.kind, planned: p.impactTime, actual: event.time, target });
      if (p.target === 'pad') {
        const pad = (cs.pads as PadInfo[])[p.targetIndex];
        if (pad) pad.flash = 1;
        if (phys.cameraMotion && (p.drop.kind === 'heavy' || p.drop.kind === 'pulse')) {
          cs.camera.punch = Math.max(cs.camera.punch, 0.5 + p.drop.velocity * 0.5);
          cs.camera.cy = pad?.y ?? H / 2;
        }
      }
      if (p.drop.kind === 'roll') cs.rollingUntil = Math.max(cs.rollingUntil, event.time + Math.min(4, p.drop.duration));
    }
  },

  isFinished: (world: PhysicsWorld, settings: Record<string, any>) => {
    const plan: ReelPlan | undefined = settings.reelPlan;
    return world.videoTime >= (plan?.duration ?? world.targetDuration);
  },
};

/** Which kind of obstacle an engine collision event touched. */
function classifyHit(world: PhysicsWorld, ev: CollisionEvent): 'pad' | 'peg' | 'ramp' | null {
  if (ev.type === 'bumper') return 'peg';
  if (ev.type !== 'wall') return null;
  const y = ev.position?.y ?? 0;
  if (Math.abs(y - PAD_Y) < 40 && PAD_XS.some((x) => Math.abs(x - (ev.position?.x ?? 0)) < PAD_LEN / 2 + 10)) return 'pad';
  if (y > 1250 && y < 1480) return 'ramp';
  return null;
}

/**
 * Work out where and when each drop is released so it reaches its target exactly at
 * `drop.time` (plus any custom nudge). Physics time = video time * reel speed.
 */
function planSpawns(
  plan: ReelPlan,
  phys: ReelPhysicsSettings,
  pads: PadInfo[],
  pegs: Peg[],
  ramps: LineSegment[],
  world: PhysicsWorld
): PendingDrop[] {
  const g = BASE_GRAVITY * phys.gravity;
  const speed = Math.max(0.05, phys.simSpeed);
  const row0 = pegs.filter((p) => p.y === PEG_ROW0_Y);
  let heavySide = 0;
  let accentSide = 0;
  let pulseIdx = 0;
  let rampSide = 0;
  const out: PendingDrop[] = [];

  for (const drop of plan.drops) {
    if (drop.muted) continue;
    const impactTime = drop.time + (drop.nudge || 0);
    const vel = drop.velocity;
    const scale = phys.ballScale;
    let target: PendingDrop['target'] = 'pad';
    let targetIndex = 0;
    let x = W / 2;
    let contactY = PAD_Y;
    let radius = 20;
    let vy0 = 150 + vel * 250;

    const usePad = (idx: number, r: number) => {
      const pad = pads[idx];
      target = 'pad';
      targetIndex = idx;
      // Land slightly off-centre on the downhill side so the ball rolls off the pad
      x = pad.x + (pad.tilt > 0 ? 18 : -18);
      // Engine line contact = centre within r of the centreline (thickness is visual only)
      contactY = pad.y + Math.tan(pad.tilt) * (x - pad.x) - r / Math.cos(pad.tilt);
      radius = r;
    };

    switch (drop.kind) {
      case 'heavy':
        usePad(heavySide++ % 2 === 0 ? 0 : 3, (30 + vel * 8) * scale);
        vy0 = 220 + vel * 320;
        break;
      case 'accent':
        usePad(accentSide++ % 2 === 0 ? 1 : 2, (19 + vel * 5) * scale);
        vy0 = 260 + vel * 300;
        break;
      case 'pulse':
        usePad(pulseIdx++ % 4, (24 + vel * 4) * scale);
        break;
      case 'roll':
        if (ramps.length) {
          const side = rampSide++ % ramps.length;
          const ramp = ramps[side];
          const r = (16 + vel * 4) * scale;
          const x1 = ramp.x1!;
          const y1 = ramp.y1!;
          const x2 = ramp.x2!;
          const y2 = ramp.y2!;
          // Falls down the clear channel by the wall and lands on the top of the ramp
          x = ROLL_XS[side];
          const along = (x - x1) / (x2 - x1);
          const angle = Math.atan2(y2 - y1, x2 - x1);
          contactY = y1 + (y2 - y1) * along - r / Math.abs(Math.cos(angle));
          radius = r;
          target = 'ramp';
          targetIndex = rampSide % ramps.length;
          vy0 = 120;
        } else {
          usePad(pulseIdx++ % 4, (18 + vel * 4) * scale);
        }
        break;
      case 'light':
      case 'cascade':
      default:
        if (row0.length) {
          // Pitch picks the peg: low notes left, high notes right
          const frac = Math.max(0, Math.min(1, (drop.midi - 36) / 60));
          const peg = row0[Math.round(frac * (row0.length - 1))];
          const r = (drop.kind === 'cascade' ? 8 : 10 + vel * 3) * scale;
          const off = 3 + world.prng.next() * 4; // tiny offset decides which way it deflects
          const side = drop.id % 2 === 0 ? 1 : -1;
          x = peg.x + off * side;
          contactY = peg.y - Math.sqrt((r + peg.radius) ** 2 - off * off);
          radius = r;
          target = 'peg';
          targetIndex = peg.id;
          vy0 = 100 + vel * 150;
        } else {
          usePad(pulseIdx++ % 4, (12 + vel * 3) * scale);
        }
    }

    // Release height: start above the screen; very early drops start lower so they still land on time
    let y0 = -radius - 30;
    let fallPhys = fallTime(contactY - y0, vy0, g);
    const tImpactPhys = impactTime * speed;
    if (fallPhys > tImpactPhys - 0.02) {
      fallPhys = Math.max(0.05, tImpactPhys - 0.02);
      y0 = contactY - (vy0 * fallPhys + 0.5 * g * fallPhys * fallPhys);
    }
    out.push({
      drop,
      impactTime,
      spawnTime: impactTime - fallPhys / speed,
      x,
      y0,
      vy0,
      radius,
      target,
      targetIndex,
    });
  }
  return out.sort((a, b) => a.spawnTime - b.spawnTime);
}

/** Time (physics s) to fall `dist` px starting at vy0 under gravity g. */
function fallTime(dist: number, vy0: number, g: number): number {
  if (dist <= 0) return 0;
  return (-vy0 + Math.sqrt(vy0 * vy0 + 2 * g * dist)) / g;
}

function positionBlades(world: PhysicsWorld): void {
  const cs = world.customState;
  const blades: LineSegment[] = cs.blades || [];
  blades.forEach((l, i) => {
    const a = cs.spinnerAngle + (i * Math.PI * 2) / 3;
    l.x1 = SPINNER.x + Math.cos(a) * 26;
    l.y1 = SPINNER.y + Math.sin(a) * 26;
    l.x2 = SPINNER.x + Math.cos(a) * SPINNER.r;
    l.y2 = SPINNER.y + Math.sin(a) * SPINNER.r;
  });
}

function applyPalette(world: PhysicsWorld, palette: (typeof REEL_PALETTES)[number]): void {
  const cs = world.customState;
  cs.palette = palette;
  for (const pad of cs.pads as PadInfo[]) pad.line.color = palette.pad;
  for (const peg of cs.pegs as Peg[]) peg.color = palette.peg;
  for (const r of cs.ramps as LineSegment[]) r.color = palette.ramp;
  for (const b of cs.blades as LineSegment[]) b.color = palette.pad;
}

function line(x1: number, y1: number, x2: number, y2: number, color: string, restitution: number): LineSegment {
  return { x1, y1, x2, y2, color, restitution, thickness: 4 };
}
