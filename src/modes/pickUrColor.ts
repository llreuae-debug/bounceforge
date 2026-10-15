import { SimulationMode } from './types';
import { PhysicsWorld } from '../engine/world';
import { CollisionEvent } from '../engine/types';

export const PickUrColorMode: SimulationMode = {
  id: 'pick_ur_color',
  name: 'pick ur color',
  category: 'fresh_drops',
  description: '4 colored contestants in a high-stakes survival arena. Predict the winner in the first 2 seconds before the elimination ring collapses.',
  asmrProfile: 'battle',
  hookLines: [
    'pick ur color before 0:02',
    'cyan, pink, yellow, or green?',
    'comment ur color right now',
    'i bet 100% you guessed wrong',
  ],
  defaultSettings: {
    duration: 60,
    ringCount: 4,
    restitution: 0.99,
    ballRadius: 16,
  },
  presets: [
    {
      name: 'viral (4 contenders)',
      settings: { duration: 60, ringCount: 4 },
    },
    {
      name: 'chill (extended duel)',
      settings: { duration: 45, ringCount: 3 },
    },
    {
      name: 'insane (speed ring storm)',
      settings: { duration: 60, ringCount: 6 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.getSafeArena(settings.platform);
    const cx = arena.centerX;
    const cy = arena.centerY;

    world.config.gravity = { x: 0, y: 750 };
    world.config.restitution = settings.restitution ?? 0.99;

    const colors = [
      { name: 'cyan', hex: '#00f0ff', glow: '#0284c7' },
      { name: 'pink', hex: '#ff007f', glow: '#be185d' },
      { name: 'yellow', hex: '#ffe600', glow: '#ca8a04' },
      { name: 'green', hex: '#39ff14', glow: '#15803d' },
    ];

    world.customState = {
      introCardDuration: 2.0,
      contestants: colors.map((c) => ({ ...c, alive: true, score: 0 })),
      winner: null,
      winnerSpotlightRadius: 0,
    };

    // Add 4 concentric rings with gaps
    const ringCount = settings.ringCount ?? 4;
    const radiusStep = Math.round((arena.radius * 0.75) / ringCount);

    for (let i = 0; i < ringCount; i++) {
      const radius = arena.radius - 20 - i * radiusStep;
      world.addRing({
        centerX: cx,
        centerY: cy,
        radius,
        thickness: 10,
        angle: world.prng.next() * Math.PI * 2,
        angularVelocity: (0.9 + i * 0.25) * (i % 2 === 0 ? 1 : -1),
        gapSize: 0.55,
        gapCount: 1,
        color: '#ffffff',
        shatterOnEscape: false,
      });
    }

    // Add 4 distinct balls with initial separation
    const offsets = [
      { x: -60, y: -60 },
      { x: 60, y: -60 },
      { x: -60, y: 60 },
      { x: 60, y: 60 },
    ];

    colors.forEach((col, idx) => {
      world.addBall({
        x: cx + offsets[idx].x,
        y: cy + offsets[idx].y,
        vx: world.prng.range(-140, 140),
        vy: world.prng.range(-140, 140),
        radius: settings.ballRadius ?? 16,
        restitution: settings.restitution ?? 0.99,
        color: col.hex,
        glowColor: col.glow,
        label: col.name,
      });
    });
  },
  step: (world: PhysicsWorld, dt: number) => {
    // Escaping out of outer ring triggers victory or elimination
    const arena = world.getSafeArena();
    const cx = arena.centerX;
    const cy = arena.centerY;

    // Check which ball escaped arena bounds first
    for (const ball of world.balls) {
      const dist = Math.hypot(ball.x - cx, ball.y - cy);
      if (dist > arena.radius && !world.winner) {
        world.winner = ball.label ? `${ball.label.toUpperCase()}` : 'CYAN';
        world.customState.winner = world.winner;
        break;
      }
    }

    if (world.winner) {
      world.customState.winnerSpotlightRadius = Math.min(
        arena.radius,
        (world.customState.winnerSpotlightRadius || 0) + dt * 450
      );
    }
  },
  onCollision: (world: PhysicsWorld, event: CollisionEvent) => {
    if (event.type === 'ball') {
      world.shockwaves.push({
        x: event.position?.x ?? 540,
        y: event.position?.y ?? 960,
        radius: 12,
        maxRadius: 75,
        speed: 300,
        color: '#ffffff',
        opacity: 0.6,
      });
    }
  },
  isFinished: (world: PhysicsWorld) => {
    return !!world.winner;
  },
};
