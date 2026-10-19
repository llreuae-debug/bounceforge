import { SimulationMode } from './types';
import { PhysicsWorld } from '../engine/world';
import { CollisionEvent } from '../engine/types';
import { reelLength } from '../engine/pacing';

export const SoapCubeCutMode: SimulationMode = {
  id: 'soap_cube_cut',
  name: 'soap cube cut',
  category: 'fresh_drops',
  description: 'Procedurally layered pastel soap block sliced slice-by-slice by a high-tension steel wire. Ultra-crisp kinetic crunch ASMR.',
  asmrProfile: 'soap',
  hookLines: [
    'the most satisfying soap cutting video',
    'pure kinetic sand + soap crunch ASMR',
    'wait for the final bottom slice',
    'listen with headphones on for max tingles',
  ],
  defaultSettings: {
    duration: 60,
    layers: 16,
    blockWidth: 320,
    blockHeight: 320,
    restitution: 0.92,
  },
  presets: [
    {
      name: 'viral (16 pastel layers)',
      settings: { duration: 60, layers: 16 },
    },
    {
      name: 'chill (8 thick soap slices)',
      settings: { duration: 30, layers: 8 },
    },
    {
      name: 'insane (32 micro grid cuts)',
      settings: { duration: 60, layers: 32 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.getSafeArena(settings.platform);
    const cx = arena.centerX;
    const cy = arena.centerY;

    world.config.gravity = { x: 0, y: 820 };
    world.config.restitution = 0.92;

    const layersCount = settings.layers ?? 16;
    const bw = settings.blockWidth ?? 320;
    const bh = settings.blockHeight ?? 320;
    const layerH = bh / layersCount;
    const topY = cy - bh / 2;

    const palette = ['#ffb3ba', '#ffdfba', '#ffffba', '#baffc9', '#bae1ff', '#e8dff5'];

    world.customState = {
      layersCount,
      cutIndex: 0,
      slicesCut: 0,
      totalSlices: layersCount,
      fullyCut: false,
    };

    // Bounding container
    world.addRing({
      centerX: cx,
      centerY: cy,
      radius: arena.radius - 20,
      thickness: 10,
      angle: 0,
      angularVelocity: 0.2,
      gapSize: 0,
      gapCount: 0,
      color: '#ffffff',
      shatterOnEscape: false,
    });

    // Horizontal cutting wire peg shelves
    for (let i = 0; i < layersCount; i++) {
      const y = topY + i * layerH;
      world.lines.push({
        id: i + 1,
        x1: cx - bw / 2,
        y1: y,
        x2: cx + bw / 2,
        y2: y,
        color: palette[i % palette.length],
        restitution: 0.88,
      });
    }

    // Heavy slicing bead
    world.addBall({
      x: cx,
      y: topY - 50,
      vx: world.prng.range(-80, 80),
      vy: 120,
      radius: 16,
      restitution: 0.92,
      color: '#ffffff',
      glowColor: '#ffb3ba',
    });
  },
  step: (world: PhysicsWorld, dt: number, settings: Record<string, any>) => {
    // Slicing progression paced to the reel (video time), last slice just before the end
    const total = world.customState.totalSlices || 16;
    const cutWindow = Math.max(5, reelLength(world, settings) - 1.5);
    const targetCut = Math.min(total, Math.floor((world.videoTime / cutWindow) * total));

    while ((world.customState.slicesCut || 0) < targetCut && world.lines.length > 0) {
      world.lines.shift();
      world.customState.slicesCut = (world.customState.slicesCut || 0) + 1;
    }
  },
  onCollision: (world: PhysicsWorld, event: CollisionEvent) => {
    // Soft crunch particle shavings on wire slice contact
    if (event.position) {
      for (let k = 0; k < 6; k++) {
        world.particles.push({
          x: event.position.x + world.prng.range(-15, 15),
          y: event.position.y + world.prng.range(-5, 5),
          vx: world.prng.range(-40, 40),
          vy: world.prng.range(20, 80),
          size: world.prng.range(2, 4),
          alpha: 1,
          color: '#ffffba',
          life: 0.6,
          maxLife: 0.6,
        });
      }
    }
  },
  isFinished: (world: PhysicsWorld) => {
    return (world.customState.slicesCut || 0) >= (world.customState.totalSlices || 16);
  },
};
