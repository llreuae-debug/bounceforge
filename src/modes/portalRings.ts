import { SimulationMode } from './types';
import { PhysicsWorld } from '../engine/world';
import { Vector2D } from '../engine/types';

interface PortalPair {
  p1: Vector2D;
  p2: Vector2D;
  color: string;
}

export const PortalRingsMode: SimulationMode = {
  id: 'portal_rings',
  name: 'Quantum Portal Rings',
  category: 'advanced',
  description: 'Paired quantum portals on the rings instantly warp the ball across spatial dimensions while conserving momentum.',
  defaultSettings: {
    portalPairs: 3,
    radius: 420,
    ringsCount: 4,
  },
  presets: [
    {
      name: 'Tri-Portal Nexus (3 Pairs)',
      settings: { portalPairs: 3, ringsCount: 4 },
    },
    {
      name: 'Twin Gateways (2 Pairs)',
      settings: { portalPairs: 2, ringsCount: 3 },
    },
    {
      name: 'Hyper Warp Maze (4 Pairs)',
      settings: { portalPairs: 4, ringsCount: 5 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.getSafeArena(settings.platform);
    const cx = arena.centerX;
    const cy = arena.centerY;
    const maxR = Math.min(arena.radius, settings.radius ?? arena.radius);
    const rings = settings.ringsCount ?? 4;

    for (let i = 0; i < rings; i++) {
      world.addRing({
        centerX: cx,
        centerY: cy,
        radius: maxR - i * 60,
        thickness: 12,
        angle: 0,
        angularVelocity: (i % 2 === 0 ? 1 : -1) * 0.7,
        gapSize: 0.35,
        gapCount: 1,
        color: '#818cf8',
        shatterOnEscape: true,
      });
    }

    const pairCount = settings.portalPairs ?? 3;
    const pairs: PortalPair[] = [];
    const colors = ['#00f0ff', '#ff007f', '#ffe600', '#00ff88'];

    for (let p = 0; p < pairCount; p++) {
      const a1 = (p * Math.PI * 2) / pairCount;
      const a2 = a1 + Math.PI * 0.8;
      const r1 = 180 + p * 60;
      const r2 = 240 + p * 40;

      pairs.push({
        p1: { x: cx + Math.cos(a1) * r1, y: cy + Math.sin(a1) * r1 },
        p2: { x: cx + Math.cos(a2) * r2, y: cy + Math.sin(a2) * r2 },
        color: colors[p % colors.length],
      });
    }

    world.customState.portalPairs = pairs;
    world.customState.cooldown = 0;

    // Render Portals on FG
    world.customState.onRenderFg = (ctx: CanvasRenderingContext2D) => {
      const plist = world.customState.portalPairs as PortalPair[];
      ctx.save();
      for (const pair of plist) {
        // Draw Portal 1
        ctx.strokeStyle = pair.color;
        ctx.lineWidth = 4;
        ctx.shadowColor = pair.color;
        ctx.shadowBlur = 12;

        ctx.beginPath();
        ctx.arc(pair.p1.x, pair.p1.y, 22, 0, Math.PI * 2);
        ctx.stroke();

        // Draw Portal 2
        ctx.beginPath();
        ctx.arc(pair.p2.x, pair.p2.y, 22, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    };

    world.addBall({
      x: cx,
      y: cy - 100,
      vx: 180,
      vy: 120,
      radius: 14,
      color: '#ffd600',
      glowColor: '#ffaa00',
      restitution: 1.0,
    });
  },
  step: (world: PhysicsWorld, dt: number) => {
    world.customState.cooldown = Math.max(0, (world.customState.cooldown || 0) - dt);
    if (world.customState.cooldown > 0) return;

    const pairs = world.customState.portalPairs as PortalPair[];
    const ball = world.balls[0];
    if (!ball || !ball.isAlive) return;

    for (const pair of pairs) {
      // Check P1
      if (Math.hypot(ball.x - pair.p1.x, ball.y - pair.p1.y) < ball.radius + 18) {
        ball.x = pair.p2.x;
        ball.y = pair.p2.y;
        ball.vx *= 1.1; // boost
        ball.vy *= 1.1;
        world.customState.cooldown = 0.35; // teleport immunity window
        world.spawnExplosion(pair.p2.x, pair.p2.y, pair.color, 25, 260);
        world.eventBus.emit({
          id: Math.floor(Math.random() * 1000000),
          time: world.time,
          type: 'portal',
          position: { x: pair.p2.x, y: pair.p2.y },
          velocity: { x: ball.vx, y: ball.vy },
          impulse: 400,
          ballId: ball.id,
          noteIndex: 0,
        });
        break;
      }
      // Check P2
      if (Math.hypot(ball.x - pair.p2.x, ball.y - pair.p2.y) < ball.radius + 18) {
        ball.x = pair.p1.x;
        ball.y = pair.p1.y;
        ball.vx *= 1.1;
        ball.vy *= 1.1;
        world.customState.cooldown = 0.35;
        world.spawnExplosion(pair.p1.x, pair.p1.y, pair.color, 25, 260);
        world.eventBus.emit({
          id: Math.floor(Math.random() * 1000000),
          time: world.time,
          type: 'portal',
          position: { x: pair.p1.x, y: pair.p1.y },
          velocity: { x: ball.vx, y: ball.vy },
          impulse: 400,
          ballId: ball.id,
          noteIndex: 0,
        });
        break;
      }
    }
  },
  isFinished: (world: PhysicsWorld) => {
    return world.escapes > 0;
  },
};
