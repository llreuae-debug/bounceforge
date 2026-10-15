import { SimulationMode } from './types';
import { PhysicsWorld } from '../engine/world';

export const OddOneOutMode: SimulationMode = {
  id: 'odd_one_out',
  name: 'odd one out',
  category: 'fresh_drops',
  description: '1 luminescent 24K gold sphere hidden amongst 50 dense silver spheres. Can the gold ball weave through the crowd and find the escape portal?',
  asmrProfile: 'crystal',
  hookLines: [
    'find the gold ball before 0:05',
    'only 1 out of 50 can escape',
    'track the gold sphere with your eyes',
    'the golden escape was immaculate',
  ],
  defaultSettings: {
    duration: 60,
    greyCount: 45,
    ringCount: 4,
    restitution: 0.94,
  },
  presets: [
    {
      name: 'viral (1 gold in 45 crowd)',
      settings: { duration: 60, greyCount: 45, ringCount: 4 },
    },
    {
      name: 'chill (1 gold in 20 crowd)',
      settings: { duration: 30, greyCount: 20, ringCount: 3 },
    },
    {
      name: 'insane (1 gold in 80 blizzard)',
      settings: { duration: 60, greyCount: 80, ringCount: 5 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.getSafeArena(settings.platform);
    const cx = arena.centerX;
    const cy = arena.centerY;

    world.config.gravity = { x: 0, y: 720 };
    world.config.restitution = settings.restitution ?? 0.94;

    const ringCount = settings.ringCount ?? 4;
    const radiusStep = Math.round((arena.radius * 0.75) / ringCount);

    world.customState = {
      goldEscaped: false,
      goldBallId: 0,
    };

    // Concentric protective rings
    for (let i = 0; i < ringCount; i++) {
      const radius = arena.radius - 25 - i * radiusStep;
      world.addRing({
        centerX: cx,
        centerY: cy,
        radius,
        thickness: 9,
        angle: world.prng.next() * Math.PI * 2,
        angularVelocity: (0.8 + i * 0.2) * (i % 2 === 0 ? 1 : -1),
        gapSize: 0.22,
        gapCount: 1,
        color: '#475569',
        shatterOnEscape: true,
      });
    }

    // 1 Gold Ball
    world.addBall({
      x: cx,
      y: cy - 30,
      vx: world.prng.range(-160, 160),
      vy: world.prng.range(-60, 80),
      radius: 15,
      restitution: 0.98,
      color: '#ffd700',
      glowColor: '#ffaa00',
      label: 'GOLD',
    });

    // 45 Grey Decoy Balls
    const count = settings.greyCount ?? 45;
    for (let i = 0; i < count; i++) {
      world.addBall({
        x: cx + world.prng.range(-arena.radius * 0.45, arena.radius * 0.45),
        y: cy + world.prng.range(-arena.radius * 0.45, arena.radius * 0.45),
        vx: world.prng.range(-120, 120),
        vy: world.prng.range(-120, 120),
        radius: 11,
        restitution: 0.92,
        color: '#64748b',
        glowColor: '#334155',
      });
    }
  },
  step: (world: PhysicsWorld) => {
    const goldBall = world.balls[0];
    // Climax escalation: keep outer ring closed until 35s for crowd tension, then widen towards 55s
    const outerRing = world.rings[0];
    if (outerRing) {
      if (world.time < 35) {
        outerRing.gapSize = 0.04; // micro-slit teaser
      } else {
        const progress = Math.min(1.0, (world.time - 35) / 20);
        outerRing.gapSize = 0.04 + progress * 0.55;
      }
    }

    const arena = world.getSafeArena();
    if (!goldBall) return;

    const dist = Math.hypot(goldBall.x - arena.centerX, goldBall.y - arena.centerY);
    if (dist > arena.radius && !world.customState.goldEscaped) {
      world.customState.goldEscaped = true;
      world.winner = 'GOLD SPHERE';
      world.shockwaves.push({
        x: goldBall.x,
        y: goldBall.y,
        radius: 20,
        maxRadius: 220,
        speed: 450,
        color: '#ffd700',
        opacity: 0.85,
      });
    }
  },
  isFinished: (world: PhysicsWorld) => {
    return !!world.customState.goldEscaped;
  },
};
