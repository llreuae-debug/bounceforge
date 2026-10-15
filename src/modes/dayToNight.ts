import { SimulationMode } from './types';
import { PhysicsWorld } from '../engine/world';

export const DayToNightMode: SimulationMode = {
  id: 'day_to_night',
  name: 'day to night',
  category: 'fresh_drops',
  description: 'Atmospheric light cycles smoothly from vibrant sunrise into twilight and starry cosmic midnight. A crescent moon rises as the ball escapes.',
  asmrProfile: 'ambient',
  hookLines: [
    'the lighting shift from 0:10 to 0:50',
    'watch the sunrise turn to midnight',
    'the moon rising at the end is art',
    'most aesthetic physics simulation',
  ],
  defaultSettings: {
    duration: 60,
    ringCount: 5,
    restitution: 0.98,
    ballRadius: 15,
  },
  presets: [
    {
      name: 'viral (60s sunrise to midnight)',
      settings: { duration: 60, ringCount: 5 },
    },
    {
      name: 'chill (30s twilight dusk)',
      settings: { duration: 30, ringCount: 4 },
    },
    {
      name: 'insane (eclipse blood moon)',
      settings: { duration: 60, ringCount: 7 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.getSafeArena(settings.platform);
    const cx = arena.centerX;
    const cy = arena.centerY;

    world.config.gravity = { x: 0, y: 840 };
    world.config.restitution = settings.restitution ?? 0.98;

    const ringCount = settings.ringCount ?? 5;
    const radiusStep = Math.round((arena.radius * 0.78) / ringCount);

    world.customState = {
      dayNightPhase: 0, // 0 = dawn, 0.5 = sunset, 1.0 = deep night
      moonRadius: 0,
    };

    // Concentric sky rings
    for (let i = 0; i < ringCount; i++) {
      const radius = arena.radius - 20 - i * radiusStep;
      world.addRing({
        centerX: cx,
        centerY: cy,
        radius,
        thickness: 9,
        angle: world.prng.next() * Math.PI * 2,
        angularVelocity: (0.9 + i * 0.18) * (i % 2 === 0 ? 1 : -1),
        gapSize: 0.48,
        gapCount: 1,
        color: '#ff7700',
        shatterOnEscape: true,
      });
    }

    // Solar ball that transforms into lunar orb
    world.addBall({
      x: cx,
      y: cy - 30,
      vx: world.prng.range(-150, 150),
      vy: world.prng.range(-50, 60),
      radius: settings.ballRadius ?? 15,
      restitution: 0.98,
      color: '#ffea00',
      glowColor: '#ff7700',
    });
  },
  step: (world: PhysicsWorld, dt: number, settings: Record<string, any>) => {
    const duration = settings.duration ?? 60;
    const phase = Math.min(1, world.time / duration);
    world.customState.dayNightPhase = phase;

    // Shift ball and rings from solar amber to lunar silver-cyan
    const ball = world.balls[0];
    if (ball) {
      if (phase < 0.5) {
        ball.color = '#ffea00';
        ball.glowColor = '#ff7700';
      } else {
        ball.color = '#e2e8f0';
        ball.glowColor = '#00f0ff';
      }
    }

    for (const ring of world.rings) {
      if (phase > 0.6) {
        ring.color = '#38bdf8';
      }
    }

    if (world.rings.every((r) => r.isShattered)) {
      world.customState.moonRadius = Math.min(60, (world.customState.moonRadius || 0) + dt * 40);
    }
  },
  isFinished: (world: PhysicsWorld) => {
    return world.rings.every((r) => r.isShattered);
  },
};
