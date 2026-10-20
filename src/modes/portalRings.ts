import { SimulationMode } from './types';
import { PhysicsWorld } from '../engine/world';
import { AsmrEngine } from '../audio/asmrEngine';

export interface PortalNode {
  x: number;
  y: number;
  radius: number;
  usesLeft: number;
  maxUses: number;
  isBroken: boolean;
}

export interface PortalWearPair {
  id: number;
  p1: PortalNode;
  p2: PortalNode;
  color: string;
}

export const PortalRingsMode: SimulationMode = {
  id: 'portal_rings',
  name: 'Quantum Portal Rings',
  category: 'advanced',
  description:
    'Paired quantum portals warp the ball across spatial dimensions while conserving speed and direction. Each portal pair has a use limit — crack rings show wear until they shatter and free the ball.',
  asmrProfile: 'crystal',
  hookLines: [
    'each portal only has 5 uses left',
    'watch the portal crack rings wear down',
    'instant velocity conservation warp',
    'portal glass pop shatter is so clean',
    'all portals broken = instant escape',
  ],
  defaultSettings: {
    portalPairs: 3,
    usesPerPortal: 5,
    radius: 420,
    ringsCount: 3,
    duration: 60,
  },
  presets: [
    {
      name: 'Chill Quantum (2 Pairs, 8 Uses Each)',
      settings: { portalPairs: 2, usesPerPortal: 8, ringsCount: 3, radius: 400 },
    },
    {
      name: 'Viral Portal Wear (3 Pairs, 5 Uses Each)',
      settings: { portalPairs: 3, usesPerPortal: 5, ringsCount: 3, radius: 420 },
    },
    {
      name: 'Insane Fragile Gates (4 Pairs, 3 Uses Each, Fast)',
      settings: { portalPairs: 4, usesPerPortal: 3, ringsCount: 4, radius: 430 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.getSafeArena(settings.platform);
    const cx = arena.centerX;
    const cy = arena.centerY;
    const maxR = Math.min(arena.radius, settings.radius ?? arena.radius);
    const rings = settings.ringsCount ?? 3;
    const pairCount = Math.max(2, Math.min(5, settings.portalPairs ?? 3));
    const maxUses = Math.max(2, Math.min(10, settings.usesPerPortal ?? 5));

    // Outer boundary ring(s)
    for (let i = 0; i < rings; i++) {
      world.addRing({
        centerX: cx,
        centerY: cy,
        radius: maxR - i * 65,
        thickness: 14,
        angle: 0,
        angularVelocity: (i % 2 === 0 ? 1 : -1) * 0.65,
        gapSize: 0.38,
        gapCount: 1,
        color: '#818cf8',
        shatterOnEscape: true,
      });
    }

    const pairs: PortalWearPair[] = [];
    const colors = ['#00f0ff', '#ff007f', '#ffd600', '#00ff88', '#a855f7'];

    for (let p = 0; p < pairCount; p++) {
      const a1 = (p * Math.PI * 2) / pairCount;
      const a2 = a1 + Math.PI * 0.85;
      const r1 = 170 + p * 55;
      const r2 = 230 + p * 45;

      pairs.push({
        id: p + 1,
        p1: {
          x: cx + Math.cos(a1) * r1,
          y: cy + Math.sin(a1) * r1,
          radius: 24,
          usesLeft: maxUses,
          maxUses,
          isBroken: false,
        },
        p2: {
          x: cx + Math.cos(a2) * r2,
          y: cy + Math.sin(a2) * r2,
          radius: 24,
          usesLeft: maxUses,
          maxUses,
          isBroken: false,
        },
        color: colors[p % colors.length],
      });
    }

    world.customState.portalPairs = pairs;
    world.customState.cooldown = 0;
    world.customState.totalPortalsBroken = 0;
    world.customState.totalPortals = pairCount * 2;

    // HUD Counter
    world.customState.counterLabel = 'PORTALS REMAINING';
    world.customState.counterValue = `${pairCount * 2} / ${pairCount * 2}`;

    // Render Portals & Wear Crack Rings on Foreground
    world.customState.onRenderFg = (ctx: CanvasRenderingContext2D) => {
      const plist = world.customState.portalPairs as PortalWearPair[];
      ctx.save();

      for (const pair of plist) {
        for (const portal of [pair.p1, pair.p2]) {
          if (portal.isBroken) continue;

          const wearRatio = portal.usesLeft / portal.maxUses; // 1 = fresh, 0 = broken

          // 1. Outer Swirling Ring
          ctx.strokeStyle = pair.color;
          ctx.lineWidth = 3.5;
          ctx.shadowColor = pair.color;
          ctx.shadowBlur = 12;

          ctx.beginPath();
          ctx.arc(portal.x, portal.y, portal.radius, 0, Math.PI * 2);
          ctx.stroke();

          // 2. Portal Wear Crack Ring (segments or arc indicating remaining uses)
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = wearRatio > 0.4 ? '#ffffff' : '#ff3366';
          ctx.shadowColor = ctx.strokeStyle;
          ctx.shadowBlur = 6;

          const wearAngle = wearRatio * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(portal.x, portal.y, portal.radius - 5, -Math.PI / 2, -Math.PI / 2 + wearAngle);
          ctx.stroke();

          // 3. Inner Portal Core
          const grad = ctx.createRadialGradient(portal.x, portal.y, 2, portal.x, portal.y, portal.radius - 7);
          grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
          grad.addColorStop(0.6, pair.color);
          grad.addColorStop(1, 'rgba(0, 0, 0, 0.4)');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(portal.x, portal.y, portal.radius - 7, 0, Math.PI * 2);
          ctx.fill();

          // 4. Uses count label inside portal
          ctx.fillStyle = '#ffffff';
          ctx.shadowBlur = 0;
          ctx.font = 'bold 11px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${portal.usesLeft}`, portal.x, portal.y);
        }
      }
      ctx.restore();
    };

    world.addBall({
      x: cx,
      y: cy - 100,
      vx: 190,
      vy: 130,
      radius: 14,
      color: '#ffd600',
      glowColor: '#ffaa00',
      restitution: 1.0,
      maxSpeed: 3000,
    });
  },

  step: (world: PhysicsWorld, dt: number) => {
    world.customState.cooldown = Math.max(0, (world.customState.cooldown || 0) - dt);
    if (world.customState.cooldown > 0) return;

    const pairs = world.customState.portalPairs as PortalWearPair[];
    const ball = world.balls[0];
    if (!ball || !ball.isAlive) return;

    for (const pair of pairs) {
      // Check P1 -> Teleport to P2 with EXACT same speed & direction
      if (!pair.p1.isBroken && !pair.p2.isBroken) {
        if (Math.hypot(ball.x - pair.p1.x, ball.y - pair.p1.y) < ball.radius + pair.p1.radius - 4) {
          // Decrement wear on entering portal
          pair.p1.usesLeft--;
          if (pair.p1.usesLeft <= 0) {
            pair.p1.isBroken = true;
            world.customState.totalPortalsBroken++;
            // Glass pop + shard burst
            world.spawnRingShatter({
              id: 888,
              ringIndex: 0,
              centerX: pair.p1.x,
              centerY: pair.p1.y,
              radius: pair.p1.radius,
              thickness: 8,
              angle: 0,
              angularVelocity: 0,
              gapSize: 0,
              gapCount: 1,
              color: pair.color,
              isShattered: true,
            });
            try {
              AsmrEngine.getInstance().playBreakEffectSound('glass_shatter');
            } catch {}
          }

          // Teleport to P2 preserving velocity direction & speed
          const speed = Math.hypot(ball.vx, ball.vy);
          const dirX = speed > 0.001 ? ball.vx / speed : 1;
          const dirY = speed > 0.001 ? ball.vy / speed : 0;

          ball.x = pair.p2.x + dirX * (pair.p2.radius + ball.radius + 2);
          ball.y = pair.p2.y + dirY * (pair.p2.radius + ball.radius + 2);
          ball.vx = dirX * speed;
          ball.vy = dirY * speed;

          world.customState.cooldown = 0.28;
          world.spawnExplosion(pair.p2.x, pair.p2.y, pair.color, 24, 250);

          world.eventBus.emit({
            id: Math.floor(Math.random() * 1000000),
            time: world.videoTime,
            type: 'portal',
            position: { x: pair.p2.x, y: pair.p2.y },
            velocity: { x: ball.vx, y: ball.vy },
            impulse: 400,
            ballId: ball.id,
            noteIndex: 0,
          });

          const remaining = (world.customState.totalPortals || 6) - world.customState.totalPortalsBroken;
          world.customState.counterValue = `${remaining} / ${world.customState.totalPortals || 6}`;
          break;
        }

        // Check P2 -> Teleport to P1 with EXACT same speed & direction
        if (Math.hypot(ball.x - pair.p2.x, ball.y - pair.p2.y) < ball.radius + pair.p2.radius - 4) {
          pair.p2.usesLeft--;
          if (pair.p2.usesLeft <= 0) {
            pair.p2.isBroken = true;
            world.customState.totalPortalsBroken++;
            world.spawnRingShatter({
              id: 888,
              ringIndex: 0,
              centerX: pair.p2.x,
              centerY: pair.p2.y,
              radius: pair.p2.radius,
              thickness: 8,
              angle: 0,
              angularVelocity: 0,
              gapSize: 0,
              gapCount: 1,
              color: pair.color,
              isShattered: true,
            });
            try {
              AsmrEngine.getInstance().playBreakEffectSound('glass_shatter');
            } catch {}
          }

          const speed = Math.hypot(ball.vx, ball.vy);
          const dirX = speed > 0.001 ? ball.vx / speed : 1;
          const dirY = speed > 0.001 ? ball.vy / speed : 0;

          ball.x = pair.p1.x + dirX * (pair.p1.radius + ball.radius + 2);
          ball.y = pair.p1.y + dirY * (pair.p1.radius + ball.radius + 2);
          ball.vx = dirX * speed;
          ball.vy = dirY * speed;

          world.customState.cooldown = 0.28;
          world.spawnExplosion(pair.p1.x, pair.p1.y, pair.color, 24, 250);

          world.eventBus.emit({
            id: Math.floor(Math.random() * 1000000),
            time: world.videoTime,
            type: 'portal',
            position: { x: pair.p1.x, y: pair.p1.y },
            velocity: { x: ball.vx, y: ball.vy },
            impulse: 400,
            ballId: ball.id,
            noteIndex: 0,
          });

          const remaining = (world.customState.totalPortals || 6) - world.customState.totalPortalsBroken;
          world.customState.counterValue = `${remaining} / ${world.customState.totalPortals || 6}`;
          break;
        }
      }
    }
  },

  isFinished: (world: PhysicsWorld) => {
    return world.escapes > 0 || (world.customState.totalPortalsBroken >= (world.customState.totalPortals || 6));
  },
};
