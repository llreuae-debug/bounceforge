import {
  Ball,
  ArcRing,
  LineSegment,
  Spike,
  Peg,
  Particle,
  Shockwave,
  CollisionEvent,
  PhysicsWorldConfig,
  SimulationStats,
  Vector2D,
} from './types';
import { Mulberry32 } from './prng';
import { PhysicsEventBus } from './eventBus';
import { SpatialHashGrid } from './spatialHash';
import { checkBallArcRingCollision, checkBallBallCollision, checkBallLineCollision } from './collision';
import { getSafeArena, SafeArena, PlatformType } from '../render/safeArea';

export class PhysicsWorld {
  public width: number;
  public height: number;
  public config: PhysicsWorldConfig;
  public prng: Mulberry32;
  public eventBus: PhysicsEventBus;
  public spatialHash: SpatialHashGrid;

  public balls: Ball[] = [];
  public rings: ArcRing[] = [];
  public lines: LineSegment[] = [];
  public spikes: Spike[] = [];
  public pegs: Peg[] = [];
  public particles: Particle[] = [];
  public shockwaves: Shockwave[] = [];

  public time: number = 0;
  public bounces: number = 0;
  public escapes: number = 0;
  public activeRingIndex: number = 0;
  public isFinished: boolean = false;
  public winner?: string;
  public customState: Record<string, any> = {};

  // Maximum particle capacity to prevent unbounded memory
  private maxParticles: number = 2000;

  constructor(
    width: number = 1080,
    height: number = 1920,
    seed: number = 1337,
    config?: Partial<PhysicsWorldConfig>
  ) {
    this.width = width;
    this.height = height;
    this.prng = new Mulberry32(seed);
    this.eventBus = new PhysicsEventBus();
    this.spatialHash = new SpatialHashGrid(width, height, 40);

    this.config = {
      width,
      height,
      substeps: 4, // 4 * 60fps = 240Hz fixed physics
      gravity: { x: 0, y: 980 },
      airDrag: 0.05,
      restitution: 0.98,
      antiStallMinSpeed: 40,
      antiStallImpulse: 150,
      ...config,
    };
  }

  reset(seed?: number): void {
    if (seed !== undefined) {
      this.prng.setSeed(seed);
    }
    this.balls = [];
    this.rings = [];
    this.lines = [];
    this.spikes = [];
    this.pegs = [];
    this.particles = [];
    this.shockwaves = [];
    this.time = 0;
    this.bounces = 0;
    this.escapes = 0;
    this.activeRingIndex = 0;
    this.isFinished = false;
    this.winner = undefined;
    this.customState = {};
    this.eventBus.clearLog();
  }

  getSafeArena(platform: PlatformType = 'all'): SafeArena {
    return getSafeArena(this.width, this.height, platform);
  }

  get arena(): SafeArena {
    return getSafeArena(this.width, this.height, 'all');
  }

  addBall(params: Partial<Ball> & { x: number; y: number }): Ball {
    const ball: Ball = {
      id: this.balls.length + 1,
      x: params.x,
      y: params.y,
      vx: params.vx ?? 0,
      vy: params.vy ?? 0,
      radius: params.radius ?? 14,
      mass: params.mass ?? 1,
      restitution: params.restitution ?? this.config.restitution,
      gravity: params.gravity ?? 1,
      airDrag: params.airDrag ?? this.config.airDrag,
      maxSpeed: params.maxSpeed ?? 3000,
      growthPerBounce: params.growthPerBounce ?? 0,
      color: params.color ?? '#38bdf8',
      glowColor: params.glowColor ?? '#0284c7',
      trail: [],
      isAlive: true,
      bounces: 0,
      tier: params.tier,
      name: params.name,
      score: params.score ?? 0,
      tag: params.tag,
    };
    this.balls.push(ball);
    return ball;
  }

  addRing(params: Partial<ArcRing> & { radius: number; centerX: number; centerY: number }): ArcRing {
    const ring: ArcRing = {
      id: this.rings.length + 1,
      ringIndex: this.rings.length,
      centerX: params.centerX,
      centerY: params.centerY,
      radius: params.radius,
      thickness: params.thickness ?? 12,
      angle: params.angle ?? 0,
      angularVelocity: params.angularVelocity ?? 1.2,
      gapSize: params.gapSize ?? 0.5,
      gapCount: params.gapCount ?? 1,
      color: params.color ?? '#a855f7',
      isShattered: false,
      shatterOnEscape: params.shatterOnEscape ?? true,
      segments: params.segments,
    };
    this.rings.push(ring);
    return ring;
  }

  spawnExplosion(x: number, y: number, color: string, count: number = 30, speed: number = 350): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const angle = this.prng.next() * Math.PI * 2;
      const spd = speed * (0.3 + 0.7 * this.prng.next());
      const life = 0.6 + this.prng.next() * 0.8;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color,
        size: 2 + this.prng.next() * 4,
        alpha: 1,
        maxLife: life,
        life,
        type: 'spark',
      });
    }
  }

  spawnRingShatter(ring: ArcRing): void {
    const shardCount = 40;
    const step = (Math.PI * 2) / shardCount;
    for (let i = 0; i < shardCount; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const angle = i * step + this.prng.range(-0.05, 0.05);
      const px = ring.centerX + Math.cos(angle) * ring.radius;
      const py = ring.centerY + Math.sin(angle) * ring.radius;
      const outSpeed = 150 + this.prng.next() * 250;
      const life = 1.0 + this.prng.next() * 0.8;

      this.particles.push({
        x: px,
        y: py,
        vx: Math.cos(angle) * outSpeed,
        vy: Math.sin(angle) * outSpeed,
        color: ring.color,
        size: ring.thickness * (0.6 + 0.4 * this.prng.next()),
        alpha: 1,
        maxLife: life,
        life,
        rotation: angle,
        angularVelocity: this.prng.range(-5, 5),
        type: 'shard',
      });
    }

    // Add radial shockwave
    this.shockwaves.push({
      x: ring.centerX,
      y: ring.centerY,
      radius: ring.radius * 0.8,
      maxRadius: ring.radius * 1.5,
      alpha: 0.9,
      color: ring.color,
    });
  }

  step(dt: number): void {
    const subDt = dt / this.config.substeps;

    for (let stepIdx = 0; stepIdx < this.config.substeps; stepIdx++) {
      this.time += subDt;

      // 1. Advance rotating rings
      for (let i = 0; i < this.rings.length; i++) {
        const ring = this.rings[i];
        if (!ring.isShattered) {
          ring.angle += ring.angularVelocity * subDt;
        }
      }

      // 2. Clear spatial hash & insert balls
      this.spatialHash.clear();
      for (let i = 0; i < this.balls.length; i++) {
        const b = this.balls[i];
        if (b.isAlive) {
          this.spatialHash.insert(b, i);
        }
      }

      // 3. Update balls
      for (let i = 0; i < this.balls.length; i++) {
        const b = this.balls[i];
        if (!b.isAlive) continue;

        // Gravity & drag
        b.vx += this.config.gravity.x * b.gravity * subDt;
        b.vy += this.config.gravity.y * b.gravity * subDt;

        b.vx *= Math.max(0, 1 - b.airDrag * subDt);
        b.vy *= Math.max(0, 1 - b.airDrag * subDt);

        // Clamp max speed
        const speed = Math.hypot(b.vx, b.vy);
        if (speed > b.maxSpeed) {
          b.vx = (b.vx / speed) * b.maxSpeed;
          b.vy = (b.vy / speed) * b.maxSpeed;
        }

        // Anti-stall: if ball is too slow, apply tiny seeded impulse
        if (speed < this.config.antiStallMinSpeed) {
          const randAngle = this.prng.next() * Math.PI * 2;
          b.vx += Math.cos(randAngle) * this.config.antiStallImpulse;
          b.vy += Math.sin(randAngle) * this.config.antiStallImpulse;
        }

        // Position integration
        b.x += b.vx * subDt;
        b.y += b.vy * subDt;

        // Trail record (every few substeps)
        if (stepIdx === 0) {
          b.trail.unshift({ x: b.x, y: b.y });
          if (b.trail.length > 25) {
            b.trail.pop();
          }
        }

        // Ring collisions
        for (let r = 0; r < this.rings.length; r++) {
          const ring = this.rings[r];
          if (ring.isShattered) continue;

          const res = checkBallArcRingCollision(b, ring, this.time);
          if (res.escaped) {
            this.escapes++;
            if (ring.shatterOnEscape) {
              ring.isShattered = true;
              this.spawnRingShatter(ring);
            }
            if (res.event) {
              this.eventBus.emit(res.event);
            }
          } else if (res.collided) {
            b.bounces++;
            this.bounces++;
            if (b.growthPerBounce > 0) {
              b.radius += b.growthPerBounce;
            }
            if (res.event) {
              this.eventBus.emit(res.event);
            }
            this.spawnExplosion(res.event?.position.x ?? b.x, res.event?.position.y ?? b.y, b.color, 12, 180);
          }
        }

        // Line collisions
        for (let l = 0; l < this.lines.length; l++) {
          const line = this.lines[l];
          const col = checkBallLineCollision(b, line, this.time);
          if (col) {
            b.bounces++;
            this.bounces++;
            this.eventBus.emit(col);
            this.spawnExplosion(col.position.x, col.position.y, line.color, 10, 160);
          }
        }

        // Ball-to-ball collisions (via spatial hash)
        const candidates = this.spatialHash.getPotentialCollisions(b, i);
        for (let c = 0; c < candidates.length; c++) {
          const otherIdx = candidates[c];
          const other = this.balls[otherIdx];
          if (!other || !other.isAlive) continue;

          const col = checkBallBallCollision(b, other, this.time);
          if (col) {
            b.bounces++;
            other.bounces++;
            this.bounces++;
            this.eventBus.emit(col);
            this.spawnExplosion(col.position.x, col.position.y, b.color, 14, 200);
          }
        }
      }

      // 4. Update particles
      for (let p = this.particles.length - 1; p >= 0; p--) {
        const part = this.particles[p];
        part.x += part.vx * subDt;
        part.y += part.vy * subDt + 300 * subDt; // slight gravity
        if (part.angularVelocity && part.rotation !== undefined) {
          part.rotation += part.angularVelocity * subDt;
        }
        part.life -= subDt;
        part.alpha = Math.max(0, part.life / part.maxLife);
        if (part.life <= 0) {
          this.particles.splice(p, 1);
        }
      }

      // 5. Update shockwaves
      for (let s = this.shockwaves.length - 1; s >= 0; s--) {
        const sw = this.shockwaves[s];
        sw.radius += 350 * subDt;
        sw.alpha = Math.max(0, 1 - sw.radius / sw.maxRadius);
        if (sw.radius >= sw.maxRadius) {
          this.shockwaves.splice(s, 1);
        }
      }
    }
  }

  getStats(): SimulationStats {
    let ringsLeft = 0;
    for (let i = 0; i < this.rings.length; i++) {
      if (!this.rings[i].isShattered) ringsLeft++;
    }

    return {
      elapsedTime: this.time,
      bounces: this.bounces,
      escapes: this.escapes,
      ringsLeft,
      ballsCount: this.balls.filter((b) => b.isAlive).length,
      fps: 60,
      isFinished: this.isFinished,
      winner: this.winner,
      customCounters: this.customState,
    };
  }
}
