import { SimulationMode } from './types';
import { PhysicsWorld } from '../engine/world';
import { CollisionEvent } from '../engine/types';

export const OnePercentMode: SimulationMode = {
  id: 'one_percent',
  name: 'one percent',
  category: 'fresh_drops',
  description: 'A 1% microscopic gap that opens rarely. Watch the attempt counter climb with rapid-fire bounces until attempt #1,000+ triumphs.',
  asmrProfile: 'crystal',
  hookLines: [
    'attempt counter took 1,284 tries',
    'only 1% of viewers watch this escape',
    'the attempt counter is climbing so fast',
    'he actually hit the 1% gap',
  ],
  defaultSettings: {
    duration: 60,
    gapSizeDeg: 12, // ~3% base, shrinks to 1%
    rotationSpeed: 1.8,
    restitution: 1.0,
    ballSpeed: 380,
  },
  presets: [
    {
      name: 'viral (1000+ attempts)',
      settings: { duration: 60, gapSizeDeg: 12, rotationSpeed: 1.8 },
    },
    {
      name: 'chill (500 attempts)',
      settings: { duration: 30, gapSizeDeg: 18, rotationSpeed: 1.2 },
    },
    {
      name: 'insane (0.5% needle hole)',
      settings: { duration: 60, gapSizeDeg: 7, rotationSpeed: 2.6 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.getSafeArena(settings.platform);
    const cx = arena.centerX;
    const cy = arena.centerY;

    world.config.gravity = { x: 0, y: 0 }; // zero-g high-speed bounce
    world.config.airDrag = 0;
    world.config.restitution = 1.0;

    const gapRad = ((settings.gapSizeDeg ?? 12) * Math.PI) / 180;

    world.customState = {
      attempts: 0,
      targetAttempts: 1284,
      escaped: false,
    };

    // Solid fortress ring with microscopic opening
    world.addRing({
      centerX: cx,
      centerY: cy,
      radius: arena.radius - 25,
      thickness: 16,
      angle: 0,
      angularVelocity: settings.rotationSpeed ?? 1.8,
      gapSize: gapRad,
      gapCount: 1,
      color: '#ff0055',
      shatterOnEscape: true,
    });

    // 2 Rapid ricochet balls
    world.addBall({
      x: cx - 40,
      y: cy,
      vx: 320,
      vy: 240,
      radius: 12,
      restitution: 1.0,
      color: '#00f0ff',
      glowColor: '#00f0ff',
    });
  },
  onCollision: (world: PhysicsWorld, event: CollisionEvent) => {
    if (event.type === 'ring') {
      world.customState.attempts = (world.customState.attempts || 0) + 1;
    }
  },
  step: (world: PhysicsWorld) => {
    // When time passes 54s or attempts cross 1,000, widen gap slightly for guaranteed viral climax
    if (world.time > 54 && world.rings[0]) {
      world.rings[0].gapSize = Math.min(0.65, world.rings[0].gapSize + 0.005);
    }
  },
  isFinished: (world: PhysicsWorld) => {
    return world.rings.every((r) => r.isShattered);
  },
};
