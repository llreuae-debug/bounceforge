import { SimulationMode } from './types';
import { PhysicsWorld } from '../engine/world';
import { reelLength } from '../engine/pacing';

export const BubblePopChainMode: SimulationMode = {
  id: 'bubble_pop_chain',
  name: 'bubble pop chain',
  category: 'fresh_drops',
  description: 'A dense hexagonal lattice of iridescent soap bubbles. A single impact sets off an explosive cascading chain reaction popping the entire sheet. Maximum ASMR bubble wrap tingles.',
  asmrProfile: 'bubble',
  hookLines: [
    'the chain reaction popping ASMR',
    'one bubble popped all 64 neighbors',
    'most satisfying bubble pop video',
    'wait for the final bottom bubble to burst',
  ],
  defaultSettings: {
    duration: 60,
    rows: 8,
    cols: 8,
    restitution: 0.95,
  },
  presets: [
    {
      name: 'viral (8x8 bubble sheet cascade)',
      settings: { duration: 60, rows: 8, cols: 8 },
    },
    {
      name: 'chill (5x5 quick pop)',
      settings: { duration: 30, rows: 5, cols: 5 },
    },
    {
      name: 'insane (12x12 mega lattice)',
      settings: { duration: 60, rows: 12, cols: 12 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.getSafeArena(settings.platform);
    const cx = arena.centerX;
    const cy = arena.centerY;

    world.config.gravity = { x: 0, y: 720 };
    world.config.restitution = settings.restitution ?? 0.95;

    const rows = settings.rows ?? 8;
    const cols = settings.cols ?? 8;
    const spacing = 48;
    const startX = cx - ((cols - 1) * spacing) / 2;
    const startY = cy - ((rows - 1) * spacing) / 2;

    const bubbles: Array<{ id: number; x: number; y: number; popped: boolean; color: string }> = [];
    let id = 0;
    const palette = ['#00f0ff', '#ff00aa', '#ffe600', '#39ff14', '#00ffcc', '#d946ef'];

    for (let r = 0; r < rows; r++) {
      const rowOffset = (r % 2) * (spacing / 2);
      for (let c = 0; c < cols; c++) {
        bubbles.push({
          id: id++,
          x: startX + c * spacing + rowOffset,
          y: startY + r * spacing,
          popped: false,
          color: palette[(r + c) % palette.length],
        });
      }
    }

    world.customState = {
      bubbles,
      poppedCount: 0,
      totalBubbles: bubbles.length,
      allPopped: false,
    };

    // Bounding ring
    world.addRing({
      centerX: cx,
      centerY: cy,
      radius: arena.radius - 20,
      thickness: 10,
      angle: 0,
      angularVelocity: 0.15,
      gapSize: 0,
      gapCount: 0,
      color: 'rgba(255, 255, 255, 0.3)',
      shatterOnEscape: false,
    });

    // Cue ball
    world.addBall({
      x: cx,
      y: startY - 80,
      vx: world.prng.range(-80, 80),
      vy: 240,
      radius: 16,
      restitution: 0.96,
      color: '#ffffff',
      glowColor: '#00f0ff',
    });
  },
  step: (world: PhysicsWorld, dt: number, settings: Record<string, any>) => {
    const ball = world.balls[0];
    const bubbles = world.customState.bubbles;
    if (!ball || !bubbles) return;

    // Chain reaction paced in video time so the last bubble pops just before the reel ends
    const total = world.customState.totalBubbles || 64;
    const popWindow = Math.max(5, reelLength(world, settings) - 1.5);
    const targetPopped = Math.min(total, Math.floor((world.videoTime / popWindow) * total));

    while ((world.customState.poppedCount || 0) < targetPopped) {
      // Spread to the nearest unpopped neighbor of the last pop so it reads as a chain
      const last = world.customState.lastPopped;
      let nextBubble: any = null;
      let bestDist = Infinity;
      for (const b of bubbles) {
        if (b.popped) continue;
        const d = last ? Math.hypot(b.x - last.x, b.y - last.y) : b.y;
        if (d < bestDist) {
          bestDist = d;
          nextBubble = b;
        }
      }
      if (!nextBubble) break;
      nextBubble.popped = true;
      world.customState.poppedCount++;
      world.customState.lastPopped = nextBubble;
      world.lastEventTime = world.videoTime;

      // Every pop is audible (melody note + pop texture) and lands in the export audio
      world.eventBus.emit({
        id: Math.floor(Math.random() * 1000000),
        time: world.videoTime,
        type: 'ring',
        position: { x: nextBubble.x, y: nextBubble.y },
        velocity: { x: 0, y: 0 },
        impulse: 220,
        ballId: ball.id,
        noteIndex: world.customState.poppedCount,
      });

      world.shockwaves.push({
        x: nextBubble.x,
        y: nextBubble.y,
        radius: 5,
        maxRadius: 40,
        speed: 250,
        color: nextBubble.color,
        opacity: 0.8,
      });

      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2;
        world.particles.push({
          x: nextBubble.x,
          y: nextBubble.y,
          vx: Math.cos(a) * 100,
          vy: Math.sin(a) * 100,
          size: 2,
          alpha: 1,
          color: nextBubble.color,
          life: 0.35,
          maxLife: 0.35,
        });
      }
    }

    if (world.customState.poppedCount >= world.customState.totalBubbles && !world.winner) {
      world.winner = 'ALL BUBBLES POPPED';
      world.customState.allPopped = true;
    }
  },
  isFinished: (world: PhysicsWorld) => {
    return (world.customState.poppedCount || 0) >= (world.customState.totalBubbles || 64);
  },
};
