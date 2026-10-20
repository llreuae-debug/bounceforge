import { SimulationMode } from './types';
import { getTargetDuration } from '../engine/duration';
import { PhysicsWorld } from '../engine/world';

interface MagneticPole {
  x: number;
  y: number;
  strength: number; // positive = attract, negative = repel
  color: string;
  radius: number;
}

export const MagneticForceFieldMode: SimulationMode = {
  id: 'magnetic_force',
  name: 'Electromagnetic Field',
  category: 'advanced',
  description: 'Metallic spheres orbit and slingshot through positive attractors and negative magnetic force fields with Lorentz forces.',
  defaultSettings: {
    ballCount: 16,
    poleStrength: 450000,
    damping: 0.999,
    chargeMode: 'alternating',
  },
  presets: [
    {
      name: 'Dipole Orbit System',
      settings: { ballCount: 16, poleStrength: 450000, damping: 0.999 },
    },
    {
      name: 'Quadrupole Vortex',
      settings: { ballCount: 24, poleStrength: 600000, damping: 0.998 },
    },
    {
      name: 'Singularity Slingshot',
      settings: { ballCount: 12, poleStrength: 800000, damping: 0.995 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.arena;
    const cx = arena.centerX;
    const cy = arena.centerY;
    const r = arena.radius;

    const ballCount = settings.ballCount || 16;
    const strength = settings.poleStrength || 450000;

    // Outer Containment Ring
    world.addRing({
      centerX: cx,
      centerY: cy,
      radius: r * 0.94,
      thickness: 12,
      angle: 0,
      angularVelocity: 0.05,
      gapSize: 0,
      gapCount: 1,
      color: '#475569',
    });

    // Magnetic Poles (Attractors & Repulsors)
    const poles: MagneticPole[] = [
      { x: cx - r * 0.45, y: cy - r * 0.25, strength: strength, color: '#ef4444', radius: 18 },
      { x: cx + r * 0.45, y: cy - r * 0.25, strength: -strength * 0.8, color: '#3b82f6', radius: 18 },
      { x: cx, y: cy + r * 0.4, strength: strength * 1.1, color: '#ef4444', radius: 22 },
      { x: cx - r * 0.35, y: cy + r * 0.3, strength: -strength * 0.6, color: '#3b82f6', radius: 16 },
      { x: cx + r * 0.35, y: cy + r * 0.3, strength: -strength * 0.6, color: '#3b82f6', radius: 16 },
    ];

    world.customState.poles = poles;

    // Add visual pegs at pole locations
    poles.forEach((pole, idx) => {
      world.pegs.push({
        id: 300 + idx,
        x: pole.x,
        y: pole.y,
        radius: pole.radius,
        color: pole.color,
        score: Math.abs(pole.strength) > 500000 ? 100 : 50,
      });
    });

    // Spawn Metallic Spheres in orbital configurations
    for (let i = 0; i < ballCount; i++) {
      const angle = (i / ballCount) * Math.PI * 2;
      const dist = r * 0.65;
      const speed = 280;

      const vx = -Math.sin(angle) * speed + (world.prng.next() - 0.5) * 40;
      const vy = Math.cos(angle) * speed + (world.prng.next() - 0.5) * 40;

      const isChrome = i % 2 === 0;
      world.addBall({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx,
        vy,
        radius: 11,
        mass: 1.0,
        color: isChrome ? '#e2e8f0' : '#38bdf8',
        glowColor: isChrome ? '#94a3b8' : '#0284c7',
        tag: isChrome ? 'pos' : 'neg',
      });
    }

    world.config.gravity = { x: 0, y: 80 };
  },

  step: (world: PhysicsWorld, dt: number) => {
    const poles: MagneticPole[] = world.customState.poles || [];
    const arena = world.arena;

    for (const ball of world.balls) {
      for (const pole of poles) {
        const dx = pole.x - ball.x;
        const dy = pole.y - ball.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        if (dist > 15 && dist < arena.radius * 1.5) {
          const force = (pole.strength / (distSq + 1200)) * dt;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          ball.vx += fx;
          ball.vy += fy;
        }
      }

      for (const other of world.balls) {
        if (other.id === ball.id) continue;
        const dx = other.x - ball.x;
        const dy = other.y - ball.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < 1600 && distSq > 4) {
          const dist = Math.sqrt(distSq);
          const repulse = (3000 / distSq) * dt;
          ball.vx -= (dx / dist) * repulse;
          ball.vy -= (dy / dist) * repulse;
        }
      }

      ball.vx *= 0.999;
      ball.vy *= 0.999;
    }
  },

  isFinished: (world: PhysicsWorld, settings: Record<string, any>) => {
    return world.time >= getTargetDuration(settings);
  },
};
