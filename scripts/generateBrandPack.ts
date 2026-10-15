import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { execSync } from 'child_process';
import {
  generateSymbolSVG,
  generateHorizontalLogoSVG,
  generateStackedLogoSVG,
  generateAppIconSVG,
  generateOGImageSVG,
  generateYouTubeBannerSVG,
} from '../src/brand/svgStrings';

const ROOT = process.cwd();
const PUBLIC_BRAND = path.join(ROOT, 'public', 'brand');
const LOCAL_BRAND = path.join(ROOT, 'brand');

const DIRS = [
  path.join(PUBLIC_BRAND, 'svg'),
  path.join(PUBLIC_BRAND, 'png'),
  path.join(PUBLIC_BRAND, 'icons'),
  path.join(PUBLIC_BRAND, 'social'),
  path.join(PUBLIC_BRAND, 'motion'),
  path.join(LOCAL_BRAND, 'svg'),
  path.join(LOCAL_BRAND, 'png'),
  path.join(LOCAL_BRAND, 'icons'),
  path.join(LOCAL_BRAND, 'social'),
  path.join(LOCAL_BRAND, 'motion'),
];

for (const d of DIRS) {
  fs.mkdirSync(d, { recursive: true });
}

function writeAsset(subpath: string, content: Buffer | string) {
  const p1 = path.join(PUBLIC_BRAND, subpath);
  const p2 = path.join(LOCAL_BRAND, subpath);
  fs.writeFileSync(p1, content);
  fs.writeFileSync(p2, content);
}

async function run() {
  console.log('🚀 Starting BOUNCEFORGE Flat 2D Brand Pack generation...');

  // 1. Generate Flat SVGs (No 3D badge/pill)
  console.log('📦 1/6 Generating Flat 2D SVG assets...');
  const svgs: Record<string, string> = {
    // Default Concept A "The Escape"
    'svg/symbol.svg': generateSymbolSVG('a'),
    'svg/logo-horizontal.svg': generateHorizontalLogoSVG('a'),
    'svg/logo-stacked.svg': generateStackedLogoSVG('a'),
    'svg/logo-mono-white.svg': generateHorizontalLogoSVG('a', 'white'),
    'svg/logo-mono-black.svg': generateHorizontalLogoSVG('a', 'black'),

    // Concept B "The Bounce Arc"
    'svg/symbol-concept-b.svg': generateSymbolSVG('b'),
    'svg/logo-horizontal-concept-b.svg': generateHorizontalLogoSVG('b'),
    'svg/logo-stacked-concept-b.svg': generateStackedLogoSVG('b'),

    // Concept C "The Double Ring" (Flat overlapping rings loop)
    'svg/symbol-concept-c.svg': generateSymbolSVG('c'),
    'svg/logo-horizontal-concept-c.svg': generateHorizontalLogoSVG('c'),
    'svg/logo-stacked-concept-c.svg': generateStackedLogoSVG('c'),

    // Icons & Social in Flat SVG
    'icons/app-icon.svg': generateAppIconSVG('a', true),
    'social/og-image.svg': generateOGImageSVG('a'),
    'social/youtube-banner.svg': generateYouTubeBannerSVG('a'),
  };

  for (const [relPath, content] of Object.entries(svgs)) {
    writeAsset(relPath, content);
  }

  // 2. High-Resolution Flat PNG Rasterization via Sharp (512, 1024, 2048, 4096 px)
  console.log('🖼️ 2/6 Rasterizing crisp flat PNG lockups (512, 1024, 2048, 4096 px)...');

  const lockups = [
    { name: 'symbol', svg: generateSymbolSVG('a'), baseW: 120, baseH: 120 },
    { name: 'logo-horizontal', svg: generateHorizontalLogoSVG('a'), baseW: 480, baseH: 120 },
    { name: 'logo-stacked', svg: generateStackedLogoSVG('a'), baseW: 360, baseH: 220 },
    { name: 'logo-mono-white', svg: generateHorizontalLogoSVG('a', 'white'), baseW: 480, baseH: 120 },
    { name: 'logo-mono-black', svg: generateHorizontalLogoSVG('a', 'black'), baseW: 480, baseH: 120 },
    // Concepts B and C
    { name: 'logo-horizontal-b', svg: generateHorizontalLogoSVG('b'), baseW: 480, baseH: 120 },
    { name: 'logo-horizontal-c', svg: generateHorizontalLogoSVG('c'), baseW: 480, baseH: 120 },
  ];

  const scales = [512, 1024, 2048, 4096];

  for (const lockup of lockups) {
    const svgBuf = Buffer.from(lockup.svg);
    for (const size of scales) {
      const aspect = lockup.baseW / lockup.baseH;
      let w = size;
      let h = Math.round(size / aspect);
      if (aspect < 1) {
        h = size;
        w = Math.round(size * aspect);
      }

      const png = await sharp(svgBuf, { density: 300 })
        .resize(w, h, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png({ compressionLevel: 9 })
        .toBuffer();

      writeAsset(`png/${lockup.name}-${size}.png`, png);
    }
  }

  // 3. Flat App Icons & Favicon
  console.log('📱 3/6 Generating Flat App Icons and Favicon...');
  const iconSvgBuf = Buffer.from(generateAppIconSVG('a', true));
  const iconSizes = [1024, 512, 192, 180, 64, 32, 16];

  for (const s of iconSizes) {
    const png = await sharp(iconSvgBuf, { density: 300 })
      .resize(s, s)
      .png({ compressionLevel: 9 })
      .toBuffer();

    writeAsset(`icons/app-icon-${s}.png`, png);
    if (s === 32) {
      writeAsset('icons/favicon.png', png);
      writeAsset('icons/favicon.ico', png);
      fs.writeFileSync(path.join(ROOT, 'public', 'favicon.ico'), png);
      fs.writeFileSync(path.join(ROOT, 'favicon.ico'), png);
    }
  }

  // 4. Social Banners & Avatars
  console.log('🌐 4/6 Generating Flat Social Media Assets...');
  const ytProfile = await sharp(iconSvgBuf, { density: 300 })
    .resize(800, 800)
    .png()
    .toBuffer();
  writeAsset('social/youtube-profile-800x800.png', ytProfile);

  const avatar = await sharp(iconSvgBuf, { density: 300 })
    .resize(1080, 1080)
    .png()
    .toBuffer();
  writeAsset('social/avatar-1080x1080.png', avatar);

  const ogPng = await sharp(Buffer.from(generateOGImageSVG('a')), { density: 300 })
    .resize(1200, 630)
    .png()
    .toBuffer();
  writeAsset('social/og-image-1200x630.png', ogPng);

  const ytBanner = await sharp(Buffer.from(generateYouTubeBannerSVG('a')), { density: 300 })
    .resize(2560, 1440)
    .png()
    .toBuffer();
  writeAsset('social/youtube-banner-2560x1440.png', ytBanner);

  // 5. 2.0s Flat Motion Intro Animation & Video Exports (60 frames @ 30fps)
  console.log('🎬 5/6 Generating 2s Flat Motion Intro (WebM, 9:16 MP4, 1:1 MP4, GIF)...');
  const tempFramesDir = path.join(ROOT, 'scratch', 'motion_frames_flat');
  fs.mkdirSync(tempFramesDir, { recursive: true });

  const fps = 30;
  const totalFrames = 60; // 2.0 seconds

  for (let f = 0; f < totalFrames; f++) {
    const t = (f / totalFrames) * 2.0; // 0.0s to 2.0s

    // Center symbol origin: (220, 540) in a 1080x1080 canvas
    const originX = 260;
    const originY = 540;

    // Ring Draw-On: stroke-dashoffset animation
    let ringProgress = 0;
    if (t >= 0.25) {
      ringProgress = Math.min(1.0, (t - 0.25) / 0.5);
    }
    const ringDashArray = 600;
    const ringDashOffset = ringDashArray * (1.0 - ringProgress);

    // Ball physics & squash/stretch
    let ballX = originX;
    let ballY = originY;
    let scaleX = 1.0;
    let scaleY = 1.0;
    let streakOpacity = 0.0;
    let flashOpacity = 0.0;
    let wordmarkX = originX + 160;
    let wordmarkOpacity = 0.0;

    if (t < 0.3) {
      // Drop in from top
      const p = t / 0.3;
      ballY = originY - 180 + p * 180;
      scaleX = 0.85;
      scaleY = 1.25;
    } else if (t < 0.6) {
      // Bounce 1: impact squash at t=0.3
      const p = (t - 0.3) / 0.3;
      if (p < 0.2) {
        scaleX = 1.35;
        scaleY = 0.7;
        ballY = originY + 12;
      } else {
        const h = Math.sin(((p - 0.2) / 0.8) * Math.PI) * 45;
        ballY = originY - h;
        scaleX = 0.95;
        scaleY = 1.08;
      }
    } else if (t < 1.1) {
      // Bounce 2 & ESCAPE burst
      const p = (t - 0.6) / 0.5;
      if (p < 0.15) {
        scaleX = 1.3;
        scaleY = 0.75;
        ballY = originY + 8;
      } else {
        const escP = (p - 0.15) / 0.85;
        const burst = escP * escP;
        ballX = originX + burst * 90;
        ballY = originY - burst * 80;
        streakOpacity = Math.min(1.0, escP * 1.5);
        scaleX = 1.12;
        scaleY = 0.92;
        flashOpacity = Math.max(0, 1.0 - escP * 2.5);
      }
    } else {
      // Settled lockup position
      ballX = originX + 85;
      ballY = originY - 76;
      streakOpacity = 1.0;
      scaleX = 1.0;
      scaleY = 1.0;
    }

    // Wordmark slide-in (no 3D)
    if (t >= 0.8) {
      const wmP = Math.min(1.0, (t - 0.8) / 0.45);
      wordmarkOpacity = wmP;
      wordmarkX = originX + 160 + (1.0 - wmP) * 50;
    }

    const frameSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
  <rect width="1080" height="1080" fill="#050507" />

  <!-- Flat Ring (Drawn with stroke-dashoffset) -->
  ${ringProgress > 0 ? `
  <g transform="translate(${originX}, ${originY})">
    <path d="M 94.5 68.5 A 38 38 0 1 1 79.5 27.5"
          transform="scale(2.6) translate(-60, -60)"
          fill="none" stroke="#CCFF00" stroke-width="32" stroke-linecap="round"
          stroke-dasharray="${ringDashArray}" stroke-dashoffset="${ringDashOffset}" />
  </g>
  ` : ''}

  <!-- Motion Streaks -->
  ${streakOpacity > 0 ? `
  <g opacity="${streakOpacity}">
    <line x1="${ballX - 65}" y1="${ballY + 58}" x2="${ballX - 24}" y2="${ballY + 22}" stroke="#FF2E93" stroke-width="12" stroke-linecap="round" />
    <line x1="${ballX - 85}" y1="${ballY + 44}" x2="${ballX - 40}" y2="${ballY + 8}" stroke="#FF2E93" stroke-width="9" stroke-linecap="round" opacity="0.75" />
    <line x1="${ballX - 70}" y1="${ballY + 82}" x2="${ballX - 32}" y2="${ballY + 48}" stroke="#00F0FF" stroke-width="8" stroke-linecap="round" opacity="0.85" />
  </g>
  ` : ''}

  <!-- Flat Flash -->
  ${flashOpacity > 0 ? `
  <circle cx="${ballX}" cy="${ballY}" r="70" fill="#CCFF00" opacity="${flashOpacity * 0.35}" />
  ` : ''}

  <!-- Ball with Squash & Stretch -->
  <g transform="translate(${ballX}, ${ballY}) scale(${scaleX}, ${scaleY})">
    <circle cx="0" cy="0" r="32" fill="#FF2E93" />
  </g>

  <!-- Wordmark: "bounceforge" (Helvetica Neue Black 900, lowercase, white, NO 3D) -->
  ${wordmarkOpacity > 0 ? `
  <g opacity="${wordmarkOpacity}">
    <text x="${wordmarkX}" y="${originY + 38}"
          font-family="'Helvetica Neue', Helvetica, -apple-system, sans-serif"
          font-size="124" font-weight="900" letter-spacing="-0.05em" fill="#F5F5F0">bounceforge</text>
  </g>
  ` : ''}
</svg>`;

    const frameFile = path.join(tempFramesDir, `frame_${String(f).padStart(3, '0')}.png`);
    await sharp(Buffer.from(frameSvg), { density: 150 })
      .resize(1080, 1080)
      .png()
      .toFile(frameFile);
  }

  console.log('🎞️ Rendering flat motion formats with FFmpeg...');
  const framePattern = path.join(tempFramesDir, 'frame_%03d.png');

  // 1. 1:1 MP4 (1080x1080)
  execSync(
    `ffmpeg -y -framerate 30 -i "${framePattern}" -c:v libx264 -pix_fmt yuv420p -b:v 4M "${path.join(PUBLIC_BRAND, 'motion', 'logo-intro-1x1.mp4')}"`,
    { stdio: 'ignore' }
  );
  fs.copyFileSync(
    path.join(PUBLIC_BRAND, 'motion', 'logo-intro-1x1.mp4'),
    path.join(LOCAL_BRAND, 'motion', 'logo-intro-1x1.mp4')
  );

  // 2. 9:16 MP4 (1080x1920) for TikTok/Shorts
  execSync(
    `ffmpeg -y -framerate 30 -i "${framePattern}" -vf "scale=1080:1080,pad=1080:1920:0:(1920-1080)/2:color=0x050507" -c:v libx264 -pix_fmt yuv420p -b:v 5M "${path.join(PUBLIC_BRAND, 'motion', 'logo-intro-9x16.mp4')}"`,
    { stdio: 'ignore' }
  );
  fs.copyFileSync(
    path.join(PUBLIC_BRAND, 'motion', 'logo-intro-9x16.mp4'),
    path.join(LOCAL_BRAND, 'motion', 'logo-intro-9x16.mp4')
  );

  // 3. 4K 9:16 MP4 (2160x3840)
  execSync(
    `ffmpeg -y -framerate 30 -i "${framePattern}" -vf "scale=2160:2160,pad=2160:3840:0:(3840-2160)/2:color=0x050507" -c:v libx264 -pix_fmt yuv420p -b:v 12M "${path.join(PUBLIC_BRAND, 'motion', 'logo-intro-4k-9x16.mp4')}"`,
    { stdio: 'ignore' }
  );
  fs.copyFileSync(
    path.join(PUBLIC_BRAND, 'motion', 'logo-intro-4k-9x16.mp4'),
    path.join(LOCAL_BRAND, 'motion', 'logo-intro-4k-9x16.mp4')
  );

  // 4. WebM (AV1/VP9 alpha compatible)
  execSync(
    `ffmpeg -y -framerate 30 -i "${framePattern}" -c:v libaom-av1 -cpu-used 8 -b:v 2M "${path.join(PUBLIC_BRAND, 'motion', 'logo-intro.webm')}"`,
    { stdio: 'ignore' }
  );
  fs.copyFileSync(
    path.join(PUBLIC_BRAND, 'motion', 'logo-intro.webm'),
    path.join(LOCAL_BRAND, 'motion', 'logo-intro.webm')
  );

  // 5. Animated GIF (512px)
  execSync(
    `ffmpeg -y -framerate 25 -i "${framePattern}" -vf "scale=512:512:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" "${path.join(PUBLIC_BRAND, 'motion', 'logo.gif')}"`,
    { stdio: 'ignore' }
  );
  fs.copyFileSync(
    path.join(PUBLIC_BRAND, 'motion', 'logo.gif'),
    path.join(LOCAL_BRAND, 'motion', 'logo.gif')
  );

  // 6. Lottie JSON format (logo.json)
  console.log('✨ 6/6 Generating Lottie JSON logo.json...');
  const lottieData = {
    v: '5.7.4',
    fr: 30,
    ip: 0,
    op: 60,
    w: 1080,
    h: 1080,
    nm: 'BounceForge Flat Logo Intro',
    ddd: 0,
    assets: [],
    layers: [
      {
        ddd: 0,
        ind: 1,
        ty: 4,
        nm: 'Ball',
        sr: 1,
        ks: {
          o: { a: 0, k: 100 },
          r: { a: 0, k: 0 },
          p: {
            a: 1,
            k: [
              { t: 0, s: [260, 360, 0], h: 0 },
              { t: 9, s: [260, 540, 0], h: 0 },
              { t: 18, s: [260, 495, 0], h: 0 },
              { t: 25, s: [260, 540, 0], h: 0 },
              { t: 33, s: [345, 464, 0], h: 0 },
              { t: 60, s: [345, 464, 0], h: 0 },
            ],
          },
          a: { a: 0, k: [0, 0, 0] },
          s: {
            a: 1,
            k: [
              { t: 0, s: [85, 125, 100], h: 0 },
              { t: 9, s: [135, 70, 100], h: 0 },
              { t: 18, s: [95, 108, 100], h: 0 },
              { t: 25, s: [130, 75, 100], h: 0 },
              { t: 33, s: [100, 100, 100], h: 0 },
              { t: 60, s: [100, 100, 100], h: 0 },
            ],
          },
        },
        shapes: [
          {
            ty: 'el',
            p: { a: 0, k: [0, 0] },
            s: { a: 0, k: [64, 64] },
          },
          {
            ty: 'fl',
            c: { a: 0, k: [1, 0.18, 0.58, 1] }, // #FF2E93
            o: { a: 0, k: 100 },
          },
        ],
        ip: 0,
        op: 60,
        st: 0,
      },
    ],
  };

  const lottieJson = JSON.stringify(lottieData, null, 2);
  writeAsset('motion/logo.json', lottieJson);

  console.log('✅ Flat 2D Brand Pack generated successfully!');
}

run().catch((e) => {
  console.error('Error generating brand pack:', e);
  process.exit(1);
});
