import { SimulationMode } from './types';
import { getTargetDuration } from '../engine/duration';
import { PhysicsWorld } from '../engine/world';

export const BlackHoleMode: SimulationMode = {
  id: 'black_hole',
  name: 'Black Hole Singularity',
  category: 'advanced',
  description: 'A colossal gravitational singularity at the center pulls balls inward. Balls execute relativistic orbital slingshots.',
  defaultSettings: {
    ballCount: 12,
    singularityMass: 3500000,
    eventHorizonRadius: 40,
    boundaryRadius: 440,
  },
  presets: [
    {
      name: 'Singularity Orbit (12 Balls)',
      settings: { ballCount: 12, singularityMass: 3500000 },
    },
    {
      name: 'Supermassive Core (20 Balls)',
      settings: { ballCount: 20, singularityMass: 5500000, eventHorizonRadius: 55 },
    },
    {
      name: 'Slingshot Haven (Weak Core)',
      settings: { ballCount: 8, singularityMass: 2000000 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.getSafeArena(settings.platform);
    const cx = arena.centerX;
    const cy = arena.centerY;
    const bRadius = Math.min(arena.radius, settings.boundaryRadius ?? arena.radius);

    // Outer containment boundary
    world.addRing({
      centerX: cx,
      centerY: cy,
      radius: bRadius,
      thickness: 16,
      angle: 0,
      angularVelocity: 0.3,
      gapSize: 0.45,
      gapCount: 2,
      color: '#bf5af2',
      shatterOnEscape: false,
    });

    world.config.gravity = { x: 0, y: 0 }; // Zero planar gravity; singularity dominates!

    world.customState.cx = cx;
    world.customState.cy = cy;
    world.customState.gMass = settings.singularityMass ?? 3500000;
    world.customState.horizonR = settings.eventHorizonRadius ?? 40;
    world.customState.survivors = 0;

    // Render central black hole accretion disk
    world.customState.onRenderFg = (ctx: CanvasRenderingContext2D) => {
      const hR = world.customState.horizonR;

      ctx.save();
      // Accretion disk glow
      const diskGrad = ctx.createRadialGradient(cx, cy, hR * 0.5, cx, cy, hR * 3);
      diskGrad.addColorStop(0, '#000000');
      diskGrad.addColorStop(0.3, 'rgba(191, 90, 242, 0.8)');
      diskGrad.addColorStop(0.7, 'rgba(0, 240, 255, 0.4)');
      diskGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = diskGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, hR * 3, 0, Math.PI * 2);
      ctx.fill();

      // Pitch black event horizon
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(cx, cy, hR, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#64d2ff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    };

    const count = settings.ballCount ?? 12;
    for (let i = 0; i < count; i++) {
      const angle = (i * Math.PI * 2) / count;
      const dist = 260 + (i % 3) * 50;
      // Perpendicular orbital velocity
      const orbitSpeed = Math.sqrt(world.customState.gMass / dist) * 0.9;
      world.addBall({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: -Math.sin(angle) * orbitSpeed,
        vy: Math.cos(angle) * orbitSpeed,
        radius: 12,
        color: ['#00f0ff', '#ff007f', '#ffd600', '#00ff88'][i % 4],
        glowColor: '#00b4d8',
      });
    }
  },
  step: (world: PhysicsWorld, dt: number) => {
    const cx = world.customState.cx;
    const cy = world.customState.cy;
    const gMass = world.customState.gMass;
    const hR = world.customState.horizonR;

    for (let i = world.balls.length - 1; i >= 0; i--) {
      const ball = world.balls[i];
      if (!ball.isAlive) continue;

      const dx = cx - ball.x;
      const dy = cy - ball.y;
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq);

      // Swallowed by event horizon
      if (dist <= hR + ball.radius * 0.5) {
        ball.isAlive = false;
        world.spawnExplosion(ball.x, ball.y, '#bf5af2', 20, 200);
        world.eventBus.emit({
          id: Math.floor(Math.random() * 1000000),
          time: world.time,
          type: 'wall',
          position: { x: ball.x, y: ball.y },
          velocity: { x: 0, y: 0 },
          impulse: 200,
          ballId: ball.id,
          noteIndex: 0,
        });
        continue;
      }

      // Gravitational pull: a = G*M / r^2
      const force = gMass / Math.max(1000, distSq);
      ball.vx += (dx / dist) * force * dt;
      ball.vy += (dy / dist) * force * dt;
    }
  },
  isFinished: (world: PhysicsWorld, settings: Record<string, any>) => {
    return world.time >= getTargetDuration(settings) || world.balls.every((b) => !b.isAlive);
  },
};
