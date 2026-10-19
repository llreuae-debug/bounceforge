import { SimulationMode } from './types';
import { PhysicsWorld } from '../engine/world';
import { CollisionEvent } from '../engine/types';
import { reelLength } from '../engine/pacing';

export const GrowTillItCracksMode: SimulationMode = {
  id: 'grow_till_it_cracks',
  name: 'grow till it cracks',
  category: 'fresh_drops',
  description: 'The ball swells with every impact until its volume exceeds the glass chamber. Watch the fracture spiderweb across the surface before the final shatter.',
  asmrProfile: 'destruction',
  hookLines: [
    'it grows 4% every single bounce',
    'wait till it completely fills the ring',
    'the glass crack sound is pure tingles',
    'how big can it actually get??',
  ],
  defaultSettings: {
    duration: 60,
    growthRate: 1.035, // 3.5% per bounce
    initialRadius: 16,
    ringRadius: 360,
    restitution: 0.96,
  },
  presets: [
    {
      name: 'viral (dramatic chamber burst)',
      settings: { growthRate: 1.035, initialRadius: 16, ringRadius: 360 },
    },
    {
      name: 'chill (slow massive giant)',
      settings: { growthRate: 1.018, initialRadius: 20, ringRadius: 380 },
    },
    {
      name: 'insane (rapid explosion)',
      settings: { growthRate: 1.06, initialRadius: 25, ringRadius: 340 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.getSafeArena(settings.platform);
    const cx = arena.centerX;
    const cy = arena.centerY;

    world.config.gravity = { x: 0, y: 780 };
    world.config.restitution = settings.restitution ?? 0.96;

    const ringRadius = settings.ringRadius ?? 360;

    world.customState = {
      growthRate: settings.growthRate ?? 1.035,
      cracks: [] as Array<{ x1: number; y1: number; x2: number; y2: number }>,
      ringRadius,
      burst: false,
      startRadius: settings.initialRadius ?? 16,
    };

    // Glass Chamber ring (closed until broken by pressure)
    world.addRing({
      centerX: cx,
      centerY: cy,
      radius: ringRadius,
      thickness: 14,
      angle: 0,
      angularVelocity: 0.5,
      gapSize: 0,
      gapCount: 0,
      color: '#00f0ff',
      shatterOnEscape: true,
    });

    world.addBall({
      x: cx,
      y: cy - 40,
      vx: world.prng.range(-160, 160),
      vy: world.prng.range(-60, 80),
      radius: settings.initialRadius ?? 16,
      restitution: settings.restitution ?? 0.96,
      color: '#ff007f',
      glowColor: '#ff007f',
    });
  },
  step: (world: PhysicsWorld, _dt: number, settings: Record<string, any>) => {
    // Sparse bounces still keep up with the schedule: grow gently toward the curve
    const ball = world.balls[0];
    const ring = world.rings[0];
    if (!ball || !ring || ring.isShattered) return;
    const floor = scheduledRadius(world, settings) * 0.9;
    if (ball.radius < floor) ball.radius = Math.min(floor, ball.radius * 1.004);
    if (ball.radius >= ring.radius * 0.85) burstChamber(world);
  },
  onCollision: (world: PhysicsWorld, event: CollisionEvent, settings: Record<string, any>) => {
    if (event.type === 'ring') {
      const ball = world.balls[0];
      const ring = world.rings[0];
      if (!ball || !ring) return;

      // Every bounce grows the ball, but never ahead of the schedule, so the burst
      // lands near the end of the reel whatever the growth rate or bounce frequency
      const rate = world.customState.growthRate || 1.035;
      const cap = Math.min(ring.radius * 0.92, scheduledRadius(world, settings));
      ball.radius = Math.max(ball.radius, Math.min(cap, ball.radius * rate));

      // Add a glass crack segment near impact
      if (event.position) {
        const angle = Math.atan2(event.position.y - ring.centerY, event.position.x - ring.centerX);
        const r1 = ring.radius - 10;
        const r2 = ring.radius + 10;
        world.customState.cracks.push({
          x1: ring.centerX + Math.cos(angle - 0.1) * r1,
          y1: ring.centerY + Math.sin(angle - 0.1) * r1,
          x2: ring.centerX + Math.cos(angle + 0.1) * r2,
          y2: ring.centerY + Math.sin(angle + 0.1) * r2,
        });
      }

      // If ball fills 85%+ of ring, shatter chamber!
      if (ball.radius >= ring.radius * 0.85) burstChamber(world);
    }
  },
  isFinished: (world: PhysicsWorld) => {
    return world.rings.every((r) => r.isShattered);
  },
};

/** Radius the ball should have reached by now: grows to the burst size at ~92% of the reel. */
function scheduledRadius(world: PhysicsWorld, settings: Record<string, any>): number {
  const ring = world.rings[0];
  const start = world.customState.startRadius || 16;
  const burstAt = ring ? ring.radius * 0.86 : 320;
  const p = Math.min(1, world.videoTime / (reelLength(world, settings) * 0.92));
  return start * Math.pow(burstAt / start, p);
}

function burstChamber(world: PhysicsWorld): void {
  const ring = world.rings[0];
  if (!ring || ring.isShattered) return;
  ring.isShattered = true;
  world.customState.burst = true;
  world.lastEventTime = world.videoTime;

  // Massive particle dispersion
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const spd = world.prng.range(180, 500);
    world.particles.push({
      x: ring.centerX + Math.cos(a) * ring.radius,
      y: ring.centerY + Math.sin(a) * ring.radius,
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd,
      radius: world.prng.range(2, 6),
      color: '#00f0ff',
      life: 1.0,
      maxLife: 1.0,
    });
  }

  // Audible burst for preview and export
  world.eventBus.emit({
    id: Math.floor(Math.random() * 1000000),
    time: world.videoTime,
    type: 'escape',
    position: { x: ring.centerX, y: ring.centerY },
    velocity: { x: 0, y: 0 },
    impulse: 400,
    ballId: world.balls[0]?.id ?? 0,
    noteIndex: 0,
  });
}
