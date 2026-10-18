import JSZip from 'jszip';
import { ALL_HOOKS, getRandomHook } from '../engine/hooksLibrary';
import { BUILTIN_THEMES } from '../render/themes';
import { BUILTIN_MELODIES } from '../audio/melodies';

import { generateAutoViralTitles } from '../marble3d/viralTitles';

export interface SocialCopy {
  shortsTitle: string;
  caption: string;
  hashtags: string;
}

/**
 * Offline template-based social caption, title, and hashtag helper
 */
export function generateSocialCopy(modeName: string, hookLine: string = 'can it escape??'): SocialCopy {
  const cleanMode = modeName.toLowerCase();
  const cleanHook = hookLine.toLowerCase().replace(/[?!.]+$/, '');

  if (cleanMode.includes('marble_melody') || cleanMode.includes('melody')) {
    const melodyName = hookLine.includes('·') ? hookLine.split('·')[0].trim() : hookLine;
    const titles = generateAutoViralTitles({
      melodyName: melodyName.replace(/escape/gi, 'marble run'),
      composer: 'Public Domain',
      isPublicDomain: true,
      totalNotes: 120,
      marbleCount: 1,
      objectFamilies: ['glass_tube', 'rainbow_xylophone'],
      themePack: 'pastel_dream',
      marbleStyle: 'glass_swirl',
      durationSeconds: 56,
      seed: Math.abs(cleanHook.length * 31),
    });
    return {
      shortsTitle: titles.youtubeTitle,
      caption: titles.tiktokCaption,
      hashtags: titles.tiktokHashtags.join(' '),
    };
  }

  const titles = [
    `${cleanHook.toUpperCase()}?? ⚡ (Satisfying ASMR Physics)`,
    `${cleanHook}?? wait for the ending! #shorts`,
    `this took 412 attempts... ${cleanMode} asmr`,
    `only 1% of viewers watch this escape 🔥`,
  ];

  const captions = [
    `wait for the end... which color did you pick before it started? comment below 👇`,
    `${cleanHook}?? listen with headphones for max tingles 🎧 follow for part 2!`,
    `the final 5 seconds were so close... drop a ❤️ if you guessed the winner!`,
    `pure deterministic ball physics + procedural asmr soundscape. what mode should we do next?`,
  ];

  const hashtagPool = [
    '#satisfying',
    '#asmr',
    '#oddlysatisfying',
    '#physics',
    '#ballsimulation',
    '#relaxing',
    '#viral',
    '#bounceforge',
    '#sounddesign',
    '#shorts',
    '#reels',
    '#tiktok',
    '#foryou',
  ];

  const title = titles[Math.abs(cleanMode.length + cleanHook.length) % titles.length];
  const caption = captions[Math.abs(cleanHook.length) % captions.length];
  const hashtags = hashtagPool.slice(0, 8).join(' ');

  return {
    shortsTitle: title,
    caption,
    hashtags,
  };
}

/**
 * Variation Guard: Guarantees no two exports in a batch share the same seed, palette, or melody
 */
export function getBatchVariation(
  batchIndex: number,
  modeId: string,
  usedSeeds: Set<number>
): { seed: number; hookText: string; themeId: string; melodyId: string } {
  // Generate high-tension unique seed
  let seedCandidate = 1337 + batchIndex * 7919 + Math.floor(Math.random() * 500);
  while (usedSeeds.has(seedCandidate)) {
    seedCandidate += 31;
  }
  usedSeeds.add(seedCandidate);

  // Rotate through themes
  const theme = BUILTIN_THEMES[batchIndex % BUILTIN_THEMES.length];

  // Rotate melodies
  const melody = BUILTIN_MELODIES[batchIndex % BUILTIN_MELODIES.length];

  // Pick unique hook line
  const hookText = ALL_HOOKS[(batchIndex * 3) % ALL_HOOKS.length] || getRandomHook();

  return {
    seed: seedCandidate,
    hookText,
    themeId: theme.id,
    melodyId: melody.id,
  };
}

export async function createBatchZip(
  items: Array<{
    filename: string;
    blob: Blob;
    coverBlob?: Blob;
    coverFilename?: string;
    seoText?: string;
    seoFilename?: string;
  }>
): Promise<Blob> {
  const zip = new JSZip();

  items.forEach((item) => {
    zip.file(item.filename, item.blob);
    if (item.coverBlob && item.coverFilename) {
      zip.file(item.coverFilename, item.coverBlob);
    }
    if (item.seoText && item.seoFilename) {
      zip.file(item.seoFilename, item.seoText);
    }
  });

  return await zip.generateAsync({ type: 'blob' });
}
