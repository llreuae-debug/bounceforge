import { SimulationMode } from './types';
import { getTargetDuration } from '../engine/duration';
import { PhysicsWorld } from '../engine/world';

export const ProceduralAIMode: SimulationMode = {
  id: 'procedural_ai',
  name: 'AI-Generated Kinetic Matrix',
  category: 'advanced',
  description: 'Procedural algorithm computes optimized harmonic peg lattices, kinetic funnels, and resonant flow fields from real math.',
  defaultSettings: {
    complexity: 'balanced',
    latticeDensity: 18,
    flowAngleDeg: 45,
    ballStreams: 4,
  },
  presets: [
    {
      name: 'Harmonic Flow Field',
      settings: { complexity: 'balanced', latticeDensity: 18, ballStreams: 4 },
    },
    {
      name: 'Dense Resonant Matrix',
      settings: { complexity: 'complex', latticeDensity: 28, ballStreams: 6 },
    },
    {
      name: 'Minimal Zen Architecture',
      settings: { complexity: 'minimal', latticeDensity: 10, ballStreams: 2 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.arena;
    const cx = arena.centerX;
    const cy = arena.centerY;
    const r = arena.radius;

    const density = settings.latticeDensity || 18;
    const colors = ['#00f0ff', '#ff007f', '#ffe600', '#00ff88', '#38bdf8', '#c084fc'];

    // Outer Harmonic Boundary
    world.addRing({
      centerX: cx,
      centerY: cy,
      radius: r * 0.95,
      thickness: 10,
      angle: Math.PI * 0.5,
      angularVelocity: 0.12,
      gapSize: 0.16,
      gapCount: 1,
      color: '#38bdf8',
    });

    // Procedural Flow-Field Peg Lattice (Algorithmic Voronoi-inspired golden ratio distribution)
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    for (let i = 1; i <= density * 2; i++) {
      const theta = i * goldenAngle;
      const distFraction = Math.sqrt(i / (density * 2));
      const dist = distFraction * (r * 0.75);

      const px = cx + Math.cos(theta) * dist;
      const py = cy + Math.sin(theta) * dist;

      const toneIdx = Math.floor(distFraction * 12);
      const color = colors[toneIdx % colors.length];

      world.pegs.push({
        id: 800 + i,
        x: px,
        y: py,
        radius: 9 + (i % 3) * 2,
        color,
        score: (toneIdx + 1) * 15,
      });
    }

    // Curvilinear deflection lines computed via algorithmic bezier samples
    const curvePoints = 8;
    for (let c = 0; c < 3; c++) {
      const baseAngle = (c * Math.PI * 2) / 3;
      for (let s = 0; s < curvePoints - 1; s++) {
        const t1 = s / curvePoints;
        const t2 = (s + 1) / curvePoints;
        const r1 = r * (0.3 + t1 * 0.45);
        const r2 = r * (0.3 + t2 * 0.45);
        const a1 = baseAngle + t1 * 1.2;
        const a2 = baseAngle + t2 * 1.2;

        world.lines.push({
          id: 900 + c * 20 + s,
          x1: cx + Math.cos(a1) * r1,
          y1: cy + Math.sin(a1) * r1,
          x2: cx + Math.cos(a2) * r2,
          y2: cy + Math.sin(a2) * r2,
          color: colors[c % colors.length],
          restitution: 0.95,
        });
      }
    }

    // Spawn Multi-Stream Kinetic Spheres
    const streams = settings.ballStreams || 4;
    for (let st = 0; st < streams; st++) {
      const ang = (st * Math.PI * 2) / streams;
      const bx = cx + Math.cos(ang) * (r * 0.2);
      const by = cy + Math.sin(ang) * (r * 0.2);
      const color = colors[st % colors.length];

      world.addBall({
        x: bx,
        y: by,
        vx: -Math.sin(ang) * 260,
        vy: Math.cos(ang) * 260,
        radius: 12,
        mass: 1.0,
        color,
        glowColor: color,
      });
    }

    world.customState.lastSpawn = 0;
  },

  step: (world: PhysicsWorld, dt: number) => {
    world.customState.lastSpawn = (world.customState.lastSpawn || 0) + dt;
    if (world.customState.lastSpawn > 1.2 && world.balls.length < 32) {
      world.customState.lastSpawn = 0;
      const arena = world.arena;
      const ang = world.prng.next() * Math.PI * 2;
      const col = '#00f0ff';

      world.addBall({
        x: arena.centerX + Math.cos(ang) * 50,
        y: arena.centerY + Math.sin(ang) * 50,
        vx: Math.cos(ang) * 220,
        vy: Math.sin(ang) * 220,
        radius: 11,
        mass: 1.0,
        color: col,
        glowColor: col,
      });
    }
  },

  isFinished: (world: PhysicsWorld, settings: Record<string, any>) => {
    return world.time >= getTargetDuration(settings);
  },
};
