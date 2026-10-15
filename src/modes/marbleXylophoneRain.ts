import { SimulationMode } from './types';
import { PhysicsWorld } from '../engine/world';
import { CollisionEvent } from '../engine/types';

export const MarbleXylophoneRainMode: SimulationMode = {
  id: 'marble_xylophone_rain',
  name: 'marble xylophone rain',
  category: 'fresh_drops',
  description: 'Glass marbles tumble down cascading tuned tone bars. Each bounce lights the chime bar in glowing neon and advances the harmonic song.',
  asmrProfile: 'xylophone',
  hookLines: [
    'wait till all 8 notes resonate',
    'the xylophone harmony at 0:45',
    'glass marbles + tuned acoustic bars',
    'pure acoustic melody tingles',
  ],
  defaultSettings: {
    duration: 60,
    barCount: 8,
    marbleCount: 6,
    restitution: 0.95,
  },
  presets: [
    {
      name: 'viral (8 tuned bars cascade)',
      settings: { duration: 60, barCount: 8, marbleCount: 6 },
    },
    {
      name: 'chill (5 zen chime bars)',
      settings: { duration: 30, barCount: 5, marbleCount: 3 },
    },
    {
      name: 'insane (12 note chromatic staircase)',
      settings: { duration: 60, barCount: 12, marbleCount: 10 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.getSafeArena(settings.platform);
    const cx = arena.centerX;
    const cy = arena.centerY;

    world.config.gravity = { x: 0, y: 850 };
    world.config.restitution = settings.restitution ?? 0.95;

    const barCount = settings.barCount ?? 8;
    const marbleCount = settings.marbleCount ?? 6;

    world.customState = {
      barsHit: 0,
      totalNotesPlayed: 0,
      songCompleted: false,
    };

    // Surrounding boundary
    world.addRing({
      centerX: cx,
      centerY: cy,
      radius: arena.radius - 20,
      thickness: 12,
      angle: 0,
      angularVelocity: 0.1,
      gapSize: 0,
      gapCount: 0,
      color: 'rgba(255, 255, 255, 0.3)',
      shatterOnEscape: false,
    });

    // Cascading tone bars (alternating angled platforms)
    const startY = cy - arena.radius * 0.55;
    const endY = cy + arena.radius * 0.55;
    const dy = (endY - startY) / barCount;
    const barW = 160;

    const colors = ['#00f0ff', '#39ff14', '#ffe600', '#ff007f', '#bf55ec', '#ff7a00', '#00ffcc', '#ff3366'];

    for (let i = 0; i < barCount; i++) {
      const y = startY + i * dy;
      const isLeft = i % 2 === 0;
      const barX = isLeft ? cx - 70 : cx + 70;
      const tilt = isLeft ? 15 : -15;

      const angleRad = (tilt * Math.PI) / 180;
      const dx = (Math.cos(angleRad) * barW) / 2;
      const dyBar = (Math.sin(angleRad) * barW) / 2;

      world.lines.push({
        p1: { x: barX - dx, y: y - dyBar },
        p2: { x: barX + dx, y: y + dyBar },
        thickness: 8,
        color: colors[i % colors.length],
        restitution: 0.96,
      });
    }

    // Glass Marbles dropped with slight staggered offsets
    for (let m = 0; m < marbleCount; m++) {
      world.addBall({
        x: cx + world.prng.range(-40, 40),
        y: startY - 60 - m * 50,
        vx: world.prng.range(-40, 40),
        vy: world.prng.range(10, 50),
        radius: 13,
        restitution: 0.95,
        color: '#ffffff',
        glowColor: '#00f0ff',
      });
    }
  },
  onCollision: (world: PhysicsWorld, event: CollisionEvent) => {
    if (event.type === 'line') {
      world.customState.totalNotesPlayed = (world.customState.totalNotesPlayed || 0) + 1;
      world.customState.barsHit = (world.customState.barsHit || 0) + 1;

      // Glow sparkle on tone bar
      if (event.position) {
        world.particles.push({
          x: event.position.x,
          y: event.position.y,
          vx: world.prng.range(-30, 30),
          vy: world.prng.range(-60, -10),
          radius: 3,
          color: '#ffffff',
          life: 0.5,
          maxLife: 0.5,
        });
      }
    }
  },
  isFinished: (world: PhysicsWorld, settings: Record<string, any>) => {
    const duration = settings.duration ?? 60;
    return world.time >= duration - 1;
  },
};
