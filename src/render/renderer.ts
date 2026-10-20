import { PhysicsWorld } from '../engine/world';
import { ThemeConfig, THEMES } from './themes';
import { OverlaySettings, drawOverlays } from './overlays';

export interface VisualSettings {
  themeId: string;
  bloomEnabled: boolean;
  bloomIntensity: number;

  // Separate glow toggles + intensity: ball glow, wall glow
  ballGlowEnabled: boolean;
  ballGlowIntensity: number;
  wallGlowEnabled: boolean;
  wallGlowIntensity: number;

  // Rainbow walls with 2 styles:
  // - flow: smooth gradient that slowly rotates around the ring
  // - flash: wall changes color briefly on every hit
  rainbowWallsMode: 'off' | 'flow' | 'flash';

  // Trail: on/off, length, and "hue shift" (trail color cycles through the rainbow over time)
  trailEnabled: boolean;
  trailLength: number;
  trailFade: number;
  trailHueShift: boolean;

  // Reactive background: background brightness/color pulses gently on every bounce
  reactiveBgEnabled: boolean;
  reactiveBgIntensity: number;

  screenShakeIntensity: number;
  slowMotionEnd: boolean;
  chromaticFlash: boolean;
  ringColorMode: 'theme' | 'rainbow' | 'index' | 'pulse';

  customBgColor?: string;
  customBgImage?: string;
}

export class WorldRenderer {
  private screenShake: number = 0;
  private flashAlpha: number = 0;
  private reactiveBgPulse: number = 0;
  private lastBouncesCount: number = 0;
  private imageCache: Map<string, HTMLImageElement> = new Map();

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

    // Detect bounce increase to trigger reactive background pulse
    if (world.bounces > this.lastBouncesCount) {
      this.reactiveBgPulse = 1.0;
      this.lastBouncesCount = world.bounces;
    }

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

    // Optional mode camera (zoom punch around a point); only modes that set it are affected
    const cam = world.customState?.camera;
    if (cam && cam.zoom && Math.abs(cam.zoom - 1) > 0.0005) {
      ctx.translate(cam.cx, cam.cy);
      ctx.scale(cam.zoom, cam.zoom);
      ctx.translate(-cam.cx, -cam.cy);
    }

    // 3D Mode Direct Render Path (Marble Melody 3D)
    if (world.customState?.is3D) {
      if (world.customState.onRenderFg) {
        world.customState.onRenderFg(ctx, world);
      }
      const stats = world.getStats();
      drawOverlays(ctx, world.width, world.height, overlays, stats, isExport);
      ctx.restore();
      return;
    }

    // 1. Draw Background (with reactive background pulse)
    this.drawBackground(ctx, world.width, world.height, theme, visuals, isExport);

    // 2. Custom Mode Background / Trails Render
    if (world.customState?.onRenderBg) {
      world.customState.onRenderBg(ctx, world);
    }

    // 3. Draw Trails (with on/off and hue shift)
    if (visuals.trailEnabled !== false && visuals.trailLength > 0) {
      this.drawTrails(ctx, world, visuals, theme);
    }

    // 4. Draw Rings (with flow and flash rainbow styles)
    this.drawRings(ctx, world, visuals, theme);

    // 5. Draw Lines / Obstacles
    this.drawObstacles(ctx, world);

    // 6. Draw Pegs / Spikes / Portals
    this.drawSpikesAndPegs(ctx, world);

    // 7. Draw Shockwaves
    this.drawShockwaves(ctx, world);

    // 8. Draw Balls with Glow & Custom Emoji/Image
    this.drawBalls(ctx, world, visuals, theme);

    // 9. Draw Particles (Sparks, Shards, and Confetti)
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

  private drawBackground(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    theme: ThemeConfig,
    visuals: VisualSettings,
    isExport: boolean
  ): void {
    // Reactive background pulse decay
    let pulseIntensity = 0;
    if (visuals.reactiveBgEnabled) {
      pulseIntensity = this.reactiveBgPulse * (visuals.reactiveBgIntensity ?? 0.5);
      this.reactiveBgPulse *= 0.85; // smooth decay
    }

    // Custom Background Image support
    if (visuals.customBgImage) {
      let img = this.imageCache.get(visuals.customBgImage);
      if (!img) {
        img = new Image();
        img.src = visuals.customBgImage;
        this.imageCache.set(visuals.customBgImage, img);
      }
      if (img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, 0, 0, w, h);
        if (visuals.customBgColor) {
          ctx.save();
          ctx.globalAlpha = 0.3;
          ctx.fillStyle = visuals.customBgColor;
          ctx.fillRect(0, 0, w, h);
          ctx.restore();
        }
        return;
      }
    }

    // 8K Multi-Stop HDR Radial Gradient
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.max(w, h) * 0.75;
    const bgGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, radius);

    const primaryBg = visuals.customBgColor || theme.background;
    const secondaryBg = visuals.customBgColor ? visuals.customBgColor : (theme.backgroundSecondary || '#111424');

    if (pulseIntensity > 0.01) {
      // Glow pulse in center with harmonic chromatic color
      const boostColor = `rgba(0, 240, 255, ${pulseIntensity * 0.3})`;
      bgGrad.addColorStop(0, boostColor);
      bgGrad.addColorStop(0.2, secondaryBg);
      bgGrad.addColorStop(0.65, primaryBg);
      bgGrad.addColorStop(1.0, visuals.customBgColor ? primaryBg : '#030408');
    } else {
      bgGrad.addColorStop(0, secondaryBg);
      bgGrad.addColorStop(0.55, primaryBg);
      bgGrad.addColorStop(1.0, visuals.customBgColor ? primaryBg : '#020306');
    }

    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 8K Anti-Banding Film Dither (prevents color banding on 4K/8K displays)
    if (isExport) {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.012)';
      // Stippled micro-noise
      for (let s = 0; s < 400; s++) {
        const nx = (s * 137.5) % w;
        const ny = (s * 289.3) % h;
        ctx.fillRect(nx, ny, 1, 1);
      }
      ctx.restore();
    }

    // 8K High-DPI Subtle Starfield or Grid for specific themes
    if (theme.id === 'galaxy' || theme.id === 'midnight' || theme.id === 'cosmic') {
      ctx.save();
      for (let i = 0; i < 90; i++) {
        const sx = ((i * 137.5) % w);
        const sy = ((i * 243.7) % h);
        const brightness = 0.25 + (Math.sin(i * 1.7) * 0.2 + 0.2);
        const starSize = i % 7 === 0 ? 2.0 : 1.2;
        ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
        ctx.fillRect(sx, sy, starSize, starSize);

        // Sub-pixel star glow on hero stars
        if (i % 15 === 0) {
          ctx.fillStyle = `rgba(56, 189, 248, ${brightness * 0.5})`;
          ctx.beginPath();
          ctx.arc(sx + starSize / 2, sy + starSize / 2, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    } else if (theme.id === 'matrix' || theme.id === 'synthwave') {
      ctx.save();
      const lineColor = theme.id === 'matrix' ? 'rgba(0, 255, 102, 0.045)' : 'rgba(6, 182, 212, 0.04)';
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1;
      const step = 60;
      for (let x = 0; x < w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.restore();
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

        // Hue shift: trail color cycles through the rainbow over time
        if (visuals.trailHueShift) {
          const hue = (world.time * 120 + (i / maxLen) * 360) % 360;
          ctx.strokeStyle = `hsl(${hue}, 100%, 65%)`;
        } else {
          ctx.strokeStyle = b.color;
        }

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

      // Rainbow walls mode: flow or flash
      if (visuals.rainbowWallsMode === 'flow') {
        const hue = (r * 40 + (ring.angle * 180) / Math.PI + world.time * 90) % 360;
        ringColor = `hsl(${hue}, 100%, 62%)`;
      } else if (visuals.rainbowWallsMode === 'flash') {
        if (this.reactiveBgPulse > 0.15) {
          const flashHue = (r * 60 + world.time * 220) % 360;
          ringColor = `hsl(${flashHue}, 100%, 75%)`;
        }
      } else if (visuals.ringColorMode === 'rainbow') {
        const hue = (r * 35 + world.time * 60) % 360;
        ringColor = `hsl(${hue}, 95%, 60%)`;
      } else if (visuals.ringColorMode === 'index') {
        ringColor = theme.ringColors[r % theme.ringColors.length];
      }

      ctx.lineWidth = ring.thickness;
      ctx.strokeStyle = ringColor;
      ctx.lineCap = 'round';

      // Wall glow control
      if (visuals.wallGlowEnabled !== false && (visuals.bloomEnabled || visuals.wallGlowIntensity > 0)) {
        ctx.shadowColor = ringColor;
        ctx.shadowBlur = 18 * (visuals.wallGlowIntensity ?? visuals.bloomIntensity ?? 1.0);
      } else {
        ctx.shadowBlur = 0;
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
      const lx1 = line.x1 ?? line.p1?.x ?? 0;
      const ly1 = line.y1 ?? line.p1?.y ?? 0;
      const lx2 = line.x2 ?? line.p2?.x ?? 0;
      const ly2 = line.y2 ?? line.p2?.y ?? 0;
      ctx.beginPath();
      ctx.moveTo(lx1, ly1);
      ctx.lineTo(lx2, ly2);
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

    // Spikes (inward-pointing or mode obstacles)
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
      const a = sw.alpha ?? sw.opacity ?? 1;
      ctx.globalAlpha = a;
      ctx.lineWidth = 6 * a;
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

      // Ball glow control
      if (visuals.ballGlowEnabled !== false && (visuals.bloomEnabled || visuals.ballGlowIntensity > 0)) {
        ctx.shadowColor = b.glowColor || b.color;
        ctx.shadowBlur = 20 * (visuals.ballGlowIntensity ?? visuals.bloomIntensity ?? 1.0);
      } else {
        ctx.shadowBlur = 0;
      }

      // 1. Custom Emoji Ball (scales with b.radius and spins with b.rotation)
      if (b.customEmoji) {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rotation || 0);
        ctx.font = `${Math.round(b.radius * 1.7)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(b.customEmoji, 0, 0);
        ctx.restore();
      }
      // 2. Custom Uploaded Image Ball (circular cropped, scales with b.radius and spins with b.rotation)
      else if (b.customImageDataUrl) {
        let img = this.imageCache.get(b.customImageDataUrl);
        if (!img) {
          img = new Image();
          img.src = b.customImageDataUrl;
          this.imageCache.set(b.customImageDataUrl, img);
        }
        if (img.complete && img.naturalWidth > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
          ctx.clip();
          ctx.translate(b.x, b.y);
          ctx.rotate(b.rotation || 0);
          ctx.drawImage(img, -b.radius, -b.radius, b.radius * 2, b.radius * 2);
          ctx.restore();
        } else {
          // Fallback while image loads
          ctx.fillStyle = b.color;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // 3. Default Ball Body
      else {
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();

        // Inner highlight sparkle
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(b.x - b.radius * 0.3, b.y - b.radius * 0.3, b.radius * 0.25, 0, Math.PI * 2);
        ctx.fill();
      }

      // Tier label for merge mode or name/label for contestants
      if (b.tier !== undefined || b.name || b.label) {
        ctx.save();
        ctx.shadowBlur = 0;
        const text = b.label || b.name || `${b.tier}`;
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(11, Math.round(b.radius * 0.75))}px Helvetica, Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, b.x, b.y);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  private drawParticles(ctx: CanvasRenderingContext2D, world: PhysicsWorld): void {
    if (!world.particles.length) return;
    ctx.save();
    for (const p of world.particles) {
      ctx.globalAlpha = p.alpha ?? 1;
      ctx.fillStyle = p.color;
      const sz = p.size ?? p.radius ?? 4;

      if (p.type === 'confetti') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation || 0);
        const pw = p.width || 8;
        const ph = p.height || 4;
        ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
        ctx.restore();
      } else if (p.type === 'shard' && p.rotation !== undefined) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillRect(-sz / 2, -sz / 2, sz, sz * 1.5);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}
