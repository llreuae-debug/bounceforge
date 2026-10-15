import { SimulationMode } from './types';
import { PhysicsWorld } from '../engine/world';
import { CollisionEvent } from '../engine/types';

export const DestructionMode: SimulationMode = {
  id: 'destruction',
  name: 'Destruction ASMR',
  category: 'core',
  description: 'Ring composed of destructible brick segments. Hits crush and shatter segments until a hole opens for escape.',
  defaultSettings: {
    segmentsCount: 36,
    radius: 380,
    ringThickness: 18,
    angularVelocity: 0.8,
  },
  presets: [
    {
      name: 'Standard 36 Bricks',
      settings: { segmentsCount: 36, radius: 380 },
    },
    {
      name: 'High Density 72 Bricks',
      settings: { segmentsCount: 72, radius: 400, ringThickness: 14 },
    },
    {
      name: 'Heavy Armor 24 Thick Bricks',
      settings: { segmentsCount: 24, radius: 360, ringThickness: 28 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.getSafeArena(settings.platform);
    const cx = arena.centerX;
    const cy = arena.centerY;

    const count = settings.segmentsCount ?? 36;
    const radius = Math.min(arena.radius, settings.radius ?? arena.radius);
    const step = (Math.PI * 2) / count;

    const segments = [];
    for (let i = 0; i < count; i++) {
      segments.push({
        startAngle: i * step,
        endAngle: (i + 1) * step - 0.03,
        broken: false,
        color: i % 2 === 0 ? '#ff007f' : '#ffd600',
      });
    }

    world.customState.destructionSegments = segments;
    world.customState.radius = radius;
    world.customState.cx = cx;
    world.customState.cy = cy;
    world.customState.angle = 0;
    world.customState.angularVelocity = settings.angularVelocity ?? 0.8;
    world.customState.escaped = false;

    // Custom foreground render to draw intact and broken bricks
    world.customState.onRenderFg = (ctx: CanvasRenderingContext2D) => {
      const segs = world.customState.destructionSegments;
      const r = world.customState.radius;
      const th = settings.ringThickness ?? 18;
      const rot = world.customState.angle;

      ctx.save();
      ctx.lineWidth = th;
      ctx.lineCap = 'butt';

      for (let i = 0; i < segs.length; i++) {
        const seg = segs[i];
        if (!seg.broken) {
          ctx.strokeStyle = seg.color;
          ctx.shadowColor = seg.color;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(cx, cy, r, rot + seg.startAngle, rot + seg.endAngle);
          ctx.stroke();
        }
      }
      ctx.restore();
    };

    world.addBall({
      x: cx,
      y: cy - 20,
      vx: world.prng.range(-250, 250),
      vy: world.prng.range(-150, 200),
      radius: 16,
      color: '#00f0ff',
      glowColor: '#00b4d8',
      restitution: 0.99,
    });
  },
  step: (world: PhysicsWorld, dt: number, settings: Record<string, any>) => {
    world.customState.angle += world.customState.angularVelocity * dt;
    const cx = world.customState.cx;
    const cy = world.customState.cy;
    const r = world.customState.radius;
    const segs = world.customState.destructionSegments;
    const rot = world.customState.angle;

    for (const ball of world.balls) {
      if (!ball.isAlive) continue;
      const dx = ball.x - cx;
      const dy = ball.y - cy;
      const dist = Math.hypot(dx, dy);

      if (dist + ball.radius >= r - 10) {
        // Find which segment was hit
        let hitAngle = Math.atan2(dy, dx) - rot;
        hitAngle = ((hitAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

        for (let i = 0; i < segs.length; i++) {
          const seg = segs[i];
          if (hitAngle >= seg.startAngle && hitAngle <= seg.endAngle) {
            if (!seg.broken) {
              seg.broken = true;
              world.spawnExplosion(ball.x, ball.y, seg.color, 25, 250);
              world.eventBus.emit({
                id: Math.floor(Math.random() * 1000000),
                time: world.time,
                type: 'ring',
                position: { x: ball.x, y: ball.y },
                velocity: { x: ball.vx, y: ball.vy },
                impulse: 350,
                ballId: ball.id,
                noteIndex: 0,
              });

              // Bounce back inward
              const nx = -dx / dist;
              const ny = -dy / dist;
              const dot = ball.vx * nx + ball.vy * ny;
              if (dot < 0) {
                ball.vx += nx * -dot * 1.95;
                ball.vy += ny * -dot * 1.95;
              }
            } else {
              // Passing through broken opening!
              if (dist >= r + 30) {
                world.customState.escaped = true;
                world.eventBus.emit({
                  id: Math.floor(Math.random() * 1000000),
                  time: world.time,
                  type: 'escape',
                  position: { x: ball.x, y: ball.y },
                  velocity: { x: ball.vx, y: ball.vy },
                  impulse: 500,
                  ballId: ball.id,
                  noteIndex: 0,
                });
              }
            }
            break;
          }
        }
      }
    }
  },
  isFinished: (world: PhysicsWorld) => {
    return world.customState?.escaped === true;
  },
};
