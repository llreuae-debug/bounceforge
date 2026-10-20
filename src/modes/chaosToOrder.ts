import { SimulationMode } from './types';
import { PhysicsWorld } from '../engine/world';

export const ChaosToOrderMode: SimulationMode = {
  id: 'chaos_to_order',
  name: 'chaos to order',
  category: 'fresh_drops',
  description: 'Chaotic bouncing balls gradually align and settle into a mathematically perfect rainbow lattice grid. Deeply satisfying ASMR color snap.',
  asmrProfile: 'sand',
  hookLines: [
    'from pure chaos to pure symmetry',
    'wait for the color snap at 0:52',
    'the most satisfying thing you will see today',
    'oddly satisfying rainbow alignment',
  ],
  defaultSettings: {
    duration: 60,
    ballCount: 36,
    gridSize: 6,
    restitution: 0.85,
  },
  presets: [
    {
      name: 'viral (6x6 rainbow grid)',
      settings: { duration: 60, ballCount: 36, gridSize: 6 },
    },
    {
      name: 'chill (4x4 quick snap)',
      settings: { duration: 30, ballCount: 16, gridSize: 4 },
    },
    {
      name: 'insane (8x8 dense matrix)',
      settings: { duration: 60, ballCount: 64, gridSize: 8 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.getSafeArena(settings.platform);
    const cx = arena.centerX;
    const cy = arena.centerY;

    world.config.gravity = { x: 0, y: 0 };
    world.config.airDrag = 0.08;
    world.config.restitution = 0.85;

    const gridSize = settings.gridSize ?? 6;
    const total = gridSize * gridSize;
    const spacing = (arena.radius * 1.4) / gridSize;
    const startX = cx - ((gridSize - 1) * spacing) / 2;
    const startY = cy - ((gridSize - 1) * spacing) / 2;

    const targets: Array<{ x: number; y: number; color: string }> = [];
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const hue = Math.round(((r * gridSize + c) / total) * 320);
        targets.push({
          x: startX + c * spacing,
          y: startY + r * spacing,
          color: `hsl(${hue}, 100%, 60%)`,
        });
      }
    }

    world.customState = {
      targets,
      orderRatio: 0,
      snapped: false,
    };

    // Bounding ring
    world.addRing({
      centerX: cx,
      centerY: cy,
      radius: arena.radius - 20,
      thickness: 10,
      angle: 0,
      angularVelocity: 0.2,
      gapSize: 0,
      gapCount: 0,
      color: 'rgba(255, 255, 255, 0.4)',
      shatterOnEscape: false,
    });

    // Spawn balls with high initial chaotic velocity
    targets.forEach((tgt) => {
      world.addBall({
        x: cx + world.prng.range(-arena.radius * 0.7, arena.radius * 0.7),
        y: cy + world.prng.range(-arena.radius * 0.7, arena.radius * 0.7),
        vx: world.prng.range(-280, 280),
        vy: world.prng.range(-280, 280),
        radius: 11,
        restitution: 0.85,
        color: tgt.color,
        glowColor: tgt.color,
      });
    });
  },
  step: (world: PhysicsWorld, dt: number, settings: Record<string, any>) => {
    const duration = settings.duration ?? 60;
    const targets = world.customState.targets;
    if (!targets) return;

    // Transition from physics chaos to magnetic grid pull starting around 35s
    const progress = Math.max(0, Math.min(1, (world.time - 32) / (duration - 40)));
    world.customState.orderRatio = progress;

    if (progress > 0) {
      for (let i = 0; i < world.balls.length; i++) {
        const ball = world.balls[i];
        const tgt = targets[i];
        if (!tgt) continue;

        // Spring force towards target
        const dx = tgt.x - ball.x;
        const dy = tgt.y - ball.y;
        const dist = Math.hypot(dx, dy);

        const strength = 18 * progress;
        ball.vx += dx * strength * dt;
        ball.vy += dy * strength * dt;

        // High damping as it locks into order
        ball.vx *= Math.pow(0.85, dt * 60);
        ball.vy *= Math.pow(0.85, dt * 60);

        if (dist < 4 && progress > 0.95 && !world.customState.snapped) {
          world.customState.snapped = true;
          world.shockwaves.push({
            x: tgt.x,
            y: tgt.y,
            radius: 5,
            maxRadius: 60,
            speed: 200,
            color: tgt.color,
            opacity: 0.7,
          });
        }
      }
    }
  },
  isFinished: (world: PhysicsWorld, settings: Record<string, any>) => {
    const duration = settings.duration ?? 60;
    return world.time >= duration - 1;
  },
};
