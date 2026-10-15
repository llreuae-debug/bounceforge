import { SimulationMode } from './types';
import { PhysicsWorld } from '../engine/world';
import { Vector2D } from '../engine/types';

export const TrailExpansionMode: SimulationMode = {
  id: 'trail_expansion',
  name: 'Rainbow Trail Expansion',
  category: 'core',
  description: 'Permanent chromatic ribbon trail that paints the arena, while the ball expands continuously on each wall impact.',
  defaultSettings: {
    radius: 420,
    growthRate: 1.2,
    maxBallRadius: 320,
  },
  presets: [
    {
      name: 'Smooth Spectrum (Standard)',
      settings: { radius: 420, growthRate: 1.2 },
    },
    {
      name: 'Mega Expansion (Fast Growth)',
      settings: { radius: 420, growthRate: 2.5 },
    },
    {
      name: 'Hyper Density (Slow Growth)',
      settings: { radius: 450, growthRate: 0.5 },
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
      thickness: 16,
      angle: 0,
      angularVelocity: 0.8,
      gapSize: 0.35,
      gapCount: 1,
      color: '#ffffff',
      shatterOnEscape: true,
    });

    world.customState.fullTrail = [] as { pt: Vector2D; color: string; width: number }[];

    world.customState.onRenderBg = (ctx: CanvasRenderingContext2D) => {
      const trail = world.customState.fullTrail as { pt: Vector2D; color: string; width: number }[];
      if (trail.length < 2) return;

      ctx.save();
      for (let i = 0; i < trail.length - 1; i++) {
        const p1 = trail[i];
        const p2 = trail[i + 1];

        ctx.strokeStyle = p1.color;
        ctx.lineWidth = Math.min(18, p1.width * 0.4);
        ctx.lineCap = 'round';
        ctx.shadowColor = p1.color;
        ctx.shadowBlur = 4;

        ctx.beginPath();
        ctx.moveTo(p1.pt.x, p1.pt.y);
        ctx.lineTo(p2.pt.x, p2.pt.y);
        ctx.stroke();
      }
      ctx.restore();
    };

    world.addBall({
      x: cx,
      y: cy,
      vx: world.prng.range(-240, 240),
      vy: world.prng.range(-200, 200),
      radius: 14,
      growthPerBounce: settings.growthRate ?? 1.2,
      color: '#ff007f',
      glowColor: '#ff007f',
      restitution: 1.0,
    });
  },
  step: (world: PhysicsWorld) => {
    const ball = world.balls[0];
    if (!ball || !ball.isAlive) return;

    const trail = world.customState.fullTrail as { pt: Vector2D; color: string; width: number }[];
    const hue = (world.time * 90) % 360;
    const color = `hsl(${hue}, 100%, 60%)`;
    ball.color = color;
    ball.glowColor = color;

    trail.push({
      pt: { x: ball.x, y: ball.y },
      color,
      width: ball.radius,
    });

    // Keep trail manageable
    if (trail.length > 2500) {
      trail.shift();
    }
  },
  isFinished: (world: PhysicsWorld, settings: Record<string, any>) => {
    const ball = world.balls[0];
    return world.escapes > 0 || (ball && ball.radius >= (settings.maxBallRadius ?? 320));
  },
};
