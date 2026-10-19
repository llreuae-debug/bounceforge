import { SimulationMode } from './types';
import { PhysicsWorld } from '../engine/world';
import { CollisionEvent } from '../engine/types';
import { reelLength } from '../engine/pacing';

export const NameBattleMode: SimulationMode = {
  id: 'name_battle',
  name: 'name battle',
  category: 'fresh_drops',
  description: 'Contestants tagged with user names clash in an enclosed octagon. Each impact depletes HP bars until one champion stands crowned.',
  asmrProfile: 'battle',
  hookLines: [
    'who is winning this name duel??',
    'tag someone who would lose first',
    'hp bar went to 1% and clutched',
    'drop your name in the comments for part 2',
  ],
  defaultSettings: {
    duration: 60,
    names: 'ALEX, JORDAN, SAM, CHRIS',
    startingHp: 100,
    restitution: 0.98,
    ballRadius: 18,
  },
  presets: [
    {
      name: 'viral (4 contenders)',
      settings: { names: 'ALEX, JORDAN, SAM, CHRIS', startingHp: 100 },
    },
    {
      name: 'chill (duo showdown)',
      settings: { names: 'RED, BLUE', startingHp: 150 },
    },
    {
      name: 'insane (6 way royal rumble)',
      settings: { names: 'ACE, NEO, NOVA, VIPER, GHOST, TITAN', startingHp: 80 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.getSafeArena(settings.platform);
    const cx = arena.centerX;
    const cy = arena.centerY;

    world.config.gravity = { x: 0, y: 550 };
    world.config.restitution = settings.restitution ?? 0.98;

    const rawNames = typeof settings.names === 'string' ? settings.names.split(',').map((s) => s.trim().toUpperCase()) : ['ALEX', 'JORDAN', 'SAM', 'CHRIS'];
    const palette = ['#00f0ff', '#ff007f', '#ffe600', '#39ff14', '#9d4edd', '#ff7a00'];

    world.customState = {
      fighters: rawNames.map((name, i) => ({
        id: i,
        name,
        hp: settings.startingHp ?? 100,
        maxHp: settings.startingHp ?? 100,
        color: palette[i % palette.length],
        alive: true,
      })),
      champion: null,
    };

    // Outer bounding ring (impenetrable arena)
    world.addRing({
      centerX: cx,
      centerY: cy,
      radius: arena.radius - 20,
      thickness: 14,
      angle: 0,
      angularVelocity: 0.4,
      gapSize: 0, // closed arena
      gapCount: 0,
      color: '#ffffff',
      shatterOnEscape: false,
    });

    // Spawn fighter balls
    const n = rawNames.length;
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2;
      const dist = arena.radius * 0.45;

      world.addBall({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: world.prng.range(-150, 150),
        vy: world.prng.range(-150, 150),
        radius: settings.ballRadius ?? 18,
        restitution: 0.98,
        color: palette[i % palette.length],
        glowColor: palette[i % palette.length],
        label: rawNames[i],
      });
    }
  },
  step: (world: PhysicsWorld, dt: number, settings: Record<string, any>) => {
    const fighters = world.customState?.fighters;
    if (!fighters || world.winner) return;

    // Sudden death: once an elimination slot opens, drain the weakest fighter so the
    // knockouts stay on schedule (video time, so it works at any reel speed)
    if (world.videoTime >= nextEliminationTime(world, settings)) {
      const aliveList = fighters.filter((f: any) => f.alive);
      if (aliveList.length > 1) {
        const lowest = aliveList.reduce((min: any, curr: any) => (curr.hp < min.hp ? curr : min));
        const drainPerSec = lowest.maxHp / 2.5;
        // dt is physics time; convert back to video time for a steady on-screen drain
        const videoDt = dt / Math.max(0.05, world.getEffectiveSpeed());
        lowest.hp = Math.max(0, lowest.hp - drainPerSec * videoDt);
        if (lowest.hp === 0) knockOut(world, lowest);
      }
      declareWinnerIfDone(world);
    }
  },
  onCollision: (world: PhysicsWorld, event: CollisionEvent, settings: Record<string, any>) => {
    const fighters = world.customState?.fighters;
    if (!fighters || world.winner) return;

    if (event.type === 'ball') {
      const fA = fighters[event.ballId - 1];
      const fB = event.targetBallId ? fighters[event.targetBallId - 1] : undefined;
      const damage = Math.round(Math.min(12, Math.max(3, event.impulse / 50)));
      // Until the next elimination slot opens, hits can't finish anyone off
      const floor = world.videoTime >= nextEliminationTime(world, settings) ? 0 : 1;

      for (const f of [fA, fB]) {
        if (f && f.alive) {
          f.hp = Math.max(floor, f.hp - damage);
          if (f.hp === 0) knockOut(world, f);
        }
      }
    }

    declareWinnerIfDone(world);
  },
  isFinished: (world: PhysicsWorld) => {
    return !!world.winner;
  },
};

/**
 * Knockouts are spread from ~25% to ~90% of the reel so a 2-name duel or a 6-way rumble
 * both crown the winner shortly before the end instead of at 10s or never.
 */
function nextEliminationTime(world: PhysicsWorld, settings: Record<string, any>): number {
  const fighters = world.customState?.fighters || [];
  const total = Math.max(1, fighters.length - 1);
  const done = fighters.filter((f: any) => !f.alive).length;
  const k = Math.min(total, done + 1);
  return reelLength(world, settings) * (0.25 + 0.65 * (k / total));
}

function knockOut(world: PhysicsWorld, fighter: any): void {
  fighter.alive = false;
  world.lastEventTime = world.videoTime;
}

function declareWinnerIfDone(world: PhysicsWorld): void {
  const fighters = world.customState?.fighters;
  if (!fighters || world.winner) return;
  const aliveList = fighters.filter((f: any) => f.alive);
  if (aliveList.length <= 1) {
    const champ = aliveList[0] || fighters[0];
    world.winner = champ.name;
    world.customState.champion = champ;
    world.isFinished = true;
  }
}
