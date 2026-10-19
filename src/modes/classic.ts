import { SimulationMode } from './types';
import { PhysicsWorld } from '../engine/world';
import { paceRingEscapes, reelLength } from '../engine/pacing';

export const ClassicMode: SimulationMode = {
  id: 'classic',
  name: 'Classic Escape',
  category: 'core',
  description: 'Concentric rotating rings with gaps. The ball escapes ring by ring with explosive shatters.',
  defaultSettings: {
    ringCount: 16,
    initialRadius: 460,
    radiusStep: 24,
    gapSizeDeg: 32,
    rotationSpeedBase: 1.2,
    speedAlternation: true,
    restitution: 0.98,
    ballRadius: 14,
    gravity: 980,
  },
  presets: [
    {
      name: 'Default 16 Rings',
      settings: { ringCount: 16, gapSizeDeg: 32, rotationSpeedBase: 1.2 },
    },
    {
      name: 'Insane 30 Rings',
      settings: { ringCount: 30, gapSizeDeg: 28, rotationSpeedBase: 1.5, radiusStep: 14 },
    },
    {
      name: 'Zen Minimal 8 Rings',
      settings: { ringCount: 8, gapSizeDeg: 45, rotationSpeedBase: 0.8, radiusStep: 45 },
    },
    {
      name: 'High Speed Rapid Spin',
      settings: { ringCount: 18, gapSizeDeg: 35, rotationSpeedBase: 2.8, restitution: 1.0 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.getSafeArena(settings.platform);
    const cx = arena.centerX;
    const cy = arena.centerY;

    world.config.gravity = { x: 0, y: settings.gravity ?? 980 };
    world.config.restitution = settings.restitution ?? 0.98;

    const ringCount = settings.ringCount ?? 16;
    const initialRadius = Math.min(arena.radius, settings.initialRadius ?? arena.radius);
    const radiusStep = settings.radiusStep ?? Math.round((initialRadius * 0.9) / ringCount);
    const gapRad = ((settings.gapSizeDeg ?? 32) * Math.PI) / 180;
    const baseSpeed = settings.rotationSpeedBase ?? 1.2;

    const colors = ['#00f0ff', '#7928ca', '#ff007f', '#ffe600', '#00ff88', '#ff7a00', '#9d4edd'];

    for (let i = 0; i < ringCount; i++) {
      const radius = initialRadius - i * radiusStep;
      if (radius < 40) break;

      const dir = settings.speedAlternation ? (i % 2 === 0 ? 1 : -1) : 1;
      const speed = dir * (baseSpeed + (i * 0.08));
      const initialAngle = world.prng.next() * Math.PI * 2;

      world.addRing({
        centerX: cx,
        centerY: cy,
        radius,
        thickness: 10,
        angle: initialAngle,
        angularVelocity: speed,
        gapSize: gapRad,
        gapCount: 1,
        color: colors[i % colors.length],
        shatterOnEscape: true,
      });
    }

    // Add center ball
    world.addBall({
      x: cx,
      y: cy - 40,
      vx: world.prng.range(-150, 150),
      vy: world.prng.range(-50, 100),
      radius: settings.ballRadius ?? 14,
      restitution: settings.restitution ?? 0.98,
      color: '#00f0ff',
      glowColor: '#0284c7',
    });
  },
  step: (world: PhysicsWorld, _dt: number, settings: Record<string, any>) => {
    // Opt-in (used by reel templates): spread escapes so the last ring breaks near the end
    if (settings.paceEscapes) paceRingEscapes(world, reelLength(world, settings));
  },
  isFinished: (world: PhysicsWorld) => {
    return world.rings.every((r) => r.isShattered);
  },
};
