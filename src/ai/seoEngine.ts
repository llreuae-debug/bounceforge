/**
 * BounceForge SEO Pack Engine
 * Generates platform-specific SEO metadata for TikTok, Instagram Reels, and YouTube Shorts.
 * Includes on-screen keyword verification, character limit enforcement, and best posting windows.
 */

export interface PlatformTikTokSeo {
  caption: string;
  hashtags: string[];
  onscreenCheck: {
    passes: boolean;
    detectedKeyword?: string;
    suggestedTweak?: string;
  };
}

export interface PlatformReelsSeo {
  caption: string;
  hashtags: string[];
  altText: string;
  coverText: string;
}

export interface PlatformShortsSeo {
  title: string;
  description: string;
  tags: string;
}

export interface CommonSeo {
  fileName: string;
  pinnedComment: string;
  bestPostingWindow: string;
}

export interface SeoPack {
  tiktok: PlatformTikTokSeo;
  reels: PlatformReelsSeo;
  shorts: PlatformShortsSeo;
  common: CommonSeo;
  isAi?: boolean;
}

const SEARCHABLE_KEYWORDS = [
  'satisfying',
  'ball',
  'escape',
  'asmr',
  'physics',
  'simulation',
  'ring',
  'rings',
  'relaxing',
  'oddlysatisfying',
  'challenge',
  'countdown',
  'drop',
  'clutch',
  'puzzle',
];

/**
 * Checks if the on-screen hook contains searchable TikTok / YouTube keywords
 */
export function checkOnScreenKeyword(hookText: string): {
  passes: boolean;
  detectedKeyword?: string;
  suggestedTweak?: string;
} {
  const lower = hookText.toLowerCase();
  for (const kw of SEARCHABLE_KEYWORDS) {
    if (lower.includes(kw)) {
      return {
        passes: true,
        detectedKeyword: kw,
      };
    }
  }

  return {
    passes: false,
    suggestedTweak: `satisfying ${hookText.replace(/^[¿?]+/, '').trim()} asmr`,
  };
}

/**
 * Computes optimal local posting window based on user's timezone
 */
export function calculateBestPostingWindow(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
    return `Peak Window: 12:30 PM – 2:30 PM & 7:00 PM – 9:30 PM (${tz}) • Guide only, actual reach varies by audience retention`;
  } catch {
    return `Peak Window: 12:00 PM – 2:00 PM & 6:30 PM – 9:00 PM Local Time`;
  }
}

/**
 * Generates an SEO-optimized clean file name
 */
export function generateSeoFileName(modeId: string, seed: number, resolution: string = '1080p'): string {
  const cleanMode = modeId.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `satisfying-ball-escape-asmr_${cleanMode}_${seed}_${resolution}.mp4`;
}

/**
 * Generates platform-specific SEO Pack (deterministic offline fallback or AI enhanced)
 */
export function generateSeoPack(params: {
  modeName: string;
  modeId: string;
  category: string;
  hookText: string;
  duration?: number;
  seed?: number;
  resolution?: string;
  variationIndex?: number;
  language?: string;
}): SeoPack {
  const { modeName, modeId, hookText, seed = 1337, resolution = '1080p', variationIndex = 0, language = 'en' } = params;
  const cleanHook = hookText.trim().replace(/[?!.]+$/, '');
  const onscreen = checkOnScreenKeyword(hookText);

  // Localized hashtag dictionary (mixing local and global tags per Part 8)
  const LOCAL_TAGS: Record<string, string[]> = {
    ur: ['#اردو', '#وائرل', '#ریلز', '#فزکس', '#تسلی_بخش'],
    hi: ['#वायरल', '#शॉर्ट्स', '#भौतिकी', '#हिंदी', '#रिलैक्सिंग'],
    ar: ['#اكسبلور', '#عرب_تيك_توك', '#فيزياء', '#ريلز', '#ممتع'],
    es: ['#parati', '#fisica', '#simulacion', '#viral', '#españa', '#mexico'],
    'pt-BR': ['#fy', '#fypbrasil', '#fisica', '#viralbrasil', '#jogos'],
    pt: ['#fy', '#fypbrasil', '#fisica', '#viralbrasil', '#jogos'],
    fr: ['#pourtoi', '#physique', '#satisfaisant', '#viralfrance'],
    de: ['#fy', '#foryoupage', '#physik', '#deutschland', '#beruhigend'],
    id: ['#fyp', '#indonesia', '#fisika', '#seru', '#santai'],
    tr: ['#kesfet', '#kesfetteyiz', '#fizik', '#rahatlatici', '#turkiye'],
    ru: ['#рек', '#рекомендации', '#физика', '#залипательно', '#шортс'],
    bn: ['#ভাইরাল', '#বাংলাদেশ', '#শর্টস', '#আরামদায়ক'],
    vi: ['#fyp', '#xuhuong', '#vatly', '#thugian', '#vietnam'],
    ja: ['#おすすめ', '#バズれ', '#物理', '#癒し', '#爽快'],
    ko: ['#추천', '#떡상', '#물리', '#힐링', '#쇼츠'],
    'zh-CN': ['#热门', '#解压', '#物理模拟', '#治愈', '#抖音'],
  };

  const localTags = LOCAL_TAGS[language] || [];

  // Hashtag sets
  const tiktokHashtags = [
    '#satisfying',
    '#asmr',
    '#ballsimulation',
    '#physics',
    `#${modeId.replace(/[^a-z0-9]/g, '')}`,
    '#oddlysatisfying',
    ...localTags.slice(0, 3),
  ];

  const reelsHashtags = [
    '#satisfying',
    '#asmr',
    '#physicssimulation',
    '#relaxingvideos',
    '#sounddesign',
    ...localTags.slice(0, 3),
  ];

  const shortsTagsList = [
    'satisfying video',
    'ball physics simulation',
    'asmr soundscape',
    'oddly satisfying',
    'ball escape challenge',
    'procedural audio',
    'bounceforge 4k',
    'relaxing sounds',
    modeName.toLowerCase(),
    ...(LOCAL_TAGS[language] ? LOCAL_TAGS[language].map((t) => t.replace('#', '')) : []),
  ];

  // Variations to avoid batch duplication
  const commentQuestions = [
    'which color did you think was gonna win?? comment below 👇',
    'how many near-misses did you count?? drop your guess 👇',
    'did the ending catch you off guard?? comment your reaction 👇',
    'what mode should we do next for part 2?? 👇',
    'be honest: did you watch till the very last frame?? 👇',
  ];

  const chosenQuestion = commentQuestions[variationIndex % commentQuestions.length];

  // TikTok SEO
  const tiktokCaption = `satisfying ball escape asmr: ${cleanHook}?? ${chosenQuestion}`;

  // Reels SEO
  const reelsCaption = `${cleanHook} 🔥 pure deterministic physics paired with binaural procedural asmr sound. ${chosenQuestion}`;
  const reelsAltText = `A deterministic vertical physics simulation of a bouncing sphere navigating rotating rings in ${modeName} mode.`;
  const reelsCoverText = `${cleanHook.toUpperCase()} ⚡`;

  // Shorts SEO
  const shortsTitle = `Satisfying Ball Escape ASMR – ${cleanHook}?? 🔥`;
  const shortsDescription = `High-octane deterministic ball physics simulation rendered in vertical 4K with procedural ASMR soundscapes.\n\n${chosenQuestion}\n\n#shorts #satisfying #asmr #physics`;
  const shortsTags = shortsTagsList.join(', ');

  const common: CommonSeo = {
    fileName: generateSeoFileName(modeId, seed, resolution),
    pinnedComment: `Pinned: ${chosenQuestion}`,
    bestPostingWindow: calculateBestPostingWindow(),
  };

  return {
    tiktok: {
      caption: tiktokCaption,
      hashtags: tiktokHashtags,
      onscreenCheck: onscreen,
    },
    reels: {
      caption: reelsCaption,
      hashtags: reelsHashtags,
      altText: reelsAltText,
      coverText: reelsCoverText,
    },
    shorts: {
      title: shortsTitle.slice(0, 95),
      description: shortsDescription,
      tags: shortsTags.slice(0, 480),
    },
    common,
    isAi: false,
  };
}

/**
 * Formats full SEO pack into a readable .txt document for creator export
 */
export function formatSeoPackAsText(pack: SeoPack, modeName: string): string {
  return `=====================================================
BOUNCEFORGE SHORT-FORM SEO PACK
Mode: ${modeName}
Recommended File Name: ${pack.common.fileName}
${pack.common.bestPostingWindow}
=====================================================

--- TIKTOK ---
Caption:
${pack.tiktok.caption}

Hashtags:
${pack.tiktok.hashtags.join(' ')}

On-Screen Keyword Check:
${pack.tiktok.onscreenCheck.passes ? '✓ Keyword verified on screen' : `⚠️ Suggestion: ${pack.tiktok.onscreenCheck.suggestedTweak}`}

--- INSTAGRAM REELS ---
Caption:
${pack.reels.caption}

Hashtags:
${pack.reels.hashtags.join(' ')}

Alt Text (Accessibility & Search):
${pack.reels.altText}

Suggested Cover Text:
${pack.reels.coverText}

--- YOUTUBE SHORTS ---
Title:
${pack.shorts.title}

Description:
${pack.shorts.description}

Tags:
${pack.shorts.tags}

--- ENGAGEMENT & COMMENTS ---
Pinned Comment:
${pack.common.pinnedComment}
`;
}
