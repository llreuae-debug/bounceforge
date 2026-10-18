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
  BreakEffectType,
} from './types';
import { Mulberry32 } from './prng';
import { PhysicsEventBus } from './eventBus';
import { SpatialHashGrid } from './spatialHash';
import { checkBallArcRingCollision, checkBallBallCollision, checkBallLineCollision } from './collision';
import { getSafeArena, SafeArena, PlatformType } from '../render/safeArea';
import type { BallPhysicsSettings, WallControlsSettings, CustomBallConfig } from '../presets/presetService';
import { AsmrEngine } from '../audio/asmrEngine';

export class PhysicsWorld {
  public width: number;
  public height: number;
  public config: PhysicsWorldConfig;
  public prng: Mulberry32;
  public eventBus: PhysicsEventBus;
  public spatialHash: SpatialHashGrid;
  public breakEffects: BreakEffectType[] = [];

  public balls: Ball[] = [];
  public rings: ArcRing[] = [];
  public lines: LineSegment[] = [];
  public spikes: Spike[] = [];
  public pegs: Peg[] = [];
  public particles: Particle[] = [];
  public shockwaves: Shockwave[] = [];

  public time: number = 0;
  public videoTime: number = 0;
  public reelSpeed: number = 0.5; // 0.25, 0.5, 0.75, 1.0, 1.25. DEFAULT = 0.5
  public slowMoSoundFeel: boolean = false;
  public speedRampFinale: boolean = false;
  public targetDuration: number = 56;
  public lastEventTime: number = 0;
  public bounces: number = 0;
  public escapes: number = 0;
  public activeRingIndex: number = 0;
  public isFinished: boolean = false;
  public winner?: string;
  public customState: Record<string, any> = {};

  // Maximum particle capacity to prevent unbounded memory
  private maxParticles: number = 2000;

  getEffectiveSpeed(): number {
    if (this.speedRampFinale && this.videoTime >= this.targetDuration - 1.5) {
      return 0.25;
    }
    return this.reelSpeed ?? 0.5;
  }

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
    this.videoTime = 0;
    this.lastEventTime = 0;
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
      bounceBoostEnabled: params.bounceBoostEnabled ?? false,
      bounceBoostRate: params.bounceBoostRate ?? 0.02,
      bounceBoostMax: params.bounceBoostMax ?? 1.5,
      initialRestitution: params.initialRestitution ?? params.restitution ?? this.config.restitution,
      currentBounceBoost: 0,
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

  spawnRingShatter(ring: ArcRing, overrideEffects?: string[]): void {
    const rawEffects = overrideEffects || ring.breakEffects || ['glass_shatter', 'shockwave'];
    const effects = rawEffects.length > 0 ? rawEffects : ['none'];

    // 1. Confetti effect: colorful fluttering paper ribbons
    if (effects.includes('confetti')) {
      const confettiColors = ['#ff007f', '#00f0ff', '#ffd600', '#00ff88', '#a855f7', '#ff5400', '#ffffff'];
      const confettiCount = 50;
      for (let i = 0; i < confettiCount; i++) {
        if (this.particles.length >= this.maxParticles) break;
        const angle = (i / confettiCount) * Math.PI * 2 + this.prng.range(-0.1, 0.1);
        const px = ring.centerX + Math.cos(angle) * ring.radius;
        const py = ring.centerY + Math.sin(angle) * ring.radius;
        const outSpeed = 120 + this.prng.next() * 280;
        const life = 1.4 + this.prng.next() * 1.2;

        this.particles.push({
          x: px,
          y: py,
          vx: Math.cos(angle) * outSpeed + this.prng.range(-40, 40),
          vy: Math.sin(angle) * outSpeed - 80, // gentle upward burst
          color: confettiColors[i % confettiColors.length],
          size: 6 + this.prng.next() * 6,
          width: 8 + this.prng.next() * 6,
          height: 4 + this.prng.next() * 4,
          alpha: 1,
          maxLife: life,
          life,
          rotation: this.prng.next() * Math.PI * 2,
          angularVelocity: this.prng.range(-8, 8),
          type: 'confetti',
        });
      }
      try {
        AsmrEngine.getInstance().playBreakEffectSound('confetti');
      } catch {}
    }

    // 2. Glass shatter: sharp crystalline polygon shards
    if (effects.includes('glass_shatter')) {
      const shardCount = 40;
      const step = (Math.PI * 2) / shardCount;
      for (let i = 0; i < shardCount; i++) {
        if (this.particles.length >= this.maxParticles) break;
        const angle = i * step + this.prng.range(-0.05, 0.05);
        const px = ring.centerX + Math.cos(angle) * ring.radius;
        const py = ring.centerY + Math.sin(angle) * ring.radius;
        const outSpeed = 160 + this.prng.next() * 260;
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
      try {
        AsmrEngine.getInstance().playBreakEffectSound('glass_shatter');
      } catch {}
    }

    // 3. Shockwave: expanding circular energy ring
    if (effects.includes('shockwave')) {
      this.shockwaves.push({
        x: ring.centerX,
        y: ring.centerY,
        radius: ring.radius * 0.8,
        maxRadius: ring.radius * 1.6,
        alpha: 0.95,
        color: ring.color,
      });
      try {
        AsmrEngine.getInstance().playBreakEffectSound('shockwave');
      } catch {}
    }

    // 4. Sparks: high-speed electric sparks
    if (effects.includes('sparks')) {
      this.spawnExplosion(ring.centerX, ring.centerY, '#ffd600', 45, 450);
      try {
        AsmrEngine.getInstance().playBreakEffectSound('sparks');
      } catch {}
    }
  }

  step(dt: number): void {
    const effectiveSpeed = this.getEffectiveSpeed();
    const dtPhysics = dt * effectiveSpeed;
    const subDt = dtPhysics / this.config.substeps;
    const subVideoDt = dt / this.config.substeps;
    const maxSpeedCap = this.config.maxSpeedCap || 2600;

    for (let stepIdx = 0; stepIdx < this.config.substeps; stepIdx++) {
      this.time += subDt;
      this.videoTime += subVideoDt;

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

        // Initialize bounce boost defaults if needed
        if (b.initialRestitution === undefined) {
          b.initialRestitution = b.restitution;
        }

        // Gravity & drag
        b.vx += this.config.gravity.x * b.gravity * subDt;
        b.vy += this.config.gravity.y * b.gravity * subDt;

        b.vx *= Math.max(0, 1 - b.airDrag * subDt);
        b.vy *= Math.max(0, 1 - b.airDrag * subDt);

        // Clamp max speed cap (so ball never tunnels or becomes unreadable)
        const allowedMax = Math.min(b.maxSpeed, maxSpeedCap);
        const speed = Math.hypot(b.vx, b.vy);
        if (speed > allowedMax) {
          b.vx = (b.vx / speed) * allowedMax;
          b.vy = (b.vy / speed) * allowedMax;
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

        // Natural rolling rotation for custom image / emoji
        b.rotation = (b.rotation || 0) + (b.vx / Math.max(1, b.radius)) * subDt;

        // Trail record (every few substeps)
        if (stepIdx === 0) {
          b.trail.unshift({ x: b.x, y: b.y });
          if (b.trail.length > 35) {
            b.trail.pop();
          }
        }

        // Ring collisions (logged at videoTime for frame-accurate audio alignment)
        for (let r = 0; r < this.rings.length; r++) {
          const ring = this.rings[r];
          if (ring.isShattered) continue;

          const res = checkBallArcRingCollision(b, ring, this.videoTime);
          if (res.escaped) {
            this.escapes++;
            this.lastEventTime = this.videoTime;
            // Reset bounce boost on escape!
            if (b.bounceBoostEnabled && b.initialRestitution !== undefined) {
              b.restitution = b.initialRestitution;
              b.currentBounceBoost = 0;
            }
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
            this.lastEventTime = this.videoTime;

            // Bounce boost: increase bounciness by set amount per wall hit (e.g. +2%)
            if (b.bounceBoostEnabled) {
              const rate = b.bounceBoostRate ?? 0.02;
              const maxRest = b.bounceBoostMax ?? 1.5;
              b.currentBounceBoost = (b.currentBounceBoost || 0) + rate;
              b.restitution = Math.min(maxRest, (b.initialRestitution ?? 0.98) + b.currentBounceBoost);
            }

            if (b.growthPerBounce > 0) {
              b.radius += b.growthPerBounce;
            }
            if (res.event) {
              this.eventBus.emit(res.event);
            }
            this.spawnExplosion(res.event?.position.x ?? b.x, res.event?.position.y ?? b.y, b.color, 12, 180);
          }
        }

        // Spikes collisions (inward pointing spikes on outer wall)
        for (let s = 0; s < this.spikes.length; s++) {
          const spike = this.spikes[s];
          const tipX = spike.x + Math.cos(spike.angle) * spike.length;
          const tipY = spike.y + Math.sin(spike.angle) * spike.length;
          const dist = Math.hypot(b.x - tipX, b.y - tipY);

          if (dist < b.radius + 8 && b.tag !== 'frozen') {
            b.bounces++;
            this.bounces++;
            this.lastEventTime = this.videoTime;
            // Bounce back along normal from spike tip to ball
            const nx = dist > 0.001 ? (b.x - tipX) / dist : 0;
            const ny = dist > 0.001 ? (b.y - tipY) / dist : -1;
            const dot = b.vx * nx + b.vy * ny;
            if (dot < 0) {
              b.vx = (b.vx - 2 * dot * nx) * b.restitution;
              b.vy = (b.vy - 2 * dot * ny) * b.restitution;
            }
            // Red flash & spark burst on spike hit
            this.spawnExplosion(tipX, tipY, '#ff0033', 18, 220);
            this.eventBus.emit({
              id: Math.floor(Math.random() * 1000000),
              time: this.videoTime,
              type: 'spike',
              position: { x: tipX, y: tipY },
              velocity: { x: b.vx, y: b.vy },
              impulse: 350,
              ballId: b.id,
              noteIndex: 0,
            });
          }
        }

        // Line collisions
        for (let l = 0; l < this.lines.length; l++) {
          const line = this.lines[l];
          const col = checkBallLineCollision(b, line, this.videoTime);
          if (col) {
            b.bounces++;
            this.bounces++;
            this.lastEventTime = this.videoTime;
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

          const col = checkBallBallCollision(b, other, this.videoTime);
          if (col) {
            b.bounces++;
            other.bounces++;
            this.bounces++;
            this.lastEventTime = this.videoTime;
            this.eventBus.emit(col);
            this.spawnExplosion(col.position.x, col.position.y, b.color, 14, 200);
          }
        }
      }

      // 4. Update particles
      for (let p = this.particles.length - 1; p >= 0; p--) {
        const part = this.particles[p];
        part.x += part.vx * subDt;
        part.y += part.vy * subDt + (part.type === 'confetti' ? 120 : 300) * subDt; // gentle gravity
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

    // Pacing & Retention Guard: ensure an event occurs at least every <= 10s of video time
    if (this.videoTime - this.lastEventTime >= 9.8) {
      const activeBall = this.balls.find((b) => b.isAlive);
      if (activeBall) {
        const randAngle = this.prng.next() * Math.PI * 2;
        const impulse = this.config.antiStallImpulse * 1.5;
        activeBall.vx += Math.cos(randAngle) * impulse;
        activeBall.vy += Math.sin(randAngle) * impulse;
        this.lastEventTime = this.videoTime;
        console.log(`[Retention Guard] Event gap reached ${(this.videoTime - this.lastEventTime).toFixed(2)}s in video time at ${this.reelSpeed}x; applied pacing impulse to ball #${activeBall.id}`);
      }
    }
  }

  getStats(): SimulationStats {
    let ringsLeft = 0;
    for (let i = 0; i < this.rings.length; i++) {
      if (!this.rings[i].isShattered) ringsLeft++;
    }

    // Calculate bounce boost energy meter from primary live ball
    const liveBall = this.balls.find((b) => b.isAlive);
    let boostEnergy = 0;
    if (liveBall && liveBall.bounceBoostEnabled) {
      const maxExtra = (liveBall.bounceBoostMax ?? 1.5) - (liveBall.initialRestitution ?? 0.98);
      boostEnergy = maxExtra > 0 ? Math.min(1, (liveBall.currentBounceBoost || 0) / maxExtra) : 0;
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
      bounceBoostEnergy: boostEnergy,
      customCounters: this.customState,
    };
  }

  getBounceBoostEnergy(): number {
    const liveBall = this.balls.find((b) => b.isAlive);
    if (!liveBall || !liveBall.bounceBoostEnabled) return 0;
    const maxExtra = (liveBall.bounceBoostMax ?? 1.5) - (liveBall.initialRestitution ?? 0.98);
    return maxExtra > 0 ? Math.min(100, Math.round(((liveBall.currentBounceBoost || 0) / maxExtra) * 100)) : 0;
  }

  resetBounceBoost(): void {
    for (const b of this.balls) {
      b.currentBounceBoost = 0;
      b.restitution = b.initialRestitution ?? 0.98;
    }
  }

  applyGlobalModifiers(
    ballPhysics?: Partial<BallPhysicsSettings>,
    wallControls?: Partial<WallControlsSettings>,
    customBall?: Partial<CustomBallConfig>
  ): void {
    if (ballPhysics) {
      if (ballPhysics.gravity !== undefined) {
        this.config.gravity = { x: 0, y: ballPhysics.gravity * 800 };
      }
      if (ballPhysics.maxSpeedCap !== undefined) {
        this.config.maxSpeedCap = ballPhysics.maxSpeedCap;
      }
      for (const b of this.balls) {
        if (ballPhysics.restitution !== undefined) {
          b.restitution = ballPhysics.restitution;
          b.initialRestitution = ballPhysics.restitution;
        }
        if (ballPhysics.radius !== undefined) {
          b.radius = ballPhysics.radius;
        }
        if (ballPhysics.color) {
          b.color = ballPhysics.color;
        }
        if (ballPhysics.bounceBoostEnabled !== undefined) {
          b.bounceBoostEnabled = ballPhysics.bounceBoostEnabled;
        }
        if (ballPhysics.bounceBoostRate !== undefined) {
          b.bounceBoostRate = ballPhysics.bounceBoostRate;
        }
        if (ballPhysics.bounceBoostMax !== undefined) {
          b.bounceBoostMax = ballPhysics.bounceBoostMax;
        }
      }
    }

    if (customBall) {
      for (const b of this.balls) {
        if (customBall.type === 'emoji' && customBall.emoji) {
          b.customEmoji = customBall.emoji;
          b.customImage = undefined;
        } else if (customBall.type === 'image' && customBall.dataUrl) {
          b.customImage = customBall.dataUrl;
          b.customEmoji = undefined;
        } else if (customBall.type === 'default') {
          b.customEmoji = undefined;
          b.customImage = undefined;
        }
      }
    }

    if (wallControls) {
      if (wallControls.breakEffects) {
        this.breakEffects = [...wallControls.breakEffects];
      }
      if (wallControls.spikesEnabled && this.spikes.length === 0 && this.rings.length > 0) {
        const outerRing = this.rings[this.rings.length - 1];
        const count = wallControls.spikeCount || 8;
        const length = wallControls.spikeLength || 20;
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2;
          const sx = outerRing.centerX + Math.cos(angle) * (outerRing.radius - length / 2);
          const sy = outerRing.centerY + Math.sin(angle) * (outerRing.radius - length / 2);
          this.spikes.push({
            id: this.spikes.length + 1,
            x: sx,
            y: sy,
            angle,
            length,
            radius: length / 2,
            isOccupied: false,
            isDeadly: true,
            color: '#ff0033',
          });
        }
      }
    }
  }

  triggerCollision(data: {
    point: { x: number; y: number };
    normal?: { x: number; y: number };
    intensity?: number;
    ringIndex?: number;
    ballColor?: string;
  }): void {
    this.bounces++;
    this.spawnExplosion(data.point.x, data.point.y, data.ballColor || '#CCFF00', 12, 180);
    this.eventBus.emit({
      type: 'ring',
      time: this.time,
      position: data.point,
      velocity: { x: 0, y: 0 },
      ringIndex: data.ringIndex ?? 0,
      normal: data.normal || { x: 0, y: -1 },
      intensity: data.intensity ?? 0.8,
    } as any);
  }
}

