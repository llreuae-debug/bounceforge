export type PlatformType = 'all' | 'tiktok' | 'shorts' | 'reels';

export interface PlatformMargins {
  top: number;    // fraction of frame height
  bottom: number; // fraction of frame height
  right: number;  // fraction of frame width
  left: number;   // fraction of frame width
}

export const PLATFORM_MARGINS: Record<PlatformType, PlatformMargins> = {
  all: {
    top: 0.115,    // 11.5% (1080p = 220px, 4K = 442px)
    bottom: 0.22,  // 22.0% (1080p = 422px, 4K = 845px)
    right: 0.13,   // 13.0% (1080p = 140px, 4K = 281px)
    left: 0.06,    // 6.0%  (1080p = 65px,  4K = 130px)
  },
  tiktok: {
    top: 0.11,
    bottom: 0.20,
    right: 0.14,
    left: 0.05,
  },
  shorts: {
    top: 0.09,
    bottom: 0.18,
    right: 0.12,
    left: 0.05,
  },
  reels: {
    top: 0.12,
    bottom: 0.22,
    right: 0.11,
    left: 0.06,
  },
};

export interface SafeArena {
  centerX: number;
  centerY: number;
  radius: number;
  diameter: number;
  safeBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  margins: {
    topPx: number;
    bottomPx: number;
    rightPx: number;
    leftPx: number;
  };
  layout: {
    titleY: number;      // Y center for Hook Title (17% of height)
    titleMaxW: number;   // Max width for Hook Title
    counterY: number;    // Y center for Live Counter (between arena and watermark)
    watermarkBottomY: number; // Y position for watermark bottom edge (77% of height)
    watermarkW: number;  // Watermark width (30% of frame width)
  };
}

/**
 * Universal layout calculator for 9:16 vertical video simulations.
 * Calculates simulation arena, safe-box boundaries, hook titles, live counters, and watermark positions.
 */
export function getSafeArena(
  width: number,
  height: number,
  platform: PlatformType = 'all'
): SafeArena {
  const m = PLATFORM_MARGINS[platform] || PLATFORM_MARGINS.all;

  const topPx = height * m.top;
  const bottomPx = height * m.bottom;
  const rightPx = width * m.right;
  const leftPx = width * m.left;

  const safeBox = {
    x: leftPx,
    y: topPx,
    width: width - leftPx - rightPx,
    height: height - topPx - bottomPx,
  };

  // Universal layout calculator adapting for vertical (9:16), square (1:1), and landscape (16:9)
  const isLandscape = width > height;
  const isSquare = Math.abs(width - height) < 30;

  let centerX = width / 2;
  let centerY = height * 0.448;
  let diameter = Math.round(width - 2 * rightPx);
  let radius = diameter / 2;
  let titleY = height * 0.17;
  let titleMaxW = safeBox.width;
  let watermarkBottomY = height * (1 - 0.23);
  let watermarkW = width * 0.30;

  if (isSquare) {
    centerY = height * 0.47;
    const maxAvailable = Math.min(safeBox.width, safeBox.height);
    diameter = Math.round(maxAvailable * 0.74);
    radius = diameter / 2;
    titleY = height * 0.11;
    watermarkBottomY = height * 0.93;
    watermarkW = width * 0.26;
  } else if (isLandscape) {
    centerY = height * 0.50;
    const maxAvailable = height - topPx - bottomPx;
    diameter = Math.round(maxAvailable * 0.82);
    radius = diameter / 2;
    titleY = height * 0.09;
    watermarkBottomY = height * 0.93;
    watermarkW = height * 0.30;
  }

  // Live Counter: centered between arena bottom and watermark top
  const arenaBottomY = centerY + radius;
  const watermarkTopY = watermarkBottomY - (watermarkW / 4);
  const counterY = (arenaBottomY + watermarkTopY) / 2;

  return {
    centerX,
    centerY,
    radius,
    diameter,
    safeBox,

    margins: {
      topPx,
      bottomPx,
      rightPx,
      leftPx,
    },
    layout: {
      titleY,
      titleMaxW,
      counterY,
      watermarkBottomY,
      watermarkW,
    },
  };
}

/**
 * Check if a rectangular box is completely inside the safe box
 */
export function isInsideSafeBox(
  box: { x: number; y: number; width: number; height: number },
  safeBox: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    box.x >= safeBox.x &&
    box.y >= safeBox.y &&
    box.x + box.width <= safeBox.x + safeBox.width &&
    box.y + box.height <= safeBox.y + safeBox.height
  );
}
