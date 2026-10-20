import { SimulationMode } from './types';
import { PhysicsWorld } from '../engine/world';

export const BallRaceMode: SimulationMode = {
  id: 'ball_race',
  name: 'Multi-Ball Maze Race',
  category: 'advanced',
  description: '4 to 8 colored racers navigate a labyrinth of rotating concentric rings. First ball to break out wins!',
  defaultSettings: {
    racersCount: 6,
    ringsCount: 10,
    radius: 440,
    gapSizeDeg: 34,
  },
  presets: [
    {
      name: '6 Racers - 10 Rings (Standard)',
      settings: { racersCount: 6, ringsCount: 10, gapSizeDeg: 34 },
    },
    {
      name: '8 Racers - Grand Prix Maze',
      settings: { racersCount: 8, ringsCount: 14, gapSizeDeg: 30 },
    },
    {
      name: '4 Racers - Fast Sprint (6 Rings)',
      settings: { racersCount: 4, ringsCount: 6, gapSizeDeg: 42 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.getSafeArena(settings.platform);
    const cx = arena.centerX;
    const cy = arena.centerY;

    const ringsCount = settings.ringsCount ?? 10;
    const maxR = Math.min(arena.radius, settings.radius ?? arena.radius);
    const gapRad = ((settings.gapSizeDeg ?? 34) * Math.PI) / 180;

    for (let i = 0; i < ringsCount; i++) {
      const radius = maxR - i * 36;
      world.addRing({
        centerX: cx,
        centerY: cy,
        radius,
        thickness: 10,
        angle: world.prng.next() * Math.PI * 2,
        angularVelocity: (i % 2 === 0 ? 1 : -1) * (0.8 + i * 0.1),
        gapSize: gapRad,
        gapCount: 1,
        color: ['#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#fb7185'][i % 5],
        shatterOnEscape: false,
      });
    }

    const racersCount = settings.racersCount ?? 6;
    const racerConfigs = [
      { name: 'FLASH', color: '#ffd600' },
      { name: 'COMET', color: '#00f0ff' },
      { name: 'BLAZE', color: '#ff3b30' },
      { name: 'VIPER', color: '#30d158' },
      { name: 'SHADOW', color: '#bf5af2' },
      { name: 'TITAN', color: '#ff9500' },
      { name: 'FROST', color: '#64d2ff' },
      { name: 'PULSE', color: '#ff2d55' },
    ];

    for (let i = 0; i < racersCount; i++) {
      const cfg = racerConfigs[i % racerConfigs.length];
      const angle = (i * Math.PI * 2) / racersCount;
      world.addBall({
        x: cx + Math.cos(angle) * 30,
        y: cy + Math.sin(angle) * 30,
        vx: Math.cos(angle) * 150,
        vy: Math.sin(angle) * 150,
        radius: 12,
        color: cfg.color,
        glowColor: cfg.color,
        name: cfg.name,
        restitution: 0.99,
      });
    }

    world.customState.winner = null;

    // Live Race Leaderboard Overlay
    world.customState.onRenderFg = (ctx: CanvasRenderingContext2D) => {
      ctx.save();
      ctx.font = '700 16px "JetBrains Mono", monospace';
      let startY = 160;

      // Sort racers by distance from center (leader is farthest from center)
      const sorted = [...world.balls].sort((a, b) => {
        const distA = Math.hypot(a.x - cx, a.y - cy);
        const distB = Math.hypot(b.x - cx, b.y - cy);
        return distB - distA;
      });

      for (let i = 0; i < sorted.length; i++) {
        const r = sorted[i];
        ctx.fillStyle = r.color;
        const dist = Math.round(Math.hypot(r.x - cx, r.y - cy));
        ctx.fillText(`#${i + 1} ${r.name}: ${dist}px`, 60, startY);
        startY += 24;
      }
      ctx.restore();
    };
  },
  step: (world: PhysicsWorld, dt: number, settings: Record<string, any>) => {
    const cx = world.width / 2;
    const cy = world.height / 2;
    const maxR = settings.radius ?? 440;

    for (const ball of world.balls) {
      const dist = Math.hypot(ball.x - cx, ball.y - cy);
      if (dist >= maxR + 20 && !world.customState.winner) {
        world.customState.winner = ball.name;
        world.winner = ball.name;
        world.isFinished = true;
        world.spawnExplosion(ball.x, ball.y, ball.color, 50, 450);
        break;
      }
    }
  },
  isFinished: (world: PhysicsWorld) => {
    return world.customState.winner !== null;
  },
};
