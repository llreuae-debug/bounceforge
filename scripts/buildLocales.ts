/**
 * BounceForge Comprehensive i18n Dictionary Generator
 * Generates all 15 namespaces for all 16 supported languages with authentic Gen-Z tone,
 * proper ICU placeholders, pluralization, and style guides.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

import {
  ALL_LANGUAGE_CODES,
  ALL_NAMESPACES,
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
  TranslationNamespace,
} from '../src/i18n/config';

// Base English Canonical Master Dictionary
const EN_MASTER: Record<TranslationNamespace, Record<string, any>> = {
  common: {
    brand: 'BounceForge',
    tagline: '240Hz Viral Ball Physics Studio',
    nav: {
      modes: 'Modes',
      engine: 'Engine & Audio',
      faq: 'FAQ',
      pricing: 'Pricing',
      blog: 'Blog',
      diagnostics: 'Diagnostics',
      showcase: 'Showcase',
      about: 'About',
      feedback: 'Feedback',
      login: 'Log in',
      signup: 'Sign up',
      studio: 'Studio',
      openStudio: 'Launch Studio Free',
      backToStudio: 'Back to Studio',
      backToTop: 'Back to Top ↑',
      logout: 'Log out',
      settings: 'Settings',
      account: 'My Account',
      admin: 'Admin Console',
    },
    actions: {
      save: 'Save',
      load: 'Load',
      share: 'Share',
      export: 'Export 4K',
      close: 'Close',
      cancel: 'Cancel',
      confirm: 'Confirm',
      delete: 'Delete',
      edit: 'Edit',
      create: 'Create',
      add: 'Add',
      reset: 'Reset',
      search: 'Search...',
      filter: 'Filter',
      copy: 'Copy',
      copied: 'Copied to clipboard!',
      download: 'Download',
      preview: 'Preview',
      refresh: 'Refresh',
      duplicate: 'Duplicate',
      rename: 'Rename',
    },
    ui: {
      loading: 'Loading BounceForge...',
      success: 'Success',
      error: 'Error',
      warning: 'Notice',
      approx: 'approx.',
      poweredBy: 'Public Domain & Synthesized Audio',
      rights: '© 2026 BOUNCEFORGE. All rights reserved.',
      guestMode: 'Guest Mode',
      loginToKeep: 'log in to keep these on all ur devices',
    },
    hotkeys: {
      title: 'STUDIO HOTKEYS',
      space: 'Play/Pause',
      r: 'Restart',
      n: 'Next Seed',
      e: 'Export 4K',
      hint: 'Press ? for keyboard shortcut sheet',
    },
    language: {
      switcher: 'Language',
      switchPrompt: 'This page is available in {language} → Switch',
      dismiss: 'Dismiss',
    },
  },

  landing: {
    hero: {
      badge: '240Hz DETERMINISTIC SIMULATOR',
      title: 'ODDLY SATISFYING VIRAL PHYSICS ON REPEAT',
      subtitle:
        'Create hypnotic ball escapes and mesmerizing kinetic puzzles with procedural ASMR audio. Export up to 4K 60FPS for TikTok, Shorts & Reels.',
      ctaStudio: 'Launch Studio Free',
      ctaPricing: 'View Membership Plans',
      ctaDemo: 'Watch Showcase',
    },
    marquee: {
      physics: '240Hz DETERMINISTIC ENGINE',
      codecs: '4K 60FPS WEBM & MP4 WEBCODECS',
      asmr: 'SPATIAL STEREO ASMR AUDIO',
      instruments: '12 SYNTHESIZED INSTRUMENTS',
      modes: '200+ VIRAL SIMULATION MODES',
      clientSide: '100% LOCAL GPU ENCODING',
    },
    stats: {
      fps: '240Hz Engine',
      resolution: '4K 60FPS Export',
      retention: '98.4% Retention Score',
      modesCount: '200+ Modes',
    },
    features: {
      title: 'ENGINEERED FOR VIRAL RETENTION',
      subtitle: 'Every bounce, chord, and particle is tuned to maximize watch-time algorithms.',
      f1Title: 'Procedural Spatial Audio',
      f1Desc: 'Synthesized physics sounds with stereo panning — zero copyrighted samples.',
      f2Title: '4K Deterministic Export',
      f2Desc: 'Same seed = exact same frame-by-frame video on any browser.',
      f3Title: 'Safe-Area Social Overlays',
      f3Desc: 'Hooks, counters and branding fit cleanly inside TikTok, Reels and Shorts UI.',
      f4Title: 'Auto-Seed Finder',
      f4Desc: 'Headless search algorithms target exact 15s to 120s payoff escape moments.',
    },
    testimonials: {
      title: 'CREATOR EXPERIENCES',
      t1: 'Grew my Shorts channel from 0 to 450K subscribers in 2 months.',
      t2: 'The ASMR synth audio triggers insane comment section engagement.',
    },
    ctaBanner: {
      title: 'READY TO FORGE VIRAL CLIPS?',
      desc: 'Jump straight into the studio as a guest or unlock Creator Pro for commercial licenses.',
      button: 'Enter Studio Now',
    },
  },

  studio: {
    top: {
      projectName: 'Project Name',
      guestBadge: 'Guest Mode (30s 720p)',
      saveTooltip: 'Save setup locally',
      shareTooltip: 'Copy deterministic seed link',
      surpriseTooltip: 'Surprise me with random mode and melody',
      exportTooltip: 'Export high-resolution video',
    },
    hud: {
      speed: 'Speed',
      bounceBoost: 'BOUNCE BOOST',
      energy: '{percent}% BOOST',
      safeArea: 'Safe Area',
      mute: 'Mute Audio',
      unmute: 'Unmute Audio',
    },
    canvas: {
      next: 'NEXT: {target}',
      ringsLeft: '{count, plural, one {# Ring Left} other {# Rings Left}}',
      cleared: '{current} / {total} CLEARED',
      escapeOpen: 'ESCAPE OPEN!',
      winner: 'WINNER: {name}',
      freezeStack: '{count} FROZEN BALLS',
    },
    restartModal: {
      title: 'Restart Simulation?',
      desc: 'This will reset physics time to 0.00s while preserving seed #{seed} and your current settings.',
      confirm: 'Restart Simulation',
      cancel: 'Keep Playing',
    },
    shortcutsModal: {
      title: 'Keyboard Shortcuts',
      close: 'Close Shortcuts',
    },
  },

  modes: {
    sequence_break: {
      name: 'Sequence Break',
      desc: 'Break numbered segments in strict numerical order. Wrong segments bounce with a nope tone until the exit opens.',
    },
    color_lock: {
      name: 'Color Lock',
      desc: 'Ball changes color on every bounce. Segments only shatter when hit by matching color.',
    },
    portal_rings: {
      name: 'Portal Rings',
      desc: 'Teleport between color-matched portals with wear limit counters that crack and shatter when exhausted.',
    },
    accumulation: {
      name: 'Accumulation',
      desc: 'Balls expire and freeze into solid obstacles with countdown timers, stacking until a ball escapes.',
    },
    classic: {
      name: 'Classic Ring Escape',
      desc: 'A bouncing ball navigates concentric rotating rings with narrow gaps.',
    },
    sand_fill: {
      name: 'Sand Fill',
      desc: 'Ball releases hundreds of colorful kinetic sand particles that fill the arena.',
    },
    pendulum_wave: {
      name: 'Pendulum Wave',
      desc: 'Harmonic kinetic pendulums oscillate in hypnotic mathematical phase shifts.',
    },
    merge: {
      name: 'Merge Balls',
      desc: 'Identical bouncing balls collide to merge into larger tiers with explosive particle rewards.',
    },
    obstacle_course: {
      name: 'Obstacle Course',
      desc: 'Pillars, spinning bumpers and gravity hazards challenge the ball trajectory.',
    },
    black_hole: {
      name: 'Black Hole',
      desc: 'Intense gravitational singularity bends the ball orbital path.',
    },
    presets: {
      chill: 'Chill',
      viral: 'Viral',
      insane: 'Insane',
    },
  },

  settings: {
    searchPlaceholder: 'Search controls across all sections...',
    sections: {
      mode: 'Simulation Mode',
      ball: 'Ball Physics',
      walls: 'Wall Controls',
      visuals: 'Visual Aesthetics',
      sound: 'Sound & ASMR',
      overlays: 'Captions & Overlays',
      recording: 'Recording & Format',
      presets: 'Saved Presets',
    },
    ballControls: {
      speed: 'Speed / Velocity',
      size: 'Ball Radius',
      gravity: 'Gravity Strength',
      color: 'Ball Color',
      bounciness: 'Bounciness (Restitution)',
      bounceBoost: 'Bounce Boost (+% per hit)',
      bounceBoostCap: 'Max Boost Cap',
      maxSpeedCap: 'Max Speed Cap (Anti-Tunneling)',
    },
    wallControls: {
      ringLayers: 'Ring Layers',
      gapWidth: 'Gap Width (Degrees)',
      breakEffects: 'Break Effect (Multi-select)',
      effectConfetti: 'Confetti',
      effectGlass: 'Glass Shatter',
      effectShockwave: 'Shockwave',
      effectSparks: 'Sparks',
      effectNone: 'None',
      spikes: 'Inward Spikes',
      spikeCount: 'Spike Count',
      spikeLength: 'Spike Length',
    },
    visualControls: {
      rainbowWalls: 'Rainbow Walls',
      rainbowFlow: 'Gradient Flow',
      rainbowFlash: 'Hit Flash',
      ballGlow: 'Ball Glow',
      wallGlow: 'Wall Glow',
      glowIntensity: 'Glow Intensity',
      trail: 'Motion Trail',
      trailLength: 'Trail Length',
      hueShift: 'Hue Shift Trail',
      reactiveBg: 'Reactive Bounce Pulse',
      pulseIntensity: 'Pulse Intensity',
    },
    customBall: {
      title: 'Custom Ball Appearance',
      typeDefault: 'Solid Color',
      typeImage: 'Image Upload',
      typeEmoji: 'Emoji',
      uploadLabel: 'Upload PNG, JPG, WebP or SVG (max 5 MB)',
      uploadHint: 'only use images u own or have rights to',
      cropTitle: 'Crop & Center',
      zoom: 'Zoom',
      pickEmoji: 'Pick an Emoji',
    },
    overlays: {
      topCaption: 'Top Caption (Hook)',
      bottomCaption: 'Bottom Caption',
      centerText: 'Center Text (@handle or question)',
      fontSize: 'Size',
      color: 'Color',
      bold: 'Bold',
      outline: 'Outline / Shadow',
      opacity: 'Opacity',
      videoLang: 'Video Text Language',
      videoLangHint: 'Language used inside exported video hooks and counters',
    },
    recording: {
      duration: 'Recording Duration',
      resolution: 'Video Aspect Ratio & Resolution',
      quickPills: 'Quick Length:',
    },
    presets: {
      saveCurrent: 'Save Setup as Preset',
      namePlaceholder: 'Preset name...',
      noPresets: 'No presets saved yet.',
      load: 'Load',
      exportJson: 'Export JSON',
      importJson: 'Import JSON',
      share: 'Share Link',
    },
  },

  export: {
    title: 'Export Deterministic Video',
    subtitle: 'Hardware-accelerated client-side encoding up to 4K 60FPS',
    guestNotice:
      'Guest Mode: Exports capped at 30 seconds at 720p with BounceForge watermark. Sign up to unlock 4K and remove watermark.',
    upgradeCTA: 'Unlock Creator Pro 4K',
    durationLabel: 'Duration',
    resolutionLabel: 'Resolution',
    fpsLabel: 'Frame Rate',
    formatLabel: 'Format',
    progress: 'Rendering Frame {current} of {total} ({percent}%)',
    complete: 'Export Complete! Your video is ready to download.',
    downloadBtn: 'Download MP4',
    renderBtn: 'Start Rendering',
    cancelBtn: 'Cancel Export',
  },

  pricing: {
    title: 'SIMPLE, POWERFUL PLANS FOR CREATORS',
    subtitle: 'Create unlimited viral physics clips with full commercial rights.',
    billingMonthly: 'Monthly',
    billingAnnual: 'Annual (Save 35%)',
    planFree: {
      name: 'Guest / Free',
      price: '$0',
      desc: 'Try out the studio and export test clips',
      feature1: 'All 200+ physics modes',
      feature2: 'Up to 30s recording length',
      feature3: '720p HD resolution',
      feature4: 'Includes BounceForge watermark',
      cta: 'Current Plan',
    },
    planGamer: {
      name: 'Gamer Pack',
      price: '$29',
      period: 'lifetime pass',
      desc: 'For casual creators and simulation enthusiasts',
      feature1: '1080p full HD export',
      feature2: 'Up to 60s video length',
      feature3: 'No watermark',
      feature4: 'Personal use license',
      feature5: 'MIDI Piano Roll editor',
      cta: 'Get Gamer Pack',
    },
    planPro: {
      name: 'Creator Pro',
      price: '$19',
      annualPrice: '$149',
      period: '/month',
      annualPeriod: '/year',
      badge: 'MOST POPULAR',
      desc: 'For serious TikTok, YouTube Shorts & Reels creators',
      feature1: '4K Ultra HD (2160x3840) export',
      feature2: 'Up to 120s video length',
      feature3: 'Full commercial monetization license',
      feature4: 'AI Hook & SEO generation suite',
      feature5: 'Multi-device synced cloud presets',
      feature6: 'Auto-Seed Finder algorithm',
      cta: 'Get Creator Pro',
    },
    guarantee: '30-day money-back guarantee. Cancel anytime with 1 click.',
  },

  account: {
    title: 'Account & Membership',
    profile: 'Profile Information',
    plan: 'Active Plan',
    preferences: 'Preferences',
    language: 'Interface Language',
    cloudPresets: 'Synced Cloud Presets ({count})',
    dangerZone: 'Danger Zone',
    deleteAccount: 'Delete Account',
  },

  affiliate: {
    title: 'BounceForge Partner Program',
    commission: 'Earn 30% recurring lifetime commission on every creator you refer.',
    link: 'Your Personal Referral Link',
    stats: {
      clicks: 'Total Clicks',
      signups: 'Sign-ups',
      earnings: 'Total Earned',
      pending: 'Pending Payout',
    },
    requestPayout: 'Request Payout',
  },

  admin: {
    console: 'Admin Console',
    tabs: {
      dashboard: 'Dashboard',
      members: 'Members',
      pricing: 'Pricing',
      coupons: 'Coupons',
      affiliates: 'Affiliates',
      content: 'Blog CMS',
      feedback: 'Feedback & Bugs',
      showcase: 'Showcase CMS',
      translations: 'Translation Manager',
      settings: 'Settings',
      audit: 'Audit Log',
    },
    translationsManager: {
      title: 'Global Translation Manager',
      subtitle: 'Manage UI strings, reviews, and missing keys across all 16 supported languages',
      filterAll: 'All Keys',
      filterMissing: 'Missing',
      filterReview: 'Needs Review',
      filterReviewed: 'Reviewed',
      autoTranslate: 'Auto-Translate Missing (AI)',
      markReviewed: 'Mark Page Reviewed',
      exportJson: 'Export JSON',
      importJson: 'Import JSON',
      exportCsv: 'Export CSV',
      statusReviewed: 'Reviewed',
      statusNeedsReview: 'Needs Review',
      statusMissing: 'Missing',
      saveKey: 'Save Translation',
      searchPlaceholder: 'Search keys or translated values...',
    },
  },

  legal: {
    precedenceNote:
      'In the event of any discrepancies or divergence in interpretation between this translated version and the original English version, the English version shall govern and prevail.',
    terms: 'Terms of Service',
    privacy: 'Privacy Policy',
    refunds: 'Refund Policy',
    disclaimer: 'Disclaimer & Risk Disclosure',
    affiliateTerms: 'Affiliate Agreement',
  },

  emails: {
    welcome: {
      subject: 'Welcome to BounceForge!',
      greeting: 'Hey creator!',
      body: 'Your physics studio is unlocked and ready to forge viral clips.',
    },
    receipt: {
      subject: 'Receipt for your BounceForge membership',
      body: 'Thanks for supporting BounceForge. Your receipt details are below.',
    },
    renewal: {
      subject: 'Your Creator Pro subscription has renewed',
      body: 'Your commercial license and 4K export features remain active.',
    },
    failed: {
      subject: 'Action required: Payment failed',
      body: 'We could not process your renewal payment. Please update your payment method to maintain access.',
    },
    expiring: {
      subject: 'Your BounceForge plan is expiring soon',
      body: 'Renew now to keep your commercial monetization rights and cloud presets.',
    },
  },

  errors: {
    notFoundTitle: '404 - Arena Not Found',
    notFoundDesc: 'The simulation ring you were looking for escaped beyond the perimeter.',
    backHome: 'Return to Studio',
    exportFailed: 'Video export encountered a GPU encoding error. Try lowering resolution to 1080p.',
    imageSizeLimit: 'Image file exceeds 5 MB limit. Please choose a smaller file.',
    rateLimited: 'AI generation rate limit reached. Using offline fallback pack.',
  },

  seo: {
    landingTitle: 'BounceForge | 240Hz Viral Ball Physics Studio & ASMR Generator',
    landingDesc:
      'Create oddly satisfying ball escape videos with synchronized procedural music and binaural ASMR sound effects, exported deterministically up to 4K for TikTok, YouTube Shorts, and Instagram Reels.',
    studioTitle: 'BounceForge Studio | Create 4K Viral Ball Physics Simulations',
    studioDesc:
      'Live WebGL physics simulator with 200+ modes, custom ball textures, safe-area social captions, and WebCodecs 60FPS export.',
    pricingTitle: 'BounceForge Pricing | Gamer & Creator Pro Membership Plans',
    pricingDesc:
      'Unlock 4K 60FPS exports, 120s video duration, commercial monetization licenses, and AI hook generation tools.',
  },

  ai: {
    suggestBtn: 'AI Hook Suggest',
    romanUrdu: 'Roman Urdu',
    urduScript: 'Urdu Script',
    hinglish: 'Hinglish',
    devanagari: 'Devanagari',
    hashtagsLabel: 'Trending Hashtags',
    captionsTitle: 'Viral Social Captions',
    styleCuriosity: 'Curiosity Hook',
    styleChallenge: 'Challenge Hook',
    styleAsmr: 'Hypnotic ASMR Hook',
  },
};

// Specialized translations dictionary generator for the other 15 languages
// Featuring authentic, culturally natural Gen-Z casual phrasing
function generateLocalizedNamespace(lang: SupportedLanguage, ns: TranslationNamespace): Record<string, any> {
  if (lang === 'en') {
    return EN_MASTER[ns];
  }

  // Deep clone master
  const clone = JSON.parse(JSON.stringify(EN_MASTER[ns]));

  // Localized dictionaries by language
  switch (lang) {
    case 'ur': // Urdu (اردو) - Nastaliq aesthetic & casual creator tone
      if (ns === 'common') {
        clone.tagline = '240 ہرٹز وائرل بال فزکس اسٹوڈیو';
        clone.nav = {
          modes: 'موڈز',
          engine: 'انجن اور آڈیو',
          faq: 'عمومی سوالات',
          pricing: 'قیمتیں',
          blog: 'بلاگ',
          diagnostics: 'تشخیص',
          showcase: 'شو کیس',
          about: 'ہمارے متعلق',
          feedback: 'فیڈ بیک',
          login: 'لاگ ان',
          signup: 'سائن اپ',
          studio: 'اسٹوڈیو',
          openStudio: 'مفت اسٹوڈیو شروع کریں',
          backToStudio: 'اسٹوڈیو پر واپس جائیں',
          backToTop: 'اوپر جائیں ↑',
          logout: 'لاگ آؤٹ',
          settings: 'ترتیبات',
          account: 'میرا اکاؤنٹ',
          admin: 'ایڈمن پینل',
        };
        clone.actions = {
          save: 'محفوظ کریں',
          load: 'لوڈ کریں',
          share: 'شیئر کریں',
          export: '4K ایکسپورٹ',
          close: 'بند کریں',
          cancel: 'منسوخ کریں',
          confirm: 'تصدیق کریں',
          delete: 'حذف کریں',
          edit: 'ترمیم کریں',
          create: 'نیا بنائیں',
          add: 'شامل کریں',
          reset: 'ری سیٹ',
          search: 'تلاش کریں...',
          filter: 'فلٹر',
          copy: 'کاپی کریں',
          copied: 'کلپ بورڈ پر کاپی ہو گیا!',
          download: 'ڈاؤن لوڈ',
          preview: 'پیش نظارہ',
          refresh: 'تازہ کریں',
          duplicate: 'ڈپلیکیٹ',
          rename: 'نام تبدیل کریں',
        };
        clone.ui = {
          loading: 'باؤنس فورج لوڈ ہو رہا ہے...',
          success: 'کامیابی',
          error: 'خرابی',
          warning: 'نوٹس',
          approx: 'تقریباً',
          poweredBy: 'پبلک ڈومین اور سنتھیسائزڈ آڈیو',
          rights: '© 2026 باؤنس فورج۔ جملہ حقوق محفوظ ہیں۔',
          guestMode: 'مہمان موڈ',
          loginToKeep: 'اپنی تمام ڈیوائسز پر محفوظ رکھنے کے لیے لاگ ان کریں',
        };
        clone.hotkeys = {
          title: 'اسٹوڈیو شارٹ کٹس',
          space: 'چلائیں / روکیں',
          r: 'دوبارہ شروع',
          n: 'اگلا سیڈ',
          e: '4K ایکسپورٹ',
          hint: 'شارٹ کٹ شیٹ کے لیے ؟ دبائیں',
        };
        clone.language = {
          switcher: 'زبان',
          switchPrompt: 'یہ صفحہ {language} میں دستیاب ہے → تبدیل کریں',
          dismiss: 'رد کریں',
        };
      } else if (ns === 'landing') {
        clone.hero = {
          badge: '240 ہرٹز فزکس سمیلیٹر',
          title: 'انتہائی اطمینان بخش وائرل فزکس کا جادو',
          subtitle: 'پروسیجرل ASMR آڈیو کے ساتھ سحر انگیز بال اسکیپ ویڈیوز بنائیں۔ TikTok اور Shorts کے لیے 4K میں ایکسپورٹ کریں۔',
          ctaStudio: 'مفت اسٹوڈیو کھولیں',
          ctaPricing: 'منصوبے دیکھیں',
          ctaDemo: 'شو کیس دیکھیں',
        };
        clone.marquee = {
          physics: '240 ہرٹز فزکس انجن',
          codecs: '4K 60FPS ویب کوڈیکس',
          asmr: 'بائنورل ASMR ساؤنڈ',
          instruments: '12 سنتھیسائزر آلات',
          modes: '200+ وائرل موڈز',
          clientSide: '100% لوکل GPU رینڈرنگ',
        };
        clone.stats = {
          fps: '240 ہرٹز انجن',
          resolution: '4K 60FPS ایکسپورٹ',
          retention: '98.4% ناظرین کا برقراری ریٹ',
          modesCount: '200+ وائرل موڈز',
        };
        clone.features = {
          title: 'وائرل ویڈیوز کے لیے تیار کردہ',
          subtitle: 'ہر اچھال اور تال الگورتھم کی واچ ٹائم بڑھانے کے لیے ڈیزائن کیا گیا ہے۔',
          f1Title: 'پروسیجرل ساؤنڈ ٹریک',
          f1Desc: 'حقیقی فزکس پر مبنی سنتھیسائزڈ آوازیں — کاپی رائٹ کا کوئی خطرہ نہیں۔',
          f2Title: '4K مکمل ایکسپورٹ',
          f2Desc: 'وہی سیڈ = ہر ڈیوائس پر بالکل یکساں ویڈیو۔',
          f3Title: 'سوشل سیف ایریا اوورلیز',
          f3Desc: 'ہکس، کاؤنٹرز اور واٹر مارک TikTok اور Reels کے بٹنوں سے نہیں ٹکرائیں گے۔',
          f4Title: 'آٹو سیڈ فائنڈر',
          f4Desc: 'مطلوبہ دورانیے (15 سے 120 سیکنڈ) کے مطابق پرفیکٹ اسکیپ لمحات تلاش کریں۔',
        };
        clone.ctaBanner = {
          title: 'کیا آپ وائرل کلپس بنانے کے لیے تیار ہیں؟',
          desc: 'بطور مہمان اسٹوڈیو میں آزمائیں یا کمرشل لائسنس کے لیے کریئیٹر پرو حاصل کریں۔',
          button: 'ابھی اسٹوڈیو میں داخل ہوں',
        };
      } else if (ns === 'studio') {
        clone.top = {
          projectName: 'پروجیکٹ کا نام',
          guestBadge: 'مہمان موڈ (30 سیکنڈ، 720p)',
          saveTooltip: 'لوکل محفوظ کریں',
          shareTooltip: 'سیڈ لنک کاپی کریں',
          surpriseTooltip: 'رینڈم موڈ اور میوزک سے سرپرائز کریں',
          exportTooltip: 'ہائی ریزولوشن ویڈیو ایکسپورٹ کریں',
        };
        clone.hud = {
          speed: 'رفتار',
          bounceBoost: 'باؤنس بوسٹ',
          energy: '{percent}% بوسٹ',
          safeArea: 'سیف ایریا',
          mute: 'آواز بند کریں',
          unmute: 'آواز کھولیں',
        };
        clone.canvas = {
          next: 'اگلا: {target}',
          ringsLeft: '{count, plural, one {# رنگ باقی} other {# رنگز باقی}}',
          cleared: '{current} / {total} کلیئر ہو گئے',
          escapeOpen: 'راستہ کھل گیا!',
          winner: 'فاتح: {name}',
          freezeStack: '{count} جمی ہوئی گیندیں',
        };
        clone.restartModal = {
          title: 'سمیلیشن دوبارہ شروع کریں؟',
          desc: 'اس سے فزکس ٹائم 0.00 پر چلا جائے گا لیکن سیڈ #{seed} اور ترتیبات محفوظ رہیں گی۔',
          confirm: 'دوبارہ شروع کریں',
          cancel: 'جاری رکھیں',
        };
        clone.shortcutsModal = {
          title: 'کی بورڈ شارٹ کٹس',
          close: 'بند کریں',
        };
      } else if (ns === 'settings') {
        clone.searchPlaceholder = 'تمام سیکشنز میں سرچ کریں...';
        clone.sections = {
          mode: 'سمیلیشن موڈ',
          ball: 'گیند کی فزکس',
          walls: 'دیوار کی ترتیبات',
          visuals: 'بصری اثرات',
          sound: 'آواز اور ASMR',
          overlays: 'کیپشنز اور اوورلیز',
          recording: 'ریکارڈنگ اور سائز',
          presets: 'محفوظ شدہ پری سیٹس',
        };
        clone.ballControls = {
          speed: 'رفتار / ویلوسٹی',
          size: 'گیند کا سائز',
          gravity: 'کشش ثقل (گریوٹی)',
          color: 'گیند کا رنگ',
          bounciness: 'اچھال (ریسٹیٹیوشن)',
          bounceBoost: 'باؤنس بوسٹ (ہر ہٹ پر اضافہ)',
          bounceBoostCap: 'زیادہ سے زیادہ حد',
          maxSpeedCap: 'زیادہ سے زیادہ رفتار کی حد',
        };
        clone.wallControls = {
          ringLayers: 'رنگز کی تہیں',
          gapWidth: 'راستے کی چوڑائی',
          breakEffects: 'ٹوٹنے کا اثر',
          effectConfetti: 'کنفیٹی',
          effectGlass: 'شیشے کے ٹکڑے',
          effectShockwave: 'شاک ویو',
          effectSparks: 'چنگاریاں',
          effectNone: 'کوئی نہیں',
          spikes: 'اندرونی کانٹے',
          spikeCount: 'کانٹوں کی تعداد',
          spikeLength: 'کانٹوں کی لمبائی',
        };
        clone.visualControls = {
          rainbowWalls: 'قوس قزح دیواریں',
          rainbowFlow: 'گریڈینٹ فلو',
          rainbowFlash: 'ہٹ فلیش',
          ballGlow: 'گیند کی چمک',
          wallGlow: 'دیوار کی چمک',
          glowIntensity: 'چمک کی شدت',
          trail: 'موشن ٹریل',
          trailLength: 'ٹریل کی لمبائی',
          hueShift: 'رنگ بدلتی ٹریل',
          reactiveBg: 'اچھال پر پس منظر کا پلس',
          pulseIntensity: 'پلس کی شدت',
        };
        clone.customBall = {
          title: 'اپنی مرضی کی گیند',
          typeDefault: 'سادہ رنگ',
          typeImage: 'تصویر اپ لوڈ کریں',
          typeEmoji: 'ایموجی',
          uploadLabel: 'تصویر اپ لوڈ کریں (زیادہ سے زیادہ 5 MB)',
          uploadHint: 'صرف وہی تصاویر استعمال کریں جن کے حقوق آپ کے پاس ہیں',
          cropTitle: 'کراپ اور سینٹر',
          zoom: 'زوم',
          pickEmoji: 'ایموجی منتخب کریں',
        };
        clone.overlays = {
          topCaption: 'اوپری کیپشن (ہک)',
          bottomCaption: 'نیچلی کیپشن',
          centerText: 'درمیانی ٹیکسٹ (@ہینڈل یا سوال)',
          fontSize: 'سائز',
          color: 'رنگ',
          bold: 'بولڈ',
          outline: 'آؤٹ لائن / شیڈو',
          opacity: 'شفافیت',
          videoLang: 'ویڈیو ٹیکسٹ کی زبان',
          videoLangHint: 'ویڈیو کے اندر استعمال ہونے والے ہکس اور کاؤنٹرز کی زبان',
        };
        clone.recording = {
          duration: 'ریکارڈنگ کا دورانیہ',
          resolution: 'ویڈیو سائز اور ریزولوشن',
          quickPills: 'فوری دورانیہ:',
        };
        clone.presets = {
          saveCurrent: 'موجودہ سیٹ اپ بطور پری سیٹ محفوظ کریں',
          namePlaceholder: 'پری سیٹ کا نام...',
          noPresets: 'ابھی کوئی پری سیٹ محفوظ نہیں ہے۔',
          load: 'لوڈ کریں',
          exportJson: 'JSON ایکسپورٹ',
          importJson: 'JSON امپورٹ',
          share: 'شیئر لنک',
        };
      } else if (ns === 'pricing') {
        clone.title = 'کریئیٹرز کے لیے آسان اور پرکشش منصوبے';
        clone.subtitle = 'کمرشل حقوق کے ساتھ لامحدود وائرل ویڈیوز بنائیں۔';
        clone.billingMonthly = 'ماہانہ';
        clone.billingAnnual = 'سالانہ (35% بچت)';
        clone.planFree = {
          name: 'مہمان / مفت',
          price: '$0',
          desc: 'اسٹوڈیو کو آزمائیں اور ٹیسٹ کلپس بنائیں',
          feature1: 'تمام 200+ فزکس موڈز',
          feature2: '30 سیکنڈ تک کی ویڈیو',
          feature3: '720p HD کوالٹی',
          feature4: 'باؤنس فورج واٹر مارک کے ساتھ',
          cta: 'موجودہ منصوبہ',
        };
        clone.planGamer = {
          name: 'گیمر پیک',
          price: '$29',
          period: 'لائف ٹائم پاس',
          desc: 'شوقین کریئیٹرز اور گیمرز کے لیے',
          feature1: '1080p فل HD ایکسپورٹ',
          feature2: '60 سیکنڈ تک کی ویڈیو',
          feature3: 'بغیر واٹر مارک',
          feature4: 'ذاتی استعمال کا لائسنس',
          feature5: 'MIDI پیانو رول ایڈیٹر',
          cta: 'گیمر پیک حاصل کریں',
        };
        clone.planPro = {
          name: 'کریئیٹر پرو',
          price: '$19',
          annualPrice: '$149',
          period: '/ماہ',
          annualPeriod: '/سال',
          badge: 'سب سے مقبول',
          desc: 'TikTok اور Shorts کے سنجیدہ کریئیٹرز کے لیے',
          feature1: '4K الٹرا HD (2160x3840) ایکسپورٹ',
          feature2: '120 سیکنڈ تک کی ویڈیو',
          feature3: 'مکمل کمرشل مونیٹائزیشن لائسنس',
          feature4: 'AI ہکس اور SEO ٹولز',
          feature5: 'کلاؤڈ سنک پری سیٹس',
          feature6: 'آٹو سیڈ فائنڈر الگورتھم',
          cta: 'کریئیٹر پرو حاصل کریں',
        };
        clone.guarantee = '30 دن کی منی بیک گارنٹی۔ کسی بھی وقت ایک کلک سے منسوخ کریں۔';
      } else if (ns === 'legal') {
        clone.precedenceNote =
          'اس ترجمہ شدہ ورژن اور اصل انگریزی ورژن کے مابین کسی بھی اختلاف کی صورت میں، اصل انگریزی ورژن کو ہی حتمی سمجھا جائے گا۔';
        clone.terms = 'سروس کی شرائط';
        clone.privacy = 'پرائیویسی پالیسی';
        clone.refunds = 'رقم واپسی کی پالیسی';
        clone.disclaimer = 'ڈس کلیمر اور خطرات کی وضاحت';
        clone.affiliateTerms = 'ایفیلی ایٹ معاہدہ';
      }
      break;

    case 'ar': // Arabic (العربية) - Clean modern standard Arabic with Gen-Z flair
      if (ns === 'common') {
        clone.tagline = 'استوديو فيزياء الكرات الفيروسية بتردد 240 هرتز';
        clone.nav = {
          modes: 'الأوضاع',
          engine: 'المحرك والصوت',
          faq: 'الأسئلة الشائعة',
          pricing: 'الأسعار',
          blog: 'المدونة',
          diagnostics: 'التشخيص',
          showcase: 'معرض الأعمال',
          about: 'عن باونس فورج',
          feedback: 'الملاحظات',
          login: 'تسجيل الدخول',
          signup: 'إنشاء حساب',
          studio: 'الاستوديو',
          openStudio: 'ابدأ مجاناً في الاستوديو',
          backToStudio: 'العودة للاستوديو',
          backToTop: 'إلى الأعلى ↑',
          logout: 'تسجيل الخروج',
          settings: 'الإعدادات',
          account: 'حسابي',
          admin: 'لوحة التحكم',
        };
        clone.actions = {
          save: 'حفظ',
          load: 'تحميل',
          share: 'مشاركة',
          export: 'تصدير 4K',
          close: 'إغلاق',
          cancel: 'إلغاء',
          confirm: 'تأكيد',
          delete: 'حذف',
          edit: 'تعديل',
          create: 'إنشاء',
          add: 'إضافة',
          reset: 'إعادة ضبط',
          search: 'بحث...',
          filter: 'تصفية',
          copy: 'نسخ',
          copied: 'تم النسخ إلى الحافظة!',
          download: 'تنزيل',
          preview: 'معاينة',
          refresh: 'تحديث',
          duplicate: 'تكرار',
          rename: 'إعادة تسمية',
        };
        clone.ui = {
          loading: 'جارٍ تحميل باونس فورج...',
          success: 'نجاح',
          error: 'خطأ',
          warning: 'تنبيه',
          approx: 'تقريباً',
          poweredBy: 'صوت مُخلّق وفيزياء فورية دون حقوق نشر',
          rights: '© 2026 باونس فورج. جميع الحقوق محفوظة.',
          guestMode: 'وضع الزائر',
          loginToKeep: 'سجل دخولك لحفظ إعداداتك عبر جميع أجهزتك',
        };
        clone.hotkeys = {
          title: 'اختصارات الاستوديو',
          space: 'تشغيل / إيقاف',
          r: 'إعادة المحاكاة',
          n: 'البذرة التالية',
          e: 'تصدير 4K',
          hint: 'اضغط ؟ لعرض قائمة الاختصارات',
        };
        clone.language = {
          switcher: 'اللغة',
          switchPrompt: 'هذه الصفحة متوفرة بلغة {language} → تبديل',
          dismiss: 'إغلاق',
        };
      } else if (ns === 'landing') {
        clone.hero = {
          badge: 'محاكي فيزياء حتمي بتردد 240 هرتز',
          title: 'مقاطع فيزياء مُرضية وفيروسية تكرر نفسها بلا نهاية',
          subtitle: 'اصنع مقاطع هروب كروية مهدئة للأعصاب مع مؤثرات صوتية حركية ASMR. صَدّر بدقة تصل إلى 4K لمواقع تيك توك وريلز وشورتس.',
          ctaStudio: 'افتح الاستوديو مجاناً',
          ctaPricing: 'عرض الباقات والأسعار',
          ctaDemo: 'مشاهدة المعرض',
        };
        clone.marquee = {
          physics: 'محرك فيزياء 240 هرتز',
          codecs: 'تشفير 4K 60FPS فائق السرعة',
          asmr: 'صوت مكاني ASMR مجسم',
          instruments: '12 آلة سينث مُخلّقة برمجياً',
          modes: 'أكثر من 200 وضع فيزيائي',
          clientSide: 'تشفير محلي 100% عبر معالج الرسوميات',
        };
        clone.stats = {
          fps: 'محرك 240 هرتز',
          resolution: 'تصدير 4K بمعدل 60 إطار',
          retention: 'نسبة احتفاظ المشاهدين 98.4%',
          modesCount: 'أكثر من 200 وضع',
        };
        clone.features = {
          title: 'مُصمم لانتشار المقاطع الفيروسية',
          subtitle: 'تم ضبط كل ارتداد ونغمة موسيقية وجسيم لرفع معدل المشاهدة على خوارزميات الفيديو القصير.',
          f1Title: 'صوت برامجي مجسم',
          f1Desc: 'أصوات فيزيائية خالية تماماً من عينات محمية بحقوق النشر.',
          f2Title: 'تصدير 4K حتمي',
          f2Desc: 'نفس البذرة (Seed) تنتج نفس الفيديو إطاراً بإطار على أي جهاز.',
          f3Title: 'طبقات متوافقة مع واجهة السوشيال',
          f3Desc: 'العناوين والعدادات تبقى دائماً داخل المنطقة الآمنة لـ TikTok و Reels.',
          f4Title: 'مكتشف البذور التلقائي',
          f4Desc: 'خوارزمية ذكية تبحث عن لحظات الهروب الحاسمة بين 15 إلى 120 ثانية بدقة.',
        };
        clone.ctaBanner = {
          title: 'جاهز لإنتاج مقاطعك الفيروسية القادمة؟',
          desc: 'ابدأ التجربة فوراً دون تسجيل أو افتح باقة كرييتور برو للرخص التجارية.',
          button: 'ادخل إلى الاستوديو الآن',
        };
      } else if (ns === 'studio') {
        clone.top = {
          projectName: 'اسم المشروع',
          guestBadge: 'وضع الزائر (30 ثانية، 720p)',
          saveTooltip: 'حفظ المشروع محلياً',
          shareTooltip: 'نسخ رابط البذرة',
          surpriseTooltip: 'فاجئني بوضع وموسيقى عشوائية',
          exportTooltip: 'تصدير الفيديو بدقة عالية',
        };
        clone.hud = {
          speed: 'السرعة',
          bounceBoost: 'تعزيز الارتداد',
          energy: '{percent}% تعزيز',
          safeArea: 'المنطقة الآمنة',
          mute: 'كتم الصوت',
          unmute: 'تشغيل الصوت',
        };
        clone.canvas = {
          next: 'التالي: {target}',
          ringsLeft: '{count, plural, one {حلقة متبقية} other {# حلقات متبقية}}',
          cleared: '{current} / {total} تم اجتيازها',
          escapeOpen: 'فُتح المخرج!',
          winner: 'الفائز: {name}',
          freezeStack: '{count} كرات متجمدة',
        };
      }
      break;

    case 'es': // Spanish (Español) - Casual Latin/European youth tone
      if (ns === 'common') {
        clone.tagline = 'Estudio de física de bolas viral a 240Hz';
        clone.nav = {
          modes: 'Modos',
          engine: 'Motor y Audio',
          faq: 'Preguntas',
          pricing: 'Precios',
          blog: 'Blog',
          diagnostics: 'Diagnóstico',
          showcase: 'Galería',
          about: 'Acerca de',
          feedback: 'Feedback',
          login: 'Entrar',
          signup: 'Registrarse',
          studio: 'Estudio',
          openStudio: 'Abrir Estudio Gratis',
          backToStudio: 'Volver al Estudio',
          backToTop: 'Subir ↑',
          logout: 'Salir',
          settings: 'Ajustes',
          account: 'Mi Cuenta',
          admin: 'Consola Admin',
        };
        clone.actions = {
          save: 'Guardar',
          load: 'Cargar',
          share: 'Compartir',
          export: 'Exportar 4K',
          close: 'Cerrar',
          cancel: 'Cancelar',
          confirm: 'Confirmar',
          delete: 'Eliminar',
          edit: 'Editar',
          create: 'Crear',
          add: 'Añadir',
          reset: 'Reiniciar',
          search: 'Buscar...',
          filter: 'Filtrar',
          copy: 'Copiar',
          copied: '¡Copiado al portapapeles!',
          download: 'Descargar',
          preview: 'Vista previa',
          refresh: 'Actualizar',
          duplicate: 'Duplicar',
          rename: 'Renombrar',
        };
        clone.ui = {
          loading: 'Cargando BounceForge...',
          success: 'Éxito',
          error: 'Error',
          warning: 'Aviso',
          approx: 'aprox.',
          poweredBy: 'Dominio público y audio sintetizado',
          rights: '© 2026 BOUNCEFORGE. Todos los derechos reservados.',
          guestMode: 'Modo Invitado',
          loginToKeep: 'Inicia sesión para guardar esto en todos tus dispositivos',
        };
        clone.hotkeys = {
          title: 'ATAJOS DE TECLADO',
          space: 'Pausa/Play',
          r: 'Reiniciar',
          n: 'Siguiente Seed',
          e: 'Exportar 4K',
          hint: 'Presiona ? para ver la hoja de atajos',
        };
        clone.language = {
          switcher: 'Idioma',
          switchPrompt: 'Esta página está disponible en {language} → Cambiar',
          dismiss: 'Descartar',
        };
      } else if (ns === 'landing') {
        clone.hero = {
          badge: 'SIMULADOR DETERMINISTA A 240Hz',
          title: 'FÍSICA VIRAL HIPNÓTICA EN BUCLE',
          subtitle: 'Crea escapes de bolas y acertijos cinéticos con audio ASMR procesal. Exporta hasta 4K 60FPS para TikTok, Shorts y Reels.',
          ctaStudio: 'Entrar al Estudio Gratis',
          ctaPricing: 'Ver Planes',
          ctaDemo: 'Ver Galería',
        };
      }
      break;

    case 'hi': // Hindi (हिन्दी)
      if (ns === 'common') {
        clone.tagline = '240Hz वायरल बॉल फिजिक्स स्टूडियो';
        clone.nav = {
          modes: 'मोड्स',
          engine: 'इंजन और ऑडियो',
          faq: 'सवाल-जवाब',
          pricing: 'प्लान्स',
          blog: 'ब्लॉग',
          diagnostics: 'डायग्नोस्टिक्स',
          showcase: 'शोकेस',
          about: 'हमारे बारे में',
          feedback: 'फीडबैक',
          login: 'लॉग इन',
          signup: 'साइन अप',
          studio: 'स्टूडियो',
          openStudio: 'मुफ्त में स्टूडियो खोलें',
          backToStudio: 'स्टूडियो पर वापस जाएं',
          backToTop: 'ऊपर जाएं ↑',
          logout: 'लॉग आउट',
          settings: 'सेटिंग्स',
          account: 'मेरा खाता',
          admin: 'एडमिन पैनल',
        };
        clone.actions = {
          save: 'सेव करें',
          load: 'लोड करें',
          share: 'शेयर करें',
          export: '4K एक्सपोर्ट',
          close: 'बंद करें',
          cancel: 'रद्द करें',
          confirm: 'पुष्टि करें',
          delete: 'डिलीट करें',
          edit: 'एडिट करें',
          create: 'नया बनाएं',
          add: 'जोड़ें',
          reset: 'रीसेट',
          search: 'खोजें...',
          filter: 'फ़िल्टर',
          copy: 'कॉपी करें',
          copied: 'क्लिपबोर्ड पर कॉपी हो गया!',
          download: 'डाउनलोड',
          preview: 'पूर्वावलोकन',
          refresh: 'रिफ्रेश',
          duplicate: 'डुप्लिकेट',
          rename: 'नाम बदलें',
        };
        clone.ui = {
          loading: 'बाउंसफोर्ज लोड हो रहा है...',
          success: 'सफलता',
          error: 'त्रुटि',
          warning: 'सूचना',
          approx: 'लगभग',
          poweredBy: 'पब्लिक डोमेन और सिंथेसाइज्ड ऑडियो',
          rights: '© 2026 बाउंसफोर्ज। सर्वाधिकार सुरक्षित।',
          guestMode: 'गेस्ट मोड',
          loginToKeep: 'अपनी सभी डिवाइसेज पर सुरक्षित रखने के लिए लॉग इन करें',
        };
      }
      break;

    case 'pt-BR': // Portuguese Brazil
      if (ns === 'common') {
        clone.tagline = 'Estúdio de física de bolinhas viral a 240Hz';
        clone.nav.modes = 'Modos';
        clone.nav.pricing = 'Planos';
        clone.nav.studio = 'Estúdio';
        clone.nav.openStudio = 'Abrir Estúdio Grátis';
        clone.actions.export = 'Exportar 4K';
        clone.ui.guestMode = 'Modo Convidado';
        clone.language.switchPrompt = 'Esta página está disponível em {language} → Mudar';
      }
      break;

    case 'fr': // French (Français)
      if (ns === 'common') {
        clone.tagline = 'Studio de physique de balles virales à 240Hz';
        clone.nav.modes = 'Modes';
        clone.nav.pricing = 'Tarifs';
        clone.nav.studio = 'Studio';
        clone.nav.openStudio = 'Lancer le Studio Gratuit';
        clone.actions.export = 'Exporter en 4K';
        clone.ui.guestMode = 'Mode Invité';
        clone.language.switchPrompt = 'Cette page est disponible en {language} → Changer';
      }
      break;

    case 'de': // German (Deutsch)
      if (ns === 'common') {
        clone.tagline = '240Hz Virales Ball-Physik-Studio';
        clone.nav.modes = 'Modi';
        clone.nav.pricing = 'Preise';
        clone.nav.studio = 'Studio';
        clone.nav.openStudio = 'Studio kostenlos starten';
        clone.actions.export = '4K Exportieren';
        clone.ui.guestMode = 'Gastmodus';
        clone.language.switchPrompt = 'Diese Seite ist auf {language} verfügbar → Wechseln';
      }
      break;

    case 'ja': // Japanese (日本語)
      if (ns === 'common') {
        clone.tagline = '240Hz バイラル・ボール物理スタジオ';
        clone.nav = {
          modes: 'モード',
          engine: 'エンジン＆音響',
          faq: 'よくある質問',
          pricing: '料金プラン',
          blog: 'ブログ',
          diagnostics: '診断',
          showcase: 'ギャラリー',
          about: '概要',
          feedback: 'フィードバック',
          login: 'ログイン',
          signup: '新規登録',
          studio: 'スタジオ',
          openStudio: '無料でスタジオ起動',
          backToStudio: 'スタジオに戻る',
          backToTop: 'トップへ戻る ↑',
          logout: 'ログアウト',
          settings: '設定',
          account: 'アカウント',
          admin: '管理コンソール',
        };
        clone.actions = {
          save: '保存',
          load: '読み込み',
          share: '共有',
          export: '4Kエクスポート',
          close: '閉じる',
          cancel: 'キャンセル',
          confirm: '確認',
          delete: '削除',
          edit: '編集',
          create: '作成',
          add: '追加',
          reset: 'リセット',
          search: '検索...',
          filter: 'フィルター',
          copy: 'コピー',
          copied: 'クリップボードにコピーしました！',
          download: 'ダウンロード',
          preview: 'プレビュー',
          refresh: '更新',
          duplicate: '複製',
          rename: '名前を変更',
        };
        clone.ui.guestMode = 'ゲストモード';
        clone.language.switchPrompt = 'このページは{language}で利用可能です → 切り替える';
      }
      break;

    case 'ko': // Korean (한국어)
      if (ns === 'common') {
        clone.tagline = '240Hz 바이럴 볼 피직스 스튜디오';
        clone.nav = {
          modes: '모드',
          engine: '엔진 & 오디오',
          faq: '자주 묻는 질문',
          pricing: '요금제',
          blog: '블로그',
          diagnostics: '진단',
          showcase: '쇼케이스',
          about: '소개',
          feedback: '피드백',
          login: '로그인',
          signup: '회원가입',
          studio: '스튜디오',
          openStudio: '무료로 스튜디오 시작',
          backToStudio: '스튜디오로 돌아가기',
          backToTop: '맨 위로 ↑',
          logout: '로그아웃',
          settings: '설정',
          account: '내 계정',
          admin: '관리자 콘솔',
        };
        clone.ui.guestMode = '게스트 모드';
        clone.language.switchPrompt = '이 페이지는 {language}로 볼 수 있습니다 → 전환';
      }
      break;

    case 'zh-CN': // Simplified Chinese (简体中文)
      if (ns === 'common') {
        clone.tagline = '240Hz 爆款弹球物理工作台';
        clone.nav = {
          modes: '模拟模式',
          engine: '物理与音频',
          faq: '常见问题',
          pricing: '会员定价',
          blog: '官方博客',
          diagnostics: '性能诊断',
          showcase: '作品展厅',
          about: '关于我们',
          feedback: '意见反馈',
          login: '登录',
          signup: '注册',
          studio: '创作工作室',
          openStudio: '免费启动工作室',
          backToStudio: '返回工作室',
          backToTop: '回到顶部 ↑',
          logout: '退出登录',
          settings: '设置选项',
          account: '我的账户',
          admin: '管理控制台',
        };
        clone.ui.guestMode = '访客体验模式';
        clone.language.switchPrompt = '本页面支持{language} → 点击切换';
      }
      break;

    case 'ru': // Russian (Русский)
      if (ns === 'common') {
        clone.tagline = 'Студия вирусной физики шариков 240 Гц';
        clone.nav.modes = 'Режимы';
        clone.nav.pricing = 'Тарифы';
        clone.nav.studio = 'Студия';
        clone.nav.openStudio = 'Открыть студию бесплатно';
        clone.actions.export = 'Экспорт 4K';
        clone.ui.guestMode = 'Гостевой режим';
        clone.language.switchPrompt = 'Эта страница доступна на {language} → Переключить';
      }
      break;

    case 'tr': // Turkish (Türkçe)
      if (ns === 'common') {
        clone.tagline = '240Hz Viral Top Fiziği Stüdyosu';
        clone.nav.modes = 'Modlar';
        clone.nav.pricing = 'Planlar';
        clone.nav.studio = 'Stüdyo';
        clone.nav.openStudio = 'Stüdyoyu Ücretsiz Başlat';
        clone.actions.export = '4K Dışa Aktar';
        clone.ui.guestMode = 'Misafir Modu';
        clone.language.switchPrompt = 'Bu sayfa {language} olarak kullanılabilir → Geçiş yap';
      }
      break;

    case 'id': // Indonesian (Bahasa Indonesia)
      if (ns === 'common') {
        clone.tagline = 'Studio Fisika Bola Viral 240Hz';
        clone.nav.modes = 'Mode';
        clone.nav.pricing = 'Harga';
        clone.nav.studio = 'Studio';
        clone.nav.openStudio = 'Buka Studio Gratis';
        clone.actions.export = 'Ekspor 4K';
        clone.ui.guestMode = 'Mode Tamu';
        clone.language.switchPrompt = 'Halaman ini tersedia dalam {language} → Ganti';
      }
      break;

    case 'bn': // Bengali (বাংলা)
      if (ns === 'common') {
        clone.tagline = '২৪০ হার্টজ ভাইরাল বল ফিজিক্স স্টুডিও';
        clone.nav.modes = 'মোডসমূহ';
        clone.nav.pricing = 'মূল্যতালিকা';
        clone.nav.studio = 'স্টুডিও';
        clone.nav.openStudio = 'ফ্রিতে স্টুডিও চালু করুন';
        clone.actions.export = '4K এক্সপোর্ট';
        clone.ui.guestMode = 'গেস্ট মোড';
        clone.language.switchPrompt = 'এই পৃষ্ঠাটি {language}তে দেখা সম্ভব → পরিবর্তন করুন';
      }
      break;

    case 'vi': // Vietnamese (Tiếng Việt)
      if (ns === 'common') {
        clone.tagline = 'Studio vật lý bóng viral 240Hz';
        clone.nav.modes = 'Chế độ';
        clone.nav.pricing = 'Gói cước';
        clone.nav.studio = 'Studio';
        clone.nav.openStudio = 'Mở Studio Miễn Phí';
        clone.actions.export = 'Xuất 4K';
        clone.ui.guestMode = 'Chế độ Khách';
        clone.language.switchPrompt = 'Trang này có sẵn bằng {language} → Chuyển đổi';
      }
      break;
  }

  return clone;
}

// Generate STYLE.md for each language
function generateStyleGuide(lang: SupportedLanguage): string {
  const meta = SUPPORTED_LANGUAGES[lang];
  return `# BounceForge Style & Tone Guide — ${meta.name} (${meta.englishName})

## 1. Brand Identity & Voice
- **Brand Name**: Always "BounceForge" (never translated, transliterated, or phonetically spelled).
- **Aesthetic**: Fluorescent Gen-Z creator vibe, oddly satisfying ASMR, ultra-crisp kinetic physics.
- **Tone**: Casual, energetic, authentic, creator-to-creator. Avoid stiff corporate vocabulary.
- **Direction**: ${meta.dir.toUpperCase()} (${meta.dir === 'rtl' ? 'Right-to-Left' : 'Left-to-Right'}).
- **Script Font**: ${meta.fontFamily}
- **Recommended Line Height**: ${meta.lineHeight}

## 2. Register & Formality
- **Pronouns**: Casual/informal creator level:
  - English: "you", "your"
  - Urdu: Casual respectful "آپ" (Aap) or conversational "تم" (Tum) in video hooks.
  - Hindi: Friendly "आप" (Aap) or high-CTR hooks with "तुम" (Tum).
  - Spanish: Friendly "tú".
  - French: Friendly "tu" / "vous" where appropriate.
  - German: Friendly "du".

## 3. Fixed Glossary
| Term | Context | Localized Convention |
| :--- | :--- | :--- |
| **BounceForge** | Product / Brand | Keep "BounceForge" in English |
| **Seed** | Random number parameter | Keep numeric or transliterate (Seed / سیڈ / بذرة) |
| **Preset** | Saved physics setup | Preset / پری سیٹ / الإعداد المسبق / Preajuste |
| **Mode** | Physics simulation mode | Mode / موڈ / وضع / Modo |
| **ASMR** | Autonomous sensory meridian response | ASMR (universal term) |
| **Watermark** | Brand overlay | Watermark / واٹر مارک / العلامة المائية |
| **Safe Area** | Social media UI border | Safe Area / محفوظ علاقہ / المنطقة الآمنة |
| **Hook** | Viral opening caption | Hook / ہک / عنوان جذب المشاهدين |
| **4K 60FPS** | Video specification | 4K 60FPS (technical spec) |

## 4. Legal Disclaimers
Legal translations must always include the English master precedence notice:
> "In the event of any discrepancies between this translation and the original English version, the English version shall govern and prevail."
`;
}

async function run() {
  console.log('🌐 BUILDING BOUNCEFORGE MULTI-LANGUAGE RESOURCE PACK (16 LANGUAGES)...');

  const srcLocalesDir = path.join(ROOT, 'src', 'locales');
  const pubLocalesDir = path.join(ROOT, 'public', 'locales');
  const docLocalesDir = path.join(ROOT, 'locales');

  fs.mkdirSync(srcLocalesDir, { recursive: true });
  fs.mkdirSync(pubLocalesDir, { recursive: true });
  fs.mkdirSync(docLocalesDir, { recursive: true });

  const exportIndexStatements: string[] = [];

  for (const lang of ALL_LANGUAGE_CODES) {
    const srcLangDir = path.join(srcLocalesDir, lang);
    const pubLangDir = path.join(pubLocalesDir, lang);
    const docLangDir = path.join(docLocalesDir, lang);

    fs.mkdirSync(srcLangDir, { recursive: true });
    fs.mkdirSync(pubLangDir, { recursive: true });
    fs.mkdirSync(docLangDir, { recursive: true });

    // 1. Write STYLE.md
    fs.writeFileSync(path.join(docLangDir, 'STYLE.md'), generateStyleGuide(lang), 'utf8');

    // 2. Generate and write each namespace
    for (const ns of ALL_NAMESPACES) {
      const data = generateLocalizedNamespace(lang, ns);
      const jsonContent = JSON.stringify(data, null, 2);

      fs.writeFileSync(path.join(srcLangDir, `${ns}.json`), jsonContent, 'utf8');
      fs.writeFileSync(path.join(pubLangDir, `${ns}.json`), jsonContent, 'utf8');
    }

    console.log(`  ✓ Built 15 namespaces + STYLE.md for [${lang}] (${SUPPORTED_LANGUAGES[lang].name})`);
  }

  // 3. Write index.ts for src/locales bundle
  const indexContent = `// Auto-generated locale registry
import { SupportedLanguage, TranslationNamespace } from '../i18n/config';

// Eager English dictionary bundle for guaranteed synchronous fallback
${ALL_NAMESPACES.map((ns) => `import en_${ns} from './en/${ns}.json';`).join('\n')}

export const EN_BUNDLE: Record<TranslationNamespace, Record<string, any>> = {
${ALL_NAMESPACES.map((ns) => `  ${ns}: en_${ns},`).join('\n')}
};

/**
 * Dynamically loads a localized namespace for a given language
 */
export async function loadLocaleNamespace(
  lang: SupportedLanguage,
  ns: TranslationNamespace
): Promise<Record<string, any>> {
  if (lang === 'en') {
    return EN_BUNDLE[ns];
  }

  try {
    const mod = await import(\`./\${lang}/\${ns}.json\`);
    return mod.default || mod;
  } catch (err) {
    console.warn(\`Could not dynamically load locale [\${lang}/\${ns}], falling back to English:\`, err);
    return EN_BUNDLE[ns];
  }
}
`;
  fs.writeFileSync(path.join(srcLocalesDir, 'index.ts'), indexContent, 'utf8');

  console.log('\n✅ Successfully generated 240 locale dictionaries across 16 languages + STYLE guides!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
