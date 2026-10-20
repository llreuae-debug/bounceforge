import { SimulationMode } from './types';
import { PhysicsWorld } from '../engine/world';

interface WebThread {
  ballId: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}

export const WebBattleMode: SimulationMode = {
  id: 'web_battle',
  name: 'Web Battle Royale',
  category: 'core',
  description: '2 to 6 colored balls weave competing web territory. Crossing rival threads steals them. Last ball standing wins!',
  defaultSettings: {
    ballCount: 4,
    radius: 420,
    eliminationDelay: 10, // seconds before thread-zero elimination begins
  },
  presets: [
    {
      name: '4-Player Battle (Classic)',
      settings: { ballCount: 4, radius: 420 },
    },
    {
      name: 'Duet Duel (2 Balls)',
      settings: { ballCount: 2, radius: 400 },
    },
    {
      name: '6-Player Chaos Royale',
      settings: { ballCount: 6, radius: 450 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.getSafeArena(settings.platform);
    const cx = arena.centerX;
    const cy = arena.centerY;
    const radius = Math.min(arena.radius, settings.radius ?? arena.radius);

    world.addRing({
      centerX: cx,
      centerY: cy,
      radius,
      thickness: 16,
      angle: 0,
      angularVelocity: 0.5,
      gapSize: 0.35,
      gapCount: 1,
      color: '#ffffff',
      shatterOnEscape: false,
    });

    const ballCount = settings.ballCount ?? 4;
    const playerConfigs = [
      { name: 'CYAN', color: '#00f0ff' },
      { name: 'PINK', color: '#ff007f' },
      { name: 'GOLD', color: '#ffd600' },
      { name: 'LIME', color: '#00ff88' },
      { name: 'PURPLE', color: '#bf5af2' },
      { name: 'ORANGE', color: '#ff7a00' },
    ];

    world.customState.threads = [] as WebThread[];
    world.customState.scores = {} as Record<number, number>;

    for (let i = 0; i < ballCount; i++) {
      const angle = (i * Math.PI * 2) / ballCount;
      const cfg = playerConfigs[i % playerConfigs.length];
      const ball = world.addBall({
        x: cx + Math.cos(angle) * 160,
        y: cy + Math.sin(angle) * 160,
        vx: Math.cos(angle + 1) * 260,
        vy: Math.sin(angle + 1) * 260,
        radius: 16,
        color: cfg.color,
        glowColor: cfg.color,
        name: cfg.name,
      });
      world.customState.scores[ball.id] = 5; // initial web points
    }

    // Render Web Battle threads & Live Scoreboard
    world.customState.onRenderFg = (ctx: CanvasRenderingContext2D) => {
      const threads = world.customState.threads as WebThread[];

      ctx.save();
      for (let i = 0; i < threads.length; i++) {
        const th = threads[i];
        ctx.strokeStyle = th.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(th.x1, th.y1);
        ctx.lineTo(th.x2, th.y2);
        ctx.stroke();
      }

      // Leaderboard overlay
      const balls = world.balls.filter((b) => b.isAlive);
      const startX = 60;
      let startY = 160;

      ctx.font = '700 18px "JetBrains Mono", monospace';
      for (const b of balls) {
        ctx.fillStyle = b.color;
        const count = threads.filter((t) => t.ballId === b.id).length;
        ctx.fillText(`${b.name}: ${count} THREADS`, startX, startY);
        startY += 26;
      }
      ctx.restore();
    };
  },
  step: (world: PhysicsWorld) => {
    const threads = world.customState.threads as WebThread[];
    const aliveBalls = world.balls.filter((b) => b.isAlive);

    // Each bounce can spawn a thread to center or previous point
    for (const ball of aliveBalls) {
      if (ball.trail.length >= 2 && Math.random() < 0.08) {
        const pt = ball.trail[0];
        const prev = ball.trail[ball.trail.length - 1];
        if (threads.length < 500) {
          threads.push({
            ballId: ball.id,
            x1: pt.x,
            y1: pt.y,
            x2: prev.x,
            y2: prev.y,
            color: ball.color,
          });
        }
      }

      // Check if this ball cuts/steals rival threads
      for (let t = 0; t < threads.length; t++) {
        const th = threads[t];
        if (th.ballId !== ball.id) {
          const dist = Math.hypot(ball.x - (th.x1 + th.x2) / 2, ball.y - (th.y1 + th.y2) / 2);
          if (dist < ball.radius + 15) {
            // Steal thread!
            th.ballId = ball.id;
            th.color = ball.color;
          }
        }
      }
    }

    if (aliveBalls.length === 1) {
      world.winner = aliveBalls[0].name;
      world.isFinished = true;
    }
  },
  isFinished: (world: PhysicsWorld) => {
    return world.balls.filter((b) => b.isAlive).length <= 1;
  },
};
