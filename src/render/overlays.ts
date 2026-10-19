import { getSafeArena, PlatformType, isInsideSafeBox } from './safeArea';
import { SupportedLanguage, isRTL } from '../i18n/config';
import { getScriptFontFamily, ensureFontLoaded } from '../i18n/fonts';
import { getOverlayStrings } from './overlayLocalization';

export interface OverlaySettings {
  showTitle: boolean;
  titleText: string;
  titleFontSize: number;
  titleColor: string;
  titleY: number; // percentage from top (between 12% and 22%, default 17)
  titleBold?: boolean;
  titleOutline?: boolean;

  // Bottom caption (kept inside safe area)
  showBottomCaption?: boolean;
  bottomCaptionText?: string;
  bottomCaptionSize?: number;
  bottomCaptionColor?: string;
  bottomCaptionBold?: boolean;
  bottomCaptionOutline?: boolean;

  // Center text (optional text in the middle of the arena e.g. @handle or a question)
  showCenterText?: boolean;
  centerText?: string;
  centerTextSize?: number;
  centerTextOpacity?: number;
  centerTextColor?: string;

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

  // Video text language (independent of UI language)
  videoLanguage?: SupportedLanguage;

  // Safe zones & generic mockup (Preview only, NEVER in video export)
  showSafeZone: boolean;
  showPlatformMockup: boolean;
  safeZonePlatform: PlatformType;
  showHitMarkers?: boolean; // Preview only: flashes on hit, turns red if silent
}

export const DEFAULT_OVERLAYS: OverlaySettings = {
  showTitle: false,
  titleText: 'can it escape??',
  titleFontSize: 42,
  titleColor: '#ffffff',
  titleY: 17, // 17% of height (between 12% and 22% safe area)
  titleBold: true,
  titleOutline: true,

  showBottomCaption: false,
  bottomCaptionText: 'wait for the ending 😱',
  bottomCaptionSize: 34,
  bottomCaptionColor: '#ffffff',
  bottomCaptionBold: true,
  bottomCaptionOutline: true,

  showCenterText: false,
  centerText: '@bounceforge',
  centerTextSize: 38,
  centerTextOpacity: 0.35,
  centerTextColor: '#ffffff',

  showCounter: false,
  counterType: 'rings',
  counterFontSize: 36,
  counterColor: '#00f0ff',
  counterCustomLabel: '',

  showProgressBar: true,
  targetDuration: 60,
  progressBarColor: '#00f0ff',

  showWatermark: true,
  watermarkOpacity: 0.85,

  showEndCard: true,
  endCardText: 'ESCAPED!',
  endCardCta: 'follow for part 2 • comment ur color',

  showPredictionIntro: true,
  predictionDuration: 2.0,
  showPartSeries: false,
  partNumber: 1,

  videoLanguage: 'en',

  showSafeZone: false,
  showPlatformMockup: false,
  safeZonePlatform: 'all', // "all platforms (safest)" default
  showHitMarkers: false,
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

  const videoLang = settings.videoLanguage || 'en';
  const overlayStrings = getOverlayStrings(videoLang);
  const scriptFont = getScriptFontFamily(videoLang);
  const isLangRtl = isRTL(videoLang);

  // Proactively ensure font is loaded
  if (typeof document !== 'undefined') {
    ensureFontLoaded(videoLang).catch(() => {});
  }

  const arena = getSafeArena(width, height, settings.safeZonePlatform);
  const scale = width / 1080;

  // 1. Top Progress Bar (Inset within frame's inner padding so rounded corners never cut it)
  if (settings.showProgressBar) {
    const progress = Math.min(1, stats.elapsedTime / settings.targetDuration);
    const barHeight = Math.max(4, Math.round(8 * scale));
    const padX = Math.round(48 * scale);
    const barY = Math.round(20 * scale);
    const barW = width - padX * 2;
    const radius = barHeight / 2;

    ctx.save();
    // Track background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(padX, barY, barW, barHeight, radius) : ctx.rect(padX, barY, barW, barHeight);
    ctx.fill();

    // Progress fill
    if (progress > 0) {
      ctx.fillStyle = settings.progressBarColor;
      ctx.shadowColor = settings.progressBarColor;
      ctx.shadowBlur = Math.round(10 * scale);
      ctx.beginPath();
      const fillW = Math.max(radius * 2, barW * progress);
      ctx.roundRect ? ctx.roundRect(padX, barY, fillW, barHeight, radius) : ctx.rect(padX, barY, fillW, barHeight);
      ctx.fill();
    }
    ctx.restore();
  }

  // 2. Hook Title (Between 12% and 22% of frame height, centered, auto-shrinks to fit in safe box)
  let titleBox: { x: number; y: number; width: number; height: number } | null = null;
  let rawTitle = settings.titleText || overlayStrings.defaultHook;
  // If marble melody is running and title is ring escape default, substitute with melody hook
  if (stats.customCounters?.modeFamily === 'marble_melody') {
    if (!settings.titleText || settings.titleText.toLowerCase().includes('escape')) {
      rawTitle = stats.customCounters.songTitle
        ? `${stats.customCounters.songTitle} · marble run`
        : 'satisfying 3D marble melody';
    }
  }

  if (settings.showTitle && rawTitle) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Constrain titleY between 12% and 22%
    const clampedTitleYPct = Math.max(12, Math.min(22, settings.titleY || 17));
    const titlePosY = (height * clampedTitleYPct) / 100;
    const maxTitleW = arena.layout.titleMaxW;

    const isRtl = isLangRtl || /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(rawTitle);
    ctx.direction = isRtl ? 'rtl' : 'ltr';

    let fontSize = Math.round((settings.titleFontSize || 42) * scale);
    ctx.font = `bold ${fontSize}px ${scriptFont}`;

    // Measure text and shrink if needed to fit maxTitleW
    let textWidth = ctx.measureText(rawTitle).width;
    while (textWidth > maxTitleW && fontSize > 16 * scale) {
      fontSize -= 2 * scale;
      ctx.font = `bold ${Math.round(fontSize)}px ${scriptFont}`;
      textWidth = ctx.measureText(rawTitle).width;
    }

    // Drop shadow for legibility
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = Math.round(12 * scale);
    ctx.fillStyle = settings.titleColor;

    ctx.fillText(rawTitle, width / 2, titlePosY);
    ctx.restore();

    titleBox = {
      x: width / 2 - textWidth / 2,
      y: titlePosY - fontSize / 2,
      width: textWidth,
      height: fontSize,
    };
  }

  // Song Title Card for Marble Melody (2.5s at the start)
  if (settings.showTitle && stats.customCounters?.modeFamily === 'marble_melody' && stats.customCounters?.songTitle && stats.elapsedTime <= 2.5) {
    const alpha = Math.min(1, Math.max(0, (2.5 - stats.elapsedTime) / 0.5));
    ctx.save();
    ctx.globalAlpha = alpha;
    const cardW = Math.min(arena.safeBox.width * 0.85, 720 * scale);
    const cardH = 88 * scale;
    const cardX = (width - cardW) / 2;
    const cardY = arena.safeBox.y + 48 * scale;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(cardX, cardY, cardW, cardH, 16 * scale) : ctx.rect(cardX, cardY, cardW, cardH);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.round(26 * scale)}px ${scriptFont}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(stats.customCounters.songTitle).toUpperCase(), width / 2, cardY + 30 * scale);

    ctx.font = `600 ${Math.round(15 * scale)}px ${scriptFont}`;
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('PUBLIC DOMAIN COMPOSITION · 3D MARBLE RUN', width / 2, cardY + 62 * scale);
    ctx.restore();
  }

  // Part Series Badge (Inside safe box, mirrored to top-right in RTL)
  if (settings.showPartSeries) {
    ctx.save();
    const partText = overlayStrings.part(settings.partNumber || 1);
    ctx.font = `bold ${Math.round(20 * scale)}px ${scriptFont}`;
    ctx.textAlign = isLangRtl ? 'right' : 'left';
    ctx.textBaseline = 'middle';
    const txtW = ctx.measureText(partText).width;
    const pillW = txtW + 24 * scale;
    const pillH = 28 * scale;
    const pillX = isLangRtl
      ? arena.safeBox.x + arena.safeBox.width - pillW - 16 * scale
      : arena.safeBox.x + 16 * scale;
    const pillY = arena.safeBox.y + 36 * scale;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(pillX, pillY - 14 * scale, pillW, pillH, 14 * scale) : ctx.rect(pillX, pillY - 14 * scale, pillW, pillH);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ff007f';
    const textTargetX = isLangRtl ? pillX + pillW - 12 * scale : pillX + 12 * scale;
    ctx.fillText(partText, textTargetX, pillY);
    ctx.restore();
  }

  // Prediction Intro (2-second "pick ur color" card at start of match - escape modes only)
  if (
    settings.showPredictionIntro &&
    stats.customCounters?.modeFamily !== 'marble_melody' &&
    stats.elapsedTime <= (settings.predictionDuration || 2.0)
  ) {
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
    ctx.font = `bold ${Math.round(30 * scale)}px ${scriptFont}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(overlayStrings.pickColor, width / 2, cardY + 45 * scale);

    ctx.font = `bold ${Math.round(18 * scale)}px ${scriptFont}`;
    ctx.fillStyle = '#00f0ff';
    ctx.fillText(overlayStrings.predictPrompt, width / 2, cardY + 90 * scale);
    ctx.restore();
  }

  // 3. Live Counters (Between arena bottom and watermark, centered)
  if (settings.showCounter) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const counterFontSize = Math.round((settings.counterFontSize || 36) * scale);
    ctx.font = `bold ${counterFontSize}px ${scriptFont}`;
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
          if (stats.customCounters?.modeFamily === 'marble_melody') {
            counterText = `${customLabel || 'NOTES'}: ${stats.customCounters.counterValue || '0/100'}`;
          } else if (stats.ringsLeft <= 0 && !customLabel) {
            counterText = '';
          } else {
            counterText = customLabel
              ? `${customLabel.toUpperCase()}: ${stats.ringsLeft}`
              : overlayStrings.ringsLeft(stats.ringsLeft);
          }
          break;
        case 'balls':
          counterText = `${customLabel ? customLabel.toUpperCase() : overlayStrings.balls}: ${stats.ballsCount}`;
          break;
        case 'bounces':
          counterText = `${customLabel ? customLabel.toUpperCase() : overlayStrings.bounces}: ${stats.bounces}`;
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

    if (counterText) {
      const counterPosY = arena.layout.counterY;
      ctx.fillText(counterText, width / 2, counterPosY);
    }
    ctx.restore();
  }

  // 3b. Center Text (Optional text in middle of arena e.g. @handle or question, separate from watermark)
  if (settings.showCenterText && settings.centerText) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = settings.centerTextOpacity ?? 0.35;
    const centerFontSize = Math.round((settings.centerTextSize || 38) * scale);
    ctx.font = `900 ${centerFontSize}px ${scriptFont}`;
    ctx.fillStyle = settings.centerTextColor || '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = Math.round(10 * scale);
    ctx.fillText(settings.centerText, arena.centerX, arena.centerY);
    ctx.restore();
  }

  // 3c. Bottom Caption (Kept strictly inside safe area)
  let bottomCaptionBox: { x: number; y: number; width: number; height: number } | null = null;
  const rawCaption = settings.bottomCaptionText || overlayStrings.defaultBottomCaption;
  if (settings.showBottomCaption && rawCaption) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Position just above the watermark or bottom safe area margin
    const bottomPosY = arena.layout.watermarkBottomY - arena.layout.watermarkW / 4 - 32 * scale;
    const maxCaptionW = arena.safeBox.width;

    let fontSize = Math.round((settings.bottomCaptionSize || 34) * scale);
    const weight = settings.bottomCaptionBold !== false ? 'bold' : 'normal';
    ctx.font = `${weight} ${fontSize}px ${scriptFont}`;

    let textWidth = ctx.measureText(rawCaption).width;
    while (textWidth > maxCaptionW && fontSize > 16 * scale) {
      fontSize -= 2 * scale;
      ctx.font = `${weight} ${fontSize}px ${scriptFont}`;
      textWidth = ctx.measureText(rawCaption).width;
    }

    if (settings.bottomCaptionOutline !== false) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
      ctx.shadowBlur = Math.round(12 * scale);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = Math.round(4 * scale);
      ctx.strokeText(rawCaption, width / 2, bottomPosY);
    }

    ctx.fillStyle = settings.bottomCaptionColor || '#ffffff';
    ctx.fillText(rawCaption, width / 2, bottomPosY);
    ctx.restore();

    bottomCaptionBox = {
      x: width / 2 - textWidth / 2,
      y: bottomPosY - fontSize / 2,
      width: textWidth,
      height: fontSize,
    };
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
    ctx.font = `bold ${Math.round(44 * scale)}px ${scriptFont}`;
    ctx.fillStyle = '#ffdf00';
    ctx.shadowColor = 'rgba(255, 223, 0, 0.6)';
    ctx.shadowBlur = Math.round(20 * scale);

    const winnerName = stats.winner
      ? overlayStrings.winner(stats.winner)
      : (settings.endCardText || overlayStrings.escaped).replace('🏆', '').trim();
    ctx.fillText(winnerName, arena.centerX, arena.centerY + 8 * scale);

    // CTA Line inside safe area
    ctx.shadowBlur = 0;
    ctx.font = `bold ${Math.round(20 * scale)}px ${scriptFont}`;
    ctx.fillStyle = '#00f0ff';
    const ctaText =
      settings.endCardCta && settings.endCardCta !== 'follow for part 2 • comment ur color'
        ? settings.endCardCta
        : overlayStrings.followCta;
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

    // 7. Hit Markers Overlay (Preview only, flashes green on sound, red if silent)
    if (settings.showHitMarkers) {
      drawHitMarkers(ctx, width, height, scale, stats.customCounters);
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
  opacity: number = 0.85
): { x: number; y: number; width: number; height: number } {
  ctx.save();
  ctx.globalAlpha = opacity;
  const targetWidth = arena.layout.watermarkW; // 30% of frame width
  const targetHeight = targetWidth / 4;
  const bottomEdgeY = arena.layout.watermarkBottomY; // 77% of frame height (23% from bottom)
  const originX = (width - targetWidth) / 2;
  const originY = bottomEdgeY - targetHeight;
  const s = targetWidth / 480;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
  ctx.shadowBlur = Math.max(4, Math.round(10 * s));
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 1. Symbol Ring with Top-Right Gap: Fluorescent Lime #CCFF00
  ctx.strokeStyle = '#CCFF00';
  ctx.lineWidth = 13 * s;
  ctx.beginPath();
  const ringCenterX = originX + 60 * s;
  const ringCenterY = originY + 60 * s;
  const startAngle = (15 * Math.PI) / 180;
  const endAngle = (-55 * Math.PI) / 180;
  ctx.arc(ringCenterX, ringCenterY, 38 * s, startAngle, endAngle, false);
  ctx.stroke();

  // 2. 3 Motion Streaks: Hot Pink #FF2E93 & Cyan #00F0FF
  ctx.strokeStyle = '#FF2E93';
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

  ctx.strokeStyle = '#00F0FF';
  ctx.lineWidth = 3 * s;
  ctx.beginPath();
  ctx.moveTo(originX + 62 * s, originY + 64 * s);
  ctx.lineTo(originX + 75 * s, originY + 52 * s);
  ctx.stroke();

  // 3. Ball: Hot Pink #FF2E93
  ctx.fillStyle = '#FF2E93';
  ctx.beginPath();
  ctx.arc(originX + 89 * s, originY + 27 * s, 12.5 * s, 0, Math.PI * 2);
  ctx.fill();

  // 4. Wordmark: "bounceforge" (Helvetica Neue Black 900, lowercase, #FFFFFF)
  ctx.fillStyle = '#FFFFFF';
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

/**
 * Draws real-time audio hit markers in preview mode.
 * Flashes green on valid sound emission, turns red if a hit was silent.
 */
function drawHitMarkers(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale: number,
  customCounters?: Record<string, any>
): void {
  ctx.save();

  // Status HUD Chip at top-left
  const hudX = Math.round(32 * scale);
  const hudY = Math.round(48 * scale);
  const hudW = Math.round(220 * scale);
  const hudH = Math.round(36 * scale);

  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1 * scale;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(hudX, hudY, hudW, hudH, 8 * scale) : ctx.rect(hudX, hudY, hudW, hudH);
  ctx.fill();
  ctx.stroke();

  // Indicator Dot
  const marker = customCounters?.lastHitMarker;
  const isSilent = marker && marker.soundPlayed === false;
  const isRecent = marker && (customCounters?.currentTime ? Math.abs(customCounters.currentTime - marker.time) < 0.25 : true);

  ctx.fillStyle = isSilent ? '#ef4444' : isRecent ? '#22c55e' : '#94a3b8';
  ctx.beginPath();
  ctx.arc(hudX + 18 * scale, hudY + hudH / 2, 5 * scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(13 * scale)}px Inter, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    isSilent ? 'HIT: SILENT (ERR)' : isRecent ? 'AUDIO HIT: SYNC OK' : 'HIT MARKER ACTIVE',
    hudX + 32 * scale,
    hudY + hudH / 2
  );

  // Active Hit Reticle / Pulse
  if (marker && marker.x !== undefined && marker.y !== undefined && isRecent) {
    const color = isSilent ? '#ef4444' : '#22c55e';
    const radius = Math.round(24 * scale);

    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5 * scale;
    ctx.shadowColor = color;
    ctx.shadowBlur = Math.round(12 * scale);

    // Crosshair circle
    ctx.beginPath();
    ctx.arc(marker.x, marker.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshair ticks
    const tickLen = 8 * scale;
    ctx.beginPath();
    ctx.moveTo(marker.x - radius - tickLen, marker.y);
    ctx.lineTo(marker.x - radius, marker.y);
    ctx.moveTo(marker.x + radius, marker.y);
    ctx.lineTo(marker.x + radius + tickLen, marker.y);
    ctx.moveTo(marker.x, marker.y - radius - tickLen);
    ctx.lineTo(marker.x, marker.y - radius);
    ctx.moveTo(marker.x, marker.y + radius);
    ctx.lineTo(marker.x, marker.y + radius + tickLen);
    ctx.stroke();
  }

  ctx.restore();
}


