import {
  generateOfflineHooks,
  fitsSafeLineLimit,
  sanitizeText,
  SupportedLanguage,
  HookStyle,
  getTrendPackOffline,
} from '../src/ai/offlineEngine';
import { generateSeoPack, formatSeoPackAsText, checkOnScreenKeyword, generateSeoFileName } from '../src/ai/seoEngine';
import { TrendsManager } from '../src/ai/trendsManager';

async function runTests() {
  console.log('--- RUNNING BOUNCEFORGE GROWTH TOOLS TEST SUITE ---\n');
  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, details?: string) {
    if (condition) {
      console.log(`✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${name} ${details ? '(' + details + ')' : ''}`);
      failed++;
    }
  }

  // TEST 1: 6 hooks returned in <5s with 300+ template library
  const t0 = Date.now();
  const hooks = generateOfflineHooks({
    modeName: 'classic',
    category: 'core',
    endingType: 'escape',
    count: 6,
    styles: ['curiosity', 'challenge'],
    language: 'en',
    emoji: true,
  });
  const elapsed = Date.now() - t0;
  assert('AI/Offline hook generation returns 6 options', hooks.length === 6, `got ${hooks.length}`);
  assert('Hook generation completes in under 5 seconds', elapsed < 5000, `took ${elapsed}ms`);

  // TEST 2: Every hook fits safe area (<40 chars and fits in 2 lines)
  let allFit = true;
  hooks.forEach((h) => {
    if (h.length > 40 || !fitsSafeLineLimit(h)) {
      allFit = false;
    }
  });
  assert('All generated hooks fit in 2 lines inside safe area (<40 chars)', allFit);

  // TEST 3: Multi-language support (Urdu Roman & Script, Hindi, Arabic, Spanish, etc.)
  const languages: SupportedLanguage[] = ['en', 'ur_roman', 'ur_script', 'hi', 'ar', 'es', 'pt', 'id', 'tr'];
  let allLangPassed = true;
  for (const lang of languages) {
    const langHooks = generateOfflineHooks({
      modeName: 'spiral',
      category: 'core',
      count: 6,
      language: lang,
    });
    if (langHooks.length !== 6) allLangPassed = false;
  }
  assert('Multi-language hooks generate 6 options across all 9 languages', allLangPassed);

  // TEST 4: SEO pack generated with strict character limits
  const seoPack = generateSeoPack({
    modeName: 'Classic Escape',
    modeId: 'classic',
    category: 'core',
    hookText: 'Can the ball escape?? 🔥',
    seed: 48213,
    resolution: '4k',
    variationIndex: 0,
  });

  assert('YouTube Shorts title is <= 100 characters', seoPack.shorts.title.length <= 100, `length: ${seoPack.shorts.title.length}`);
  assert('YouTube Shorts tags is <= 500 characters', seoPack.shorts.tags.length <= 500, `length: ${seoPack.shorts.tags.length}`);
  assert('SEO file name follows format: keyword-slug_mode_seed_res.mp4', seoPack.common.fileName.includes('classic_48213_4k.mp4'));
  assert('TikTok caption has question to drive comments', seoPack.tiktok.caption.includes('?'));
  assert('Instagram Reels has accessibility alt text', seoPack.reels.altText.length > 10);
  assert('Pinned comment is suggested', seoPack.common.pinnedComment.length > 5);

  // TEST 5: Batch export generates unique SEO packs with no duplicates
  const batchPacks = [0, 1, 2, 3, 4].map((i) =>
    generateSeoPack({
      modeName: 'Accumulation Rush',
      modeId: 'accumulation',
      category: 'core',
      hookText: 'Will it overflow?? ⚠️',
      seed: 1000 + i,
      variationIndex: i,
    })
  );
  const captions = new Set(batchPacks.map((p) => p.tiktok.caption));
  assert('Batch export generates unique captions per video with no duplicates', captions.size === 5, `unique: ${captions.size}/5`);

  // TEST 6: Content filter blocks brand names, celebrities, copyrighted song lyrics, fake viral guarantees
  const sanitized1 = sanitizeText('Listen to Taylor Swift while playing Nike simulator guaranteed viral 10M views');
  assert('Content filter removes songs, brands, celebrities and fake viral claims', !sanitized1.toLowerCase().includes('taylor swift') && !sanitized1.toLowerCase().includes('nike') && !sanitized1.toLowerCase().includes('guaranteed viral'));

  // TEST 7: On-screen keyword verification and tweak suggestion
  const kwCheckPass = checkOnScreenKeyword('satisfying ball escape asmr');
  assert('On-screen keyword verification detects satisfying/asmr/ball keywords', kwCheckPass.passes && kwCheckPass.detectedKeyword === 'satisfying');

  const kwCheckFail = checkOnScreenKeyword('random text without search terms');
  assert('On-screen keyword verification flags missing keywords and suggests tweak', !kwCheckFail.passes && !!kwCheckFail.suggestedTweak);

  // TEST 8: Trend date freshness check (>14 days stale warning)
  const freshDate = new Date().toISOString().slice(0, 10);
  assert('Fresh trends (<14 days) are marked not stale', !TrendsManager.getInstance().isOlderThan14Days(freshDate));

  const staleDate = '2026-01-01';
  assert('Outdated trends (>14 days) are flagged as stale', TrendsManager.getInstance().isOlderThan14Days(staleDate));

  console.log(`\nTEST SUMMARY: ${passed} PASSED, ${failed} FAILED.`);
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
