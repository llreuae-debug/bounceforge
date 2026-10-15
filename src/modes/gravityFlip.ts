import { SimulationMode } from './types';
import { PhysicsWorld } from '../engine/world';

export const GravityFlipMode: SimulationMode = {
  id: 'gravity_flip',
  name: 'Gravity Flip Quad',
  category: 'advanced',
  description: 'Gravity shifts by 90 degrees in synchrony with the musical rhythm, creating tumbling multidirectional bounces.',
  defaultSettings: {
    flipInterval: 2.0, // seconds
    gravityMag: 1200,
    rings: 6,
    radius: 420,
    gapSizeDeg: 35,
  },
  presets: [
    {
      name: '2-Second Flip (Tempo Match)',
      settings: { flipInterval: 2.0, gravityMag: 1200 },
    },
    {
      name: 'Hyper Tumbler (1-Second Flip)',
      settings: { flipInterval: 1.0, gravityMag: 1500 },
    },
    {
      name: 'Heavy Whirl (Zero-G Swaps)',
      settings: { flipInterval: 3.0, gravityMag: 1800 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.getSafeArena(settings.platform);
    const cx = arena.centerX;
    const cy = arena.centerY;
    const radius = Math.min(arena.radius, settings.radius ?? arena.radius);
    const rings = settings.rings ?? 6;
    const gapRad = ((settings.gapSizeDeg ?? 35) * Math.PI) / 180;

    for (let i = 0; i < rings; i++) {
      world.addRing({
        centerX: cx,
        centerY: cy,
        radius: radius - i * 45,
        thickness: 12,
        angle: world.prng.next() * Math.PI * 2,
        angularVelocity: (i % 2 === 0 ? 1 : -1) * 0.9,
        gapSize: gapRad,
        gapCount: 1,
        color: ['#00f0ff', '#ff007f', '#ffe600', '#00ff88'][i % 4],
        shatterOnEscape: true,
      });
    }

    world.customState.flipInterval = settings.flipInterval ?? 2.0;
    world.customState.lastFlip = 0;
    world.customState.gravityIndex = 0; // 0: Down, 1: Left, 2: Up, 3: Right

    world.config.gravity = { x: 0, y: settings.gravityMag ?? 1200 };

    world.addBall({
      x: cx,
      y: cy,
      vx: 120,
      vy: -100,
      radius: 15,
      color: '#ffd600',
      glowColor: '#ffaa00',
      restitution: 0.99,
    });
  },
  step: (world: PhysicsWorld, dt: number, settings: Record<string, any>) => {
    const interval = world.customState.flipInterval;
    const mag = settings.gravityMag ?? 1200;

    if (world.time - world.customState.lastFlip >= interval) {
      world.customState.lastFlip = world.time;
      world.customState.gravityIndex = (world.customState.gravityIndex + 1) % 4;

      // 0: Down (0, 1), 1: Left (-1, 0), 2: Up (0, -1), 3: Right (1, 0)
      switch (world.customState.gravityIndex) {
        case 0:
          world.config.gravity = { x: 0, y: mag };
          break;
        case 1:
          world.config.gravity = { x: -mag, y: 0 };
          break;
        case 2:
          world.config.gravity = { x: 0, y: -mag };
          break;
        case 3:
          world.config.gravity = { x: mag, y: 0 };
          break;
      }
    }
  },
  isFinished: (world: PhysicsWorld) => {
    return world.rings.every((r) => r.isShattered);
  },
};
