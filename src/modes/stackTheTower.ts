import { SimulationMode } from './types';
import { PhysicsWorld } from '../engine/world';
import { CollisionEvent } from '../engine/types';

export const StackTheTowerMode: SimulationMode = {
  id: 'stack_the_tower',
  name: 'stack the tower',
  category: 'fresh_drops',
  description: 'Balls drop sequentially and magnetically balance atop one another into a precarious wobbling vertical tower. Live height meter measures each new record before the climactic topple.',
  asmrProfile: 'sand',
  hookLines: [
    'stacked 18 balls without falling',
    'the wobble at ball 12 gave me anxiety',
    'watch the height record meter climb',
    'wait for the final collapse at 0:56',
  ],
  defaultSettings: {
    duration: 60,
    ballCount: 18,
    targetHeight: 18,
    restitution: 0.72,
    ballRadius: 18,
  },
  presets: [
    {
      name: 'viral (18-ball sky tower)',
      settings: { duration: 60, ballCount: 18 },
    },
    {
      name: 'chill (10-ball stable stack)',
      settings: { duration: 30, ballCount: 10 },
    },
    {
      name: 'insane (25-ball mega wobble)',
      settings: { duration: 60, ballCount: 25 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.getSafeArena(settings.platform);
    const cx = arena.centerX;
    const cy = arena.centerY;

    world.config.gravity = { x: 0, y: 780 };
    world.config.airDrag = 0.04;
    world.config.restitution = settings.restitution ?? 0.72;

    const count = settings.ballCount ?? 18;
    const floorY = cy + arena.radius * 0.75;

    world.customState = {
      totalToDrop: count,
      droppedSoFar: 1,
      currentHeight: 1,
      maxHeightRecord: 1,
      toppled: false,
      nextDropTime: 2.0,
      dropInterval: 2.8,
    };

    // Stable pedestal base line
    world.lines.push({
      p1: { x: cx - 120, y: floorY },
      p2: { x: cx + 120, y: floorY },
      thickness: 14,
      color: '#ffffff',
      restitution: 0.6,
    });

    // Outer guide arena
    world.addRing({
      centerX: cx,
      centerY: cy,
      radius: arena.radius - 20,
      thickness: 8,
      angle: 0,
      angularVelocity: 0.1,
      gapSize: 0,
      gapCount: 0,
      color: 'rgba(255, 255, 255, 0.25)',
      shatterOnEscape: false,
    });

    // Base seed ball
    world.addBall({
      x: cx,
      y: floorY - 22,
      vx: 0,
      vy: 0,
      radius: settings.ballRadius ?? 18,
      restitution: 0.6,
      color: '#00f0ff',
      glowColor: '#00f0ff',
    });
  },
  step: (world: PhysicsWorld, dt: number) => {
    const arena = world.getSafeArena();
    const cx = arena.centerX;
    const { nextDropTime, dropInterval, droppedSoFar, totalToDrop } = world.customState;

    // Drop next ball on schedule
    if (world.time >= nextDropTime && droppedSoFar < totalToDrop) {
      world.customState.nextDropTime = world.time + dropInterval;
      world.customState.droppedSoFar++;

      const palette = ['#00f0ff', '#39ff14', '#ffe600', '#ff007f', '#bf55ec', '#ff7a00'];
      const col = palette[droppedSoFar % palette.length];

      // Drop from top with slight micro-wobble
      const wobble = world.prng.range(-4, 4);
      world.addBall({
        x: cx + wobble,
        y: arena.centerY - arena.radius * 0.7,
        vx: world.prng.range(-5, 5),
        vy: 200,
        radius: 18,
        restitution: 0.65,
        color: col,
        glowColor: col,
      });

      world.customState.currentHeight = world.balls.length;
      world.customState.maxHeightRecord = Math.max(world.customState.maxHeightRecord, world.balls.length);
    }

    // At 55s, trigger intentional topple burst for the payoff
    if (world.time >= 55 && !world.customState.toppled) {
      world.customState.toppled = true;
      for (const b of world.balls) {
        b.vx += world.prng.range(-280, 280);
        b.vy -= world.prng.range(80, 220);
      }
      world.winner = `RECORD: ${world.customState.maxHeightRecord} BALLS`;
    }
  },
  isFinished: (world: PhysicsWorld, settings: Record<string, any>) => {
    const duration = settings.duration ?? 60;
    return world.time >= duration - 1;
  },
};
