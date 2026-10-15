import { getSafeArena, PlatformType, isInsideSafeBox } from './safeArea';

export interface OverlaySettings {
  showTitle: boolean;
  titleText: string;
  titleFontSize: number;
  titleColor: string;
  titleY: number; // percentage from top (between 12% and 22%, default 17)

  showCounter: boolean;
  counterType: 'rings' | 'balls' | 'bounces' | 'timer' | 'percent';
  counterFontSize: number;
  counterColor: string;
  counterCustomLabel?: string;

  showProgressBar: boolean;
  targetDuration: number; // in seconds (e.g. 60)
  progressBarColor: string;

  showWatermark: boolean;
  watermarkOpacity: number;

  showEndCard: boolean;
  endCardText: string;
  endCardCta?: string;

  showPredictionIntro?: boolean;
  predictionDuration?: number;
  showPartSeries?: boolean;
  partNumber?: number;

  // Safe zones & generic mockup (Preview only, NEVER in video export)
  showSafeZone: boolean;
  showPlatformMockup: boolean;
  safeZonePlatform: PlatformType;
}

export const DEFAULT_OVERLAYS: OverlaySettings = {
  showTitle: true,
  titleText: 'can it escape??',
  titleFontSize: 42,
  titleColor: '#ffffff',
  titleY: 17, // 17% of height (between 12% and 22% safe area)

  showCounter: true,
  counterType: 'rings',
  counterFontSize: 36,
  counterColor: '#00f0ff',
  counterCustomLabel: '',

  showProgressBar: true,
  targetDuration: 60,
  progressBarColor: '#00f0ff',

  showWatermark: false,
  watermarkOpacity: 0.6,

  showEndCard: true,
  endCardText: 'ESCAPED!',
  endCardCta: 'follow for part 2 • comment ur color',

  showPredictionIntro: true,
  predictionDuration: 2.0,
  showPartSeries: false,
  partNumber: 1,

  showSafeZone: false,
  showPlatformMockup: false,
  safeZonePlatform: 'all', // "all platforms (safest)" default
};


/**
 * Draws overlays onto any Canvas 2D context (used in both live renderer and offline video exporter)
 */
export function drawOverlays(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: OverlaySettings,
  stats: {
    elapsedTime: number;
    ringsLeft: number;
    ballsCount: number;
    bounces: number;
    isFinished: boolean;
    winner?: string;
    customCounters?: Record<string, any>;
  },
  isExport: boolean = false
): void {
  ctx.save();

  const arena = getSafeArena(width, height, settings.safeZonePlatform);
  const scale = width / 1080;

  // 1. Top Progress Bar
  if (settings.showProgressBar) {
    const progress = Math.min(1, stats.elapsedTime / settings.targetDuration);
    const barHeight = Math.max(4, Math.round(8 * scale));
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(0, 0, width, barHeight);

    ctx.fillStyle = settings.progressBarColor;
    ctx.shadowColor = settings.progressBarColor;
    ctx.shadowBlur = Math.round(10 * scale);
    ctx.fillRect(0, 0, width * progress, barHeight);
    ctx.shadowBlur = 0;
  }

  // 2. Hook Title (Between 12% and 22% of frame height, centered, auto-shrinks to fit in safe box)
  let titleBox: { x: number; y: number; width: number; height: number } | null = null;
  if (settings.showTitle && settings.titleText) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Constrain titleY between 12% and 22%
    const clampedTitleYPct = Math.max(12, Math.min(22, settings.titleY || 17));
    const titlePosY = (height * clampedTitleYPct) / 100;
    const maxTitleW = arena.layout.titleMaxW;

    let fontSize = Math.round((settings.titleFontSize || 42) * scale);
    ctx.font = `bold ${fontSize}px Helvetica, Arial, sans-serif`;

    // Measure text and shrink if needed to fit maxTitleW
    let textWidth = ctx.measureText(settings.titleText).width;
    while (textWidth > maxTitleW && fontSize > 18 * scale) {
      fontSize -= 2 * scale;
      ctx.font = `bold ${Math.round(fontSize)}px Helvetica, Arial, sans-serif`;
      textWidth = ctx.measureText(settings.titleText).width;
    }

    // Drop shadow for legibility
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = Math.round(12 * scale);
    ctx.fillStyle = settings.titleColor;

    ctx.fillText(settings.titleText, width / 2, titlePosY);
    ctx.restore();

    titleBox = {
      x: width / 2 - textWidth / 2,
      y: titlePosY - fontSize / 2,
      width: textWidth,
      height: fontSize,
    };
  }

  // Part Series Badge (Inside safe box, top-left)
  if (settings.showPartSeries) {
    ctx.save();
    const partText = `PART ${settings.partNumber || 1}`;
    ctx.font = `bold ${Math.round(20 * scale)}px Helvetica, Arial, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const txtW = ctx.measureText(partText).width;
    const pillX = arena.safeBox.x + 16 * scale;
    const pillY = arena.safeBox.y + 36 * scale;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(pillX, pillY - 14 * scale, txtW + 20 * scale, 28 * scale, 14 * scale) : ctx.rect(pillX, pillY - 14 * scale, txtW + 20 * scale, 28 * scale);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ff007f';
    ctx.fillText(partText, pillX + 10 * scale, pillY);
    ctx.restore();
  }

  // Prediction Intro (2-second "pick ur color" card at start of match)
  if (settings.showPredictionIntro && stats.elapsedTime <= (settings.predictionDuration || 2.0)) {
    const alpha = Math.min(1, Math.max(0, (settings.predictionDuration || 2.0) - stats.elapsedTime));
    ctx.save();
    ctx.globalAlpha = alpha;
    const cardW = arena.safeBox.width * 0.9;
    const cardH = 130 * scale;
    const cardX = (width - cardW) / 2;
    const cardY = arena.centerY - cardH / 2;

    ctx.fillStyle = 'rgba(6, 10, 20, 0.92)';
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(cardX, cardY, cardW, cardH, 20 * scale) : ctx.rect(cardX, cardY, cardW, cardH);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.round(32 * scale)}px Helvetica, Arial, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('PICK UR COLOR 👇', width / 2, cardY + 45 * scale);

    ctx.font = `bold ${Math.round(18 * scale)}px Helvetica, Arial, sans-serif`;
    ctx.fillStyle = '#00f0ff';
    ctx.fillText('comment before 0:02 to predict the winner', width / 2, cardY + 90 * scale);
    ctx.restore();
  }

  // 3. Live Counters (Between arena bottom and watermark, centered)
  if (settings.showCounter) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const counterFontSize = Math.round((settings.counterFontSize || 36) * scale);
    ctx.font = `bold ${counterFontSize}px Helvetica, Arial, sans-serif`;
    ctx.fillStyle = settings.counterColor;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = Math.round(8 * scale);

    let counterText = '';
    const customLabel = settings.counterCustomLabel?.trim();
    if (stats.customCounters?.counterLabel) {
      counterText = `${customLabel || stats.customCounters.counterLabel}: ${stats.customCounters.counterValue}`;
    } else {
      switch (settings.counterType) {
        case 'rings':
          counterText = `${customLabel ? customLabel.toUpperCase() : 'RINGS LEFT'}: ${stats.ringsLeft}`;
          break;
        case 'balls':
          counterText = `${customLabel ? customLabel.toUpperCase() : 'BALLS'}: ${stats.ballsCount}`;
          break;
        case 'bounces':
          counterText = `${customLabel ? customLabel.toUpperCase() : 'BOUNCES'}: ${stats.bounces}`;
          break;
        case 'timer': {
          const mins = Math.floor(stats.elapsedTime / 60);
          const secs = (stats.elapsedTime % 60).toFixed(2);
          counterText = `${customLabel ? customLabel.toUpperCase() + ' ' : ''}${mins.toString().padStart(2, '0')}:${secs.padStart(5, '0')}`;
          break;
        }
        case 'percent': {
          const pct = Math.floor((stats.elapsedTime / settings.targetDuration) * 100);
          counterText = `${customLabel ? customLabel.toUpperCase() + ' ' : ''}${pct}%`;
          break;
        }
      }
    }

    const counterPosY = arena.layout.counterY;
    ctx.fillText(counterText, width / 2, counterPosY);
    ctx.restore();
  }

  // 4. Watermark (Centered, bottom edge at 23% from frame bottom, width 30% of frame, 60% opacity)
  let watermarkBox: { x: number; y: number; width: number; height: number } | null = null;
  if (settings.showWatermark) {
    watermarkBox = drawFlatWatermark(ctx, width, height, arena, settings.watermarkOpacity);
  }

  // 5. Winner Reveal End Card (Centered inside safe box with vector trophy & CTA line)
  if (settings.showEndCard && stats.isFinished) {
    ctx.save();
    const bannerH = 220 * scale;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, arena.centerY - bannerH / 2, width, bannerH);

    // Draw vector trophy (SVG icon drawn natively on canvas)
    drawVectorTrophy(ctx, arena.centerX, arena.centerY - 45 * scale, 38 * scale, '#ffd700');

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.round(44 * scale)}px Helvetica, Arial, sans-serif`;
    ctx.fillStyle = '#ffdf00';
    ctx.shadowColor = 'rgba(255, 223, 0, 0.6)';
    ctx.shadowBlur = Math.round(20 * scale);

    const winnerName = stats.winner ? `${stats.winner} WINS` : settings.endCardText.replace('🏆', '').trim();
    ctx.fillText(winnerName, arena.centerX, arena.centerY + 8 * scale);

    // CTA Line inside safe area
    ctx.shadowBlur = 0;
    ctx.font = `bold ${Math.round(20 * scale)}px Helvetica, Arial, sans-serif`;
    ctx.fillStyle = '#00f0ff';
    const ctaText = settings.endCardCta || 'follow for part 2 • comment ur color';
    ctx.fillText(ctaText, arena.centerX, arena.centerY + 58 * scale);
    ctx.restore();
  }


  // 6. Safe-Zone Guides & Mockup (Preview only, NEVER in export)
  if (!isExport) {
    let hasOverflow = false;
    if (titleBox && !isInsideSafeBox(titleBox, arena.safeBox)) {
      hasOverflow = true;
    }
    if (watermarkBox && !isInsideSafeBox(watermarkBox, arena.safeBox)) {
      hasOverflow = true;
    }

    if (settings.showSafeZone) {
      drawSafeZones(ctx, width, height, arena, settings.safeZonePlatform);
    }

    if (settings.showPlatformMockup) {
      drawPlatformMockup(ctx, width, height, arena);
    }

    // Warning Chip: "heads up: ur text is under the buttons"
    if (hasOverflow) {
      drawSafeWarningChip(ctx, width, height, scale);
    }
  }

  ctx.restore();
}

/**
 * Draws the official flat mono-white horizontal watermark:
 * "bounceforge" (no 3D), centered, bottom edge at 23% from frame bottom, width 30% of frame, 60% opacity.
 */
function drawFlatWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  arena: ReturnType<typeof getSafeArena>,
  opacity: number = 0.6
): { x: number; y: number; width: number; height: number } {
  ctx.save();
  const targetWidth = arena.layout.watermarkW; // 30% of frame width
  const targetHeight = targetWidth / 4;
  const bottomEdgeY = arena.layout.watermarkBottomY; // 77% of frame height (23% from bottom)
  const originX = (width - targetWidth) / 2;
  const originY = bottomEdgeY - targetHeight;
  const s = targetWidth / 480;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = Math.max(4, Math.round(8 * s));
  ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
  ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 1. Symbol Ring with Top-Right Gap
  ctx.lineWidth = 13 * s;
  ctx.beginPath();
  const ringCenterX = originX + 60 * s;
  const ringCenterY = originY + 60 * s;
  const startAngle = (15 * Math.PI) / 180;
  const endAngle = (-55 * Math.PI) / 180;
  ctx.arc(ringCenterX, ringCenterY, 38 * s, startAngle, endAngle, false);
  ctx.stroke();

  // 2. 3 Motion Streaks
  ctx.lineWidth = 4.5 * s;
  ctx.beginPath();
  ctx.moveTo(originX + 64 * s, originY + 56 * s);
  ctx.lineTo(originX + 79 * s, originY + 43 * s);
  ctx.stroke();

  ctx.lineWidth = 3.5 * s;
  ctx.beginPath();
  ctx.moveTo(originX + 57 * s, originY + 52 * s);
  ctx.lineTo(originX + 73 * s, originY + 38 * s);
  ctx.stroke();

  ctx.lineWidth = 3 * s;
  ctx.beginPath();
  ctx.moveTo(originX + 62 * s, originY + 64 * s);
  ctx.lineTo(originX + 75 * s, originY + 52 * s);
  ctx.stroke();

  // 3. Ball
  ctx.beginPath();
  ctx.arc(originX + 89 * s, originY + 27 * s, 12.5 * s, 0, Math.PI * 2);
  ctx.fill();

  // 4. Wordmark: "bounceforge" (Helvetica Neue Black 900, lowercase, no 3D)
  ctx.font = `900 ${Math.round(52 * s)}px "Helvetica Neue", Helvetica, -apple-system, sans-serif`;
  ctx.letterSpacing = '-0.05em';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('bounceforge', originX + 132 * s, originY + 74 * s);

  ctx.restore();

  return { x: originX, y: originY, width: targetWidth, height: targetHeight };
}

/**
 * Draws safe area guides: red shaded overlays for platform UI + dashed lime safe box
 */
function drawSafeZones(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  arena: ReturnType<typeof getSafeArena>,
  platform: PlatformType
): void {
  ctx.save();
  const { topPx, bottomPx, rightPx, leftPx } = arena.margins;
  const { safeBox } = arena;

  // Red shaded covered platform areas
  ctx.fillStyle = 'rgba(239, 68, 68, 0.16)';

  // Top header area
  ctx.fillRect(0, 0, width, topPx);
  // Bottom caption & audio area
  ctx.fillRect(0, height - bottomPx, width, bottomPx);
  // Right action buttons area
  ctx.fillRect(width - rightPx, topPx, rightPx, height - topPx - bottomPx);
  // Left margin area
  ctx.fillRect(0, topPx, leftPx, height - topPx - bottomPx);

  // Dashed lime safe box outline
  ctx.strokeStyle = '#CCFF00';
  ctx.lineWidth = Math.max(2, Math.round(3 * (width / 1080)));
  ctx.setLineDash([10 * (width / 1080), 8 * (width / 1080)]);
  ctx.strokeRect(safeBox.x, safeBox.y, safeBox.width, safeBox.height);
  ctx.setLineDash([]);

  // Labels
  ctx.font = `700 ${Math.round(18 * (width / 1080))}px "JetBrains Mono", monospace`;
  ctx.fillStyle = '#CCFF00';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`SAFE BOX (${platform.toUpperCase()})`, safeBox.x + 12, safeBox.y + 12);

  ctx.fillStyle = 'rgba(255, 100, 100, 0.9)';
  ctx.fillText('TOP BAR / SEARCH', 20, 20);

  ctx.textAlign = 'right';
  ctx.fillText('BUTTONS', width - 20, topPx + 20);

  ctx.textAlign = 'left';
  ctx.fillText('CAPTIONS / AUDIO', 20, height - bottomPx + 20);

  ctx.restore();
}

/**
 * Generic short-video app platform mockup (grey placeholders, NO copyrighted logos)
 */
function drawPlatformMockup(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  arena: ReturnType<typeof getSafeArena>
): void {
  ctx.save();
  const scale = width / 1080;

  // 1. Right Action Bar (Avatar, Like, Comment, Bookmark, Share, Music Disc)
  const btnX = width - arena.margins.rightPx / 2;
  const startY = height * 0.44;
  const spacing = 72 * scale;

  // Avatar Circle
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.beginPath();
  ctx.arc(btnX, startY, 22 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#CCFF00';
  ctx.beginPath();
  ctx.arc(btnX, startY + 22 * scale, 7 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Like Heart Placeholder
  drawMockupButton(ctx, btnX, startY + spacing, '♥', '142K', scale);
  // Comment Bubble Placeholder
  drawMockupButton(ctx, btnX, startY + spacing * 2, '💬', '1.8K', scale);
  // Bookmark Placeholder
  drawMockupButton(ctx, btnX, startY + spacing * 3, '★', '24K', scale);
  // Share Arrow Placeholder
  drawMockupButton(ctx, btnX, startY + spacing * 4, '➜', 'Share', scale);

  // Rotating Music Disc at Bottom Right
  const discY = height - arena.margins.bottomPx * 0.45;
  ctx.fillStyle = 'rgba(30, 30, 40, 0.85)';
  ctx.beginPath();
  ctx.arc(btnX, discY, 20 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 2 * scale;
  ctx.stroke();

  // 2. Bottom Captions Mockup
  const capX = arena.safeBox.x + 10;
  const capY = height - arena.margins.bottomPx * 0.75;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  ctx.font = `800 ${Math.round(20 * scale)}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillText('@bounceforge.creator', capX, capY);

  ctx.font = `500 ${Math.round(15 * scale)}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.fillText('Wait for the end... oddlysatisfying #physics #sound', capX, capY + 26 * scale);

  ctx.font = `600 ${Math.round(14 * scale)}px "JetBrains Mono", monospace`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fillText('♫ original sound - bounceforge studio', capX, capY + 48 * scale);

  // 3. Top Tabs Mockup ("Following | For You")
  ctx.textAlign = 'center';
  ctx.font = `700 ${Math.round(18 * scale)}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fillText('Following   |   For You', width / 2, arena.margins.topPx * 0.55);

  ctx.restore();
}

function drawMockupButton(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  icon: string,
  count: string,
  scale: number
): void {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Icon Circle
  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.beginPath();
  ctx.arc(x, y, 20 * scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `${Math.round(18 * scale)}px sans-serif`;
  ctx.fillText(icon, x, y);

  // Count text below
  ctx.font = `700 ${Math.round(12 * scale)}px "JetBrains Mono", monospace`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fillText(count, x, y + 26 * scale);
  ctx.restore();
}

/**
 * Warning chip displayed in preview if text crosses under platform buttons
 */
function drawSafeWarningChip(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale: number
): void {
  ctx.save();
  const text = '⚠️ heads up: ur text is under the buttons';
  const chipH = 34 * scale;
  const chipY = 60 * scale;

  ctx.font = `800 ${Math.round(14 * scale)}px "Plus Jakarta Sans", sans-serif`;
  const textW = ctx.measureText(text).width;
  const chipW = textW + 36 * scale;
  const chipX = (width - chipW) / 2;

  // Background Pill
  ctx.fillStyle = 'rgba(239, 68, 68, 0.95)';
  ctx.beginPath();
  ctx.roundRect(chipX, chipY, chipW, chipH, 999);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1.5 * scale;
  ctx.stroke();

  // Text
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, chipY + chipH / 2);

  ctx.restore();
}

/**
 * Draws an inline vector trophy icon (no emoji) for the winner end card
 */
function drawVectorTrophy(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string = '#ffd700'
): void {
  ctx.save();
  ctx.translate(cx, cy);
  const s = size / 32;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5 * s;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Trophy cup body
  ctx.beginPath();
  ctx.moveTo(-10 * s, -12 * s);
  ctx.lineTo(10 * s, -12 * s);
  ctx.lineTo(8 * s, 2 * s);
  ctx.bezierCurveTo(6 * s, 8 * s, -6 * s, 8 * s, -8 * s, 2 * s);
  ctx.closePath();
  ctx.fill();

  // Handles
  ctx.beginPath();
  ctx.arc(-11 * s, -5 * s, 4.5 * s, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(11 * s, -5 * s, 4.5 * s, -Math.PI / 2, Math.PI / 2, true);
  ctx.stroke();

  // Stem & Base
  ctx.fillRect(-2.5 * s, 8 * s, 5 * s, 4.5 * s);
  ctx.fillRect(-8 * s, 12.5 * s, 16 * s, 3.5 * s);

  ctx.restore();
}

