import { SimulationMode } from './types';
import { PhysicsWorld } from '../engine/world';

export const PendulumWaveMode: SimulationMode = {
  id: 'pendulum_wave',
  name: 'Pendulum Wave Harmony',
  category: 'advanced',
  description: '15 to 30 coupled pendulums tuned to harmonic oscillation periods. Kinetic waves travel and perfectly realign at 60 seconds.',
  defaultSettings: {
    pendulumCount: 21,
    cycleDuration: 60, // Realignment time in seconds
    baseCycles: 51,    // Number of oscillations in cycle duration
    pivotY: 260,
    maxAngleDeg: 35,
  },
  presets: [
    {
      name: 'Harmonic 21 (Realign at 60s)',
      settings: { pendulumCount: 21, cycleDuration: 60, baseCycles: 51 },
    },
    {
      name: 'Dense Symphony (29 Pendulums)',
      settings: { pendulumCount: 29, cycleDuration: 60, baseCycles: 55 },
    },
    {
      name: 'Swift Realignment (30s Cycle)',
      settings: { pendulumCount: 15, cycleDuration: 30, baseCycles: 30 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.getSafeArena(settings.platform);
    const count = settings.pendulumCount ?? 21;
    const cycleT = settings.cycleDuration ?? 60;
    const baseN = settings.baseCycles ?? 51;
    const pivotY = settings.pivotY ?? (arena.safeBox.y + 40);
    const maxTheta = ((settings.maxAngleDeg ?? 35) * Math.PI) / 180;
    const availableWidth = arena.diameter * 0.95;
    const spacing = availableWidth / (count - 1);

    const pendulums = [];
    const g = 980;

    for (let i = 0; i < count; i++) {
      const n = baseN + i;
      const period = cycleT / n;
      const length = g * Math.pow(period / (2 * Math.PI), 2) * 50; // tuned visual scale
      const px = 120 + i * spacing;
      const hue = (i * (360 / count)) % 360;

      pendulums.push({
        x0: px,
        y0: pivotY,
        length,
        period,
        maxTheta,
        color: `hsl(${hue}, 100%, 65%)`,
        currentTheta: maxTheta,
        lastSign: 1,
      });

      world.addBall({
        x: px + Math.sin(maxTheta) * length,
        y: pivotY + Math.cos(maxTheta) * length,
        vx: 0,
        vy: 0,
        radius: 12,
        color: `hsl(${hue}, 100%, 65%)`,
        glowColor: `hsl(${hue}, 100%, 50%)`,
        gravity: 0, // Pendulum analytical kinematics controls motion
      });
    }

    world.customState.pendulums = pendulums;
    world.customState.cycleT = cycleT;

    // Render pendulum suspension strings
    world.customState.onRenderFg = (ctx: CanvasRenderingContext2D) => {
      const plist = world.customState.pendulums;
      if (!plist) return;

      ctx.save();
      for (let i = 0; i < plist.length; i++) {
        const p = plist[i];
        const b = world.balls[i];
        if (!b) continue;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p.x0, p.y0);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      ctx.restore();
    };
  },
  step: (world: PhysicsWorld) => {
    const pendulums = world.customState.pendulums;
    if (!pendulums) return;

    for (let i = 0; i < pendulums.length; i++) {
      const p = pendulums[i];
      const b = world.balls[i];
      if (!b) continue;

      const omega = (2 * Math.PI) / p.period;
      const theta = p.maxTheta * Math.cos(omega * world.time);

      b.x = p.x0 + Math.sin(theta) * p.length;
      b.y = p.y0 + Math.cos(theta) * p.length;

      // Note emission at apex
      const sign = Math.sign(theta);
      if (sign !== p.lastSign && Math.abs(theta) > p.maxTheta * 0.95) {
        p.lastSign = sign;
        world.eventBus.emit({
          id: Math.floor(Math.random() * 1000000),
          time: world.time,
          type: 'wall',
          position: { x: b.x, y: b.y },
          velocity: { x: 0, y: 0 },
          impulse: 250,
          ballId: b.id,
          noteIndex: i,
        });
      }
    }
  },
  isFinished: (world: PhysicsWorld) => {
    return world.time >= (world.customState.cycleT ?? 60);
  },
};
