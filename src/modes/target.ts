import { SimulationMode } from './types';
import { PhysicsWorld } from '../engine/world';

export const TargetMode: SimulationMode = {
  id: 'target',
  name: 'Target (Numbered Wall)',
  category: 'core',
  description: 'Numbered segments line the wall. The ball must hit them in the correct order — each correct hit triggers a satisfying wall-break effect.',
  asmrProfile: 'destruction',
  hookLines: [
    'can it hit all 15 in order??',
    'watch the target counter closely',
    'one wrong bounce resets nothing, just keep watching',
    'the final number break is so satisfying',
  ],
  defaultSettings: {
    segmentCount: 15,
    radius: 400,
    ringThickness: 16,
    angularVelocity: 0.35,
    duration: 60,
  },
  presets: [
    {
      name: 'Standard 15 Targets',
      settings: { segmentCount: 15, radius: 400, angularVelocity: 0.35 },
    },
    {
      name: 'Speed Run 10 Targets',
      settings: { segmentCount: 10, radius: 380, angularVelocity: 0.6 },
    },
    {
      name: 'Marathon 24 Targets',
      settings: { segmentCount: 24, radius: 420, angularVelocity: 0.25 },
    },
  ],
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    world.reset(seed);
    const arena = world.getSafeArena(settings.platform);
    const cx = arena.centerX;
    const cy = arena.centerY;

    const count = settings.segmentCount ?? 15;
    const radius = Math.min(arena.radius, settings.radius ?? arena.radius);
    const step = (Math.PI * 2) / count;

    // Permute numbers 1..count around the perimeter
    const numbers = Array.from({ length: count }, (_, i) => i + 1);
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(world.prng.next() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }

    const segments = [];
    for (let i = 0; i < count; i++) {
      segments.push({
        num: numbers[i],
        startAngle: i * step,
        endAngle: (i + 1) * step - 0.05,
        broken: false,
        color: '#00e599',
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
    world.customState.escaped = false;

    world.customState.onRenderFg = (ctx: CanvasRenderingContext2D) => {
      const segs = world.customState.targetSegments;
      const r = world.customState.radius;
      const th = settings.ringThickness ?? 16;
      const rot = world.customState.angle;
      const curTarget = world.customState.currentTarget;
      const total = world.customState.totalTargets;

      ctx.save();
      ctx.lineCap = 'round';

      // 1. Draw segments and numbers
      for (let i = 0; i < segs.length; i++) {
        const seg = segs[i];
        if (seg.broken) continue;

        const isCurrent = seg.num === curTarget;
        const color = isCurrent ? '#ffd600' : '#00e599';
        ctx.lineWidth = isCurrent ? th + 4 : th;
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = isCurrent ? 14 : 6;

        ctx.beginPath();
        ctx.arc(cx, cy, r, rot + seg.startAngle, rot + seg.endAngle);
        ctx.stroke();

        // Number label just inside segment
        const midAngle = rot + (seg.startAngle + seg.endAngle) / 2;
        const textR = r - 26;
        const tx = cx + Math.cos(midAngle) * textR;
        const ty = cy + Math.sin(midAngle) * textR;

        ctx.fillStyle = isCurrent ? '#ffd600' : '#8ef8c7';
        ctx.font = `bold ${isCurrent ? 15 : 12}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(seg.num.toString(), tx, ty);
      }

      // 2. Center HUD: Current target & progress
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Big target number
      ctx.fillStyle = '#ffd600';
      ctx.shadowColor = 'rgba(255, 214, 0, 0.6)';
      ctx.shadowBlur = 12;
      ctx.font = 'bold 36px monospace';
      ctx.fillText(curTarget <= total ? curTarget.toString() : 'CLEARED!', cx, cy - 8);

      // Subtitle
      ctx.fillStyle = '#94a3b8';
      ctx.shadowBlur = 0;
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`${Math.min(curTarget - 1, total)} / ${total}`, cx, cy + 18);

      ctx.restore();
    };

    // Bouncing Ball
    world.addBall({
      x: cx,
      y: cy - 30,
      vx: world.prng.range(-220, 220),
      vy: world.prng.range(-150, 180),
      radius: 14,
      color: '#00f0ff',
      glowColor: '#00b4d8',
      mass: 1.0,
      restitution: 0.98,
      gravity: 300,
    });
  },

  step: (world: PhysicsWorld, dt: number) => {
    world.customState.angle += world.customState.angularVelocity * dt;
    const segs = world.customState.targetSegments;
    const r = world.customState.radius;
    const cx = world.customState.cx;
    const cy = world.customState.cy;
    const rot = world.customState.angle;
    const curTarget = world.customState.currentTarget;

    const ball = world.balls[0];
    if (!ball || !ball.isAlive) return;

    const dx = ball.x - cx;
    const dy = ball.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Escape check
    if (dist > r + 40) {
      world.customState.escaped = true;
      return;
    }

    if (dist + ball.radius >= r) {
      let hitAngle = Math.atan2(dy, dx) - rot;
      while (hitAngle < 0) hitAngle += Math.PI * 2;
      while (hitAngle >= Math.PI * 2) hitAngle -= Math.PI * 2;

      // Find hit segment
      const seg = segs.find((s: any) => hitAngle >= s.startAngle && hitAngle <= s.endAngle);
      if (seg && !seg.broken) {
        if (seg.num === curTarget) {
          // Success! Break this target
          seg.broken = true;
          world.customState.currentTarget += 1;
          world.triggerCollision({
            point: { x: ball.x, y: ball.y },
            normal: { x: -dx / dist, y: -dy / dist },
            intensity: 1.0,
            ringIndex: 0,
            ballColor: '#ffd600',
          });
        } else {
          // Normal bounce
          world.triggerCollision({
            point: { x: ball.x, y: ball.y },
            normal: { x: -dx / dist, y: -dy / dist },
            intensity: 0.6,
            ringIndex: 0,
            ballColor: ball.color,
          });
        }

        // Reflect ball
        const nx = -dx / dist;
        const ny = -dy / dist;
        const dot = ball.vx * nx + ball.vy * ny;
        ball.vx = (ball.vx - 2 * dot * nx) * ball.restitution;
        ball.vy = (ball.vy - 2 * dot * ny) * ball.restitution;
        ball.x = cx - nx * (r - ball.radius - 1);
        ball.y = cy - ny * (r - ball.radius - 1);
      }
    }
  },

  isFinished: (world: PhysicsWorld) => {
    return Boolean(world.customState.escaped);
  },
};
