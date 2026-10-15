import { PhysicsWorld } from '../engine/world';
import { ThemeConfig, THEMES } from './themes';
import { OverlaySettings, drawOverlays } from './overlays';
import { ArcRing, Ball } from '../engine/types';

export interface VisualSettings {
  themeId: string;
  bloomEnabled: boolean;
  bloomIntensity: number;
  trailLength: number;
  trailFade: number;
  screenShakeIntensity: number;
  slowMotionEnd: boolean;
  chromaticFlash: boolean;
  ringColorMode: 'theme' | 'rainbow' | 'index' | 'pulse';
}

export class WorldRenderer {
  private screenShake: number = 0;
  private flashAlpha: number = 0;

  constructor() {}

  triggerShake(amount: number = 10): void {
    this.screenShake = Math.max(this.screenShake, amount);
  }

  triggerFlash(): void {
    this.flashAlpha = 0.8;
  }

  render(
    ctx: CanvasRenderingContext2D,
    world: PhysicsWorld,
    visuals: VisualSettings,
    overlays: OverlaySettings,
    renderWidth: number,
    renderHeight: number,
    isExport: boolean = false
  ): void {
    const theme = THEMES[visuals.themeId] || THEMES.neon_night;

    // Scale from world coordinates (1080x1920) to output canvas resolution
    const scaleX = renderWidth / world.width;
    const scaleY = renderHeight / world.height;

    ctx.save();

    // Screen Shake Offset
    if (this.screenShake > 0.1 && visuals.screenShakeIntensity > 0) {
      const shakeMag = this.screenShake * visuals.screenShakeIntensity;
      const offsetX = (Math.random() * 2 - 1) * shakeMag;
      const offsetY = (Math.random() * 2 - 1) * shakeMag;
      ctx.translate(offsetX, offsetY);
      this.screenShake *= 0.88;
    }

    // Scale to output
    ctx.scale(scaleX, scaleY);

    // 1. Draw Background
    this.drawBackground(ctx, world.width, world.height, theme);

    // 2. Custom Mode Background / Trails Render
    if (world.customState?.onRenderBg) {
      world.customState.onRenderBg(ctx, world);
    }

    // 3. Draw Trails
    if (visuals.trailLength > 0) {
      this.drawTrails(ctx, world, visuals, theme);
    }

    // 4. Draw Rings
    this.drawRings(ctx, world, visuals, theme);

    // 5. Draw Lines / Obstacles
    this.drawObstacles(ctx, world);

    // 6. Draw Pegs / Spikes / Portals
    this.drawSpikesAndPegs(ctx, world);

    // 7. Draw Shockwaves
    this.drawShockwaves(ctx, world);

    // 8. Draw Balls with Glow
    this.drawBalls(ctx, world, visuals, theme);

    // 9. Draw Particles (Sparks & Shards)
    this.drawParticles(ctx, world);

    // 10. Custom Mode Foreground Render (Webs, Paint, Sand, Dominoes, Leaderboards)
    if (world.customState?.onRenderFg) {
      world.customState.onRenderFg(ctx, world);
    }

    // 11. Chromatic Flash
    if (this.flashAlpha > 0.01 && visuals.chromaticFlash) {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.flashAlpha})`;
      ctx.fillRect(0, 0, world.width, world.height);
      this.flashAlpha *= 0.85;
    }

    // 12. Overlays
    const stats = world.getStats();
    drawOverlays(ctx, world.width, world.height, overlays, stats, isExport);

    ctx.restore();
  }

  private drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number, theme: ThemeConfig): void {
    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, h * 0.7);
    bgGrad.addColorStop(0, theme.backgroundSecondary || '#111424');
    bgGrad.addColorStop(1, theme.background);

    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle starfield or grid for themes
    if (theme.id === 'galaxy') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      for (let i = 0; i < 40; i++) {
        const sx = ((i * 137.5) % w);
        const sy = ((i * 243.7) % h);
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }
    } else if (theme.id === 'matrix') {
      ctx.strokeStyle = 'rgba(0, 255, 102, 0.04)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
    }
  }

  private drawTrails(
    ctx: CanvasRenderingContext2D,
    world: PhysicsWorld,
    visuals: VisualSettings,
    theme: ThemeConfig
  ): void {
    ctx.save();
    for (const b of world.balls) {
      if (!b.isAlive || b.trail.length < 2) continue;

      const maxLen = Math.min(b.trail.length, visuals.trailLength);
      for (let i = 0; i < maxLen - 1; i++) {
        const p1 = b.trail[i];
        const p2 = b.trail[i + 1];
        const alpha = (1 - i / maxLen) * visuals.trailFade;

        ctx.strokeStyle = b.color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = b.radius * (1 - (i / maxLen) * 0.7);
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  private drawRings(
    ctx: CanvasRenderingContext2D,
    world: PhysicsWorld,
    visuals: VisualSettings,
    theme: ThemeConfig
  ): void {
    ctx.save();
    for (let r = 0; r < world.rings.length; r++) {
      const ring = world.rings[r];
      if (ring.isShattered) continue;

      let ringColor = ring.color;
      if (visuals.ringColorMode === 'rainbow') {
        const hue = (r * 35 + world.time * 60) % 360;
        ringColor = `hsl(${hue}, 95%, 60%)`;
      } else if (visuals.ringColorMode === 'index') {
        ringColor = theme.ringColors[r % theme.ringColors.length];
      }

      ctx.lineWidth = ring.thickness;
      ctx.strokeStyle = ringColor;
      ctx.lineCap = 'round';

      if (visuals.bloomEnabled) {
        ctx.shadowColor = ringColor;
        ctx.shadowBlur = 15 * visuals.bloomIntensity;
      }

      // Draw arc segments between gaps
      const step = (Math.PI * 2) / ring.gapCount;
      const halfGap = ring.gapSize / 2;

      for (let i = 0; i < ring.gapCount; i++) {
        const start = ring.angle + i * step + halfGap;
        const end = ring.angle + (i + 1) * step - halfGap;

        ctx.beginPath();
        ctx.arc(ring.centerX, ring.centerY, ring.radius, start, end);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  private drawObstacles(ctx: CanvasRenderingContext2D, world: PhysicsWorld): void {
    if (!world.lines.length) return;
    ctx.save();
    ctx.lineCap = 'round';
    for (const line of world.lines) {
      ctx.strokeStyle = line.color;
      ctx.lineWidth = 8;
      ctx.shadowColor = line.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(line.x1, line.y1);
      ctx.lineTo(line.x2, line.y2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawSpikesAndPegs(ctx: CanvasRenderingContext2D, world: PhysicsWorld): void {
    ctx.save();
    // Pegs
    for (const peg of world.pegs) {
      ctx.fillStyle = peg.color;
      ctx.shadowColor = peg.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(peg.x, peg.y, peg.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Spikes
    for (const spike of world.spikes) {
      ctx.fillStyle = spike.color;
      const endX = spike.x + Math.cos(spike.angle) * spike.length;
      const endY = spike.y + Math.sin(spike.angle) * spike.length;
      const perpAngle = spike.angle + Math.PI / 2;
      const base1X = spike.x + Math.cos(perpAngle) * 8;
      const base1Y = spike.y + Math.sin(perpAngle) * 8;
      const base2X = spike.x - Math.cos(perpAngle) * 8;
      const base2Y = spike.y - Math.sin(perpAngle) * 8;

      ctx.beginPath();
      ctx.moveTo(base1X, base1Y);
      ctx.lineTo(endX, endY);
      ctx.lineTo(base2X, base2Y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  private drawShockwaves(ctx: CanvasRenderingContext2D, world: PhysicsWorld): void {
    if (!world.shockwaves.length) return;
    ctx.save();
    for (const sw of world.shockwaves) {
      ctx.strokeStyle = sw.color;
      ctx.globalAlpha = sw.alpha;
      ctx.lineWidth = 6 * sw.alpha;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawBalls(
    ctx: CanvasRenderingContext2D,
    world: PhysicsWorld,
    visuals: VisualSettings,
    theme: ThemeConfig
  ): void {
    ctx.save();
    for (const b of world.balls) {
      if (!b.isAlive) continue;

      if (visuals.bloomEnabled) {
        ctx.shadowColor = b.glowColor || b.color;
        ctx.shadowBlur = 20 * visuals.bloomIntensity;
      }

      // Ball body
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();

      // Inner highlight sparkle
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.beginPath();
      ctx.arc(b.x - b.radius * 0.3, b.y - b.radius * 0.3, b.radius * 0.25, 0, Math.PI * 2);
      ctx.fill();

      // Tier label for merge mode or name for race mode
      if (b.tier !== undefined || b.name) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `700 ${Math.max(12, b.radius * 0.8)}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(b.name || `${b.tier}`, b.x, b.y);
      }
    }
    ctx.restore();
  }

  private drawParticles(ctx: CanvasRenderingContext2D, world: PhysicsWorld): void {
    if (!world.particles.length) return;
    ctx.save();
    for (const p of world.particles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      if (p.type === 'shard' && p.rotation !== undefined) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.5);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}
