import { SimulationMode } from './types';
import { PhysicsWorld } from '../engine/world';
import { CollisionEvent } from '../engine/types';
import { AsmrEngine } from '../audio/asmrEngine';

export interface TargetSegment {
  id: number;
  num: number;
  startAngle: number;
  endAngle: number;
  broken: boolean;
  color: string;
  flashGreyTimer: number; // seconds to flash grey on wrong hit
}

export const SequenceBreakMode: SimulationMode = {
  id: 'sequence_break',
  name: 'Sequence Break',
  category: 'core',
  description:
    'The outer ring is split into numbered segments. Only the segment with the NEXT number can break — hitting a wrong one bounces with a nope tone. Break them all in order to open the exit.',
  asmrProfile: 'destruction',
  hookLines: [
    'can it hit all numbers in exact order??',
    'watch the target counter closely',
    'wrong hit bounces back, next one breaks',
    'the final number break is so satisfying',
    'number 7 is holding on for dear life',
  ],
  defaultSettings: {
    segmentCount: 15,
    randomOrder: true,
    showNumbers: true,
    radius: 400,
    ringThickness: 16,
    angularVelocity: 0.35,
    duration: 60,
  },
  presets: [
    {
      name: 'Chill Sequence (8 Segments, In-Order)',
      settings: {
        segmentCount: 8,
        randomOrder: false,
        showNumbers: true,
        radius: 390,
        angularVelocity: 0.25,
      },
    },
    {
      name: 'Viral Sequence (15 Segments, Random Order)',
      settings: {
        segmentCount: 15,
        randomOrder: true,
        showNumbers: true,
        radius: 400,
        angularVelocity: 0.35,
      },
    },
    {
      name: 'Insane Marathon (24 Segments, High Speed)',
      settings: {
        segmentCount: 24,
        randomOrder: true,
        showNumbers: true,
        radius: 420,
        angularVelocity: 0.6,
      },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.getSafeArena(settings.platform);
    const cx = arena.centerX;
    const cy = arena.centerY;

    const count = Math.max(6, Math.min(24, settings.segmentCount ?? 15));
    const radius = Math.min(arena.radius, settings.radius ?? arena.radius);
    const step = (Math.PI * 2) / count;
    const isRandom = settings.randomOrder !== false;
    const showNumbers = settings.showNumbers !== false;

    // Number sequence 1..count
    const numbers = Array.from({ length: count }, (_, i) => i + 1);
    if (isRandom) {
      for (let i = numbers.length - 1; i > 0; i--) {
        const j = Math.floor(world.prng.next() * (i + 1));
        [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
      }
    }

    const segments: TargetSegment[] = [];
    for (let i = 0; i < count; i++) {
      segments.push({
        id: i,
        num: numbers[i],
        startAngle: i * step,
        endAngle: (i + 1) * step - 0.05,
        broken: false,
        color: '#00e599',
        flashGreyTimer: 0,
      });
    }

    world.customState.targetSegments = segments;
    world.customState.currentTarget = 1;
    world.customState.totalTargets = count;
    world.customState.radius = radius;
    world.customState.cx = cx;
    world.customState.cy = cy;
    world.customState.angle = 0;
    world.customState.angularVelocity = settings.angularVelocity ?? 0.35;
    world.customState.showNumbers = showNumbers;
    world.customState.escaped = false;
    world.customState.pulseTime = 0;

    // Set custom counters for overlay
    world.customState.counterLabel = 'NEXT';
    world.customState.counterValue = `1 / ${count}`;

    world.customState.onRenderFg = (ctx: CanvasRenderingContext2D) => {
      const segs = world.customState.targetSegments as TargetSegment[];
      const r = world.customState.radius;
      const th = settings.ringThickness ?? 16;
      const rot = world.customState.angle;
      const curTarget = world.customState.currentTarget;
      const total = world.customState.totalTargets;
      const pTime = world.customState.pulseTime;

      ctx.save();
      ctx.lineCap = 'round';

      // 1. Draw perimeter segments
      for (let i = 0; i < segs.length; i++) {
        const seg = segs[i];
        if (seg.broken) continue;

        const isCurrent = seg.num === curTarget;
        const isFlashingGrey = seg.flashGreyTimer > 0;

        let strokeColor = '#00e599';
        let strokeWidth = th;

        if (isFlashingGrey) {
          strokeColor = '#64748b'; // soft grey flash
        } else if (isCurrent) {
          // Glow and pulse next target
          const pulse = Math.sin(pTime * 8) * 0.5 + 0.5;
          strokeColor = `rgb(255, ${Math.round(214 + pulse * 41)}, 0)`;
          strokeWidth = th + 4 + pulse * 3;
        }

        ctx.lineWidth = strokeWidth;
        ctx.strokeStyle = strokeColor;
        ctx.shadowColor = isCurrent ? '#ffd600' : isFlashingGrey ? '#64748b' : '#00e599';
        ctx.shadowBlur = isCurrent ? 16 : isFlashingGrey ? 4 : 8;

        ctx.beginPath();
        ctx.arc(cx, cy, r, rot + seg.startAngle, rot + seg.endAngle);
        ctx.stroke();

        // Number label just inside segment
        if (showNumbers) {
          const midAngle = rot + (seg.startAngle + seg.endAngle) / 2;
          const textR = r - 26;
          const tx = cx + Math.cos(midAngle) * textR;
          const ty = cy + Math.sin(midAngle) * textR;

          ctx.fillStyle = isCurrent ? '#ffd600' : isFlashingGrey ? '#94a3b8' : '#8ef8c7';
          ctx.font = `bold ${isCurrent ? 16 : 12}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(seg.num.toString(), tx, ty);
        }
      }

      // 2. Center HUD: Next target indicator
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (curTarget <= total) {
        ctx.fillStyle = '#ffd600';
        ctx.shadowColor = 'rgba(255, 214, 0, 0.6)';
        ctx.shadowBlur = 12;
        ctx.font = '900 32px monospace';
        ctx.fillText(`NEXT: ${curTarget}`, cx, cy - 8);

        ctx.fillStyle = '#94a3b8';
        ctx.shadowBlur = 0;
        ctx.font = 'bold 13px monospace';
        ctx.fillText(`${curTarget - 1} / ${total} CLEARED`, cx, cy + 22);
      } else {
        ctx.fillStyle = '#00ffcc';
        ctx.shadowColor = 'rgba(0, 255, 204, 0.8)';
        ctx.shadowBlur = 16;
        ctx.font = '900 36px monospace';
        ctx.fillText('ESCAPE OPEN!', cx, cy);
      }

      ctx.restore();
    };

    // Add bouncing ball
    world.addBall({
      x: cx,
      y: cy - 40,
      vx: world.prng.range(-220, 220),
      vy: world.prng.range(-150, 180),
      radius: 14,
      color: '#00f0ff',
      glowColor: '#00b4d8',
      mass: 1.0,
      restitution: 0.98,
      gravity: 1.0,
    });
  },

  step: (world: PhysicsWorld, dt: number) => {
    world.customState.angle += world.customState.angularVelocity * dt;
    world.customState.pulseTime = (world.customState.pulseTime || 0) + dt;

    const segs = world.customState.targetSegments as TargetSegment[];
    const r = world.customState.radius;
    const cx = world.customState.cx;
    const cy = world.customState.cy;
    const rot = world.customState.angle;
    let curTarget = world.customState.currentTarget;
    const total = world.customState.totalTargets;

    // Decay flash timers
    for (const s of segs) {
      if (s.flashGreyTimer > 0) {
        s.flashGreyTimer = Math.max(0, s.flashGreyTimer - dt);
      }
    }

    const ball = world.balls[0];
    if (!ball || !ball.isAlive) return;

    const dx = ball.x - cx;
    const dy = ball.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Escape check
    if (dist > r + 30) {
      world.customState.escaped = true;
      world.escapes++;
      return;
    }

    // If all targets cleared, ring is fully open: ball flies out!
    if (curTarget > total) {
      return;
    }

    if (dist + ball.radius >= r) {
      let hitAngle = Math.atan2(dy, dx) - rot;
      while (hitAngle < 0) hitAngle += Math.PI * 2;
      while (hitAngle >= Math.PI * 2) hitAngle -= Math.PI * 2;

      // Find hit segment
      const seg = segs.find((s) => hitAngle >= s.startAngle && hitAngle <= s.endAngle);
      if (seg) {
        if (seg.num === curTarget && !seg.broken) {
          // Success! Correct number broken
          seg.broken = true;
          world.customState.currentTarget += 1;
          curTarget++;
          world.customState.counterValue = `${Math.min(curTarget, total)} / ${total}`;

          // Spawn celebration explosion
          world.spawnExplosion(ball.x, ball.y, '#ffd600', 25, 280);
          world.triggerCollision({
            point: { x: ball.x, y: ball.y },
            normal: { x: -dx / dist, y: -dy / dist },
            intensity: 1.0,
            ringIndex: 0,
            ballColor: '#ffd600',
          });

          // If last target broken, open ring completely so ball escapes freely
          if (curTarget > total) {
            for (const s of segs) {
              s.broken = true;
            }
            world.spawnRingShatter({
              id: 999,
              ringIndex: 0,
              centerX: cx,
              centerY: cy,
              radius: r,
              thickness: 16,
              angle: rot,
              angularVelocity: 0,
              gapSize: 0,
              gapCount: 1,
              color: '#00ffcc',
              isShattered: true,
            });
            // Ring open! Ball escapes outward without bounce
            return;
          }
        } else if (!seg.broken) {
          // Wrong number! Bounce with soft "nope" tone and flash grey
          seg.flashGreyTimer = 0.35;
          try {
            AsmrEngine.getInstance().playNopeTone();
          } catch {}

          world.triggerCollision({
            point: { x: ball.x, y: ball.y },
            normal: { x: -dx / dist, y: -dy / dist },
            intensity: 0.5,
            ringIndex: 0,
            ballColor: '#64748b',
          });
        }

        // Reflect ball inward if moving outward
        const nx = -dx / dist;
        const ny = -dy / dist;
        const dot = ball.vx * nx + ball.vy * ny;
        if (dot < 0) {
          ball.vx = (ball.vx - 2 * dot * nx) * ball.restitution;
          ball.vy = (ball.vy - 2 * dot * ny) * ball.restitution;
        }
        ball.x = cx + (dx / dist) * (r - ball.radius - 2);
        ball.y = cy + (dy / dist) * (r - ball.radius - 2);
      }
    }
  },

  isFinished: (world: PhysicsWorld) => {
    return Boolean(world.customState.escaped);
  },
};
