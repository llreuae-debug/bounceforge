import { SimulationMode } from './types';
import { PhysicsWorld } from '../engine/world';
import { Spike } from '../engine/types';

export const AccumulationMode: SimulationMode = {
  id: 'accumulation',
  name: 'Spike Accumulation',
  category: 'core',
  description: 'Balls freeze upon hitting internal ring spikes, gradually filling the perimeter until a final ball escapes.',
  defaultSettings: {
    spikeCount: 16,
    radius: 400,
    gapSizeDeg: 35,
    maxFrozen: 15,
  },
  presets: [
    {
      name: 'Standard 16 Spikes',
      settings: { spikeCount: 16, maxFrozen: 15 },
    },
    {
      name: 'Dense 24 Spikes',
      settings: { spikeCount: 24, maxFrozen: 23 },
    },
    {
      name: 'Quick 8 Spikes',
      settings: { spikeCount: 8, maxFrozen: 7 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.getSafeArena(settings.platform);
    const cx = arena.centerX;
    const cy = arena.centerY;

    const count = settings.spikeCount ?? 16;
    const radius = Math.min(arena.radius, settings.radius ?? arena.radius);
    const gapRad = ((settings.gapSizeDeg ?? 35) * Math.PI) / 180;

    world.addRing({
      centerX: cx,
      centerY: cy,
      radius,
      thickness: 12,
      angle: 0,
      angularVelocity: 0.6,
      gapSize: gapRad,
      gapCount: 1,
      color: '#ff007f',
      shatterOnEscape: true,
    });

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

    world.customState.frozenCount = 0;
    world.customState.maxFrozen = settings.maxFrozen ?? 15;

    // Drop first ball
    world.addBall({
      x: cx,
      y: cy - 150,
      vx: world.prng.range(-150, 150),
      vy: world.prng.range(50, 200),
      radius: 14,
      color: '#00f0ff',
      glowColor: '#00b4d8',
    });
  },
  step: (world: PhysicsWorld, dt: number, settings: Record<string, any>) => {
    const cx = world.width / 2;
    const cy = world.height / 2;

    // Check ball hits against unoccupied spikes
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

          // Spawn next challenger ball if not all filled
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
  },
  isFinished: (world: PhysicsWorld) => {
    return world.escapes > 0 || (world.customState.frozenCount >= world.customState.maxFrozen);
  },
};
