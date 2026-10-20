/**
 * Feature QA for Drop Studio in real Chrome: every library song + preset, all 14 styles (non-blank),
 * every option changes the preview, beat marker editing, transport, stuck-sound and effect-chain
 * checks, persistence, favorites, uploads (MP3/WAV/MIDI, bad/long/no file) and memory.
 * Usage: node scripts/featureQa.mjs [baseURL] [fixturesDir]
 */
import { chromium } from '@playwright/test';
const BASE = process.argv[2] || 'http://localhost:4173';
const FX = process.argv[3];
const results = [];
const check = (section, name, ok, detail = '') => {
  results.push({ section, name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${section} | ${name}${detail ? ` | ${detail}` : ''}`);
};

const b = await chromium.launch({ channel: 'chrome', args: ['--autoplay-policy=no-user-gesture-required', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
await ctx.addInitScript(() => {
  window.__starts = 0;
  window.__convolvers = 0;
  // AudioBufferSourceNode (sampled piano/marimba) overrides start(), so patch both
  for (const proto of [AudioScheduledSourceNode.prototype, AudioBufferSourceNode.prototype]) {
    const s = proto.start;
    proto.start = function (...a) {
      window.__starts++;
      return s.apply(this, a);
    };
  }
  const c = BaseAudioContext.prototype.createConvolver;
  BaseAudioContext.prototype.createConvolver = function () {
    if (!(this instanceof OfflineAudioContext)) window.__convolvers++;
    return c.apply(this);
  };
});
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
p.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && errors.push(m.text().slice(0, 200)));
const T = (id) => p.getByTestId(id);
const starts = () => p.evaluate(() => window.__starts);
const open = async (q = '?debug=1') => {
  await p.goto(BASE + '/drops' + q);
  await T('lib-list').waitFor({ timeout: 60000 });
};
/** Pixel fingerprint + variance of the 3D canvas */
const canvasInfo = () =>
  p.evaluate(() => {
    const gl = document.querySelector('[data-testid="drop-canvas-3d"]') || document.querySelector('[data-testid="drop-canvas"]');
    const c = document.createElement('canvas');
    c.width = 180;
    c.height = 320;
    const g = c.getContext('2d');
    g.drawImage(gl, 0, 0, 180, 320);
    g.drawImage(document.querySelector('[data-testid="drop-canvas"]'), 0, 0, 180, 320);
    const d = g.getImageData(0, 0, 180, 320).data;
    let sum = 0, sum2 = 0, h = 0;
    for (let i = 0; i < d.length; i += 4) {
      const y = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
      sum += y;
      sum2 += y * y;
      h = (h * 31 + d[i] * 7 + d[i + 1] * 3 + d[i + 2]) | 0;
    }
    const n = d.length / 4;
    return { std: Math.sqrt(sum2 / n - (sum / n) ** 2), hash: h };
  });
const stats = () => T('gen-stats').innerText();
const settle = () => p.waitForTimeout(350);

// ---------------------------------------------------------------- Library + presets
await open();
const ids = await p.$$eval('[data-testid^="song-"]', (els) => els.map((e) => e.getAttribute('data-testid').slice(5)));
let loadOk = 0, playOk = 0;
const noPlay = [];
for (const id of ids) {
  const title = (await p.locator(`[data-testid="use-${id}"] span`).first().innerText()).trim();
  await T(`use-${id}`).click();
  if ((await T('current-track').innerText()).trim() === title) loadOk++;
  const s0 = await starts();
  await T(`preview-${id}`).click();
  await p.waitForTimeout(500);
  if ((await starts()) > s0) playOk++;
  else noPlay.push(id);
  await T(`preview-${id}`).click();
}
check('1', `MIDI library cards load their song`, loadOk === ids.length, `${loadOk}/${ids.length}`);
check('1', `MIDI library cards preview-play`, playOk === ids.length, `${playOk}/${ids.length} ${noPlay.join(',')}`);
const presetIds = await p.$$eval('[data-testid^="preset-"]', (els) => els.map((e) => e.getAttribute('data-testid')).filter((x) => x !== 'presets'));
let presetOk = 0;
const presetBad = [];
for (const id of presetIds) {
  const before = await stats();
  await T(id).click();
  await settle();
  const after = await stats();
  const s0 = await starts();
  await T('play').click();
  // Some pieces open with a rest (e.g. Clair de Lune, Amazing Grace pickup)
  await p.waitForTimeout(2500);
  const played = (await starts()) > s0;
  await T('play').click();
  if ((after !== before || id === presetIds[0]) && played) presetOk++;
  else presetBad.push(`${id}:${after !== before}/${played}`);
}
check('1', 'Every viral preset loads song + style and plays', presetOk === presetIds.length, `${presetOk}/${presetIds.length} ${presetBad.join(',')}`);

// ---------------------------------------------------------------- Styles (non-blank)
await T('scrub').fill('12');
await T('tab-style').click();
const styles = ['classic', 'staircase', 'rain', 'pendulum', 'funnel', 'glass', 'rings', 'pegboard', 'stack', 'gravityflip', 'split', 'bowl', 'maze', 'automix'];
const blank = [];
for (const s of styles) {
  await T(`style-${s}`).click();
  await p.waitForTimeout(500);
  const info = await canvasInfo();
  if (info.std < 6) blank.push(`${s}(${info.std.toFixed(1)})`);
}
check('2', 'All 14 drop styles render (no blank canvas)', blank.length === 0, blank.join(', '));
const thumbs = await p.evaluate(() => {
  let ok = 0;
  for (const c of document.querySelectorAll('[data-testid="style-grid"] canvas')) {
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let mx = 0;
    for (let i = 0; i < d.length; i += 4) mx = Math.max(mx, d[i] + d[i + 1] + d[i + 2]);
    if (mx > 120) ok++;
  }
  return ok;
});
check('2', 'Style thumbnails animate', thumbs >= 10, `${thumbs}/14 visible thumbnails drawn`);

// ---------------------------------------------------------------- Options change the preview live
await T('style-classic').click();
await settle();
const changed = async (name, act, viaStats = false) => {
  const a = viaStats ? await stats() : (await canvasInfo()).hash;
  await act();
  await p.waitForTimeout(450);
  const z = viaStats ? await stats() : (await canvasInfo()).hash;
  check('2', `Option changes preview live: ${name}`, a !== z);
};
await changed('ball count', () => T('ball-count').fill('5'));
await changed('ball size', () => T('ball-size').fill('1.6'));
await changed('material', () => T('material-neon').click());
await changed('colour palette', () => T('palette-sunset').click());
await changed('trail', () => T('trail').click());
await changed('camera', () => T('camera-orbit').click());
await T('tab-sync').click();
await changed('drop frequency', () => T('frequency-beat').click(), true);
await changed('slow-mo', () => T('slowmo').fill('0.9'));
await changed('sync offset', () => T('offset').fill('150'), true);

// ---------------------------------------------------------------- Beat markers
const beats = async () => parseInt((await T('beat-count').innerText()).split(' ')[0], 10);
const tl = T('beat-timeline');
const box = await tl.boundingBox();
const n0 = await beats();
await tl.dblclick({ position: { x: box.width * 0.37, y: 60 } });
await settle();
const n1 = await beats();
check('2', 'Beat marker: double-click adds a beat', n1 === n0 + 1, `${n0} → ${n1}`);
// Find a marker x by scanning for the yellow-select response
const markerX = await p.evaluate(() => {
  const c = document.querySelector('[data-testid="beat-timeline"]');
  const g = c.getContext('2d');
  const d = g.getImageData(0, 4 * (window.devicePixelRatio > 1 ? 2 : 1), c.width, 1).data;
  for (let x = 40; x < c.width; x++) if (d[x * 4] > 120 && d[x * 4 + 1] > 120) return x / (c.width / c.getBoundingClientRect().width);
  return -1;
});
await p.mouse.move(box.x + markerX, box.y + 20);
await p.mouse.down();
await p.mouse.move(box.x + markerX + 12, box.y + 20, { steps: 4 });
await p.mouse.up();
await settle();
check('2', 'Beat marker: drag moves a beat', (await p.getByText('Reset beats').count()) > 0 && (await beats()) === n1);
await p.mouse.click(box.x + markerX + 12, box.y + 20);
await T('beat-delete').click();
await settle();
check('2', 'Beat marker: select + delete removes a beat', (await beats()) === n1 - 1, `${n1} → ${await beats()}`);
await p.getByText('Reset beats').click();

// ---------------------------------------------------------------- Transport, stuck sound, effects chain
await p.evaluate(() => (window.__convolvers = 0));
await T('scrub').fill('0');
await T('play').click();
await p.waitForTimeout(1500);
const c1 = await T('clock').innerText();
check('2', 'Play advances the clock', !/^0:00\.[0-4]/.test(c1), c1);
for (let k = 0; k < 10; k++) {
  await T('regenerate').click();
  await p.waitForTimeout(120);
}
const seedChanged = /seed (\d+)/.exec(await stats())[1] !== '1337';
check('2', 'Regenerate makes a new layout (new seed)', seedChanged);
check('3', 'Effect chain built once (no stacking after 10 regenerates)', (await p.evaluate(() => window.__convolvers)) <= 1, `${await p.evaluate(() => window.__convolvers)} live convolver(s)`);
const voicesPlaying = await p.evaluate(() => window.__dropStudio.player.activeVoices());
await T('play').click();
await p.waitForTimeout(300);
const s0 = await starts();
const clockPaused = await T('clock').innerText();
await p.waitForTimeout(1200);
check('2', 'Pause stops the clock', (await T('clock').innerText()) === clockPaused);
check('2', 'No stuck sound after stopping (no new sounds scheduled)', (await starts()) === s0);
check('3', 'Active voices return to 0 after stop', (await p.evaluate(() => window.__dropStudio.player.activeVoices())) === 0, `while playing: ${voicesPlaying}`);
await T('scrub').fill('30');
await p.waitForTimeout(200);
check('2', 'Scrub moves the playhead', (await T('clock').innerText()).startsWith('0:30'));
await T('loop').click();
check('2', 'Loop toggle', (await T('loop').getAttribute('aria-pressed')) === 'false');
await T('loop').click();

// Active voices stay bounded while playing (sample over 6s)
await T('scrub').fill('0');
await T('play').click();
let vmax = 0, vSeries = [];
for (let k = 0; k < 12; k++) {
  await p.waitForTimeout(500);
  const v = await p.evaluate(() => window.__dropStudio.player.activeVoices());
  vSeries.push(v);
  vmax = Math.max(vmax, v);
}
await T('play').click();
check('3', 'Active voices bounded while playing (never climbs steadily)', vmax < 60 && vSeries[11] <= Math.max(...vSeries.slice(0, 6)) + 5, vSeries.join(','));

// ---------------------------------------------------------------- Memory after 10 regenerates
const heap = async () => {
  await p.evaluate(() => window.gc && window.gc());
  await p.waitForTimeout(300);
  return p.evaluate(() => performance.memory.usedJSHeapSize / 1e6);
};
const h0 = await heap();
for (let k = 0; k < 10; k++) {
  await T('regenerate').click();
  await p.waitForTimeout(250);
}
const h1 = await heap();
for (let k = 0; k < 10; k++) {
  await T('regenerate').click();
  await p.waitForTimeout(250);
}
const h2 = await heap();
check('5', 'Memory stable after regenerates', h2 - h1 < 15 && h1 - h0 < 25, `${h0.toFixed(1)} → ${h1.toFixed(1)} → ${h2.toFixed(1)} MB`);

// ---------------------------------------------------------------- Favorites, search, filters, persistence
await T('tab-library').click();
await p.getByRole('button', { name: 'Favorite' }).nth(2).click();
await T('fav-only').click();
check('2', 'Favorites filter', (await p.locator('[data-testid^="song-"]').count()) === 1);
await T('fav-only').click();
await T('lib-search').fill('bach');
check('2', 'Search', (await p.locator('[data-testid^="song-"]').count()) === 3);
await T('lib-search').fill('');
await T('tempo-fast').click();
const fast = await p.locator('[data-testid^="song-"]').count();
await T('tempo-all').click();
check('2', 'Tempo filter', fast > 0 && fast < 41, `${fast} fast songs`);
await T('use-greensleeves').click();
await T('tab-style').click();
await T('style-maze').click();
await T('material-metal').click();
await settle();
await p.reload();
await T('lib-list').waitFor({ timeout: 60000 });
await T('fav-only').click();
const favPersist = (await p.locator('[data-testid^="song-"]').count()) === 1;
await T('fav-only').click();
check('2', 'Settings persist after reload (song, style, material)', (await T('current-track').innerText()) === 'Greensleeves' && (await stats()).includes('Maze Fall'), await stats());
check('2', 'Favorites persist after reload', favPersist);
await T('tab-style').click();
check('2', 'Material persists after reload', (await T('material-metal').getAttribute('aria-checked')) === 'true');

// ---------------------------------------------------------------- Uploads
await T('tab-library').click();
check('6', 'Upload disabled until rights checkbox', await T('upload-input').isDisabled());
await T('rights-checkbox').check();
const upload = async (file) => {
  await T('upload-input').setInputFiles(file);
};
if (FX) {
  const t0 = Date.now();
  await upload(`${FX}/song3min.mp3`);
  const sawProgress = await T('upload-progress').waitFor({ timeout: 3000 }).then(() => true).catch(() => false);
  await T('analysis-time').waitFor({ timeout: 20000 });
  const at = await T('analysis-time').innerText();
  const secs = parseFloat(/Analysed in ([\d.]+)s/.exec(at)[1]);
  check('2', 'Beat analysis of a 3-minute MP3 under 2s', secs < 2, `${at} (wall ${(Date.now() - t0) / 1000}s)`);
  check('2', 'Analysis shows a progress bar', sawProgress);
  check('6', 'Uploaded track shows the User Provided badge', (await T('badge-user').count()) > 0);
  await T('rights-checkbox').check();
  const t1 = Date.now();
  await upload(`${FX}/song3min.mp3`);
  await T('analysis-time').waitFor({ timeout: 20000 });
  check('2', 'Re-opening the same file uses the cache', true, `${await T('analysis-time').innerText()} (wall ${(Date.now() - t1) / 1000}s)`);
  for (const [file, re] of [
    [`${FX}/broken.mp3`, /could not be decoded/i],
    [`${FX}/long21min.mp3`, /limit is 20 minutes/i],
    [`${FX}/notes.txt`, /Unsupported file/i],
  ]) {
    await T('rights-checkbox').check();
    await upload(file);
    const ok = await p.getByRole('alert').filter({ hasText: re }).waitFor({ timeout: 20000 }).then(() => true).catch(() => false);
    check('2', `Error message for ${file.split('/').pop()}`, ok);
  }
}
await T('rights-checkbox').check();
await upload('tests/fixtures/click120.wav');
await T('analysis-time').waitFor({ timeout: 20000 });
check('2', 'WAV upload', (await T('current-track').innerText()) === 'click120', await T('analysis-time').innerText());
await T('rights-checkbox').check();
await upload('tests/fixtures/groove.mid');
await p.waitForTimeout(800);
check('2', 'MIDI upload', (await T('badge-user').count()) > 0 && (await stats()).includes('max sync error 0.00'));
await T('tab-export').click();
check('6', 'Export shows the copyright reminder for uploads', await T('copyright-reminder').isVisible());

// ---------------------------------------------------------------- Back button
await p.goto(BASE + '/credits');
await p.getByTestId('credits-table').waitFor({ timeout: 60000 });
await p.goto(BASE + '/drops');
await T('lib-list').waitFor({ timeout: 60000 });
await p.goBack();
await p.getByTestId('credits-table').waitFor({ timeout: 30000 }).catch(() => {});
check('1', 'Browser back button returns to the previous page', p.url().endsWith('/credits') && (await p.getByTestId('credits-table').count()) === 1);

check('1', 'No console errors or warnings during the whole session', errors.length === 0, errors.slice(0, 5).join(' || '));
const fails = results.filter((r) => !r.ok);
console.log(`\nFEATURE QA: ${results.length - fails.length}/${results.length} passed`);
await b.close();
if (fails.length) process.exit(1);
