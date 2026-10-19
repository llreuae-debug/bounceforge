import { SimulationMode } from './types';
import { PhysicsWorld } from '../engine/world';
import { CollisionEvent } from '../engine/types';

export const FragmentExpansionMode: SimulationMode = {
  id: 'fragment_expansion',
  name: 'Fragment Expansion',
  category: 'core',
  description: 'The ball grows with every bounce. Touching central spikes violently shatters it into lively mini-fragments that keep bouncing.',
  defaultSettings: {
    radius: 420,
    growthRate: 1.5,
    fragmentsOnShatter: 8,
    shatterThreshold: 45,
  },
  presets: [
    {
      name: 'Standard Shatter (8 Shards)',
      settings: { radius: 420, growthRate: 1.5, fragmentsOnShatter: 8 },
    },
    {
      name: 'Mega Cluster (16 Shards)',
      settings: { radius: 420, growthRate: 2.0, fragmentsOnShatter: 16 },
    },
    {
      name: 'Quick Shrapnel (Low Threshold)',
      settings: { radius: 400, growthRate: 2.5, shatterThreshold: 30 },
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
      thickness: 14,
      angle: 0,
      angularVelocity: 0.8,
      gapSize: 0.45,
      gapCount: 1,
      color: '#00f0ff',
      shatterOnEscape: true,
    });

    // Central spikes
    const spikeCount = 6;
    const step = (Math.PI * 2) / spikeCount;
    for (let i = 0; i < spikeCount; i++) {
      const angle = i * step;
      world.spikes.push({
        id: i + 1,
        x: cx + Math.cos(angle) * 35,
        y: cy + Math.sin(angle) * 35,
        angle,
        length: 25,
        radius: 8,
        isOccupied: false,
        color: '#ff007f',
      });
    }

    world.addBall({
      x: cx,
      y: cy - 140,
      vx: world.prng.range(-200, 200),
      vy: world.prng.range(-150, 150),
      radius: 14,
      growthPerBounce: settings.growthRate ?? 1.5,
      color: '#ffd600',
      glowColor: '#ffaa00',
      restitution: 0.99,
    });
  },
  step: (world: PhysicsWorld, dt: number, settings: Record<string, any>) => {
    const thresh = settings.shatterThreshold ?? 45;
    const fragCount = settings.fragmentsOnShatter ?? 8;

    for (let bIdx = world.balls.length - 1; bIdx >= 0; bIdx--) {
      const ball = world.balls[bIdx];
      if (!ball.isAlive || ball.radius < thresh) continue;

      for (const spike of world.spikes) {
        const tipX = spike.x + Math.cos(spike.angle) * spike.length;
        const tipY = spike.y + Math.sin(spike.angle) * spike.length;
        const dist = Math.hypot(ball.x - tipX, ball.y - tipY);

        if (dist < ball.radius + 6) {
          // Violent shatter!
          ball.isAlive = false;
          world.spawnExplosion(ball.x, ball.y, ball.color, 35, 350);

          world.eventBus.emit({
            id: Math.floor(Math.random() * 1000000),
            time: world.videoTime,
            type: 'spike',
            position: { x: ball.x, y: ball.y },
            velocity: { x: ball.vx, y: ball.vy },
            impulse: 500,
            ballId: ball.id,
            noteIndex: 0,
          });

          // Spawn mini fragments
          const colors = ['#00f0ff', '#ff007f', '#ffd600', '#00ff88'];
          for (let f = 0; f < fragCount; f++) {
            const angle = (f * (Math.PI * 2)) / fragCount + world.prng.range(-0.2, 0.2);
            const spd = world.prng.range(250, 450);
            world.addBall({
              x: ball.x,
              y: ball.y,
              vx: Math.cos(angle) * spd,
              vy: Math.sin(angle) * spd,
              radius: 10,
              growthPerBounce: 0.3,
              color: colors[f % colors.length],
              glowColor: colors[f % colors.length],
              restitution: 0.99,
            });
          }
          break;
        }
      }
    }
  },
  isFinished: (world: PhysicsWorld) => {
    return world.escapes > 0;
  },
};
