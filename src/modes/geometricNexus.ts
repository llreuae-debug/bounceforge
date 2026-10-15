import { SimulationMode } from './types';
import { getTargetDuration } from '../engine/duration';
import { PhysicsWorld } from '../engine/world';

export const GeometricNexusMode: SimulationMode = {
  id: 'geometric_nexus',
  name: 'Futuristic Geometric Nexus',
  category: 'advanced',
  description: 'Neon spheres weave through rotating polyhedral rings, hexagonal gates, and harmonic pulse portals.',
  defaultSettings: {
    ringCount: 6,
    rotationSpeed: 0.6,
    ballCount: 8,
  },
  presets: [
    {
      name: 'Hexagonal Cyber Ring',
      settings: { ringCount: 6, rotationSpeed: 0.6, ballCount: 8 },
    },
    {
      name: 'Octagonal Singularity',
      settings: { ringCount: 8, rotationSpeed: 0.8, ballCount: 12 },
    },
    {
      name: 'Triangular Trinity Matrix',
      settings: { ringCount: 5, rotationSpeed: 0.45, ballCount: 6 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.arena;
    const cx = arena.centerX;
    const cy = arena.centerY;
    const maxR = arena.radius * 0.95;

    const ringCount = settings.ringCount || 6;
    const ballCount = settings.ballCount || 8;
    const speed = settings.rotationSpeed || 0.6;
    const colors = ['#00f0ff', '#ff007f', '#a855f7', '#ffe600', '#00ff88', '#38bdf8'];

    // Nested Polyhedral Gates constructed as segmented rings
    for (let i = 0; i < ringCount; i++) {
      const radius = maxR * ((i + 1) / ringCount);
      const isOdd = i % 2 !== 0;
      const rotSpd = (isOdd ? -1 : 1) * speed * (0.8 + (ringCount - i) * 0.15);

      world.addRing({
        centerX: cx,
        centerY: cy,
        radius,
        thickness: 9,
        angle: (i * Math.PI) / 3,
        angularVelocity: rotSpd,
        gapSize: 0.22,
        gapCount: 1,
        color: colors[i % colors.length],
      });
    }

    // Central geometric portal pegs
    const centerPegs = 6;
    for (let p = 0; p < centerPegs; p++) {
      const ang = (p / centerPegs) * Math.PI * 2;
      world.pegs.push({
        id: 400 + p,
        x: cx + Math.cos(ang) * 45,
        y: cy + Math.sin(ang) * 45,
        radius: 8,
        color: '#ffffff',
        score: 100,
      });
    }

    // Spawn Neon spheres with harmonic scales
    for (let b = 0; b < ballCount; b++) {
      const angle = (b / ballCount) * Math.PI * 2;
      const dist = maxR * 0.25;
      const col = colors[b % colors.length];

      world.addBall({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: (world.prng.next() - 0.5) * 350,
        vy: (world.prng.next() - 0.5) * 350,
        radius: 12,
        mass: 1.0,
        color: col,
        glowColor: col,
      });
    }

    world.config.gravity = { x: 0, y: 450 };
  },

  step: (world: PhysicsWorld, dt: number, settings: Record<string, any>) => {
    const arena = world.arena;
    for (const ball of world.balls) {
      const distToCenter = Math.hypot(ball.x - arena.centerX, ball.y - arena.centerY);
      if (distToCenter < 60) {
        const ang = Math.atan2(ball.y - arena.centerY, ball.x - arena.centerX);
        ball.vx += Math.cos(ang) * 180 * dt;
        ball.vy += Math.sin(ang) * 180 * dt;
      }
    }
  },

  isFinished: (world: PhysicsWorld, settings: Record<string, any>) => {
    return world.time >= getTargetDuration(settings);
  },
};
