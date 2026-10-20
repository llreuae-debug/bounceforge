import { SimulationMode } from './types';
import { PhysicsWorld } from '../engine/world';

export const EndlessFallMode: SimulationMode = {
  id: 'endless_fall',
  name: 'endless fall',
  category: 'fresh_drops',
  description: 'A continuous downward plunge through revolving trapdoor discs. Live depth counter meters descent into a pulsating neon subterranean core.',
  asmrProfile: 'droplet',
  hookLines: [
    'falling 10,000 meters into the void',
    'depth counter took it to floor 50',
    'the parallax speed in the last 15s',
    'how deep can the sphere plunge?',
  ],
  defaultSettings: {
    duration: 60,
    floorCount: 12,
    targetDepth: 5000,
    restitution: 0.94,
    ballRadius: 14,
  },
  presets: [
    {
      name: 'viral (5,000m deep core plunge)',
      settings: { duration: 60, floorCount: 12, targetDepth: 5000 },
    },
    {
      name: 'chill (2,000m zen drop)',
      settings: { duration: 30, floorCount: 8, targetDepth: 2000 },
    },
    {
      name: 'insane (10,000m terminal velocity)',
      settings: { duration: 60, floorCount: 18, targetDepth: 10000 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.getSafeArena(settings.platform);
    const cx = arena.centerX;
    const cy = arena.centerY;

    world.config.gravity = { x: 0, y: 920 };
    world.config.restitution = settings.restitution ?? 0.94;

    const floorCount = settings.floorCount ?? 12;
    const targetDepth = settings.targetDepth ?? 5000;
    const arenaH = arena.radius * 1.8;
    const startY = cy - arenaH / 2;
    const stepY = arenaH / floorCount;

    world.customState = {
      currentDepth: 0,
      targetDepth,
      floorsPassed: 0,
      reachedCore: false,
    };

    // Shaft Walls
    world.lines.push({
      p1: { x: cx - arena.radius * 0.7, y: startY - 100 },
      p2: { x: cx - arena.radius * 0.7, y: startY + arenaH + 100 },
      thickness: 10,
      color: '#00f0ff',
      restitution: 0.95,
    });
    world.lines.push({
      p1: { x: cx + arena.radius * 0.7, y: startY - 100 },
      p2: { x: cx + arena.radius * 0.7, y: startY + arenaH + 100 },
      thickness: 10,
      color: '#00f0ff',
      restitution: 0.95,
    });

    // Horizontal floors with shifting gaps
    for (let i = 0; i < floorCount; i++) {
      const y = startY + i * stepY;
      const gapX = cx + world.prng.range(-arena.radius * 0.4, arena.radius * 0.4);
      const gapW = 85;

      // Left segment
      world.lines.push({
        p1: { x: cx - arena.radius * 0.7, y },
        p2: { x: gapX - gapW / 2, y },
        thickness: 5,
        color: '#ff007f',
        restitution: 0.92,
      });

      // Right segment
      world.lines.push({
        p1: { x: gapX + gapW / 2, y },
        p2: { x: cx + arena.radius * 0.7, y },
        thickness: 5,
        color: '#ff007f',
        restitution: 0.92,
      });
    }

    world.addBall({
      x: cx,
      y: startY - 40,
      vx: world.prng.range(-60, 60),
      vy: 80,
      radius: settings.ballRadius ?? 14,
      restitution: 0.94,
      color: '#ffffff',
      glowColor: '#00f0ff',
    });
  },
  step: (world: PhysicsWorld, dt: number, settings: Record<string, any>) => {
    const duration = settings.duration ?? 60;
    const progress = Math.min(1, world.time / duration);
    const target = settings.targetDepth ?? 5000;
    world.customState.currentDepth = Math.round(progress * target);

    if (world.time >= duration - 2 && !world.customState.reachedCore) {
      world.customState.reachedCore = true;
      world.winner = 'NEON CORE REACHED';
    }
  },
  isFinished: (world: PhysicsWorld, settings: Record<string, any>) => {
    const duration = settings.duration ?? 60;
    return world.time >= duration - 0.5;
  },
};
