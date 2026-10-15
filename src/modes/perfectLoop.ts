import { SimulationMode } from './types';
import { PhysicsWorld } from '../engine/world';

export const PerfectLoopMode: SimulationMode = {
  id: 'perfect_loop',
  name: 'perfect loop',
  category: 'fresh_drops',
  description: 'A closed orbital choreography engineered so the final frame seamlessly matches frame 0 for infinite replay retention.',
  asmrProfile: 'crystal',
  hookLines: [
    'watch when it loops at the end',
    'you will not notice when it restarts',
    'the seamless loop is 100% pure math',
    'let this play 3 times and see',
  ],
  defaultSettings: {
    duration: 30,
    cycleCount: 6,
    orbitRadius: 220,
    ballCount: 8,
  },
  presets: [
    {
      name: 'viral (30s infinite loop)',
      settings: { duration: 30, cycleCount: 6, ballCount: 8 },
    },
    {
      name: 'chill (15s hypnotic loop)',
      settings: { duration: 15, cycleCount: 3, ballCount: 6 },
    },
    {
      name: 'insane (60s complex harmonic)',
      settings: { duration: 60, cycleCount: 12, ballCount: 12 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.getSafeArena(settings.platform);
    const cx = arena.centerX;
    const cy = arena.centerY;

    world.config.gravity = { x: 0, y: 0 };
    world.config.airDrag = 0;
    world.config.restitution = 1.0;

    const ballCount = settings.ballCount ?? 8;
    const orbitR = settings.orbitRadius ?? 220;
    const duration = settings.duration ?? 30;
    const cycles = settings.cycleCount ?? 6;
    const omega = (Math.PI * 2 * cycles) / duration;

    world.customState = {
      cx,
      cy,
      orbitR,
      omega,
      duration,
      loopPointReached: false,
    };

    // Resonating concentric loop guides
    world.addRing({
      centerX: cx,
      centerY: cy,
      radius: arena.radius - 30,
      thickness: 10,
      angle: 0,
      angularVelocity: omega / cycles,
      gapSize: 0.8,
      gapCount: 3,
      color: '#00f0ff',
      shatterOnEscape: false,
    });

    world.addRing({
      centerX: cx,
      centerY: cy,
      radius: orbitR,
      thickness: 4,
      angle: 0,
      angularVelocity: -omega / cycles,
      gapSize: 0,
      gapCount: 0,
      color: 'rgba(255, 255, 255, 0.2)',
      shatterOnEscape: false,
    });

    // Balls initialized at closed Lissajous phase positions
    const colors = ['#00f0ff', '#39ff14', '#ff007f', '#ffe600', '#00ffcc', '#bf55ec', '#ff7a00', '#ffffff'];

    for (let i = 0; i < ballCount; i++) {
      const phase = (i / ballCount) * Math.PI * 2;
      world.addBall({
        x: cx + Math.cos(phase) * orbitR,
        y: cy + Math.sin(phase) * orbitR,
        vx: -Math.sin(phase) * orbitR * omega,
        vy: Math.cos(phase) * orbitR * omega,
        radius: 14,
        restitution: 1.0,
        color: colors[i % colors.length],
        glowColor: colors[i % colors.length],
      });
    }
  },
  step: (world: PhysicsWorld, dt: number) => {
    const { cx, cy, orbitR, omega, duration } = world.customState;
    if (!omega) return;

    // Harmonic restoring orbit keeping exact cyclical closure
    const t = world.time;
    const n = world.balls.length;

    for (let i = 0; i < n; i++) {
      const ball = world.balls[i];
      const phase = (i / n) * Math.PI * 2 + omega * t;
      const targetX = cx + Math.cos(phase) * orbitR;
      const targetY = cy + Math.sin(phase) * orbitR;

      ball.vx = (targetX - ball.x) * 15 - Math.sin(phase) * orbitR * omega;
      ball.vy = (targetY - ball.y) * 15 + Math.cos(phase) * orbitR * omega;
    }

    if (t >= duration - 0.1) {
      world.customState.loopPointReached = true;
    }
  },
  isFinished: (world: PhysicsWorld, settings: Record<string, any>) => {
    const duration = settings.duration ?? 30;
    return world.time >= duration;
  },
};
