import { test, expect } from '@playwright/test';

/**
 * Drop Studio (BounceForge 3D) acceptance tests in a real browser.
 * Fixtures are written by `npm run check:midi` and `npm run check:drops`.
 */

async function open(page: import('@playwright/test').Page) {
  // ?debug=1 shows the debug overlay toggle used below
  await page.goto('/drops?debug=1');
  // The app shell boots slowly in software-rendered headless Chromium
  await page.getByTestId('lib-list').waitFor({ timeout: 60000 });
}

test.describe('Drop Studio 3D', () => {
  test.setTimeout(240000);

  test('library, style, synced preview and live controls', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await open(page);

    // Library: 41 built-ins, all Copyright Safe, searchable and filterable
    await expect(page.getByTestId('lib-list').locator('li')).toHaveCount(41);
    await expect(page.getByTestId('lib-list').getByTestId('badge-safe')).toHaveCount(41);
    await page.getByTestId('lib-search').fill('grieg');
    await expect(page.getByTestId('lib-list').locator('li')).toHaveCount(2);
    await page.getByTestId('lib-search').fill('');
    await page.getByTestId('mood-Festive').click();
    await expect(page.getByTestId('song-jingle_bells')).toBeVisible();
    await expect(page.getByTestId('song-fur_elise')).toHaveCount(0);
    await page.getByTestId('mood-All').click();

    // Pick a song + style: synced preview generated in well under a second, zero sync error
    await page.getByTestId('use-ode_to_joy').click();
    await expect(page.getByTestId('current-track')).toHaveText('Ode to Joy');
    await page.getByTestId('tab-style').click();
    await page.getByTestId('style-glass').click();
    const stats = await page.getByTestId('gen-stats').innerText();
    const ms = parseFloat(stats.match(/generated in ([\d.]+) ms/)![1]);
    expect(ms).toBeLessThan(1000);
    expect(stats).toContain('max sync error 0.00 frames');

    // Preview animates while playing
    await page.getByTestId('play').click();
    await page.waitForTimeout(1500);
    const canvas = page.getByTestId('drop-canvas');
    const a = await canvas.screenshot();
    await page.waitForTimeout(800);
    const b = await canvas.screenshot();
    expect(a.equals(b)).toBe(false);
    await expect(page.getByTestId('clock')).not.toHaveText(/^0:00\.0/);

    // Material / palette / camera change instantly (no re-timing)
    const before = await page.getByTestId('gen-stats').innerText();
    await page.getByTestId('material-metal').click();
    await page.getByTestId('palette-gold').click();
    await page.getByTestId('camera-orbit').click();
    expect(await page.getByTestId('gen-stats').innerText()).toBe(before);

    // Every style generates with zero sync error
    for (const id of ['classic', 'staircase', 'rain', 'pendulum', 'funnel', 'glass', 'rings', 'pegboard', 'stack', 'gravityflip', 'split', 'bowl', 'maze', 'automix']) {
      await page.getByTestId(`style-${id}`).click();
      await expect(page.getByTestId('gen-stats')).toContainText('max sync error 0.00 frames');
    }

    // Beat sync controls regenerate live
    await page.getByTestId('tab-sync').click();
    await page.getByTestId('sync-mode-note').click();
    await page.getByTestId('frequency-beat').click();
    await page.getByTestId('offbeats').check();
    await page.getByTestId('sync-check').check();
    await page.getByTestId('freeze-3').click();
    await expect(page.getByTestId('gen-stats')).toContainText('max sync error 0.00 frames');
    await expect(page.getByTestId('beat-timeline')).toBeVisible();

    // Debug overlay
    await page.getByTestId('debug-toggle').click();
    await expect(page.getByTestId('debug-overlay')).toContainText('fps');
    await page.getByTestId('mute').click();
    await expect(page.getByTestId('mute')).toContainText('Muted');
    expect(errors).toEqual([]);
  });

  test('viral presets set song, style and look in one click', async ({ page }) => {
    await open(page);
    await page.getByTestId('preset-mountain_king_chaos').click();
    await expect(page.getByTestId('current-track')).toHaveText('In the Hall of the Mountain King');
    await expect(page.getByTestId('gen-stats')).toContainText('Split & Multiply');
    await page.getByTestId('preset-calm_night').click();
    await expect(page.getByTestId('current-track')).toHaveText('Clair de Lune');
    await expect(page.getByTestId('gen-stats')).toContainText('Bowl Settle');
    await page.getByTestId('tab-export').click();
    await expect(page.getByTestId('description')).toHaveValue(/Music: Clair de Lune — Claude Debussy \(Public Domain\)/);
    await expect(page.getByTestId('copyright-reminder')).toHaveCount(0);
  });

  test('uploads need the rights checkbox and are never marked copyright safe', async ({ page }) => {
    await open(page);
    await expect(page.getByTestId('upload-input')).toBeDisabled();
    await page.getByTestId('rights-checkbox').check();
    await expect(page.getByTestId('upload-input')).toBeEnabled();

    // MIDI upload
    await page.getByTestId('upload-input').setInputFiles('tests/fixtures/groove.mid');
    await expect(page.getByTestId('badge-user').first()).toBeVisible();
    await expect(page.getByTestId('gen-stats')).toContainText('max sync error 0.00 frames');
    await page.getByTestId('tab-export').click();
    await expect(page.getByTestId('copyright-reminder')).toContainText('claimed or muted');

    // Audio upload: beats detected from the recording (120 BPM click track)
    await page.getByTestId('tab-library').click();
    await page.getByTestId('rights-checkbox').check();
    await page.getByTestId('upload-input').setInputFiles('tests/fixtures/click120.wav');
    await expect(page.getByTestId('current-track')).toHaveText('click120', { timeout: 20000 });
    await expect(page.getByTestId('badge-user').first()).toBeVisible();
    const stats = await page.getByTestId('gen-stats').innerText();
    expect(stats).toContain('max sync error 0.00 frames');
    expect(parseInt(stats.match(/(\d+) impacts/)![1], 10)).toBeGreaterThan(20);
  });

  test('export a verified 60s MP4', async ({ page, browserName }) => {
    const h264 = await page.evaluate(async () => {
      if (typeof VideoEncoder === 'undefined') return false;
      const r = await VideoEncoder.isConfigSupported({ codec: 'avc1.640028', width: 1080, height: 1920, bitrate: 8e6, framerate: 30 });
      return !!r.supported;
    });
    test.skip(!h264, `This ${browserName} build has no H.264 encoder (WebCodecs); real Chrome/Edge/Safari do.`);
    await open(page);
    await page.getByTestId('tab-export').click();
    await page.getByTestId('export-preset-1080').click();
    await page.getByTestId('export-start').click();
    await expect(page.getByTestId('export-progress')).toBeVisible();
    await expect(page.getByTestId('export-result')).toBeVisible({ timeout: 600000 });
    await expect(page.getByTestId('verify-dims')).toContainText('1080×1920');
    await expect(page.getByTestId('verify-duration')).toContainText(/60\.\d\ds/);
    await expect(page.getByTestId('verify-audio')).toContainText(/mp4a|aac/i);
    await expect(page.getByTestId('verify-drift')).toContainText('start offset 0.0 ms');
    await expect(page.getByText('Verified MP4')).toBeVisible();
  });
});
