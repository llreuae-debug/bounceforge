import { SimulationMode } from './types';
import { PhysicsWorld } from '../engine/world';
import { reelLength } from '../engine/pacing';

export const EliminationWheelMode: SimulationMode = {
  id: 'elimination_wheel',
  name: 'elimination wheel',
  category: 'fresh_drops',
  description: 'A spinning roulette wheel with color sectors. Every 8 seconds, the roulette pointer stops and eliminates whichever ball holds that hue until one survivor remains.',
  asmrProfile: 'mechanical',
  hookLines: [
    'which color gets eliminated first?',
    'wheel roulette of doom',
    'the last 2 colors clutched hard',
    'pick your color before the wheel spins',
  ],
  defaultSettings: {
    duration: 60,
    eliminationInterval: 8,
    restitution: 0.98,
    ballRadius: 15,
  },
  presets: [
    {
      name: 'viral (8s wheel ticks)',
      settings: { duration: 60, eliminationInterval: 8 },
    },
    {
      name: 'chill (12s slow roulette)',
      settings: { duration: 50, eliminationInterval: 12 },
    },
    {
      name: 'insane (5s rapid elimination)',
      settings: { duration: 40, eliminationInterval: 5 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.getSafeArena(settings.platform);
    const cx = arena.centerX;
    const cy = arena.centerY;

    world.config.gravity = { x: 0, y: 700 };
    world.config.restitution = settings.restitution ?? 0.98;

    const colors = [
      { name: 'CYAN', hex: '#00f0ff' },
      { name: 'PINK', hex: '#ff007f' },
      { name: 'YELLOW', hex: '#ffe600' },
      { name: 'GREEN', hex: '#39ff14' },
      { name: 'PURPLE', hex: '#bf55ec' },
      { name: 'ORANGE', hex: '#ff7a00' },
    ];

    world.customState = {
      interval: settings.eliminationInterval ?? 8,
      lastEliminationTime: 0,
      activeContestants: [...colors],
      wheelAngle: 0,
    };

    // Outer roulette ring
    world.addRing({
      centerX: cx,
      centerY: cy,
      radius: arena.radius - 20,
      thickness: 14,
      angle: 0,
      angularVelocity: 1.4,
      gapSize: 0,
      gapCount: 0,
      color: '#ffffff',
      shatterOnEscape: false,
    });

    // Spawn 6 contestant balls
    const n = colors.length;
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2;
      const r = arena.radius * 0.4;
      world.addBall({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        vx: world.prng.range(-120, 120),
        vy: world.prng.range(-120, 120),
        radius: settings.ballRadius ?? 15,
        restitution: 0.98,
        color: colors[i].hex,
        glowColor: colors[i].hex,
        label: colors[i].name,
      });
    }
  },
  step: (world: PhysicsWorld, dt: number, settings: Record<string, any>) => {
    world.customState.wheelAngle = (world.customState.wheelAngle || 0) + dt * 2.2;

    // Interval is in video seconds, shortened if needed so the last survivor is crowned
    // by ~90% of the reel (e.g. a 30s reel still finishes)
    const eliminations = Math.max(1, (world.customState.activeContestants?.length || 6) - 1);
    const fitInterval = (reelLength(world, settings) * 0.9) / eliminations;
    const interval = Math.min(world.customState.interval || 8, fitInterval);

    // Check elimination timer
    if (world.videoTime - world.customState.lastEliminationTime >= interval && world.balls.length > 1) {
      world.customState.lastEliminationTime = world.videoTime;

      // Eliminate one random ball with explosion shockwave
      const elimIdx = Math.floor(world.prng.next() * world.balls.length);
      const eliminatedBall = world.balls[elimIdx];

      if (eliminatedBall) {
        world.shockwaves.push({
          x: eliminatedBall.x,
          y: eliminatedBall.y,
          radius: 15,
          maxRadius: 140,
          speed: 400,
          color: eliminatedBall.color,
          opacity: 0.9,
        });

        world.balls.splice(elimIdx, 1);
        world.lastEventTime = world.videoTime;

        // Audible elimination (shatter + note) in preview and export
        world.eventBus.emit({
          id: Math.floor(Math.random() * 1000000),
          time: world.videoTime,
          type: 'escape',
          position: { x: eliminatedBall.x, y: eliminatedBall.y },
          velocity: { x: 0, y: 0 },
          impulse: 350,
          ballId: eliminatedBall.id,
          noteIndex: 0,
        });
      }

      if (world.balls.length === 1 && !world.winner) {
        world.winner = world.balls[0].label || 'CHAMPION';
      }
    }
  },
  isFinished: (world: PhysicsWorld) => {
    return !!world.winner;
  },
};
