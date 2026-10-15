import { SimulationMode } from './types';
import { PhysicsWorld } from '../engine/world';

export const SpiralMode: SimulationMode = {
  id: 'spiral',
  name: 'Spiral Vortex',
  category: 'core',
  description: 'Concentric rings nested with incrementally shifted rotational gaps, forcing the ball through a vortex spiral trajectory.',
  defaultSettings: {
    coils: 12,
    maxRadius: 460,
    minRadius: 80,
    gapSizeDeg: 36,
    angularVelocity: 0.9,
  },
  presets: [
    {
      name: 'Vortex Outward (Standard)',
      settings: { coils: 12, gapSizeDeg: 36, angularVelocity: 0.9 },
    },
    {
      name: 'Tight Spiral (18 Coils)',
      settings: { coils: 18, gapSizeDeg: 28, angularVelocity: 1.2 },
    },
    {
      name: 'Slow Hypnotic Spiral',
      settings: { coils: 10, gapSizeDeg: 42, angularVelocity: 0.4 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.getSafeArena(settings.platform);
    const cx = arena.centerX;
    const cy = arena.centerY;

    const coils = settings.coils ?? 12;
    const maxR = Math.min(arena.radius, settings.maxRadius ?? arena.radius);
    const minR = settings.minRadius ?? 80;
    const rStep = (maxR - minR) / coils;
    const gapRad = ((settings.gapSizeDeg ?? 36) * Math.PI) / 180;
    const baseSpeed = settings.angularVelocity ?? 0.9;

    const colors = ['#bf5af2', '#5e5ce6', '#64d2ff', '#30d158', '#ffd60a', '#ff9f0a', '#ff453a'];

    for (let i = 0; i < coils; i++) {
      const radius = minR + i * rStep;
      // Shift initial gap angle along a golden spiral curve
      const angleOffset = i * 0.55;

      world.addRing({
        centerX: cx,
        centerY: cy,
        radius,
        thickness: 10,
        angle: angleOffset,
        angularVelocity: baseSpeed,
        gapSize: gapRad,
        gapCount: 1,
        color: colors[i % colors.length],
        shatterOnEscape: true,
      });
    }

    world.addBall({
      x: cx,
      y: cy,
      vx: world.prng.range(-80, 80),
      vy: world.prng.range(-80, 80),
      radius: 12,
      color: '#ffd60a',
      glowColor: '#ff9f0a',
      restitution: 0.99,
    });
  },
  isFinished: (world: PhysicsWorld) => {
    return world.rings.every((r) => r.isShattered);
  },
};
