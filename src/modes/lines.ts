import { SimulationMode } from './types';
import { PhysicsWorld } from '../engine/world';
import { CollisionEvent, Vector2D } from '../engine/types';

export const LinesMode: SimulationMode = {
  id: 'lines',
  name: 'Lines (Geometric String Art)',
  category: 'core',
  description: 'Every bounce point is connected by a line, creating intricate geometric art as the ball ricochets around the circle.',
  asmrProfile: 'ambient',
  hookLines: [
    'every single bounce connects a line',
    'watch the geometric art form',
    'the string symmetry at the end is unreal',
    'pure geometric satisfaction',
  ],
  defaultSettings: {
    radius: 410,
    maxLines: 400,
    duration: 60,
  },
  presets: [
    {
      name: 'Chroma String Art (Standard)',
      settings: { radius: 410, maxLines: 400 },
    },
    {
      name: 'Dense Starburst (Fast Lines)',
      settings: { radius: 420, maxLines: 600 },
    },
    {
      name: 'Minimal Polyhedra (Chill)',
      settings: { radius: 380, maxLines: 200 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.getSafeArena(settings.platform);
    const cx = arena.centerX;
    const cy = arena.centerY;
    const radius = Math.min(arena.radius, settings.radius ?? arena.radius);

    world.addRing({
      centerX: cx,
      centerY: cy,
      radius,
      thickness: 12,
      color: '#00f0ff',
      gapSize: 0,
      gapCount: 0,
      angularVelocity: 0,
    });

    world.customState.bouncePoints = [] as Vector2D[];
    world.customState.cx = cx;
    world.customState.cy = cy;
    world.customState.radius = radius;
    world.customState.maxLines = settings.maxLines ?? 400;

    const colors = ['#ff007f', '#00f0ff', '#ffe600', '#a855f7', '#00ff88', '#ff7a00'];

    world.customState.onRenderFg = (ctx: CanvasRenderingContext2D) => {
      const pts: Vector2D[] = world.customState.bouncePoints;
      if (pts.length < 2) return;

      ctx.save();
      ctx.lineWidth = 1.4;

      for (let i = 1; i < pts.length; i++) {
        const p1 = pts[i - 1];
        const p2 = pts[i];
        const color = colors[i % colors.length];

        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }

      ctx.restore();
    };

    world.addBall({
      x: cx,
      y: cy - 40,
      vx: world.prng.range(-280, 280),
      vy: world.prng.range(-200, 220),
      radius: 14,
      color: '#ffffff',
      glowColor: '#00f0ff',
      mass: 1.0,
      restitution: 1.0,
      gravity: 0, // Zero gravity so it weaves smooth geometric chords across the circle
    });
  },

  onCollision: (world: PhysicsWorld, event: CollisionEvent) => {
    if (world.customState.bouncePoints.length < world.customState.maxLines) {
      const pt = event.point ?? event.position;
      world.customState.bouncePoints.push({ x: pt.x, y: pt.y });
    }
  },

  isFinished: (world: PhysicsWorld) => {
    return world.time >= 60;
  },
};
