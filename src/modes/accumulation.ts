import { SimulationMode } from './types';
import { PhysicsWorld } from '../engine/world';
import { checkBallBallCollision } from '../engine/collision';
import { AsmrEngine } from '../audio/asmrEngine';

export const AccumulationMode: SimulationMode = {
  id: 'accumulation',
  name: 'Accumulation (Freeze Timer)',
  category: 'core',
  description:
    'Each ball has a countdown lifetime shown as a shrinking aura ring. When time runs out, it freezes into a permanent physical obstacle and a new challenger ball spawns. Stack up frozen balls until one escapes.',
  asmrProfile: 'destruction',
  hookLines: [
    'it freezes every 4 seconds into a solid wall',
    'watch the shrinking freeze timer ring',
    '8 balls frozen, the arena is almost clogged',
    'can the final challenger ball find the gap??',
    'frozen ball cascade is pure chaos',
  ],
  defaultSettings: {
    variant: 'freeze_timer', // 'freeze_timer' | 'spike_trap'
    lifetimeSeconds: 4.5,
    maxFrozen: 12,
    radius: 400,
    gapSizeDeg: 35,
    duration: 60,
  },
  presets: [
    {
      name: 'Chill Freeze (6s Timer, 6 Max Balls)',
      settings: {
        variant: 'freeze_timer',
        lifetimeSeconds: 6.0,
        maxFrozen: 6,
        radius: 390,
        gapSizeDeg: 40,
      },
    },
    {
      name: 'Viral Accumulation (4.5s Timer, 12 Max Balls)',
      settings: {
        variant: 'freeze_timer',
        lifetimeSeconds: 4.5,
        maxFrozen: 12,
        radius: 400,
        gapSizeDeg: 35,
      },
    },
    {
      name: 'Insane Ice Trap (2.5s Timer, 20 Max Balls)',
      settings: {
        variant: 'freeze_timer',
        lifetimeSeconds: 2.5,
        maxFrozen: 20,
        radius: 420,
        gapSizeDeg: 30,
      },
    },
    {
      name: 'Classic Spike Trap (16 Spikes)',
      settings: {
        variant: 'spike_trap',
        spikeCount: 16,
        maxFrozen: 15,
        radius: 400,
        gapSizeDeg: 35,
      },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.getSafeArena(settings.platform);
    const cx = arena.centerX;
    const cy = arena.centerY;

    const radius = Math.min(arena.radius, settings.radius ?? arena.radius);
    const gapRad = ((settings.gapSizeDeg ?? 35) * Math.PI) / 180;
    const variant = settings.variant || 'freeze_timer';

    world.addRing({
      centerX: cx,
      centerY: cy,
      radius,
      thickness: 14,
      angle: 0,
      angularVelocity: 0.65,
      gapSize: gapRad,
      gapCount: 1,
      color: '#ff007f',
      shatterOnEscape: true,
    });

    world.customState.variant = variant;
    world.customState.frozenCount = 0;
    world.customState.maxFrozen = settings.maxFrozen ?? 12;
    world.customState.lifetimeSeconds = settings.lifetimeSeconds ?? 4.5;
    world.customState.cx = cx;
    world.customState.cy = cy;
    world.customState.radius = radius;
    world.customState.ballTimer = world.customState.lifetimeSeconds;

    // HUD Counter
    world.customState.counterLabel = variant === 'freeze_timer' ? 'FROZEN OBSTACLES' : 'SPIKES FILLED';
    world.customState.counterValue = `0 / ${world.customState.maxFrozen}`;

    if (variant === 'spike_trap') {
      const count = settings.spikeCount ?? 16;
      const step = (Math.PI * 2) / count;
      for (let i = 0; i < count; i++) {
        const angle = i * step;
        world.spikes.push({
          id: i + 1,
          x: cx + Math.cos(angle) * (radius - 5),
          y: cy + Math.sin(angle) * (radius - 5),
          angle: angle + Math.PI, // pointing inward
          length: 28,
          radius: 12,
          isOccupied: false,
          color: '#ff5400',
        });
      }
    }

    // Shrinking Timer Ring Render on Foreground
    world.customState.onRenderFg = (ctx: CanvasRenderingContext2D) => {
      if (world.customState.variant !== 'freeze_timer') return;
      const activeBall = world.balls.find((b) => b.isAlive && b.tag !== 'frozen');
      if (!activeBall) return;

      const timeLeft = world.customState.ballTimer || 0;
      const maxTime = world.customState.lifetimeSeconds || 4.5;
      const ratio = Math.max(0, Math.min(1, timeLeft / maxTime));

      ctx.save();
      // Outer aura shrinking countdown ring
      const ringR = activeBall.radius + 6 + ratio * 16;
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = ratio > 0.35 ? '#00f0ff' : '#ff0055';
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 10;

      ctx.beginPath();
      ctx.arc(activeBall.x, activeBall.y, ringR, -Math.PI / 2, -Math.PI / 2 + ratio * Math.PI * 2);
      ctx.stroke();

      // Small digital countdown timer above ball
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 4;
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${timeLeft.toFixed(1)}s`, activeBall.x, activeBall.y - ringR - 2);

      ctx.restore();
    };

    // First active ball
    world.addBall({
      x: cx,
      y: cy - 120,
      vx: world.prng.range(-180, 180),
      vy: world.prng.range(60, 220),
      radius: 14,
      color: '#00f0ff',
      glowColor: '#00b4d8',
      tag: 'active',
      restitution: 0.98,
    });
  },

  step: (world: PhysicsWorld, dt: number) => {
    const cx = world.customState.cx || world.width / 2;
    const cy = world.customState.cy || world.height / 2;
    const variant = world.customState.variant;

    if (variant === 'freeze_timer') {
      const activeBall = world.balls.find((b) => b.isAlive && b.tag !== 'frozen');

      if (activeBall) {
        world.customState.ballTimer -= dt;

        // When time expires: Freeze active ball in place, becomes solid physical obstacle
        if (world.customState.ballTimer <= 0) {
          activeBall.tag = 'frozen';
          activeBall.vx = 0;
          activeBall.vy = 0;
          activeBall.gravity = 0;
          activeBall.color = '#38bdf8'; // frozen ice cyan
          activeBall.glowColor = '#0284c7';

          world.customState.frozenCount = (world.customState.frozenCount || 0) + 1;
          world.customState.counterValue = `${world.customState.frozenCount} / ${world.customState.maxFrozen}`;

          world.spawnExplosion(activeBall.x, activeBall.y, '#38bdf8', 25, 260);

          try {
            AsmrEngine.getInstance().playBreakEffectSound('glass_shatter');
          } catch {}

          world.eventBus.emit({
            id: Math.floor(Math.random() * 1000000),
            time: world.time,
            type: 'ball',
            position: { x: activeBall.x, y: activeBall.y },
            velocity: { x: 0, y: 0 },
            impulse: 350,
            ballId: activeBall.id,
            noteIndex: 0,
          });

          // Spawn new challenger ball if limit not exceeded
          if (world.customState.frozenCount < world.customState.maxFrozen) {
            world.customState.ballTimer = world.customState.lifetimeSeconds;
            world.addBall({
              x: cx,
              y: cy - 120,
              vx: world.prng.range(-200, 200),
              vy: world.prng.range(60, 220),
              radius: 14,
              color: '#00f0ff',
              glowColor: '#00b4d8',
              tag: 'active',
              restitution: 0.98,
            });
          }
        }
      }

      // Handle collision between active ball and frozen stationary balls
      const liveBall = world.balls.find((b) => b.isAlive && b.tag !== 'frozen');
      if (liveBall) {
        for (const frozen of world.balls) {
          if (frozen.tag !== 'frozen') continue;
          const dx = liveBall.x - frozen.x;
          const dy = liveBall.y - frozen.y;
          const dist = Math.hypot(dx, dy);
          const minDist = liveBall.radius + frozen.radius;

          if (dist < minDist && dist > 0.0001) {
            // Static collision resolution: bounce liveBall off frozen ball
            const nx = dx / dist;
            const ny = dy / dist;
            const overlap = minDist - dist;
            liveBall.x += nx * overlap;
            liveBall.y += ny * overlap;

            const dot = liveBall.vx * nx + liveBall.vy * ny;
            if (dot < 0) {
              liveBall.vx = (liveBall.vx - 2 * dot * nx) * liveBall.restitution;
              liveBall.vy = (liveBall.vy - 2 * dot * ny) * liveBall.restitution;
              liveBall.bounces++;
              world.bounces++;
              world.spawnExplosion(liveBall.x, liveBall.y, '#38bdf8', 8, 140);
            }
          }
        }
      }
    } else {
      // Classic spike-trap variant
      for (const ball of world.balls) {
        if (!ball.isAlive || ball.tag === 'frozen') continue;

        for (const spike of world.spikes) {
          if (spike.isOccupied) continue;

          const tipX = spike.x + Math.cos(spike.angle) * spike.length;
          const tipY = spike.y + Math.sin(spike.angle) * spike.length;
          const dist = Math.hypot(ball.x - tipX, ball.y - tipY);

          if (dist < ball.radius + 8) {
            spike.isOccupied = true;
            ball.tag = 'frozen';
            ball.vx = 0;
            ball.vy = 0;
            ball.gravity = 0;
            ball.x = tipX;
            ball.y = tipY;
            ball.color = '#ff9100';

            world.customState.frozenCount = (world.customState.frozenCount || 0) + 1;
            world.customState.counterValue = `${world.customState.frozenCount} / ${world.customState.maxFrozen}`;
            world.spawnExplosion(tipX, tipY, '#ff9100', 15, 180);

            world.eventBus.emit({
              id: Math.floor(Math.random() * 1000000),
              time: world.time,
              type: 'spike',
              position: { x: tipX, y: tipY },
              velocity: { x: 0, y: 0 },
              impulse: 300,
              ballId: ball.id,
              noteIndex: 0,
            });

            if (world.customState.frozenCount < world.customState.maxFrozen) {
              world.addBall({
                x: cx,
                y: cy - 150,
                vx: world.prng.range(-200, 200),
                vy: world.prng.range(50, 250),
                radius: 14,
                color: '#00f0ff',
                glowColor: '#00b4d8',
              });
            }
            break;
          }
        }
      }
    }
  },

  isFinished: (world: PhysicsWorld) => {
    return world.escapes > 0 || (world.customState.frozenCount >= world.customState.maxFrozen);
  },
};
