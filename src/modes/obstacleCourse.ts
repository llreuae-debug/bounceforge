import { SimulationMode } from './types';
import { getTargetDuration } from '../engine/duration';
import { PhysicsWorld } from '../engine/world';

export const ObstacleCourseMode: SimulationMode = {
  id: 'obstacle_course',
  name: 'Pinball Obstacle Course',
  category: 'advanced',
  description: 'Balls navigate a multi-tiered obstacle course with spinning paddles, spring bumpers, angled ramps, and speed boosters.',
  defaultSettings: {
    ballCount: 6,
    spinnerSpeed: 2.5,
    bumperPower: 1.6,
    rampCount: 4,
  },
  presets: [
    {
      name: 'Dynamic Pinball Gauntlet',
      settings: { ballCount: 6, spinnerSpeed: 2.5, bumperPower: 1.6 },
    },
    {
      name: 'High Kinetic Mayhem',
      settings: { ballCount: 12, spinnerSpeed: 4.0, bumperPower: 2.0 },
    },
    {
      name: 'Precision Trial',
      settings: { ballCount: 3, spinnerSpeed: 1.5, bumperPower: 1.3 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.arena;
    const cx = arena.centerX;
    const cy = arena.centerY;
    const r = arena.radius;

    const ballCount = settings.ballCount || 6;
    const colors = ['#00f0ff', '#ff007f', '#ffe600', '#00ff88', '#a855f7', '#f97316'];

    // Outer Bounding Ring
    world.addRing({
      centerX: cx,
      centerY: cy,
      radius: r * 0.95,
      thickness: 10,
      angle: Math.PI * 0.25,
      angularVelocity: 0.1,
      gapSize: 0.15,
      gapCount: 1,
      color: '#38bdf8',
    });

    // Angled Sloped Guide Ramps
    world.lines.push({
      id: 10,
      x1: cx - r * 0.7,
      y1: cy - r * 0.6,
      x2: cx - r * 0.1,
      y2: cy - r * 0.35,
      color: '#ff007f',
      restitution: 1.1,
    });
    world.lines.push({
      id: 11,
      x1: cx + r * 0.7,
      y1: cy - r * 0.45,
      x2: cx + r * 0.1,
      y2: cy - r * 0.2,
      color: '#00f0ff',
      restitution: 1.1,
    });
    world.lines.push({
      id: 12,
      x1: cx - r * 0.6,
      y1: cy + r * 0.1,
      x2: cx,
      y2: cy + r * 0.3,
      color: '#ffe600',
      restitution: 1.2,
    });

    // Spring Bumpers
    const bumperPositions = [
      { x: cx - r * 0.35, y: cy - r * 0.15 },
      { x: cx + r * 0.35, y: cy - r * 0.05 },
      { x: cx, y: cy - r * 0.5 },
      { x: cx - r * 0.25, y: cy + r * 0.45 },
      { x: cx + r * 0.3, y: cy + r * 0.45 },
      { x: cx, y: cy },
    ];

    bumperPositions.forEach((pos, idx) => {
      world.pegs.push({
        id: 100 + idx,
        x: pos.x,
        y: pos.y,
        radius: 18,
        color: idx % 2 === 0 ? '#ff007f' : '#00f0ff',
        score: (idx + 1) * 50,
      });
    });

    // Rotating Spinner Paddles stored in customState
    world.customState.spinnerSpeed = settings.spinnerSpeed || 2.5;
    world.customState.spinners = [
      { id: 201, cx: cx - r * 0.25, cy: cy + r * 0.1, length: r * 0.25 },
      { id: 202, cx: cx + r * 0.3, cy: cy + r * 0.15, length: r * 0.28 },
    ];

    // Initialize Balls
    for (let i = 0; i < ballCount; i++) {
      const angle = (i / ballCount) * Math.PI * 2;
      const dist = r * 0.3;
      const color = colors[i % colors.length];

      world.addBall({
        x: cx + Math.cos(angle) * dist,
        y: cy - r * 0.65 + Math.sin(angle) * 30,
        vx: world.prng.range(-150, 150),
        vy: world.prng.range(50, 150),
        radius: 13,
        mass: 1.2,
        color,
        glowColor: color,
      });
    }
  },

  step: (world: PhysicsWorld, dt: number, settings: Record<string, any>) => {
    const arena = world.arena;
    const speed = settings.spinnerSpeed || 2.5;

    // Update dynamic rotating spinners
    if (!world.customState.spinnerAngle) {
      world.customState.spinnerAngle = 0;
    }
    world.customState.spinnerAngle += speed * dt;

    // Remove old dynamic spinner line segments
    world.lines = world.lines.filter((l) => (l.id ?? 0) < 200 || (l.id ?? 0) > 210);

    // Recreate rotated spinner line segments
    const spinners = world.customState.spinners || [];
    spinners.forEach((sp: any, idx: number) => {
      const ang = world.customState.spinnerAngle * (idx % 2 === 0 ? 1 : -1) + idx * 1.5;
      const cos = Math.cos(ang) * (sp.length / 2);
      const sin = Math.sin(ang) * (sp.length / 2);

      world.lines.push({
        id: 201 + idx,
        x1: sp.cx - cos,
        y1: sp.cy - sin,
        x2: sp.cx + cos,
        y2: sp.cy + sin,
        color: '#CCFF00',
        restitution: 1.35,
      });
    });

    // Keep balls energized so obstacle course stays thrilling
    for (const ball of world.balls) {
      const spd = Math.hypot(ball.vx, ball.vy);
      if (spd < 120 && ball.y > arena.centerY + arena.radius * 0.5) {
        ball.vy = -350 - world.prng.next() * 200;
        ball.vx += (world.prng.next() - 0.5) * 250;
      }
    }
  },

  isFinished: (world: PhysicsWorld, settings: Record<string, any>) => {
    return world.time >= getTargetDuration(settings);
  },
};
