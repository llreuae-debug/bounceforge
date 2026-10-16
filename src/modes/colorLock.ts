import { SimulationMode } from './types';
import { PhysicsWorld } from '../engine/world';
import { CollisionEvent } from '../engine/types';
import { AsmrEngine } from '../audio/asmrEngine';

export const COLOR_PALETTES: Record<number, string[]> = {
  3: ['#00f0ff', '#ff007f', '#ffd600'],
  4: ['#00f0ff', '#ff007f', '#ffd600', '#00ff88'],
  5: ['#00f0ff', '#ff007f', '#ffd600', '#00ff88', '#a855f7'],
  6: ['#00f0ff', '#ff007f', '#ffd600', '#00ff88', '#a855f7', '#ff5400'],
  7: ['#00f0ff', '#ff007f', '#ffd600', '#00ff88', '#a855f7', '#ff5400', '#3b82f6'],
  8: ['#00f0ff', '#ff007f', '#ffd600', '#00ff88', '#a855f7', '#ff5400', '#3b82f6', '#ec4899'],
};

export const ColorLockMode: SimulationMode = {
  id: 'color_lock',
  name: 'Color Lock',
  category: 'core',
  description:
    'The ball changes color on every bounce. Ring segments only shatter when hit with the matching color, unlocking musical chords. Clear the segments to break free.',
  asmrProfile: 'crystal',
  hookLines: [
    'it ONLY breaks when the color matches',
    'watch the ball color cycle',
    '3 segments left, can it match the yellow?',
    'color match chord is so satisfying',
    'pure chromatic satisfaction',
  ],
  defaultSettings: {
    paletteSize: 4,
    colorOrder: 'cycle', // 'cycle' | 'random'
    segmentCount: 12,
    radius: 400,
    ringThickness: 16,
    angularVelocity: 0.4,
    duration: 60,
  },
  presets: [
    {
      name: 'Chill Prism (3 Colors, 9 Segments, Cycle)',
      settings: {
        paletteSize: 3,
        colorOrder: 'cycle',
        segmentCount: 9,
        radius: 390,
        angularVelocity: 0.3,
      },
    },
    {
      name: 'Viral Color Lock (4 Colors, 12 Segments, Cycle)',
      settings: {
        paletteSize: 4,
        colorOrder: 'cycle',
        segmentCount: 12,
        radius: 400,
        angularVelocity: 0.4,
      },
    },
    {
      name: 'Insane Spectrum (6 Colors, 18 Segments, Random)',
      settings: {
        paletteSize: 6,
        colorOrder: 'random',
        segmentCount: 18,
        radius: 420,
        angularVelocity: 0.65,
      },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.getSafeArena(settings.platform);
    const cx = arena.centerX;
    const cy = arena.centerY;

    const pSize = Math.max(3, Math.min(8, settings.paletteSize ?? 4));
    const palette = COLOR_PALETTES[pSize] || COLOR_PALETTES[4];
    const count = Math.max(6, Math.min(24, settings.segmentCount ?? 12));
    const radius = Math.min(arena.radius, settings.radius ?? arena.radius);
    const step = (Math.PI * 2) / count;
    const colorOrder = settings.colorOrder || 'cycle';

    const segments = [];
    for (let i = 0; i < count; i++) {
      const col = palette[i % palette.length];
      segments.push({
        id: i,
        startAngle: i * step,
        endAngle: (i + 1) * step - 0.04,
        broken: false,
        color: col,
      });
    }

    world.customState.colorSegments = segments;
    world.customState.palette = palette;
    world.customState.colorOrder = colorOrder;
    world.customState.currentColorIndex = 0;
    world.customState.radius = radius;
    world.customState.cx = cx;
    world.customState.cy = cy;
    world.customState.angle = 0;
    world.customState.angularVelocity = settings.angularVelocity ?? 0.4;
    world.customState.escaped = false;
    world.customState.clearedCount = 0;
    world.customState.totalCount = count;

    // HUD Counter
    world.customState.counterLabel = 'MATCHED';
    world.customState.counterValue = `0 / ${count}`;

    world.customState.onRenderFg = (ctx: CanvasRenderingContext2D) => {
      const segs = world.customState.colorSegments;
      const r = world.customState.radius;
      const th = settings.ringThickness ?? 16;
      const rot = world.customState.angle;
      const curColor = palette[world.customState.currentColorIndex % palette.length];
      const cleared = world.customState.clearedCount;
      const total = world.customState.totalCount;

      ctx.save();
      ctx.lineCap = 'round';

      // 1. Draw segments
      for (const seg of segs) {
        if (seg.broken) continue;

        const isMatchingBall = seg.color.toLowerCase() === curColor.toLowerCase();
        ctx.lineWidth = isMatchingBall ? th + 4 : th;
        ctx.strokeStyle = seg.color;
        ctx.shadowColor = seg.color;
        ctx.shadowBlur = isMatchingBall ? 16 : 8;

        ctx.beginPath();
        ctx.arc(cx, cy, r, rot + seg.startAngle, rot + seg.endAngle);
        ctx.stroke();
      }

      // 2. Center Indicator: Ball Current Target Color & Score
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Outer Glow Pill
      ctx.fillStyle = curColor;
      ctx.shadowColor = curColor;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(cx, cy - 12, 16, 0, Math.PI * 2);
      ctx.fill();

      // Cleared counter
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 8;
      ctx.font = '900 20px monospace';
      ctx.fillText(`${cleared} / ${total}`, cx, cy + 24);

      ctx.restore();
    };

    // First ball with palette color
    world.addBall({
      x: cx,
      y: cy - 40,
      vx: world.prng.range(-200, 200),
      vy: world.prng.range(-150, 180),
      radius: 14,
      color: palette[0],
      glowColor: palette[0],
      mass: 1.0,
      restitution: 0.98,
      gravity: 1.0,
    });
  },

  step: (world: PhysicsWorld, dt: number) => {
    world.customState.angle += world.customState.angularVelocity * dt;
    const segs = world.customState.colorSegments;
    const palette = world.customState.palette as string[];
    const colorOrder = world.customState.colorOrder;
    const r = world.customState.radius;
    const cx = world.customState.cx;
    const cy = world.customState.cy;
    const rot = world.customState.angle;
    const total = world.customState.totalCount;

    const ball = world.balls[0];
    if (!ball || !ball.isAlive) return;

    const dx = ball.x - cx;
    const dy = ball.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Escape check (ball passes through a broken gap)
    if (dist > r + 30) {
      world.customState.escaped = true;
      world.escapes++;
      return;
    }

    // If all cleared, ring is fully open: let ball fly out freely
    if (world.customState.clearedCount >= total) {
      return;
    }

    if (dist + ball.radius >= r) {
      let hitAngle = Math.atan2(dy, dx) - rot;
      while (hitAngle < 0) hitAngle += Math.PI * 2;
      while (hitAngle >= Math.PI * 2) hitAngle -= Math.PI * 2;

      // Find hit segment
      const seg = segs.find((s: any) => hitAngle >= s.startAngle && hitAngle <= s.endAngle);
      if (seg) {
        // If segment is already broken, it is an open gap! Let ball pass through!
        if (seg.broken) {
          return;
        }

        // Check color match
        const matches = seg.color.toLowerCase() === ball.color.toLowerCase();

        if (matches) {
          // Break segment with bright shatter + harmonic chord
          seg.broken = true;
          world.customState.clearedCount = (world.customState.clearedCount || 0) + 1;
          world.customState.counterValue = `${world.customState.clearedCount} / ${total}`;

          world.spawnExplosion(ball.x, ball.y, seg.color, 30, 320);

          try {
            AsmrEngine.getInstance().playChordMatch();
          } catch {}

          world.triggerCollision({
            point: { x: ball.x, y: ball.y },
            normal: { x: -dx / dist, y: -dy / dist },
            intensity: 1.2,
            ringIndex: 0,
            ballColor: seg.color,
          });

          // Check if all cleared
          if (world.customState.clearedCount >= total) {
            world.spawnRingShatter({
              id: 999,
              ringIndex: 0,
              centerX: cx,
              centerY: cy,
              radius: r,
              thickness: 16,
              angle: rot,
              angularVelocity: 0,
              gapSize: 0,
              gapCount: 1,
              color: ball.color,
              isShattered: true,
            });
            // Ring completely open! Ball flies out!
            return;
          }
        } else {
          // Regular bounce
          world.triggerCollision({
            point: { x: ball.x, y: ball.y },
            normal: { x: -dx / dist, y: -dy / dist },
            intensity: 0.6,
            ringIndex: 0,
            ballColor: ball.color,
          });
        }

        // Change ball color on every bounce
        if (colorOrder === 'random') {
          const nextIdx = Math.floor(world.prng.next() * palette.length);
          world.customState.currentColorIndex = nextIdx;
        } else {
          world.customState.currentColorIndex = (world.customState.currentColorIndex + 1) % palette.length;
        }
        const nextCol = palette[world.customState.currentColorIndex];
        ball.color = nextCol;
        ball.glowColor = nextCol;

        // Reflect ball inward if moving outward
        const nx = -dx / dist;
        const ny = -dy / dist;
        const dot = ball.vx * nx + ball.vy * ny;
        if (dot < 0) {
          ball.vx = (ball.vx - 2 * dot * nx) * ball.restitution;
          ball.vy = (ball.vy - 2 * dot * ny) * ball.restitution;
        }
        ball.x = cx + (dx / dist) * (r - ball.radius - 2);
        ball.y = cy + (dy / dist) * (r - ball.radius - 2);
      }
    }
  },

  isFinished: (world: PhysicsWorld) => {
    return Boolean(world.customState.escaped) || (world.customState.clearedCount >= world.customState.totalCount);
  },
};
