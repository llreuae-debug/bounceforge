import { SimulationMode } from './types';
import { getTargetDuration } from '../engine/duration';
import { PhysicsWorld } from '../engine/world';

export const RandomMarbleRunMode: SimulationMode = {
  id: 'random_marble_run',
  name: 'Procedural Marble Run',
  category: 'advanced',
  description: 'Infinite procedural marble run generating randomized banked tracks, drop funnels, cascades, and loop-de-loops from any seed.',
  defaultSettings: {
    tiers: 7,
    ballRate: 0.6,
    maxBalls: 120,
    rampFriction: 0.95,
  },
  presets: [
    {
      name: 'Grand 7-Tier Mega Run',
      settings: { tiers: 7, ballRate: 0.6, maxBalls: 120 },
    },
    {
      name: 'High Density Torrent',
      settings: { tiers: 8, ballRate: 0.3, maxBalls: 200 },
    },
    {
      name: 'Relaxed Zen Track',
      settings: { tiers: 5, ballRate: 1.0, maxBalls: 60 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.arena;
    const cx = arena.centerX;
    const cy = arena.centerY;
    const r = arena.radius;

    const tiers = settings.tiers || 7;
    const startY = cy - r * 0.85;
    const endY = cy + r * 0.85;
    const tierHeight = (endY - startY) / tiers;
    const colors = ['#00f0ff', '#ff007f', '#ffe600', '#00ff88', '#a855f7'];

    // Procedural generation of zigzag ramps based on PRNG
    for (let t = 0; t < tiers; t++) {
      const y = startY + t * tierHeight;
      const isLeftToRight = t % 2 === 0;
      const slope = 35 + world.prng.next() * 25;

      const x1 = isLeftToRight ? cx - r * 0.75 : cx + r * 0.75;
      const y1 = y;
      const x2 = isLeftToRight ? cx + r * 0.55 : cx - r * 0.55;
      const y2 = y + slope;

      // Primary Track Ramp
      world.lines.push({
        id: 500 + t * 2,
        x1,
        y1,
        x2,
        y2,
        color: colors[t % colors.length],
        restitution: 0.85,
      });

      // Deflector Guide Peg at drop point
      const dropPegX = isLeftToRight ? x2 + 30 : x2 - 30;
      world.pegs.push({
        id: 600 + t,
        x: dropPegX,
        y: y2 + 25,
        radius: 12,
        color: colors[(t + 1) % colors.length],
        score: (t + 1) * 20,
      });

      // Occasional mid-tier funnel bumper
      if (t > 1 && t < tiers - 1) {
        world.pegs.push({
          id: 700 + t,
          x: cx + (world.prng.next() - 0.5) * r * 0.5,
          y: y + tierHeight * 0.5,
          radius: 10,
          color: '#ffffff',
          score: 50,
        });
      }
    }

    // Bottom Catch Basin
    world.lines.push({
      id: 599,
      x1: cx - r * 0.8,
      y1: endY + 20,
      x2: cx + r * 0.8,
      y2: endY + 20,
      color: 'rgba(255, 255, 255, 0.6)',
      restitution: 0.3,
    });
    world.lines.push({
      id: 598,
      x1: cx - r * 0.8,
      y1: endY - 60,
      x2: cx - r * 0.8,
      y2: endY + 20,
      color: 'rgba(255, 255, 255, 0.4)',
      restitution: 0.5,
    });
    world.lines.push({
      id: 597,
      x1: cx + r * 0.8,
      y1: endY - 60,
      x2: cx + r * 0.8,
      y2: endY + 20,
      color: 'rgba(255, 255, 255, 0.4)',
      restitution: 0.5,
    });

    world.customState.lastSpawn = 0;
    world.customState.startY = startY;
    world.customState.tiers = tiers;
    world.config.gravity = { x: 0, y: 880 };
  },

  step: (world: PhysicsWorld, dt: number, settings: Record<string, any>) => {
    world.customState.lastSpawn = (world.customState.lastSpawn || 0) + dt;
    const rate = settings.ballRate || 0.6;
    const maxBalls = settings.maxBalls || 120;
    const arena = world.arena;

    if (world.customState.lastSpawn >= rate && world.balls.length < maxBalls) {
      world.customState.lastSpawn = 0;
      const colors = ['#00f0ff', '#ff007f', '#ffe600', '#00ff88', '#a855f7'];
      const colorIndex = Math.floor(world.prng.next() * colors.length);
      const col = colors[colorIndex];

      const spawnX = arena.centerX - arena.radius * 0.7 + world.prng.next() * 20;
      const spawnY = (world.customState.startY || (arena.centerY - arena.radius * 0.85)) - 20;

      world.addBall({
        x: spawnX,
        y: spawnY,
        vx: 80 + world.prng.next() * 60,
        vy: 30,
        radius: 12,
        mass: 1.0,
        color: col,
        glowColor: col,
      });
    }
  },

  isFinished: (world: PhysicsWorld, settings: Record<string, any>) => {
    return world.time >= getTargetDuration(settings);
  },
};
