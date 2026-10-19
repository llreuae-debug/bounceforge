import { SimulationMode } from './types';
import { PhysicsWorld } from '../engine/world';
import { paceRingEscapes, reelLength } from '../engine/pacing';

export const CountdownEscapeMode: SimulationMode = {
  id: 'countdown_escape',
  name: 'countdown escape',
  category: 'fresh_drops',
  description: 'Big 60→0 countdown timer. Gaps tighten and align so the ball escapes exactly as the clock strikes 0.0.',
  asmrProfile: 'crystal',
  hookLines: [
    'escapes at 0.0 or deletes the channel',
    'watch the timer in the last 3 seconds',
    'can it beat the 60s countdown??',
    'the timing on this is insane',
  ],
  defaultSettings: {
    duration: 60,
    ringCount: 6,
    initialRadius: 460,
    gapSizeDeg: 34,
    rotationSpeedBase: 1.1,
    restitution: 0.98,
    ballRadius: 15,
  },
  presets: [
    {
      name: 'viral (60s buzzer beater)',
      settings: { duration: 60, ringCount: 6, gapSizeDeg: 34, rotationSpeedBase: 1.1 },
    },
    {
      name: 'chill (relaxed 30s)',
      settings: { duration: 30, ringCount: 4, gapSizeDeg: 48, rotationSpeedBase: 0.8 },
    },
    {
      name: 'insane (10 rings crunch)',
      settings: { duration: 60, ringCount: 10, gapSizeDeg: 28, rotationSpeedBase: 1.6 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.getSafeArena(settings.platform);
    const cx = arena.centerX;
    const cy = arena.centerY;

    const duration = settings.duration ?? 60;
    const ringCount = settings.ringCount ?? 6;
    const radiusStep = Math.round((arena.radius * 0.85) / ringCount);
    const gapRad = ((settings.gapSizeDeg ?? 34) * Math.PI) / 180;

    world.config.gravity = { x: 0, y: 980 };
    world.config.restitution = settings.restitution ?? 0.98;

    world.customState = {
      targetDuration: duration,
      escapedAtZero: false,
      timerPulse: 0,
      nearMissCount: 0,
    };

    const colors = ['#00f0ff', '#39ff14', '#ffe600', '#ff007f', '#ff7a00', '#bf55ec'];

    // Outer to inner rings
    for (let i = 0; i < ringCount; i++) {
      const radius = arena.radius - 20 - i * radiusStep;
      if (radius < 50) break;

      // Angular velocity calculated so all gaps line up near the escape window (time: duration - 2s)
      const targetTime = duration - 2.5 + (i * 0.3);
      const rotationsNeeded = 2 + (i % 3);
      const targetAngle = -Math.PI / 2; // top exit
      const speed = (Math.PI * 2 * rotationsNeeded) / targetTime;
      const dir = i % 2 === 0 ? 1 : -1;

      world.addRing({
        centerX: cx,
        centerY: cy,
        radius,
        thickness: 9,
        angle: targetAngle - dir * speed * targetTime,
        angularVelocity: dir * speed,
        gapSize: gapRad,
        gapCount: 1,
        color: colors[i % colors.length],
        shatterOnEscape: true,
      });
    }

    world.addBall({
      x: cx,
      y: cy - 20,
      vx: world.prng.range(-120, 120),
      vy: world.prng.range(-40, 60),
      radius: settings.ballRadius ?? 15,
      restitution: settings.restitution ?? 0.98,
      color: '#ffffff',
      glowColor: '#00f0ff',
    });
  },
  step: (world: PhysicsWorld, dt: number, settings: Record<string, any>) => {
    // Reel clock (video time), so the countdown matches the video at any reel speed
    const duration = reelLength(world, settings);
    const timeLeft = Math.max(0, duration - world.videoTime);

    // Pulse tension red in last 10 seconds
    if (timeLeft <= 10) {
      world.customState.timerPulse = Math.sin(world.videoTime * 8) * 0.5 + 0.5;
    }

    // Escapes land through the reel with the last one in the final seconds
    paceRingEscapes(world, duration, 0.15, 0.85);

    // Dynamic speed ramp in the final stretch (75% -> 97% of the reel)
    const rampStart = duration * 0.75;
    const rampEnd = duration * 0.97;
    if (world.videoTime > rampStart && world.videoTime < rampEnd) {
      const speedRamp = 1 + ((world.videoTime - rampStart) / (rampEnd - rampStart)) * 0.25;
      for (const ring of world.rings) {
        ring.angularVelocity = Math.sign(ring.angularVelocity) * Math.abs(ring.angularVelocity) * speedRamp;
      }
    }
  },
  isFinished: (world: PhysicsWorld, settings: Record<string, any>) => {
    return world.videoTime >= reelLength(world, settings) || world.rings.every((r) => r.isShattered);
  },
};
