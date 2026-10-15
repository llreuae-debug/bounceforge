/**
 * 50+ Original Lowercase Hook Library for TikTok, Instagram Reels & YouTube Shorts
 * Categorized by simulation dynamic.
 */

export interface HookCategory {
  id: string;
  name: string;
  hooks: string[];
}

export const HOOK_CATEGORIES: HookCategory[] = [
  {
    id: 'escape',
    name: 'escape & puzzle',
    hooks: [
      'can it escape??',
      'this one took 412 tries',
      'wait for the last ring',
      'escapes at 0.0 or deletes the channel',
      'only 1% of viewers watch this escape',
      'watch till the end to see how it gets out',
      'it was trapped for 58 seconds',
      'how did it find that gap??',
      'the escape at the end is so satisfying',
      'bet you $10 it fails this jump',
      'wait for the buzzer beater escape',
    ],
  },
  {
    id: 'battle_race',
    name: 'battle & race',
    hooks: [
      'pick a color before it starts',
      'comment ur color right now',
      'which color is surviving this??',
      'yellow came from behind at the last second',
      'cyan vs pink who got this??',
      'tag someone who would lose first round',
      'hp bar went to 1% and clutched',
      'first color to reach the core wins',
      'i bet 100% you guessed the wrong winner',
      'who is taking the crown today?',
      'the comeback at 0:42 is legendary',
    ],
  },
  {
    id: 'asmr_satisfying',
    name: 'asmr & satisfying',
    hooks: [
      'listen with headphones for max tingles',
      'the most satisfying thing on your feed today',
      'pure soap cutting + glass shatter asmr',
      'the acoustic sound at 0:38 is heavenly',
      'oddly satisfying rainbow alignment',
      'from pure chaos to pure symmetry',
      'sound on for the glass chime ping',
      'this audio will instantly relax you',
      'the bubble pop chain reaction is so crisp',
      'satisfying 100-ring speedrun',
    ],
  },
  {
    id: 'tease_near_miss',
    name: 'near-miss & twist',
    hooks: [
      'the ending tho...',
      'the 4th near miss almost broke me',
      'so close it actually hurts',
      'watch what happens at the final bounce',
      'i almost threw my phone at 0:45',
      'no way that just happened',
      'you will not predict what happens next',
      'it almost got out 6 times in a row',
      'the biggest twist in bounceforge history',
      'wait for the second drop',
    ],
  },
  {
    id: 'loop_growth',
    name: 'loop & growth',
    hooks: [
      'you will not notice when it restarts',
      'it grows 4% every single bounce',
      'watch it 3 times to spot the loop point',
      'seamless loop engineered with pure math',
      'how big can this ball actually get??',
      'wait till it completely shatters the glass',
      'stacked 18 balls without toppling once',
      'the wobble at the top gave me anxiety',
      'infinite falling into the core',
      'let it loop once and tell me if you felt it',
    ],
  },
];

export const ALL_HOOKS: string[] = HOOK_CATEGORIES.flatMap((c) => c.hooks);

export function getRandomHook(category?: string): string {
  if (category) {
    const cat = HOOK_CATEGORIES.find((c) => c.id === category);
    if (cat && cat.hooks.length > 0) {
      return cat.hooks[Math.floor(Math.random() * cat.hooks.length)];
    }
  }
  return ALL_HOOKS[Math.floor(Math.random() * ALL_HOOKS.length)];
}
