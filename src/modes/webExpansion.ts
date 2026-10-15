import { SimulationMode } from './types';
import { PhysicsWorld } from '../engine/world';
import { CollisionEvent, Vector2D } from '../engine/types';

export const WebExpansionMode: SimulationMode = {
  id: 'web_expansion',
  name: 'Geometric Web Expansion',
  category: 'core',
  description: 'Each ring collision attaches an elastic glowing anchor thread to the ball as it grows, weaving an intricate geometric web.',
  defaultSettings: {
    radius: 400,
    growthRate: 0.8,
    maxWebs: 300,
  },
  presets: [
    {
      name: 'Spider Polyhedra (Standard)',
      settings: { radius: 400, growthRate: 0.8 },
    },
    {
      name: 'Rapid Giant (High Growth)',
      settings: { radius: 400, growthRate: 1.8 },
    },
    {
      name: 'Micro Thread Weave',
      settings: { radius: 440, growthRate: 0.4 },
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
      thickness: 14,
      angle: 0,
      angularVelocity: 0.7,
      gapSize: 0.4,
      gapCount: 1,
      color: '#38bdf8',
      shatterOnEscape: true,
    });

    world.customState.anchors = [] as { point: Vector2D; color: string }[];

    // Render connecting lines from anchors to active ball
    world.customState.onRenderFg = (ctx: CanvasRenderingContext2D) => {
      const anchors = world.customState.anchors as { point: Vector2D; color: string }[];
      const ball = world.balls[0];
      if (!ball || !ball.isAlive || !anchors.length) return;

      ctx.save();
      for (let i = 0; i < anchors.length; i++) {
        const anc = anchors[i];
        ctx.strokeStyle = anc.color;
        ctx.globalAlpha = 0.65;
        ctx.lineWidth = 1.8;
        ctx.shadowColor = anc.color;
        ctx.shadowBlur = 6;

        ctx.beginPath();
        ctx.moveTo(anc.point.x, anc.point.y);
        ctx.lineTo(ball.x, ball.y);
        ctx.stroke();
      }
      ctx.restore();
    };

    world.addBall({
      x: cx,
      y: cy,
      vx: world.prng.range(-200, 200),
      vy: world.prng.range(-150, 150),
      radius: 12,
      growthPerBounce: settings.growthRate ?? 0.8,
      color: '#00f0ff',
      glowColor: '#00b4d8',
      restitution: 0.99,
    });
  },
  onCollision: (world: PhysicsWorld, event: CollisionEvent, settings: Record<string, any>) => {
    if (event.type === 'ring' || event.type === 'wall') {
      const anchors = world.customState.anchors as { point: Vector2D; color: string }[];
      if (anchors.length < (settings.maxWebs ?? 300)) {
        const hue = (anchors.length * 24) % 360;
        anchors.push({
          point: { x: event.position.x, y: event.position.y },
          color: `hsl(${hue}, 100%, 65%)`,
        });
      }
    }
  },
  isFinished: (world: PhysicsWorld) => {
    const ball = world.balls[0];
    return world.escapes > 0 || (ball && ball.radius >= 260);
  },
};
