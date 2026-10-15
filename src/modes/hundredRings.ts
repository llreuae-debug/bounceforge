import { SimulationMode } from './types';
import { PhysicsWorld } from '../engine/world';
import { CollisionEvent } from '../engine/types';

export const HundredRingsMode: SimulationMode = {
  id: 'hundred_rings',
  name: 'hundred rings',
  category: 'fresh_drops',
  description: '100 paper-thin neon rings stacked tightly. With each escape, ball velocity and rotation ramp into an electric frenzy.',
  asmrProfile: 'crystal',
  hookLines: [
    'can it clear 100 rings??',
    'speed doubles after ring 50',
    'wait for ring 99 to shatter',
    'satisfying 100 ring speedrun',
  ],
  defaultSettings: {
    duration: 60,
    ringCount: 100,
    initialRadius: 460,
    gapSizeDeg: 36,
    speedRamp: true,
  },
  presets: [
    {
      name: 'viral (full 100 rings ramp)',
      settings: { duration: 60, ringCount: 100, gapSizeDeg: 36 },
    },
    {
      name: 'chill (50 rings)',
      settings: { duration: 40, ringCount: 50, gapSizeDeg: 45 },
    },
    {
      name: 'insane (100 rings micro gaps)',
      settings: { duration: 60, ringCount: 100, gapSizeDeg: 26 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.getSafeArena(settings.platform);
    const cx = arena.centerX;
    const cy = arena.centerY;

    world.config.gravity = { x: 0, y: 880 };
    world.config.restitution = 0.99;

    const ringCount = Math.min(100, settings.ringCount ?? 100);
    const gapRad = ((settings.gapSizeDeg ?? 36) * Math.PI) / 180;
    const maxR = arena.radius - 15;
    const minR = 40;
    const step = (maxR - minR) / ringCount;

    world.customState = {
      ringsCleared: 0,
      totalRings: ringCount,
      speedMultiplier: 1.0,
    };

    const colors = ['#00f0ff', '#39ff14', '#ffe600', '#ff007f', '#bf55ec', '#ff7a00'];

    for (let i = 0; i < ringCount; i++) {
      const radius = maxR - i * step;
      const dir = i % 2 === 0 ? 1 : -1;
      const speed = dir * (1.2 + (i / ringCount) * 2.2);

      world.addRing({
        centerX: cx,
        centerY: cy,
        radius,
        thickness: 3.5,
        angle: (i * 0.35 + world.prng.next() * Math.PI) % (Math.PI * 2),
        angularVelocity: speed,
        gapSize: gapRad,
        gapCount: 1,
        color: colors[i % colors.length],
        shatterOnEscape: true,
      });
    }

    world.addBall({
      x: cx,
      y: cy - 20,
      vx: world.prng.range(-150, 150),
      vy: world.prng.range(-60, 60),
      radius: 9,
      restitution: 0.99,
      color: '#ffffff',
      glowColor: '#00f0ff',
    });
  },
  onCollision: (world: PhysicsWorld, event: CollisionEvent) => {
    if (event.type === 'ring' && event.ringId !== undefined) {
      const ring = world.rings.find((r) => r.id === event.ringId);
      if (ring && !ring.isShattered) {
        ring.isShattered = true;
        world.spawnRingShatter(ring);
        world.customState.ringsCleared = (world.customState.ringsCleared || 0) + 1;
        world.customState.speedMultiplier = 1.0 + (world.customState.ringsCleared / world.customState.totalRings) * 1.5;
      }
    } else if (event.type === 'escape') {
      world.customState.ringsCleared = (world.customState.ringsCleared || 0) + 1;
      world.customState.speedMultiplier = 1.0 + (world.customState.ringsCleared / world.customState.totalRings) * 1.5;
    }
  },
  step: (world: PhysicsWorld, dt: number) => {
    const ball = world.balls[0];
    const mult = world.customState.speedMultiplier || 1.0;
    if (ball && mult > 1.0) {
      ball.vx *= Math.pow(1.0008, dt * 60);
      ball.vy *= Math.pow(1.0008, dt * 60);
    }

    // Retention Pacing: steadily break rings outwards towards payoff at 56s
    const targetCleared = Math.min(world.rings.length, Math.floor((world.time / 56) * world.rings.length));
    while ((world.customState.ringsCleared || 0) < targetCleared) {
      for (let i = world.rings.length - 1; i >= 0; i--) {
        const r = world.rings[i];
        if (!r.isShattered) {
          r.isShattered = true;
          world.spawnRingShatter(r);
          world.customState.ringsCleared = (world.customState.ringsCleared || 0) + 1;
          break;
        }
      }
    }
  },
  isFinished: (world: PhysicsWorld) => {
    return world.rings.every((r) => r.isShattered);
  },
};
