import { SimulationMode } from './types';
import { PhysicsWorld } from '../engine/world';
import { CollisionEvent } from '../engine/types';

export const CollisionMode: SimulationMode = {
  id: 'collision',
  name: 'Ball Explosion Duet',
  category: 'core',
  description: 'Balls bounce inside a ring. Direct ball-to-ball collisions trigger high-energy explosions and spawn new balls.',
  defaultSettings: {
    initialBalls: 2,
    spawnPerImpact: 2,
    maxBalls: 200,
    radius: 400,
  },
  presets: [
    {
      name: 'Duet Collision (2 Balls)',
      settings: { initialBalls: 2, spawnPerImpact: 2, maxBalls: 150 },
    },
    {
      name: 'Trio Ignition (3 Balls)',
      settings: { initialBalls: 3, spawnPerImpact: 3, maxBalls: 250 },
    },
    {
      name: 'Mass Chain Reaction',
      settings: { initialBalls: 4, spawnPerImpact: 2, maxBalls: 400 },
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
      angularVelocity: 0.5,
      gapSize: 0.45,
      gapCount: 1,
      color: '#a855f7',
      shatterOnEscape: true,
    });

    const initCount = settings.initialBalls ?? 2;
    const colors = ['#00f0ff', '#ff007f', '#ffd600', '#00ff88'];

    for (let i = 0; i < initCount; i++) {
      const angle = (i * (Math.PI * 2)) / initCount;
      world.addBall({
        x: cx + Math.cos(angle) * 120,
        y: cy + Math.sin(angle) * 120,
        vx: Math.cos(angle + Math.PI / 2) * 280,
        vy: Math.sin(angle + Math.PI / 2) * 280,
        radius: 18,
        color: colors[i % colors.length],
        glowColor: colors[i % colors.length],
        restitution: 1.0,
      });
    }
  },
  onCollision: (world: PhysicsWorld, event: CollisionEvent, settings: Record<string, any>) => {
    const maxBalls = settings.maxBalls ?? 200;
    if (event.type === 'ball' && world.balls.length < maxBalls) {
      const spawnCount = settings.spawnPerImpact ?? 2;
      for (let s = 0; s < spawnCount; s++) {
        if (world.balls.length >= maxBalls) break;
        const angle = world.prng.next() * Math.PI * 2;
        const speed = world.prng.range(200, 450);
        const colors = ['#00f0ff', '#ff007f', '#ffe600', '#00ff88', '#bf5af2'];
        const col = colors[Math.floor(world.prng.next() * colors.length)];

        world.addBall({
          x: event.position.x,
          y: event.position.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: 12,
          color: col,
          glowColor: col,
          restitution: 0.99,
        });
      }
    }
  },
  isFinished: (world: PhysicsWorld, settings: Record<string, any>) => {
    return world.balls.length >= (settings.maxBalls ?? 200) || world.escapes > 0;
  },
};
