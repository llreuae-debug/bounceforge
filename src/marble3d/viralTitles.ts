import { AutoViralTitles, MarbleMelodyConfig, ReelFormatId } from './types';
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
  'apple',
  'iphone',
  'samsung',
  'sony',
  'nike',
  'adidas',
  'coca cola',
  'pepsi',
  'lego',
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
  reelFormat?: ReelFormatId;
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
  const reelFormat = params.reelFormat;

  // 1. Generate 3 Distinct Hooks using rotating formulas
  let hookA = `${cleanMelody} played by a marble`;
  let hookB = marbleCount > 1
    ? `${marbleCount} marbles, ${totalNotes} notes, 0 errors`
    : `${totalNotes} notes. 1 marble. zero mistakes`;
  let hookC = isPublicDomain
    ? `${cleanMelody} but it's an ASMR marble run`
    : `every note is a different 3D object 🎶`;

  let extraHashtags: string[] = [];
  let formatQuestion = 'Rate the finale drop from 1 to 10 in the comments! 👇✨';

  // Format Specific Hook Formulas (Part 6)
  if (reelFormat === 'f1_guess_tune') {
    hookA = 'guess the tune in 5 seconds';
    hookB = 'only 1% get the 3rd one';
    hookC = 'can you name this song before the reveal?';
    extraHashtags = ['#guessthesong', '#guessthetune', '#quiz'];
    formatQuestion = 'Did you guess it before the answer revealed at the end? 👇';
  } else if (reelFormat === 'f2_guess_all') {
    hookA = 'guess all 3 tunes';
    hookB = 'only 1% get all tunes right';
    hookC = 'how many tunes did you recognize?';
    extraHashtags = ['#guessthesong', '#musicquiz', '#challenge'];
    formatQuestion = 'Drop your answers in the comments! 1, 2, 3 👇';
  } else if (reelFormat === 'f3_which_sounds_better') {
    hookA = 'bells or glass? 1 or 2 👇';
    hookB = 'which one sounds better?';
    hookC = 'which instrument has the cleaner tone?';
    extraHashtags = ['#whichone', '#soundcomparison', '#asmrsounds'];
    formatQuestion = 'Comment 1 or 2! Which tone was your favorite? 👇';
  } else if (reelFormat === 'f5_night_beats') {
    hookA = "night beats but it's a marble";
    hookB = 'volume up 🔊 bass test';
    hookC = 'phonk marble run hits different';
    extraHashtags = ['#nightbeats', '#phonk', '#bassdrop'];
    formatQuestion = 'Turn the bass up! Rate this beat 1-10 👇🔊';
  } else if (reelFormat === 'f6_squeaky_orchestra') {
    hookA = 'rubber ducks play a classic';
    hookB = 'the squeakiest orchestra';
    hookC = 'squeaky toys hit every note';
    extraHashtags = ['#rubberduck', '#squeakytoy', '#orchestra'];
    formatQuestion = 'How did the rubber ducks sound? 🦆 Comment below!';
  } else if (reelFormat === 'f11_split_screen') {
    hookA = 'my hands vs the marble';
    hookB = 'live piano vs marble physics 🎹';
    hookC = 'split screen marble run';
    extraHashtags = ['#splitscreen', '#pianocover', '#marblephysics'];
    formatQuestion = 'Who was more on beat? Let me know below 👇';
  }

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
  if (reelFormat === 'f1_guess_tune') {
    youtubeTitle = `Guess the Tune in 5 Seconds! · Satisfying 3D ASMR Marble Run`;
  } else if (reelFormat === 'f3_which_sounds_better') {
    youtubeTitle = `Which Sounds Better? (1 or 2) · Satisfying 3D ASMR Marble Run`;
  } else if (reelFormat === 'f5_night_beats') {
    youtubeTitle = `Night Beats but it's a 3D Marble Run · Volume Up 🔊`;
  } else if (reelFormat === 'f6_squeaky_orchestra') {
    youtubeTitle = `Rubber Ducks Play ${cleanMelody} · Squeaky Toy Orchestra`;
  } else if (youtubeTitle.length > 98) {
    youtubeTitle = `${cleanMelody} played by a marble run · Satisfying ASMR 3D`;
  }
  youtubeTitle = sanitizeCopyright(youtubeTitle);

  // 3. TikTok Caption + 4-6 Hashtags
  const baseTiktok = [
    '#marblerun',
    '#oddlysatisfying',
    '#asmrsounds',
    '#3danimation',
  ];
  const tiktokHashtags = [...extraHashtags, ...baseTiktok].slice(0, 6);
  const tiktokCaption = sanitizeCopyright(
    `${cleanMelody} played note-for-note down this 3D wall of ${primaryObject}s & ${secondaryObject}s! Wait for the finale drop 🎶✨`
  );

  // 4. Instagram Reels Caption + Hashtags
  const baseReels = [
    '#satisfying',
    '#asmr',
    '#marblerun',
    '#relaxingvideos',
  ];
  const reelsHashtags = [...extraHashtags, ...baseReels].slice(0, 6);
  const reelsCaption = sanitizeCopyright(
    `Which part gave you chills? ${totalNotes} notes, ${marbleCount} marble${marbleCount > 1 ? 's' : ''}, 100% mechanical physics. Turn sound ON 🎧`
  );

  // 5. Pinned Comment Question
  const questions = [
    formatQuestion,
    'Which instrument sounded best: the glass tubes or the xylophone? 👇',
    'Did you recognize this melody before the 10-second mark? 🎶',
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
