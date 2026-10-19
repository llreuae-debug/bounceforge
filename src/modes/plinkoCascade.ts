import { SimulationMode } from './types';
import { PhysicsWorld } from '../engine/world';
import { Peg } from '../engine/types';

export const PlinkoCascadeMode: SimulationMode = {
  id: 'plinko_cascade',
  name: 'Plinko Peg Cascade',
  category: 'advanced',
  description: 'Balls rain continuously through a dense triangular field of melodic pegs into scoring bins with a live histogram.',
  defaultSettings: {
    pegRows: 12,
    binsCount: 9,
    dropRate: 0.6,
    maxBalls: 120,
  },
  presets: [
    {
      name: 'Standard 12 Rows - 9 Bins',
      settings: { pegRows: 12, binsCount: 9, dropRate: 0.6 },
    },
    {
      name: 'High Frequency Storm (Fast Drop)',
      settings: { pegRows: 14, binsCount: 11, dropRate: 0.3 },
    },
    {
      name: 'Precision Pyramid (8 Rows)',
      settings: { pegRows: 8, binsCount: 7, dropRate: 0.9 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const cx = world.width / 2;

    const rows = settings.pegRows ?? 12;
    const bins = settings.binsCount ?? 9;
    const startY = 320;
    const rowHeight = 75;
    const pegSpacing = 65;

    // Triangular peg field
    for (let r = 0; r < rows; r++) {
      const pegCount = r + 3;
      const rowStartX = cx - ((pegCount - 1) * pegSpacing) / 2;
      for (let p = 0; p < pegCount; p++) {
        world.pegs.push({
          id: world.pegs.length + 1,
          x: rowStartX + p * pegSpacing,
          y: startY + r * rowHeight,
          radius: 8,
          score: 10,
          color: '#38bdf8',
        });
      }
    }

    // Bottom Bins Histogram
    world.customState.binCounts = new Array(bins).fill(0);
    world.customState.binsCount = bins;
    world.customState.binWidth = (world.width - 120) / bins;
    world.customState.lastDrop = 0;
    world.customState.dropRate = settings.dropRate ?? 0.6;
    world.customState.totalLanded = 0;

    // Render Histogram on FG
    world.customState.onRenderFg = (ctx: CanvasRenderingContext2D) => {
      const binCounts = world.customState.binCounts as number[];
      const bW = world.customState.binWidth;
      const bCount = world.customState.binsCount;
      const startX = 60;
      const floorY = world.height - 120;

      ctx.save();
      for (let i = 0; i < bCount; i++) {
        const count = binCounts[i];
        const barH = Math.min(180, count * 12);
        const bx = startX + i * bW;

        // Bin Slot
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(bx + 4, floorY - barH, bW - 8, barH);

        // Divider
        ctx.strokeStyle = '#818cf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(bx, floorY - 200);
        ctx.lineTo(bx, floorY);
        ctx.stroke();

        // Bin score count label
        ctx.fillStyle = '#38bdf8';
        ctx.font = '700 14px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${count}`, bx + bW / 2, floorY + 25);
      }
      ctx.restore();
    };

    world.config.gravity = { x: 0, y: 800 };
  },
  step: (world: PhysicsWorld, dt: number, settings: Record<string, any>) => {
    const cx = world.width / 2;
    const rate = world.customState.dropRate ?? 0.6;
    const maxBalls = settings.maxBalls ?? 120;

    // Drop new ball
    if (world.time - world.customState.lastDrop >= rate && world.customState.totalLanded < maxBalls) {
      world.customState.lastDrop = world.time;
      world.addBall({
        x: cx + world.prng.range(-20, 20),
        y: 180,
        vx: world.prng.range(-30, 30),
        vy: 100,
        radius: 12,
        color: ['#00f0ff', '#ff007f', '#ffd600', '#00ff88'][Math.floor(world.prng.next() * 4)],
        glowColor: '#00b4d8',
        restitution: 0.8,
      });
    }

    // Check collisions with pegs
    for (const ball of world.balls) {
      if (!ball.isAlive) continue;

      for (const peg of world.pegs) {
        const dx = ball.x - peg.x;
        const dy = ball.y - peg.y;
        const dist = Math.hypot(dx, dy);

        if (dist < ball.radius + peg.radius && dist > 0.001) {
          const nx = dx / dist;
          const ny = dy / dist;

          // Push apart
          const overlap = ball.radius + peg.radius - dist;
          ball.x += nx * overlap;
          ball.y += ny * overlap;

          // Bounce
          const dot = ball.vx * nx + ball.vy * ny;
          if (dot < 0) {
            ball.vx -= (1 + 0.8) * dot * nx;
            ball.vy -= (1 + 0.8) * dot * ny;

            world.spawnExplosion(peg.x, peg.y, peg.color, 8, 140);
            world.eventBus.emit({
              id: Math.floor(Math.random() * 1000000),
              time: world.videoTime,
              type: 'peg',
              position: { x: peg.x, y: peg.y },
              velocity: { x: ball.vx, y: ball.vy },
              impulse: 280,
              ballId: ball.id,
              noteIndex: 0,
            });
          }
        }
      }

      // Check landing into bottom bins
      const floorY = world.height - 120;
      if (ball.y >= floorY && ball.isAlive) {
        ball.isAlive = false;
        world.customState.totalLanded = (world.customState.totalLanded || 0) + 1;

        const startX = 60;
        const bW = world.customState.binWidth;
        const binIdx = Math.max(0, Math.min(world.customState.binsCount - 1, Math.floor((ball.x - startX) / bW)));
        world.customState.binCounts[binIdx]++;
      }
    }
  },
  isFinished: (world: PhysicsWorld, settings: Record<string, any>) => {
    return world.customState.totalLanded >= (settings.maxBalls ?? 120);
  },
};
