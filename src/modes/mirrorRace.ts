import { SimulationMode } from './types';
import { PhysicsWorld } from '../engine/world';

export const MirrorRaceMode: SimulationMode = {
  id: 'mirror_race',
  name: 'mirror race',
  category: 'fresh_drops',
  description: 'Two mirrored arenas with opposing gravitational poles (top vs bottom). Neon Cyan battles Hot Pink to see which sphere escapes its orbital cage first.',
  asmrProfile: 'battle',
  hookLines: [
    'top arena vs bottom arena',
    'inverted gravity mirror race',
    'cyan or pink escaping first?',
    'the lead changed 5 times here',
  ],
  defaultSettings: {
    duration: 60,
    ringCount: 4,
    restitution: 0.98,
    ballRadius: 14,
  },
  presets: [
    {
      name: 'viral (top vs bottom mirror duel)',
      settings: { duration: 60, ringCount: 4 },
    },
    {
      name: 'chill (extended rally)',
      settings: { duration: 40, ringCount: 3 },
    },
    {
      name: 'insane (6 ring mirror storm)',
      settings: { duration: 60, ringCount: 6 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.getSafeArena(settings.platform);
    const cx = arena.centerX;
    const cy = arena.centerY;

    world.config.gravity = { x: 0, y: 0 }; // custom dual gravity per half
    world.config.restitution = settings.restitution ?? 0.98;

    const ringCount = settings.ringCount ?? 4;
    const subRadius = arena.radius * 0.44;
    const topCy = cy - subRadius * 0.98;
    const bottomCy = cy + subRadius * 0.98;
    const step = subRadius / (ringCount + 1);

    world.customState = {
      topCy,
      bottomCy,
      subRadius,
      winner: null,
    };

    // Separator line
    world.lines.push({
      p1: { x: cx - arena.radius * 0.9, y: cy },
      p2: { x: cx + arena.radius * 0.9, y: cy },
      thickness: 4,
      color: 'rgba(255, 255, 255, 0.4)',
      restitution: 0.98,
    });

    // Top Arena Rings (Cyan)
    for (let i = 0; i < ringCount; i++) {
      const r = subRadius - i * step;
      world.addRing({
        centerX: cx,
        centerY: topCy,
        radius: r,
        thickness: 7,
        angle: world.prng.next() * Math.PI * 2,
        angularVelocity: (1.1 + i * 0.2) * (i % 2 === 0 ? 1 : -1),
        gapSize: 0.5,
        gapCount: 1,
        color: '#00f0ff',
        shatterOnEscape: true,
      });
    }

    // Bottom Arena Rings (Pink)
    for (let i = 0; i < ringCount; i++) {
      const r = subRadius - i * step;
      world.addRing({
        centerX: cx,
        centerY: bottomCy,
        radius: r,
        thickness: 7,
        angle: world.prng.next() * Math.PI * 2,
        angularVelocity: (1.1 + i * 0.2) * (i % 2 === 0 ? -1 : 1),
        gapSize: 0.5,
        gapCount: 1,
        color: '#ff007f',
        shatterOnEscape: true,
      });
    }

    // Top Ball (Negative gravity pulled upward)
    world.addBall({
      x: cx,
      y: topCy + 20,
      vx: world.prng.range(-120, 120),
      vy: world.prng.range(-60, 60),
      radius: settings.ballRadius ?? 14,
      restitution: 0.98,
      color: '#00f0ff',
      glowColor: '#00f0ff',
      label: 'CYAN',
    });

    // Bottom Ball (Positive gravity pulled downward)
    world.addBall({
      x: cx,
      y: bottomCy - 20,
      vx: world.prng.range(-120, 120),
      vy: world.prng.range(-60, 60),
      radius: settings.ballRadius ?? 14,
      restitution: 0.98,
      color: '#ff007f',
      glowColor: '#ff007f',
      label: 'PINK',
    });
  },
  step: (world: PhysicsWorld, dt: number) => {
    const { topCy, bottomCy, subRadius } = world.customState;
    const topBall = world.balls[0];
    const bottomBall = world.balls[1];

    // Top gravity pulls upward towards -Y
    if (topBall) {
      topBall.vy -= 780 * dt;
      const dist = Math.hypot(topBall.x - 540, topBall.y - topCy);
      if (dist > subRadius + 15 && !world.winner) {
        world.winner = 'CYAN (TOP)';
      }
    }

    // Bottom gravity pulls downward towards +Y
    if (bottomBall) {
      bottomBall.vy += 780 * dt;
      const dist = Math.hypot(bottomBall.x - 540, bottomBall.y - bottomCy);
      if (dist > subRadius + 15 && !world.winner) {
        world.winner = 'PINK (BOTTOM)';
      }
    }
  },
  isFinished: (world: PhysicsWorld) => {
    return !!world.winner;
  },
};
