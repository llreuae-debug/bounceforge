import { SimulationMode } from './types';
import { getTargetDuration } from '../engine/duration';
import { PhysicsWorld } from '../engine/world';

const SORT_COLORS = [
  { id: 0, name: 'Cyan', color: '#00f0ff', glow: '#00b4d8' },
  { id: 1, name: 'Magenta', color: '#ff007f', glow: '#e0006f' },
  { id: 2, name: 'Yellow', color: '#ffe600', glow: '#cca700' },
  { id: 3, name: 'Lime', color: '#00ff88', glow: '#00cc6a' },
];

export const BallSorterMode: SimulationMode = {
  id: 'ball_sorter',
  name: 'Chromatic Ball Sorter',
  category: 'advanced',
  description: 'Multi-colored balls filter through angled sorting chutes and color gates into matching collection bins.',
  defaultSettings: {
    dropRate: 0.5,
    maxBalls: 160,
    chuteAngleDeg: 18,
    hopperCapacity: 100,
  },
  presets: [
    {
      name: 'Quad-Spectrum Cascade',
      settings: { dropRate: 0.5, maxBalls: 160, chuteAngleDeg: 18 },
    },
    {
      name: 'High-Speed Sorter (Fast Stream)',
      settings: { dropRate: 0.25, maxBalls: 240, chuteAngleDeg: 22 },
    },
    {
      name: 'Zen Slow Sorter',
      settings: { dropRate: 0.8, maxBalls: 80, chuteAngleDeg: 15 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.arena;
    const cx = arena.centerX;
    const cy = arena.centerY;
    const r = arena.radius;

    // Top funnel guide walls
    world.lines.push({
      id: 1,
      x1: cx - r * 0.75,
      y1: cy - r * 0.85,
      x2: cx - 40,
      y2: cy - r * 0.45,
      color: 'rgba(255, 255, 255, 0.4)',
      restitution: 0.7,
    });
    world.lines.push({
      id: 2,
      x1: cx + r * 0.75,
      y1: cy - r * 0.85,
      x2: cx + 40,
      y2: cy - r * 0.45,
      color: 'rgba(255, 255, 255, 0.4)',
      restitution: 0.7,
    });

    // Tier 1 Sorting Divider (splits into Left and Right streams)
    world.lines.push({
      id: 3,
      x1: cx,
      y1: cy - r * 0.35,
      x2: cx - r * 0.4,
      y2: cy - r * 0.1,
      color: '#00f0ff',
      restitution: 0.85,
    });
    world.lines.push({
      id: 4,
      x1: cx,
      y1: cy - r * 0.35,
      x2: cx + r * 0.4,
      y2: cy - r * 0.1,
      color: '#ff007f',
      restitution: 0.85,
    });

    // Tier 2 Sorting Dividers (splits into 4 target bins)
    const tier2Y = cy + r * 0.15;
    world.lines.push({
      id: 5,
      x1: cx - r * 0.5,
      y1: tier2Y,
      x2: cx - r * 0.75,
      y2: tier2Y + 120,
      color: '#00f0ff',
      restitution: 0.85,
    });
    world.lines.push({
      id: 6,
      x1: cx - r * 0.25,
      y1: tier2Y,
      x2: cx - r * 0.25,
      y2: tier2Y + 120,
      color: '#ff007f',
      restitution: 0.85,
    });
    world.lines.push({
      id: 7,
      x1: cx + r * 0.25,
      y1: tier2Y,
      x2: cx + r * 0.25,
      y2: tier2Y + 120,
      color: '#ffe600',
      restitution: 0.85,
    });
    world.lines.push({
      id: 8,
      x1: cx + r * 0.5,
      y1: tier2Y,
      x2: cx + r * 0.75,
      y2: tier2Y + 120,
      color: '#00ff88',
      restitution: 0.85,
    });

    // 4 Bottom Collection Bins
    const binCount = 4;
    const binWidth = (r * 1.6) / binCount;
    const binBottomY = cy + r * 0.85;
    const binTopY = cy + r * 0.4;
    const binStartX = cx - r * 0.8;

    for (let i = 0; i <= binCount; i++) {
      world.lines.push({
        id: 10 + i,
        x1: binStartX + i * binWidth,
        y1: binTopY,
        x2: binStartX + i * binWidth,
        y2: binBottomY,
        color: 'rgba(255, 255, 255, 0.3)',
        restitution: 0.4,
      });
    }

    // Bin Bottom Floors
    world.lines.push({
      id: 20,
      x1: binStartX,
      y1: binBottomY,
      x2: binStartX + binCount * binWidth,
      y2: binBottomY,
      color: 'rgba(255, 255, 255, 0.6)',
      restitution: 0.2,
    });

    // Scoring pegs inside sorting pathways
    for (let i = 0; i < 4; i++) {
      const pegX = binStartX + (i + 0.5) * binWidth;
      world.pegs.push({
        id: 100 + i,
        x: pegX,
        y: binTopY + 30,
        radius: 10,
        color: SORT_COLORS[i].color,
        score: (i + 1) * 25,
      });
    }

    world.customState.lastDropTime = 0;
    world.customState.sortedCounts = [0, 0, 0, 0];
    world.customState.totalSorted = 0;
  },

  step: (world: PhysicsWorld, dt: number, settings: Record<string, any>) => {
    world.customState.lastDropTime = (world.customState.lastDropTime || 0) + dt;
    const dropRate = settings.dropRate || 0.5;
    const maxBalls = settings.maxBalls || 160;

    // Spawn new colored balls from top hopper
    if (world.customState.lastDropTime >= dropRate && world.balls.length < maxBalls) {
      world.customState.lastDropTime = 0;
      const arena = world.arena;
      const colorIndex = Math.floor(world.prng.next() * SORT_COLORS.length);
      const conf = SORT_COLORS[colorIndex];

      // Slight horizontal variation in top hopper
      const spawnX = arena.centerX + (world.prng.next() - 0.5) * 40;
      const spawnY = arena.centerY - arena.radius * 0.9;

      // Color guide force bias toward appropriate channel
      const targetChannelX = arena.centerX + (colorIndex - 1.5) * (arena.radius * 0.4);
      const vx = (targetChannelX - spawnX) * 0.4 + (world.prng.next() - 0.5) * 20;

      world.addBall({
        x: spawnX,
        y: spawnY,
        vx: vx,
        vy: 40 + world.prng.next() * 40,
        radius: 12,
        mass: 1.0,
        color: conf.color,
        glowColor: conf.glow,
        tag: `color_${colorIndex}`,
      });
    }

    // Color Sorting Guidance & Chute Steering
    const arena = world.arena;
    for (const ball of world.balls) {
      const match = ball.tag?.match(/color_(\d+)/);
      const targetId = match ? parseInt(match[1], 10) : 0;
      const binWidth = (arena.radius * 1.6) / 4;
      const binStartX = arena.centerX - arena.radius * 0.8;
      const targetBinCenterX = binStartX + (targetId + 0.5) * binWidth;

      // When ball is in mid-section, gently steer towards its matching bin
      if (ball.y > arena.centerY - arena.radius * 0.3 && ball.y < arena.centerY + arena.radius * 0.35) {
        const diffX = targetBinCenterX - ball.x;
        ball.vx += diffX * 0.9 * dt;
      }
    }
  },

  isFinished: (world: PhysicsWorld, settings: Record<string, any>) => {
    return world.time >= getTargetDuration(settings);
  },
};
