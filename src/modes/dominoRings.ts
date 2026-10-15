import { SimulationMode } from './types';
import { PhysicsWorld } from '../engine/world';
import { CollisionEvent } from '../engine/types';

export const DominoRingsMode: SimulationMode = {
  id: 'domino_rings',
  name: 'Domino Ring Cascade',
  category: 'advanced',
  description: 'Escaping a ring destabilizes it, causing it to collapse inward and knock neighboring rings in a mesmerizing domino cascade.',
  defaultSettings: {
    ringCount: 14,
    radius: 460,
    radiusStep: 28,
    gapSizeDeg: 35,
    cascadeSpeed: 0.18, // delay between ring collapses
  },
  presets: [
    {
      name: 'Domino Chain 14 (Standard)',
      settings: { ringCount: 14, radius: 460 },
    },
    {
      name: 'Rapid Collapse 20 Rings',
      settings: { ringCount: 20, radius: 480, radiusStep: 20, cascadeSpeed: 0.1 },
    },
    {
      name: 'Heavy Rings (Slow Dominoes)',
      settings: { ringCount: 10, radius: 420, radiusStep: 35, cascadeSpeed: 0.35 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.getSafeArena(settings.platform);
    const cx = arena.centerX;
    const cy = arena.centerY;

    const ringCount = settings.ringCount ?? 14;
    const maxR = Math.min(arena.radius, settings.radius ?? arena.radius);
    const step = settings.radiusStep ?? 28;
    const gapRad = ((settings.gapSizeDeg ?? 35) * Math.PI) / 180;

    const colors = ['#00f0ff', '#7928ca', '#ff007f', '#ffe600', '#00ff88'];

    for (let i = 0; i < ringCount; i++) {
      const radius = maxR - i * step;
      world.addRing({
        centerX: cx,
        centerY: cy,
        radius,
        thickness: 12,
        angle: world.prng.next() * Math.PI * 2,
        angularVelocity: (i % 2 === 0 ? 1 : -1) * (0.8 + i * 0.05),
        gapSize: gapRad,
        gapCount: 1,
        color: colors[i % colors.length],
        shatterOnEscape: false,
      });
    }

    world.customState.cascading = false;
    world.customState.cascadeIndex = 0;
    world.customState.lastCascadeTime = 0;
    world.customState.cascadeDelay = settings.cascadeSpeed ?? 0.18;

    world.addBall({
      x: cx,
      y: cy,
      vx: world.prng.range(-150, 150),
      vy: world.prng.range(-100, 150),
      radius: 14,
      color: '#ffd600',
      glowColor: '#ffaa00',
      restitution: 0.99,
    });
  },
  onCollision: (world: PhysicsWorld, event: CollisionEvent) => {
    // Escape starts domino cascade!
    if (event.type === 'escape' && !world.customState.cascading) {
      world.customState.cascading = true;
      world.customState.cascadeIndex = world.rings.length - 1;
      world.customState.lastCascadeTime = world.time;
    }
  },
  step: (world: PhysicsWorld) => {
    if (!world.customState.cascading) return;

    const delay = world.customState.cascadeDelay;
    if (world.time - world.customState.lastCascadeTime >= delay) {
      world.customState.lastCascadeTime = world.time;
      const idx = world.customState.cascadeIndex;

      if (idx >= 0 && idx < world.rings.length) {
        const ring = world.rings[idx];
        if (!ring.isShattered) {
          ring.isShattered = true;
          world.spawnRingShatter(ring);
          world.eventBus.emit({
            id: Math.floor(Math.random() * 1000000),
            time: world.time,
            type: 'ring',
            position: { x: ring.centerX, y: ring.centerY },
            velocity: { x: 0, y: 0 },
            impulse: 400,
            ringId: ring.id,
            ballId: 0,
            noteIndex: idx,
          });
        }
        world.customState.cascadeIndex--;
      }
    }
  },
  isFinished: (world: PhysicsWorld) => {
    return world.rings.every((r) => r.isShattered);
  },
};
