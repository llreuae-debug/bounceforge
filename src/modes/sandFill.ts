import { SimulationMode } from './types';
import { PhysicsWorld } from '../engine/world';
import { CollisionEvent } from '../engine/types';

interface SandGrain {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  isSettled: boolean;
}

export const SandFillMode: SimulationMode = {
  id: 'sand_fill',
  name: 'Chromatic Sand Fill',
  category: 'advanced',
  description: 'Every bounce showers thousands of fine colored sand particles that cascade down and accumulate in stratified sand dunes.',
  defaultSettings: {
    sandPerBounce: 35,
    radius: 420,
    maxSand: 3500,
  },
  presets: [
    {
      name: 'Stratified Dunes (35 Grains/Hit)',
      settings: { sandPerBounce: 35, radius: 420 },
    },
    {
      name: 'Sand Avalanche (70 Grains/Hit)',
      settings: { sandPerBounce: 70, radius: 420 },
    },
    {
      name: 'Fine Dust (20 Grains/Hit)',
      settings: { sandPerBounce: 20, radius: 440 },
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
      angularVelocity: 0.6,
      gapSize: 0.4,
      gapCount: 1,
      color: '#ffd600',
      shatterOnEscape: true,
    });

    world.customState.sand = [] as SandGrain[];
    world.customState.floorY = cy + radius - 20;

    // Render sand on FG
    world.customState.onRenderFg = (ctx: CanvasRenderingContext2D) => {
      const sand = world.customState.sand as SandGrain[];
      if (!sand.length) return;

      ctx.save();
      for (let i = 0; i < sand.length; i++) {
        const s = sand[i];
        ctx.fillStyle = s.color;
        ctx.fillRect(s.x, s.y, 3, 3);
      }
      ctx.restore();
    };

    world.addBall({
      x: cx,
      y: cy - 100,
      vx: world.prng.range(-200, 200),
      vy: world.prng.range(-150, 150),
      radius: 14,
      color: '#ff9100',
      glowColor: '#ff6d00',
      restitution: 0.99,
    });
  },
  onCollision: (world: PhysicsWorld, event: CollisionEvent, settings: Record<string, any>) => {
    if (event.type === 'ring' || event.type === 'wall' || event.type === 'ball') {
      const sand = world.customState.sand as SandGrain[];
      const maxSand = settings.maxSand ?? 3500;
      const count = settings.sandPerBounce ?? 35;
      const colors = ['#ffd600', '#ff9f0a', '#ff453a', '#ff375f', '#bf5af2', '#64d2ff'];
      const hue = colors[Math.floor(world.prng.next() * colors.length)];

      for (let i = 0; i < count; i++) {
        if (sand.length >= maxSand) break;
        const angle = world.prng.next() * Math.PI * 2;
        const spd = world.prng.range(50, 220);
        sand.push({
          x: event.position.x,
          y: event.position.y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          color: hue,
          isSettled: false,
        });
      }
    }
  },
  step: (world: PhysicsWorld, dt: number) => {
    const sand = world.customState.sand as SandGrain[];
    const floorY = world.customState.floorY ?? 1300;

    for (let i = 0; i < sand.length; i++) {
      const s = sand[i];
      if (s.isSettled) continue;

      s.vy += 800 * dt; // gravity
      s.x += s.vx * dt;
      s.y += s.vy * dt;

      if (s.y >= floorY) {
        s.y = floorY + (Math.random() * 4 - 2);
        s.vx = 0;
        s.vy = 0;
        s.isSettled = true;
      }
    }
  },
  isFinished: (world: PhysicsWorld, settings: Record<string, any>) => {
    const sand = world.customState.sand as SandGrain[];
    return world.escapes > 0 || sand.length >= (settings.maxSand ?? 3500);
  },
};
