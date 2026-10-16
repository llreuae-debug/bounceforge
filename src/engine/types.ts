export interface Vector2D {
  x: number;
  y: number;
}

export interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  mass: number;
  restitution: number;
  gravity: number;
  airDrag: number;
  maxSpeed: number;
  growthPerBounce: number;
  color: string;
  glowColor: string;
  trail: Vector2D[];
  isAlive: boolean;
  bounces: number;
  rotation?: number;
  angularVelocity?: number;
  bounceBoostEnabled?: boolean;
  bounceBoostRate?: number;
  bounceBoostMax?: number;
  currentBounceBoost?: number;
  initialRestitution?: number;
  customEmoji?: string;
  customImageDataUrl?: string;
  customTexture?: any;
  tier?: number;
  name?: string;
  score?: number;
  tag?: string;
  label?: string;
}

export type BreakEffectType = 'confetti' | 'glass_shatter' | 'shockwave' | 'sparks';

export interface ArcRing {
  id: number;
  ringIndex: number;
  centerX: number;
  centerY: number;
  radius: number;
  thickness: number;
  angle: number;           // Current orientation in radians
  angularVelocity: number; // Rad/sec
  gapSize: number;         // Gap width in radians
  gapCount: number;        // Number of symmetrical gaps
  color: string;
  isShattered: boolean;
  shatterTime?: number;
  shatterOnEscape?: boolean;
  breakEffects?: BreakEffectType[];
  segments?: {
    startAngle: number;
    endAngle: number;
    broken: boolean;
    color?: string;
  }[];
}

export interface LineSegment {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  restitution: number;
}

export interface Spike {
  id: number;
  x: number;
  y: number;
  angle: number;
  length: number;
  radius: number;
  isOccupied: boolean;
  color: string;
}

export interface Peg {
  id: number;
  x: number;
  y: number;
  radius: number;
  score: number;
  color: string;
}

export interface Portal {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  radius: number;
  color: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  width?: number;
  height?: number;
  alpha: number;
  maxLife: number;
  life: number;
  rotation?: number;
  angularVelocity?: number;
  type?: 'spark' | 'shard' | 'sand' | 'dust' | 'confetti';
}

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

export interface CollisionEvent {
  id: number;
  time: number; // in seconds from start
  type: 'ring' | 'ball' | 'spike' | 'wall' | 'escape' | 'peg' | 'portal' | 'merge';
  position: Vector2D;
  velocity: Vector2D;
  impulse: number;
  ringId?: number;
  ballId: number;
  targetBallId?: number;
  noteIndex: number;
  extra?: Record<string, any>;
}

export interface PhysicsWorldConfig {
  width: number;
  height: number;
  substeps: number; // 4 substeps at 60fps = 240Hz
  gravity: Vector2D;
  airDrag: number;
  restitution: number;
  antiStallMinSpeed: number;
  antiStallImpulse: number;
  maxSpeedCap?: number;
}

export interface SimulationStats {
  elapsedTime: number;
  bounces: number;
  escapes: number;
  ringsLeft: number;
  ballsCount: number;
  fps: number;
  isFinished: boolean;
  winner?: string;
  bounceBoostEnergy?: number; // 0 to 1 energy meter
  customCounters?: Record<string, string | number>;
}

