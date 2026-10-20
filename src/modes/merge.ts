import { SimulationMode } from './types';
import { PhysicsWorld } from '../engine/world';
import { CollisionEvent } from '../engine/types';

const MERGE_TIERS = [
  { tier: 1, radius: 14, color: '#ff3b30', name: 'Cherry' },
  { tier: 2, radius: 18, color: '#ff9500', name: 'Berry' },
  { tier: 3, radius: 24, color: '#ffcc00', name: 'Lemon' },
  { tier: 4, radius: 30, color: '#34c759', name: 'Kiwi' },
  { tier: 5, radius: 38, color: '#00c7be', name: 'Aqua' },
  { tier: 6, radius: 46, color: '#30b0c7', name: 'Blue' },
  { tier: 7, radius: 56, color: '#5856d6', name: 'Grape' },
  { tier: 8, radius: 68, color: '#af52de', name: 'Plum' },
  { tier: 9, radius: 82, color: '#ff2d55', name: 'Peach' },
  { tier: 10, radius: 98, color: '#a2845e', name: 'Coconut' },
  { tier: 11, radius: 116, color: '#30d158', name: 'Melon' },
  { tier: 12, radius: 140, color: '#ffd60a', name: 'SOLAR NOVA' },
];

export const MergeMode: SimulationMode = {
  id: 'merge',
  name: 'Tier Merge Drop',
  category: 'core',
  description: 'Balls drop into the bowl and fuse on contact with equal tiers, expanding across 12 vibrant tiers up to the Solar Nova.',
  defaultSettings: {
    dropInterval: 1.5,
    bowlRadius: 400,
    maxTier: 12,
  },
  presets: [
    {
      name: 'Standard Fruit Drop',
      settings: { dropInterval: 1.5, bowlRadius: 400 },
    },
    {
      name: 'Rapid Cascade (Fast Drop)',
      settings: { dropInterval: 0.8, bowlRadius: 420 },
    },
    {
      name: 'Zen Fusion (Slow Drop)',
      settings: { dropInterval: 2.2, bowlRadius: 380 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.getSafeArena(settings.platform);
    const cx = arena.centerX;
    const cy = arena.centerY;
    const radius = Math.min(arena.radius, settings.bowlRadius ?? arena.radius);

    // Solid container bowl (open at the top)
    world.addRing({
      centerX: cx,
      centerY: cy,
      radius,
      thickness: 16,
      angle: -Math.PI / 2, // gap at top
      angularVelocity: 0,  // stationary bowl
      gapSize: 0.9,
      gapCount: 1,
      color: '#a855f7',
      shatterOnEscape: false,
    });

    world.customState.lastDropTime = 0;
    world.customState.dropInterval = settings.dropInterval ?? 1.5;
    world.customState.score = 0;
    world.customState.hasReachedTier12 = false;

    // Initial 2 tier-1 balls
    world.addBall({
      x: cx - 50,
      y: cy - 100,
      radius: MERGE_TIERS[0].radius,
      tier: 1,
      color: MERGE_TIERS[0].color,
      glowColor: MERGE_TIERS[0].color,
    });
    world.addBall({
      x: cx + 50,
      y: cy - 100,
      radius: MERGE_TIERS[0].radius,
      tier: 1,
      color: MERGE_TIERS[0].color,
      glowColor: MERGE_TIERS[0].color,
    });
  },
  step: (world: PhysicsWorld) => {
    const cx = world.width / 2;
    const interval = world.customState.dropInterval ?? 1.5;

    if (world.time - world.customState.lastDropTime >= interval) {
      world.customState.lastDropTime = world.time;

      // Drop random low-tier ball (tier 1, 2, or 3)
      const tierIdx = Math.floor(world.prng.range(0, 3));
      const tierDef = MERGE_TIERS[tierIdx];

      world.addBall({
        x: cx + world.prng.range(-60, 60),
        y: 220,
        vx: world.prng.range(-40, 40),
        vy: 120,
        radius: tierDef.radius,
        tier: tierDef.tier,
        color: tierDef.color,
        glowColor: tierDef.color,
        restitution: 0.7,
      });
    }

    world.customState.counterLabel = 'SCORE';
    world.customState.counterValue = world.customState.score;
  },
  onCollision: (world: PhysicsWorld, event: CollisionEvent) => {
    if (event.type === 'ball' && event.targetBallId) {
      const b1 = world.balls.find((b) => b.id === event.ballId);
      const b2 = world.balls.find((b) => b.id === event.targetBallId);

      if (b1 && b2 && b1.isAlive && b2.isAlive && b1.tier && b2.tier && b1.tier === b2.tier) {
        // Fuse balls!
        b1.isAlive = false;
        b2.isAlive = false;

        const nextTier = b1.tier + 1;
        const tierDef = MERGE_TIERS[Math.min(nextTier - 1, MERGE_TIERS.length - 1)];

        world.customState.score = (world.customState.score || 0) + nextTier * 100;
        world.spawnExplosion(event.position.x, event.position.y, tierDef.color, 25, 260);

        if (nextTier >= 12) {
          world.customState.hasReachedTier12 = true;
          world.winner = 'SOLAR NOVA ACHIEVED!';
        }

        // Spawn merged higher-tier ball
        world.addBall({
          x: event.position.x,
          y: event.position.y,
          vx: (b1.vx + b2.vx) / 2,
          vy: (b1.vy + b2.vy) / 2,
          radius: tierDef.radius,
          tier: nextTier,
          color: tierDef.color,
          glowColor: tierDef.color,
          restitution: 0.7,
        });

        world.eventBus.emit({
          id: Math.floor(Math.random() * 1000000),
          time: world.videoTime,
          type: 'merge',
          position: event.position,
          velocity: event.velocity,
          impulse: 400,
          ballId: b1.id,
          noteIndex: nextTier,
        });
      }
    }
  },
  isFinished: (world: PhysicsWorld) => {
    return world.customState.hasReachedTier12 === true;
  },
};
