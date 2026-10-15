import { SimulationMode } from './types';
import { PhysicsWorld } from '../engine/world';
import { CollisionEvent } from '../engine/types';

export const BassDropEscapeMode: SimulationMode = {
  id: 'bass_drop_escape',
  name: 'bass drop escape',
  category: 'fresh_drops',
  description: 'Tension rises with an accelerating Shepard tone and vibrating containment rings. At exactly second 55, the sub-bass drops and triggers an explosive 4K escape.',
  asmrProfile: 'bass',
  hookLines: [
    'wait for the bass drop at 0:55',
    'the buildup will give you chills',
    'listen with subwoofer or bass headphones',
    'escapes on the exact 808 drop',
  ],
  defaultSettings: {
    duration: 60,
    dropTime: 55,
    ringCount: 6,
    restitution: 0.98,
    ballRadius: 15,
  },
  presets: [
    {
      name: 'viral (55s bass drop climax)',
      settings: { duration: 60, dropTime: 55, ringCount: 6 },
    },
    {
      name: 'chill (28s quick drop)',
      settings: { duration: 30, dropTime: 26, ringCount: 4 },
    },
    {
      name: 'insane (double drop overload)',
      settings: { duration: 60, dropTime: 55, ringCount: 10 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.getSafeArena(settings.platform);
    const cx = arena.centerX;
    const cy = arena.centerY;

    world.config.gravity = { x: 0, y: 880 };
    world.config.restitution = settings.restitution ?? 0.98;

    const ringCount = settings.ringCount ?? 6;
    const dropTime = settings.dropTime ?? 55;
    const radiusStep = Math.round((arena.radius * 0.8) / ringCount);

    world.customState = {
      dropTime,
      dropFired: false,
      tensionVibration: 0,
    };

    const colors = ['#ff007f', '#9d4edd', '#00f0ff', '#ffe600', '#39ff14', '#ff7a00'];

    for (let i = 0; i < ringCount; i++) {
      const radius = arena.radius - 20 - i * radiusStep;
      world.addRing({
        centerX: cx,
        centerY: cy,
        radius,
        thickness: 10,
        angle: 0,
        angularVelocity: (1.0 + i * 0.25) * (i % 2 === 0 ? 1 : -1),
        gapSize: 0, // completely sealed until drop!
        gapCount: 0,
        color: colors[i % colors.length],
        shatterOnEscape: true,
      });
    }

    world.addBall({
      x: cx,
      y: cy - 40,
      vx: world.prng.range(-140, 140),
      vy: world.prng.range(-60, 60),
      radius: settings.ballRadius ?? 15,
      restitution: settings.restitution ?? 0.98,
      color: '#ffffff',
      glowColor: '#ff007f',
    });
  },
  step: (world: PhysicsWorld, dt: number, settings: Record<string, any>) => {
    const dropTime = settings.dropTime ?? 55;

    // Rising tension vibration in the 10 seconds preceding the drop
    if (world.time >= dropTime - 10 && world.time < dropTime) {
      const progress = (world.time - (dropTime - 10)) / 10;
      world.customState.tensionVibration = progress;
      for (const ring of world.rings) {
        ring.angularVelocity = Math.sign(ring.angularVelocity) * (1.2 + progress * 4.5);
      }
    }

    // THE DROP: instant wide breach on all rings + massive shockwave
    if (world.time >= dropTime && !world.customState.dropFired) {
      world.customState.dropFired = true;
      const arena = world.getSafeArena();

      for (const ring of world.rings) {
        ring.gapSize = 1.2;
        ring.gapCount = 2;
        ring.isShattered = true;
      }

      // 808 Sub Bass Shockwave
      world.shockwaves.push({
        x: arena.centerX,
        y: arena.centerY,
        radius: 20,
        maxRadius: arena.radius * 1.5,
        speed: 600,
        color: '#ff007f',
        opacity: 0.95,
      });

      // Launch ball outward with blast velocity
      const ball = world.balls[0];
      if (ball) {
        ball.vx = 480;
        ball.vy = -620;
      }
    }
  },
  onCollision: (world: PhysicsWorld, event: CollisionEvent) => {
    if (event.type === 'ring' && world.customState.tensionVibration > 0.6) {
      world.shockwaves.push({
        x: event.position?.x ?? 540,
        y: event.position?.y ?? 960,
        radius: 10,
        maxRadius: 80,
        speed: 350,
        color: '#00f0ff',
        opacity: 0.7,
      });
    }
  },
  isFinished: (world: PhysicsWorld) => {
    return !!world.customState.dropFired && world.rings.every((r) => r.isShattered);
  },
};
