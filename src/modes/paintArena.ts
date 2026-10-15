import { SimulationMode } from './types';
import { getTargetDuration } from '../engine/duration';
import { PhysicsWorld } from '../engine/world';
import { CollisionEvent } from '../engine/types';

interface PaintSplat {
  x: number;
  y: number;
  radius: number;
  color: string;
  ballId: number;
}

export const PaintArenaMode: SimulationMode = {
  id: 'paint_arena',
  name: 'Paint Splat Arena',
  category: 'advanced',
  description: 'Balls splatter vivid paint on the arena floor with each bounce. A live progress bar tracks territory ownership.',
  defaultSettings: {
    ballCount: 4,
    radius: 420,
    splatSize: 45,
    maxSplats: 800,
  },
  presets: [
    {
      name: '4-Color Turf War',
      settings: { ballCount: 4, radius: 420, splatSize: 45 },
    },
    {
      name: 'Neon Duet (Cyan vs Pink)',
      settings: { ballCount: 2, radius: 400, splatSize: 60 },
    },
    {
      name: 'Macro Splatters (Giant Blobs)',
      settings: { ballCount: 4, radius: 420, splatSize: 80 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.getSafeArena(settings.platform);
    const cx = arena.centerX;
    const cy = arena.centerY;
    const radius = Math.min(arena.radius, settings.radius ?? arena.radius);

    world.addRing({
      centerX: cx,
      centerY: cy,
      radius,
      thickness: 16,
      angle: 0,
      angularVelocity: 0.6,
      gapSize: 0.35,
      gapCount: 1,
      color: '#ffffff',
      shatterOnEscape: false,
    });

    world.customState.splats = [] as PaintSplat[];
    const ballConfigs = [
      { name: 'CYAN', color: '#00f0ff' },
      { name: 'MAGENTA', color: '#ff007f' },
      { name: 'YELLOW', color: '#ffe600' },
      { name: 'LIME', color: '#00ff88' },
    ];

    const ballCount = settings.ballCount ?? 4;
    for (let i = 0; i < ballCount; i++) {
      const cfg = ballConfigs[i % ballConfigs.length];
      const angle = (i * Math.PI * 2) / ballCount;
      world.addBall({
        x: cx + Math.cos(angle) * 140,
        y: cy + Math.sin(angle) * 140,
        vx: Math.cos(angle + 1) * 280,
        vy: Math.sin(angle + 1) * 280,
        radius: 16,
        color: cfg.color,
        glowColor: cfg.color,
        name: cfg.name,
      });
    }

    // Paint Splat Background Render
    world.customState.onRenderBg = (ctx: CanvasRenderingContext2D) => {
      const splats = world.customState.splats as PaintSplat[];
      ctx.save();
      for (let i = 0; i < splats.length; i++) {
        const s = splats[i];
        ctx.fillStyle = s.color;
        ctx.globalAlpha = 0.45;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    // Live Percentage Territory Bar Overlay
    world.customState.onRenderFg = (ctx: CanvasRenderingContext2D) => {
      const splats = world.customState.splats as PaintSplat[];
      if (!splats.length) return;

      const total = splats.length;
      const barY = 160;
      const barW = world.width - 120;
      const barH = 20;
      let currX = 60;

      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(currX, barY, barW, barH);

      for (let i = 0; i < world.balls.length; i++) {
        const b = world.balls[i];
        const count = splats.filter((s) => s.ballId === b.id).length;
        const ratio = count / total;
        const segmentW = barW * ratio;

        ctx.fillStyle = b.color;
        ctx.fillRect(currX, barY, segmentW, barH);
        currX += segmentW;
      }
      ctx.restore();
    };
  },
  onCollision: (world: PhysicsWorld, event: CollisionEvent, settings: Record<string, any>) => {
    if (event.type === 'ring' || event.type === 'wall' || event.type === 'ball') {
      const splats = world.customState.splats as PaintSplat[];
      const maxSplats = settings.maxSplats ?? 800;
      const ball = world.balls.find((b) => b.id === event.ballId);
      if (ball) {
        if (splats.length >= maxSplats) {
          splats.shift();
        }
        splats.push({
          x: event.position.x,
          y: event.position.y,
          radius: settings.splatSize ?? 45,
          color: ball.color,
          ballId: ball.id,
        });
      }
    }
  },
  isFinished: (world: PhysicsWorld, settings: Record<string, any>) => {
    return world.time >= getTargetDuration(settings);
  },
};
