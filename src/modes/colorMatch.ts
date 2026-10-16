import { SimulationMode } from './types';
import { PhysicsWorld } from '../engine/world';
import { CollisionEvent } from '../engine/types';

const COLORS = ['#00f0ff', '#ff007f', '#ffd600', '#00ff88'];

export const ColorMatchMode: SimulationMode = {
  id: 'color_match',
  name: 'Color Match (Segment Breaker)',
  category: 'core',
  description: 'The wall is divided into coloured segments. The ball changes colour on every bounce — break the segment when your colour matches. Clear them all to escape.',
  asmrProfile: 'crystal',
  hookLines: [
    'it only breaks when the color matches',
    '7 out of 12 matched so far',
    'wait for the final color match',
    'color sync is so satisfying',
  ],
  defaultSettings: {
    segmentCount: 12,
    radius: 400,
    ringThickness: 16,
    angularVelocity: 0.4,
    duration: 60,
  },
  presets: [
    {
      name: 'Standard 12 Segments',
      settings: { segmentCount: 12, radius: 400, angularVelocity: 0.4 },
    },
    {
      name: 'Speed Run 8 Segments',
      settings: { segmentCount: 8, radius: 380, angularVelocity: 0.7 },
    },
    {
      name: 'Rainbow 16 Segments',
      settings: { segmentCount: 16, radius: 420, angularVelocity: 0.3 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.getSafeArena(settings.platform);
    const cx = arena.centerX;
    const cy = arena.centerY;

    const count = settings.segmentCount ?? 12;
    const radius = Math.min(arena.radius, settings.radius ?? arena.radius);
    const step = (Math.PI * 2) / count;

    const segments = [];
    for (let i = 0; i < count; i++) {
      const col = COLORS[i % COLORS.length];
      segments.push({
        id: i,
        startAngle: i * step,
        endAngle: (i + 1) * step - 0.04,
        broken: false,
        color: col,
      });
    }

    world.customState.colorSegments = segments;
    world.customState.totalSegments = count;
    world.customState.clearedCount = 0;
    world.customState.radius = radius;
    world.customState.cx = cx;
    world.customState.cy = cy;
    world.customState.angle = 0;
    world.customState.angularVelocity = settings.angularVelocity ?? 0.4;
    world.customState.escaped = false;

    world.customState.onRenderFg = (ctx: CanvasRenderingContext2D) => {
      const segs = world.customState.colorSegments;
      const r = world.customState.radius;
      const th = settings.ringThickness ?? 16;
      const rot = world.customState.angle;
      const cleared = world.customState.clearedCount;
      const total = world.customState.totalSegments;
      const ball = world.balls[0];

      ctx.save();
      ctx.lineWidth = th;
      ctx.lineCap = 'round';

      // 1. Draw intact segments
      for (let i = 0; i < segs.length; i++) {
        const seg = segs[i];
        if (seg.broken) continue;

        ctx.strokeStyle = seg.color;
        ctx.shadowColor = seg.color;
        ctx.shadowBlur = 10;

        ctx.beginPath();
        ctx.arc(cx, cy, r, rot + seg.startAngle, rot + seg.endAngle);
        ctx.stroke();
      }

      // 2. Center HUD: Live counter
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
      ctx.shadowBlur = 10;
      ctx.font = 'bold 24px monospace';
      ctx.fillText(`${cleared} / ${total}`, cx, cy - 6);

      // Status pill
      ctx.font = 'bold 11px monospace';
      if (ball) {
        ctx.fillStyle = ball.color;
        ctx.shadowColor = ball.color;
        ctx.shadowBlur = 8;
        ctx.fillText(`Match ${ball.color === '#00f0ff' ? 'Cyan' : ball.color === '#ff007f' ? 'Pink' : ball.color === '#ffd600' ? 'Yellow' : 'Green'}`, cx, cy + 18);
      }

      ctx.restore();
    };

    // Bouncing Ball with initial random color
    const initialColor = COLORS[Math.floor(world.prng.next() * COLORS.length)];
    world.addBall({
      x: cx,
      y: cy - 25,
      vx: world.prng.range(-220, 220),
      vy: world.prng.range(-160, 180),
      radius: 15,
      color: initialColor,
      glowColor: initialColor,
      mass: 1.0,
      restitution: 0.98,
      gravity: 300,
    });
  },

  step: (world: PhysicsWorld, dt: number) => {
    world.customState.angle += world.customState.angularVelocity * dt;
    const segs = world.customState.colorSegments;
    const r = world.customState.radius;
    const cx = world.customState.cx;
    const cy = world.customState.cy;
    const rot = world.customState.angle;

    const ball = world.balls[0];
    if (!ball || !ball.isAlive) return;

    const dx = ball.x - cx;
    const dy = ball.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Escape check
    if (dist > r + 35) {
      world.customState.escaped = true;
      return;
    }

    if (dist + ball.radius >= r) {
      let hitAngle = Math.atan2(dy, dx) - rot;
      while (hitAngle < 0) hitAngle += Math.PI * 2;
      while (hitAngle >= Math.PI * 2) hitAngle -= Math.PI * 2;

      // Find hit segment
      const seg = segs.find((s: any) => hitAngle >= s.startAngle && hitAngle <= s.endAngle);
      if (seg && !seg.broken) {
        const matches = seg.color === ball.color;
        if (matches) {
          // Color match! Break segment
          seg.broken = true;
          world.customState.clearedCount += 1;
          world.triggerCollision({
            point: { x: ball.x, y: ball.y },
            normal: { x: -dx / dist, y: -dy / dist },
            intensity: 1.0,
            ringIndex: 0,
            ballColor: ball.color,
          });
        } else {
          world.triggerCollision({
            point: { x: ball.x, y: ball.y },
            normal: { x: -dx / dist, y: -dy / dist },
            intensity: 0.6,
            ringIndex: 0,
            ballColor: ball.color,
          });
        }

        // Change ball color on every bounce to a new random color
        const otherColors = COLORS.filter((c) => c !== ball.color);
        const nextColor = otherColors[Math.floor(world.prng.next() * otherColors.length)];
        ball.color = nextColor;
        ball.glowColor = nextColor;

        // Reflect ball
        const nx = -dx / dist;
        const ny = -dy / dist;
        const dot = ball.vx * nx + ball.vy * ny;
        ball.vx = (ball.vx - 2 * dot * nx) * ball.restitution;
        ball.vy = (ball.vy - 2 * dot * ny) * ball.restitution;
        ball.x = cx - nx * (r - ball.radius - 1);
        ball.y = cy - ny * (r - ball.radius - 1);
      }
    }
  },

  isFinished: (world: PhysicsWorld) => {
    return Boolean(world.customState.escaped);
  },
};
