import { SimulationMode } from './types';
import { PhysicsWorld } from '../engine/world';
import { CollisionEvent } from '../engine/types';

export const FillRaceMode: SimulationMode = {
  id: 'fill_race',
  name: 'fill race',
  category: 'fresh_drops',
  description: '4 fluorescent balls race across 4 quadrants to fill their territory to 100%. Live percent meters track the battle to the final pixel.',
  asmrProfile: 'sand',
  hookLines: [
    'first color to 100% wins',
    'yellow came from behind at 94%',
    'which quadrant fills up first?',
    'watch the live percentage bars',
  ],
  defaultSettings: {
    duration: 60,
    targetScore: 80,
    restitution: 0.98,
    ballRadius: 15,
  },
  presets: [
    {
      name: 'viral (4 quadrant 100% race)',
      settings: { duration: 60, targetScore: 80 },
    },
    {
      name: 'chill (quick 100 sprint)',
      settings: { duration: 30, targetScore: 40 },
    },
    {
      name: 'insane (500 mega battle)',
      settings: { duration: 60, targetScore: 160 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.getSafeArena(settings.platform);
    const cx = arena.centerX;
    const cy = arena.centerY;

    world.config.gravity = { x: 0, y: 0 };
    world.config.airDrag = 0.01;
    world.config.restitution = settings.restitution ?? 0.98;

    const target = settings.targetScore ?? 250;
    const colors = [
      { name: 'cyan', hex: '#00f0ff', count: 0 },
      { name: 'pink', hex: '#ff007f', count: 0 },
      { name: 'yellow', hex: '#ffe600', count: 0 },
      { name: 'green', hex: '#39ff14', count: 0 },
    ];

    world.customState = {
      targetScore: target,
      racers: colors,
      champion: null,
    };

    // Outer perimeter ring
    world.addRing({
      centerX: cx,
      centerY: cy,
      radius: arena.radius - 20,
      thickness: 12,
      angle: 0,
      angularVelocity: 0.3,
      gapSize: 0,
      gapCount: 0,
      color: '#ffffff',
      shatterOnEscape: false,
    });

    // 4 Racer Balls
    const offsets = [
      { x: -120, y: -120, vx: 220, vy: 160 },
      { x: 120, y: -120, vx: -200, vy: 180 },
      { x: -120, y: 120, vx: 180, vy: -210 },
      { x: 120, y: 120, vx: -210, vy: -170 },
    ];

    colors.forEach((col, idx) => {
      world.addBall({
        x: cx + offsets[idx].x,
        y: cy + offsets[idx].y,
        vx: offsets[idx].vx,
        vy: offsets[idx].vy,
        radius: settings.ballRadius ?? 15,
        restitution: 0.98,
        color: col.hex,
        glowColor: col.hex,
        label: col.name,
      });
    });
  },
  step: (world: PhysicsWorld) => {
    const racers = world.customState?.racers;
    if (!racers || world.winner) return;

    // Climax resolution: if 56s reached and no winner yet, highest count claims victory
    if (world.time >= 56 && !world.winner) {
      const winner = racers.reduce((max: any, r: any) => (r.count > max.count ? r : max));
      winner.count = world.customState.targetScore;
      world.winner = winner.name.toUpperCase();
      world.customState.champion = winner.name.toUpperCase();
    }
  },
  onCollision: (world: PhysicsWorld, event: CollisionEvent) => {
    if (event.type === 'ring' || event.type === 'ball') {
      const racers = world.customState?.racers;
      if (!racers || world.winner) return;

      const idx = (event.ballId - 1) % racers.length;
      if (racers[idx]) {
        racers[idx].count += 1;
        if (racers[idx].count >= world.customState.targetScore && !world.winner) {
          world.winner = racers[idx].name.toUpperCase();
          world.customState.champion = racers[idx].name.toUpperCase();
        }
      }
    }
  },
  isFinished: (world: PhysicsWorld) => {
    return !!world.winner;
  },
};
