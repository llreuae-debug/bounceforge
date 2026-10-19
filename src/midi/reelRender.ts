import type { PhysicsWorld } from '../engine/world';
import type { PadInfo } from './midiDropMode';

/**
 * Foreground layer for MIDI reels, drawn after the engine renderer (walls, pegs, trails,
 * particles): glossy glass marbles with a bright core and white swirl, and glowing drum pads
 * that flash on the musical impact. World coordinates (1080x1920).
 */
export function drawReelForeground(ctx: CanvasRenderingContext2D, world: PhysicsWorld): void {
  const cs = world.customState;
  ctx.save();

  // Pad glow on impact
  for (const pad of (cs.pads || []) as PadInfo[]) {
    if (pad.flash < 0.03) continue;
    const l = pad.line;
    ctx.save();
    ctx.globalAlpha = Math.min(1, pad.flash);
    ctx.strokeStyle = '#ffffff';
    ctx.shadowColor = l.color;
    ctx.shadowBlur = 40 * pad.flash;
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(l.x1!, l.y1!);
    ctx.lineTo(l.x2!, l.y2!);
    ctx.stroke();
    ctx.restore();
  }

  // Glass marbles
  for (const b of world.balls) {
    if (!b.isAlive) continue;
    drawGlassMarble(ctx, b.x, b.y, b.radius, b.color, b.rotation || 0);
  }
  ctx.restore();
}

export function drawGlassMarble(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, rotation: number): void {
  ctx.save();
  // Outer glow
  ctx.shadowColor = color;
  ctx.shadowBlur = r * 0.9;

  // Glass body: bright core fading to a deep edge
  const body = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, r * 0.1, x, y, r);
  body.addColorStop(0, '#ffffff');
  body.addColorStop(0.25, color);
  body.addColorStop(0.85, shade(color, -0.45));
  body.addColorStop(1, shade(color, -0.65));
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // White swirl ribbons (rotate with the marble)
  ctx.beginPath();
  ctx.arc(x, y, r * 0.98, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineCap = 'round';
  for (let k = 0; k < 2; k++) {
    ctx.lineWidth = Math.max(1.2, r * (k === 0 ? 0.16 : 0.09));
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 1.6 + k * Math.PI;
      const rr = r * (0.15 + (i / 24) * 0.75);
      const px = Math.cos(a) * rr;
      const py = Math.sin(a) * rr * 0.75;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();

  // Specular highlights
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.38, y - r * 0.42, r * 0.22, r * 0.13, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.arc(x + r * 0.35, y + r * 0.4, r * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function shade(hex: string, amt: number): string {
  const m = hex.replace('#', '').match(/^([0-9a-f]{6})$/i);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c * (1 + amt))));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `rgb(${r},${g},${b})`;
}
