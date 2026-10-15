import { SimulationMode } from './types';
import { PhysicsWorld } from '../engine/world';
import { CollisionEvent } from '../engine/types';

export const InfiniteLoopMode: SimulationMode = {
  id: 'infinite_loop',
  name: 'Infinite Loop',
  category: 'core',
  description: 'Exponential ball duplication on each escape or bounce, scaling up to 5,000 balls with spatial hashing.',
  defaultSettings: {
    duplicateOn: 'escape', // 'escape' or 'bounce'
    maxBalls: 2500,
    rings: 8,
    radius: 420,
    gapSizeDeg: 36,
  },
  presets: [
    {
      name: 'Escape Clones (Standard)',
      settings: { duplicateOn: 'escape', maxBalls: 2000, rings: 8 },
    },
    {
      name: 'Bounce Multiplier (Chaotic)',
      settings: { duplicateOn: 'bounce', maxBalls: 3000, rings: 4 },
    },
    {
      name: 'Max Swarm (5,000 Cap)',
      settings: { duplicateOn: 'escape', maxBalls: 5000, rings: 10 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.getSafeArena(settings.platform);
    const cx = arena.centerX;
    const cy = arena.centerY;

    const ringCount = settings.rings ?? 8;
    const baseR = Math.min(arena.radius, settings.radius ?? arena.radius);
    const gapRad = ((settings.gapSizeDeg ?? 36) * Math.PI) / 180;

    for (let i = 0; i < ringCount; i++) {
      world.addRing({
        centerX: cx,
        centerY: cy,
        radius: baseR - i * 36,
        thickness: 12,
        angle: world.prng.next() * Math.PI * 2,
        angularVelocity: (i % 2 === 0 ? 1 : -1) * (1.1 + i * 0.15),
        gapSize: gapRad,
        gapCount: 1,
        color: ['#00f0ff', '#ff007f', '#ffd600', '#00ff88', '#bf5af2'][i % 5],
        shatterOnEscape: false,
      });
    }

    world.addBall({
      x: cx,
      y: cy,
      vx: world.prng.range(-200, 200),
      vy: world.prng.range(-200, 200),
      radius: 12,
      color: '#00f0ff',
      glowColor: '#00b4d8',
    });
  },
  onCollision: (world: PhysicsWorld, event: CollisionEvent, settings: Record<string, any>) => {
    const maxBalls = settings.maxBalls ?? 2500;
    if (world.balls.length >= maxBalls) return;

    const shouldDuplicate =
      (settings.duplicateOn === 'escape' && event.type === 'escape') ||
      (settings.duplicateOn === 'bounce' && (event.type === 'ring' || event.type === 'ball'));

    if (shouldDuplicate) {
      const parent = world.balls.find((b) => b.id === event.ballId);
      if (parent && world.balls.length < maxBalls) {
        const spreadAngle = world.prng.next() * Math.PI * 2;
        const colors = ['#00f0ff', '#ff007f', '#ffe600', '#00ff88', '#a855f7'];
        const newColor = colors[Math.floor(world.prng.next() * colors.length)];

        world.addBall({
          x: parent.x,
          y: parent.y,
          vx: Math.cos(spreadAngle) * 350,
          vy: Math.sin(spreadAngle) * 350,
          radius: Math.max(6, parent.radius * 0.95),
          color: newColor,
          glowColor: newColor,
        });
      }
    }
  },
  isFinished: (world: PhysicsWorld, settings: Record<string, any>) => {
    return world.balls.length >= (settings.maxBalls ?? 2500);
  },
};
