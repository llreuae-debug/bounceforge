import { AutoViralTitles, MarbleMelodyConfig } from './types';
import { SupportedLanguage } from '../i18n/config';

// Blacklisted keywords (copyrighted cartoons, pop songs, pop stars, movie characters, protected brands)
export const COPYRIGHT_BLACKLIST: string[] = [
  'disney',
  'mickey',
  'mario',
  'pokemon',
  'pikachu',
  'nintendo',
  'marvel',
  'avengers',
  'harry potter',
  'star wars',
  'batman',
  'spiderman',
  'shrek',
  'taylor swift',
  'drake',
  'bts',
  'beiber',
  'bieber',
  'billie eilish',
  'ariana grande',
  'minecraft',
  'roblox',
  'fortnite',
  'anime',
  'naruto',
  'dragon ball',
  'one piece',
  'elvis',
  'beatles',
  'queen',
  'michael jackson',
  'rihanna',
];

export interface TitleGenerationParams {
  melodyName: string;
  composer: string;
  isPublicDomain: boolean;
  totalNotes: number;
  marbleCount: number;
  objectFamilies: string[];
  themePack: string;
  marbleStyle: string;
  durationSeconds: number;
  language?: SupportedLanguage;
  seed: number;
}

/**
 * Validates text against the copyright blacklist.
 * Returns true if clean, false if any blacklisted keyword is found.
 */
export function isCopyrightSafe(text: string): boolean {
  const lower = text.toLowerCase();
  for (const word of COPYRIGHT_BLACKLIST) {
    // Regex for word boundary
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(lower)) {
      return false;
    }
  }
  return true;
}

/**
 * Filter and sanitize text to ensure zero copyright violations
 */
export function sanitizeCopyright(text: string): string {
  let sanitized = text;
  for (const word of COPYRIGHT_BLACKLIST) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    sanitized = sanitized.replace(regex, '');
  }
  return sanitized.replace(/\s+/g, ' ').trim();
}

/**
 * Generates viral short-form titles, hooks, and captions for Marble Melody 3D
 */
export function generateAutoViralTitles(params: TitleGenerationParams): AutoViralTitles {
  const {
    melodyName,
    isPublicDomain,
    totalNotes,
    marbleCount,
    objectFamilies,
    durationSeconds,
    seed,
  } = params;

  // Clean melody name for titles
  const cleanMelody = melodyName.toLowerCase().replace(/\s*\(.*?\)/g, '').trim();
  const primaryObject = (objectFamilies[0] || 'glass tube').replace(/_/g, ' ');
  const secondaryObject = (objectFamilies[1] || 'xylophone').replace(/_/g, ' ');

  // 1. Generate 3 Distinct Hooks using rotating formulas
  // Formula A: satisfying + object + melody
  const hookA = `${cleanMelody} played by a marble`;

  // Formula B: count / challenge
  const hookB = marbleCount > 1
    ? `${marbleCount} marbles, ${totalNotes} notes, 0 errors`
    : `${totalNotes} notes. 1 marble. zero mistakes`;

  // Formula C: ASMR / prediction / spot instrument
  const hookC = isPublicDomain
    ? `${cleanMelody} but it's an ASMR marble run`
    : `every note is a different 3D object 🎶`;

  const hookAlternatives = [
    {
      hook: hookA.length <= 40 ? hookA : hookA.slice(0, 39) + '…',
      recommended: (seed % 3) === 0,
      formula: 'satisfying_melody',
    },
    {
      hook: hookB.length <= 40 ? hookB : hookB.slice(0, 39) + '…',
      recommended: (seed % 3) === 1,
      formula: 'count_challenge',
    },
    {
      hook: hookC.length <= 40 ? hookC : hookC.slice(0, 39) + '…',
      recommended: (seed % 3) === 2,
      formula: 'asmr_instrument',
    },
  ];

  // Pick recommended hook as main onScreenHook
  const chosen = hookAlternatives.find((h) => h.recommended) || hookAlternatives[0];
  const onScreenHook = chosen.hook;

  // 2. YouTube Shorts Title (<= 100 chars, keyword first)
  let youtubeTitle = `${cleanMelody} on ${primaryObject}s · Satisfying 3D ASMR Marble Run (${Math.round(durationSeconds)}s)`;
  if (youtubeTitle.length > 98) {
    youtubeTitle = `${cleanMelody} played by a marble run · Satisfying ASMR 3D`;
  }
  youtubeTitle = sanitizeCopyright(youtubeTitle);

  // 3. TikTok Caption + 4-6 Hashtags
  const tiktokHashtags = [
    '#marblerun',
    '#oddlysatisfying',
    '#asmrsounds',
    '#3danimation',
    '#musiccover',
    '#satisfyingvideo',
  ];
  const tiktokCaption = sanitizeCopyright(
    `${cleanMelody} played note-for-note down this 3D wall of ${primaryObject}s & ${secondaryObject}s! Wait for the finale drop 🎶✨`
  );

  // 4. Instagram Reels Caption + Hashtags
  const reelsHashtags = [
    '#satisfying',
    '#asmr',
    '#marblerun',
    '#calm',
    '#relaxingvideos',
  ];
  const reelsCaption = sanitizeCopyright(
    `Which part gave you chills? ${totalNotes} notes, ${marbleCount} marble${marbleCount > 1 ? 's' : ''}, 100% mechanical physics. Turn sound ON 🎧`
  );

  // 5. Pinned Comment Question
  const questions = [
    'Which instrument sounded best: the glass tubes or the xylophone? 👇',
    'Did you recognize this melody before the 10-second mark? 🎶',
    'Rate the finale drop from 1 to 10 in the comments! 👇✨',
    'What public-domain song should we build the marble wall for next? 🎹',
  ];
  const pinnedComment = questions[seed % questions.length];

  return {
    onScreenHook,
    hookAlternatives,
    tiktokCaption,
    tiktokHashtags,
    youtubeTitle,
    reelsCaption,
    reelsHashtags,
    pinnedComment,
  };
}
