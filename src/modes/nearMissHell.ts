import { SimulationMode } from './types';
import { PhysicsWorld } from '../engine/world';
import { CollisionEvent } from '../engine/types';
import { paceRingEscapes, reelLength } from '../engine/pacing';

export const NearMissHellMode: SimulationMode = {
  id: 'near_miss_hell',
  name: 'near-miss hell',
  category: 'fresh_drops',
  description: 'Tuned micro-gaps tease the exit over and over. Every near-miss triggers a tension flash before the final clean escape.',
  asmrProfile: 'crystal',
  hookLines: [
    'the 4th near miss almost broke me',
    'so close it hurts',
    'how did it not get out here?!',
    'wait for the final bounce tho',
  ],
  defaultSettings: {
    duration: 60,
    ringCount: 5,
    gapSizeDeg: 30,
    restitution: 0.99,
    ballRadius: 13,
  },
  presets: [
    {
      name: 'viral (maximum tease)',
      settings: { duration: 60, ringCount: 5, gapSizeDeg: 30 },
    },
    {
      name: 'chill (wider exit)',
      settings: { duration: 30, ringCount: 3, gapSizeDeg: 46 },
    },
    {
      name: 'insane (pixel-perfect gap)',
      settings: { duration: 60, ringCount: 8, gapSizeDeg: 24 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.getSafeArena(settings.platform);
    const cx = arena.centerX;
    const cy = arena.centerY;

    world.config.gravity = { x: 0, y: 920 };
    world.config.restitution = settings.restitution ?? 0.99;

    world.customState = {
      nearMisses: 0,
      flashIntensity: 0,
      nearMissBanner: '',
    };

    const ringCount = settings.ringCount ?? 5;
    const radiusStep = Math.round((arena.radius * 0.8) / ringCount);
    const gapRad = ((settings.gapSizeDeg ?? 30) * Math.PI) / 180;
    const colors = ['#ff0055', '#ff9900', '#ffe600', '#00f0ff', '#bd00ff'];

    for (let i = 0; i < ringCount; i++) {
      const radius = arena.radius - 30 - i * radiusStep;
      if (radius < 50) break;
      const speed = (0.7 + i * 0.22) * (i % 2 === 0 ? 1 : -1);

      world.addRing({
        centerX: cx,
        centerY: cy,
        radius,
        thickness: 10,
        angle: world.prng.next() * Math.PI * 2,
        angularVelocity: speed,
        gapSize: gapRad,
        gapCount: 1,
        color: colors[i % colors.length],
        shatterOnEscape: true,
      });
    }

    world.addBall({
      x: cx,
      y: cy - 30,
      vx: world.prng.range(-180, 180),
      vy: world.prng.range(-80, 80),
      radius: settings.ballRadius ?? 13,
      restitution: settings.restitution ?? 0.99,
      color: '#00ffff',
      glowColor: '#ff0055',
    });
  },
  step: (world: PhysicsWorld, dt: number, settings: Record<string, any>) => {
    paceRingEscapes(world, reelLength(world, settings));
    // Decay flash intensity
    if (world.customState.flashIntensity > 0) {
      world.customState.flashIntensity = Math.max(0, world.customState.flashIntensity - dt * 2.5);
    }

    // Check near-misses: ball position close to gap edge of outer intact ring
    const ball = world.balls[0];
    if (!ball) return;

    for (const ring of world.rings) {
      if (ring.isShattered) continue;
      const dx = ball.x - ring.centerX;
      const dy = ball.y - ring.centerY;
      const dist = Math.hypot(dx, dy);

      // If ball is within rim proximity
      if (Math.abs(dist - ring.radius) < ball.radius * 2.2) {
        let ballAngle = Math.atan2(dy, dx);
        if (ballAngle < 0) ballAngle += Math.PI * 2;

        let ringAngle = ring.angle % (Math.PI * 2);
        if (ringAngle < 0) ringAngle += Math.PI * 2;

        const diff = Math.abs(ballAngle - ringAngle);
        const nearEdge = Math.abs(diff - ring.gapSize / 2);

        // Near edge of the gap
        if (nearEdge < 0.12 && world.time > 1.5) {
          world.customState.nearMisses++;
          world.customState.flashIntensity = 1.0;
          world.customState.nearMissBanner = 'SO CLOSE!! 🔥';
          break;
        }
      }
    }
  },
  onCollision: (world: PhysicsWorld, event: CollisionEvent) => {
    if (event.type === 'ring' && world.customState.flashIntensity > 0.5) {
      world.shockwaves.push({
        x: event.position?.x ?? 540,
        y: event.position?.y ?? 960,
        radius: 20,
        maxRadius: 180,
        speed: 400,
        color: '#ff0055',
        opacity: 0.8,
      });
    }
  },
  isFinished: (world: PhysicsWorld) => {
    return world.rings.every((r) => r.isShattered);
  },
};
