import { SimulationMode } from './types';
import { getTargetDuration } from '../engine/duration';
import { PhysicsWorld } from '../engine/world';
import { Vector2D } from '../engine/types';

export const ShrinkingPrisonMode: SimulationMode = {
  id: 'shrinking_prison',
  name: 'Shrinking Geometric Prison',
  category: 'advanced',
  description: 'A spinning polygon prison (hexagon, square, or octagon) shrinks inexorably inward. The ball fights for survival.',
  defaultSettings: {
    sides: 6,
    initialRadius: 460,
    shrinkRate: 5.5, // px/sec
    minRadius: 60,
    angularVelocity: 0.75,
  },
  presets: [
    {
      name: 'Hexagon Vortex (6 Sides)',
      settings: { sides: 6, initialRadius: 460, shrinkRate: 5.5 },
    },
    {
      name: 'Square Trap (4 Sides)',
      settings: { sides: 4, initialRadius: 420, shrinkRate: 6.0 },
    },
    {
      name: 'Octagon Chamber (8 Sides)',
      settings: { sides: 8, initialRadius: 480, shrinkRate: 5.0 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.getSafeArena(settings.platform);
    const cx = arena.centerX;
    const cy = arena.centerY;

    world.customState.cx = cx;
    world.customState.cy = cy;
    world.customState.sides = settings.sides ?? 6;
    world.customState.radius = Math.min(arena.radius, settings.initialRadius ?? arena.radius);
    world.customState.shrinkRate = settings.shrinkRate ?? 5.5;
    world.customState.minRadius = settings.minRadius ?? 60;
    world.customState.angle = 0;
    world.customState.angularVelocity = settings.angularVelocity ?? 0.75;
    world.customState.survived = false;

    // Render polygon prison on FG
    world.customState.onRenderFg = (ctx: CanvasRenderingContext2D) => {
      const sides = world.customState.sides;
      const r = world.customState.radius;
      const rot = world.customState.angle;

      ctx.save();
      ctx.strokeStyle = '#ff007f';
      ctx.lineWidth = 14;
      ctx.shadowColor = '#ff007f';
      ctx.shadowBlur = 18;
      ctx.beginPath();

      for (let i = 0; i <= sides; i++) {
        const a = rot + (i * Math.PI * 2) / sides;
        const px = cx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    };

    world.addBall({
      x: cx,
      y: cy - 40,
      vx: world.prng.range(-200, 200),
      vy: world.prng.range(-150, 150),
      radius: 14,
      color: '#00f0ff',
      glowColor: '#00b4d8',
      restitution: 0.99,
    });
  },
  step: (world: PhysicsWorld, dt: number) => {
    world.customState.angle += world.customState.angularVelocity * dt;
    world.customState.radius = Math.max(
      world.customState.minRadius,
      world.customState.radius - world.customState.shrinkRate * dt
    );

    const cx = world.customState.cx;
    const cy = world.customState.cy;
    const sides = world.customState.sides;
    const r = world.customState.radius;
    const rot = world.customState.angle;

    // Build segments for current polygon frame
    const vertices: Vector2D[] = [];
    for (let i = 0; i < sides; i++) {
      const a = rot + (i * Math.PI * 2) / sides;
      vertices.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }

    // Check ball collision with each polygon segment
    const ball = world.balls[0];
    if (!ball || !ball.isAlive) return;

    for (let i = 0; i < sides; i++) {
      const p1 = vertices[i];
      const p2 = vertices[(i + 1) % sides];

      const vx = p2.x - p1.x;
      const vy = p2.y - p1.y;
      const lenSq = vx * vx + vy * vy;
      if (lenSq === 0) continue;

      const t = Math.max(0, Math.min(1, ((ball.x - p1.x) * vx + (ball.y - p1.y) * vy) / lenSq));
      const projX = p1.x + t * vx;
      const projY = p1.y + t * vy;

      const dx = ball.x - projX;
      const dy = ball.y - projY;
      const dist = Math.hypot(dx, dy);

      if (dist < ball.radius && dist > 0.001) {
        const nx = dx / dist;
        const ny = dy / dist;

        const overlap = ball.radius - dist;
        ball.x += nx * overlap;
        ball.y += ny * overlap;

        const dot = ball.vx * nx + ball.vy * ny;
        if (dot < 0) {
          ball.vx -= (1 + 0.98) * dot * nx;
          ball.vy -= (1 + 0.98) * dot * ny;

          world.spawnExplosion(projX, projY, '#ff007f', 12, 180);
          world.eventBus.emit({
            id: Math.floor(Math.random() * 1000000),
            time: world.time,
            type: 'wall',
            position: { x: projX, y: projY },
            velocity: { x: ball.vx, y: ball.vy },
            impulse: 320,
            ballId: ball.id,
            noteIndex: 0,
          });
        }
      }
    }
  },
  isFinished: (world: PhysicsWorld, settings: Record<string, any>) => {
    return world.time >= getTargetDuration(settings) || world.customState.radius <= world.customState.minRadius + 5;
  },
};
