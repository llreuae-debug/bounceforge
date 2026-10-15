/**
 * BOUNCEFORGE — Official Flat 2D Brand SVG Assets Generator
 * Flat vector shapes only: solid fills, clean strokes, optional soft neon glow.
 * NO 3D, NO isometric shapes, NO bevels, NO "3D" badge or pill.
 *
 * Conforms strictly to:
 * - Brand Name: "bounceforge" (all lowercase, no 3D)
 * - Typeface: Helvetica Neue / Helvetica ONLY (Black 900)
 * - Tracking: -0.05em
 * - Palette: #050507 (Black), #CCFF00 (Acid Lime), #FF2E93 (Hot Pink), #00F0FF (Cyber Cyan), #A855FF (Ultra Violet), #F5F5F0 (White)
 */

export type LogoConcept = 'a' | 'b' | 'c';
export type LogoVariant = 'symbol' | 'horizontal' | 'stacked' | 'mono-white' | 'mono-black';

export const BRAND_COLORS = {
  bg: '#050507',
  lime: '#CCFF00',
  pink: '#FF2E93',
  cyan: '#00F0FF',
  violet: '#A855FF',
  white: '#F5F5F0',
  gray: '#8E8E93',
};

// -------------------------------------------------------------
// FLAT SYMBOLS (120x120 viewBox)
// -------------------------------------------------------------

export function getSymbolSVG(concept: LogoConcept = 'a', mono?: 'white' | 'black'): string {
  const isWhite = mono === 'white';
  const isBlack = mono === 'black';

  const limeColor = isWhite ? '#FFFFFF' : isBlack ? '#000000' : BRAND_COLORS.lime;
  const pinkColor = isWhite ? '#FFFFFF' : isBlack ? '#000000' : BRAND_COLORS.pink;
  const cyanColor = isWhite ? '#FFFFFF' : isBlack ? '#000000' : BRAND_COLORS.cyan;
  const violetColor = isWhite ? '#FFFFFF' : isBlack ? '#000000' : BRAND_COLORS.violet;

  if (concept === 'a') {
    // CONCEPT A: "THE ESCAPE" (Recommended Default)
    // Flat thick lime ring with top-right gap (~40 deg). Solid hot-pink ball bursting out with 3 flat motion streaks.
    return `
    <g class="symbol-concept-a">
      <!-- 3 Flat Motion Streaks behind the bursting ball -->
      <path d="M 64 56 L 79 43" stroke="${pinkColor}" stroke-width="4.5" stroke-linecap="round" />
      <path d="M 57 52 L 73 38" stroke="${pinkColor}" stroke-width="3.5" stroke-linecap="round" opacity="0.75" />
      <path d="M 62 64 L 75 52" stroke="${cyanColor}" stroke-width="3" stroke-linecap="round" opacity="0.85" />

      <!-- Flat Thick Ring with Top-Right Gap (~40 deg gap centered at 45 deg) -->
      <path d="M 94.5 68.5 A 38 38 0 1 1 79.5 27.5"
            fill="none"
            stroke="${limeColor}"
            stroke-width="13"
            stroke-linecap="round"
            stroke-linejoin="round" />

      <!-- Solid Hot-Pink Ball Bursting Out Through The Gap -->
      <circle cx="89" cy="27" r="12.5" fill="${pinkColor}" />
    </g>`;
  }

  if (concept === 'b') {
    // CONCEPT B: "THE BOUNCE ARC"
    // Pink ball at peak of dotted arc forming stylized letter "b", with flat lime squash-shadow on baseline.
    return `
    <g class="symbol-concept-b">
      <!-- Flat lime squash-shadow on baseline -->
      <ellipse cx="40" cy="102" rx="16" ry="4.5" fill="${limeColor}" />

      <!-- Vertical stem of letter "b" -->
      <path d="M 40 22 L 40 102" stroke="${limeColor}" stroke-width="12" stroke-linecap="round" />

      <!-- Parabolic bounce arc forming the loop of "b" -->
      <path d="M 40 60 C 58 42, 88 42, 96 66 C 104 88, 76 102, 40 102"
            fill="none"
            stroke="${limeColor}"
            stroke-width="8"
            stroke-linecap="round" />

      <!-- Flat dotted bounce trail shrinking from left to right -->
      <circle cx="56" cy="46" r="4.2" fill="${pinkColor}" />
      <circle cx="68" cy="42" r="3.6" fill="${pinkColor}" />
      <circle cx="80" cy="44" r="3.0" fill="${cyanColor}" />
      <circle cx="90" cy="52" r="2.4" fill="${cyanColor}" />

      <!-- Solid pink ball at peak -->
      <circle cx="68" cy="32" r="12" fill="${pinkColor}" />
    </g>`;
  }

  // CONCEPT C: "THE DOUBLE RING"
  // Two overlapping flat rings (cyan and violet) forming an infinity-like loop, with a solid pink ball at crossing.
  return `
    <g class="symbol-concept-c">
      <!-- Left Flat Ring (Cyber Cyan) -->
      <circle cx="46" cy="60" r="28"
              fill="none"
              stroke="${cyanColor}"
              stroke-width="10" />

      <!-- Right Flat Ring (Ultra Violet) -->
      <circle cx="74" cy="60" r="28"
              fill="none"
              stroke="${violetColor}"
              stroke-width="10" />

      <!-- Solid Hot-Pink Ball at Central Crossing Point -->
      <circle cx="60" cy="60" r="11" fill="${pinkColor}" />

      <!-- Tiny lime escape energy sparks on top-right -->
      <circle cx="88" cy="36" r="3" fill="${limeColor}" />
      <circle cx="32" cy="84" r="2.5" fill="${limeColor}" />
    </g>`;
}

// -------------------------------------------------------------
// FLAT WORDMARK (Helvetica Neue Black 900, lowercase, tracking -0.05em, NO 3D)
// -------------------------------------------------------------

function getWordmarkSVG(mono?: 'white' | 'black', x = 132, y = 74, fontSize = 54): string {
  const textColor = mono === 'white' ? '#FFFFFF' : mono === 'black' ? '#000000' : BRAND_COLORS.white;

  return `
    <!-- Flat Wordmark: "bounceforge" in Helvetica Neue Black 900, lowercase, tracking -0.05em -->
    <text x="${x}" y="${y}"
          font-family="'Helvetica Neue', Helvetica, -apple-system, sans-serif"
          font-size="${fontSize}"
          font-weight="900"
          letter-spacing="-0.05em"
          fill="${textColor}">bounceforge</text>`;
}

// -------------------------------------------------------------
// COMPLETE STANDALONE FLAT SVG GENERATORS
// -------------------------------------------------------------

/**
 * 1. Symbol Only Flat SVG (120x120)
 */
export function generateSymbolSVG(concept: LogoConcept = 'a', mono?: 'white' | 'black', size = 120): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="${size}" height="${size}">
  ${getSymbolSVG(concept, mono)}
</svg>`.trim();
}

/**
 * 2. Horizontal Lockup Flat SVG (480x120)
 * Flat Symbol on left + "bounceforge" wordmark (NO 3D pill)
 */
export function generateHorizontalLogoSVG(concept: LogoConcept = 'a', mono?: 'white' | 'black'): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 120" width="480" height="120">
  <!-- Flat Symbol at left -->
  <g transform="translate(4, 0)">
    ${getSymbolSVG(concept, mono)}
  </g>
  <!-- Flat Wordmark (no 3D) -->
  ${getWordmarkSVG(mono, 132, 74, 52)}
</svg>`.trim();
}

/**
 * 3. Stacked Lockup Flat SVG (360x220)
 * Flat Symbol centered on top + "bounceforge" centered below
 */
export function generateStackedLogoSVG(concept: LogoConcept = 'a', mono?: 'white' | 'black'): string {
  const textColor = mono === 'white' ? '#FFFFFF' : mono === 'black' ? '#000000' : BRAND_COLORS.white;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 220" width="360" height="220">
  <!-- Flat Symbol Centered on Top -->
  <g transform="translate(120, 10)">
    ${getSymbolSVG(concept, mono)}
  </g>

  <!-- Flat Wordmark Centered Below -->
  <text x="180" y="180"
        font-family="'Helvetica Neue', Helvetica, -apple-system, sans-serif"
        font-size="44"
        font-weight="900"
        letter-spacing="-0.05em"
        text-anchor="middle"
        fill="${textColor}">bounceforge</text>
</svg>`.trim();
}

/**
 * 4. App Icon Flat SVG (1024x1024, flat symbol on #050507 rounded square, iOS radius 22.37% = 229px)
 */
export function generateAppIconSVG(concept: LogoConcept = 'a', withBg = true): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  ${withBg ? `
  <!-- Flat Dark Rounded Square (#050507, iOS 22.37% corner radius) -->
  <rect x="16" y="16" width="992" height="992" rx="222" fill="#050507" />
  ` : ''}

  <!-- Scaled Flat Symbol in center (scaled 6.33x from 120x120) -->
  <g transform="translate(132, 132) scale(6.33)">
    ${getSymbolSVG(concept)}
  </g>
</svg>`.trim();
}

/**
 * 5. Social Assets Flat SVGs (YouTube Banner, Avatar, OG Image)
 */
export function generateOGImageSVG(concept: LogoConcept = 'a'): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <rect width="1200" height="630" fill="#050507" />
  
  <!-- Flat subtle rings in background -->
  <circle cx="600" cy="270" r="300" fill="none" stroke="#CCFF00" stroke-width="2" stroke-opacity="0.12" />
  <circle cx="600" cy="270" r="200" fill="none" stroke="#FF2E93" stroke-width="2" stroke-opacity="0.12" />

  <!-- Flat Logo Horizontal in center -->
  <g transform="translate(330, 210) scale(1.15)">
    <g transform="translate(0, 0)">
      ${getSymbolSVG(concept)}
    </g>
    ${getWordmarkSVG(undefined, 132, 74, 52)}
  </g>

  <!-- Tagline below -->
  <text x="600" y="400"
        font-family="'Helvetica Neue', Helvetica, -apple-system, sans-serif"
        font-size="24"
        font-weight="700"
        letter-spacing="0.14em"
        text-anchor="middle"
        fill="#8E8E93">VIRAL BALL PHYSICS &amp; SOUND STUDIO</text>

  <!-- Feature Chips -->
  <g transform="translate(435, 450)">
    <rect x="0" y="0" width="105" height="30" rx="15" fill="#14141E" stroke="#CCFF00" stroke-width="1.5" />
    <text x="52" y="20" font-family="'Helvetica Neue', Helvetica, sans-serif" font-size="12" font-weight="900" fill="#CCFF00" text-anchor="middle">4K 60FPS</text>
  </g>
  <g transform="translate(555, 450)">
    <rect x="0" y="0" width="105" height="30" rx="15" fill="#14141E" stroke="#FF2E93" stroke-width="1.5" />
    <text x="52" y="20" font-family="'Helvetica Neue', Helvetica, sans-serif" font-size="12" font-weight="900" fill="#FF2E93" text-anchor="middle">ASMR AUDIO</text>
  </g>
  <g transform="translate(675, 450)">
    <rect x="0" y="0" width="105" height="30" rx="15" fill="#14141E" stroke="#00F0FF" stroke-width="1.5" />
    <text x="52" y="20" font-family="'Helvetica Neue', Helvetica, sans-serif" font-size="12" font-weight="900" fill="#00F0FF" text-anchor="middle">21+ MODES</text>
  </g>
</svg>`.trim();
}

export function generateYouTubeBannerSVG(concept: LogoConcept = 'a'): string {
  // Banner is 2560x1440, safe area in center: 1546x423
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2560 1440" width="2560" height="1440">
  <rect width="2560" height="1440" fill="#050507" />

  <!-- Logo centered in safe area (no 3D) -->
  <g transform="translate(940, 640) scale(1.4)">
    <g transform="translate(0, 0)">
      ${getSymbolSVG(concept)}
    </g>
    ${getWordmarkSVG(undefined, 132, 74, 52)}
  </g>

  <!-- Subtitle -->
  <text x="1280" y="850"
        font-family="'Helvetica Neue', Helvetica, -apple-system, sans-serif"
        font-size="30"
        font-weight="800"
        letter-spacing="0.12em"
        text-anchor="middle"
        fill="#CCFF00">VIRAL BALL PHYSICS &amp; SOUND STUDIO</text>
</svg>`.trim();
}
