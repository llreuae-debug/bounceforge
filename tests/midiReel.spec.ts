import { test, expect, type Page } from '@playwright/test';

/**
 * MIDI → reel acceptance workflow in a real browser:
 * upload → synthesized preview → analysis → generation → synced preview → export → verified MP4,
 * plus malformed / silent / tempo-change / missing-instrument / dense files.
 * Fixtures are written by `npm run check:midi`.
 */

async function countAudioStarts(page: Page) {
  await page.addInitScript(() => {
    (window as any).__starts = 0;
    const orig = AudioScheduledSourceNode.prototype.start;
    AudioScheduledSourceNode.prototype.start = function (...a: any[]) {
      (window as any).__starts++;
      return (orig as any).apply(this, a);
    };
  });
}
const starts = (page: Page) => page.evaluate(() => (window as any).__starts as number);

async function upload(page: Page, file: string) {
  await page.goto('/midi');
  await page.getByTestId('midi-upload').setInputFiles(`tests/fixtures/${file}`);
}

test.describe('MIDI → Reel Studio', () => {
  test.setTimeout(240000);

  test('upload, preview, analyze, generate and play a synced reel', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await countAudioStarts(page);
    await upload(page, 'groove.mid');

    // 1-2. Uploaded file is analysed and its synthesized audio previews
    await expect(page.getByTestId('bpm')).toHaveText('120 BPM');
    const s0 = await starts(page);
    await page.getByTestId('play-toggle').first().click();
    await page.waitForTimeout(2000);
    expect(await starts(page)).toBeGreaterThan(s0 + 5);
    await expect(page.getByTestId('clock').first()).not.toHaveText(/^0:00\.0/);
    await page.getByTestId('play-toggle').first().click();

    // 3. Analysis screen shows tempo / beats / tracks
    await page.getByRole('button', { name: /Continue/ }).click();
    await expect(page.getByText('Percussion:')).toBeVisible();
    await page.getByTestId('target-duration').selectOption('15');

    // 4-5. Generate: major drops align with the music
    await page.getByTestId('generate').click();
    const alignment = page.getByTestId('alignment');
    await expect(alignment).toBeVisible({ timeout: 30000 });
    const m = (await alignment.innerText()).match(/(\d+) of (\d+) drops/);
    expect(m).not.toBeNull();
    expect(Number(m![1])).toBe(Number(m![2]));
    expect(Number(m![2])).toBeGreaterThan(10);

    // 6-8. Preview: canvas animates and collision sounds come from real collisions
    await page.getByTestId('to-preview').click();
    const canvas = page.getByTestId('reel-canvas');
    await page.getByTestId('play-toggle').first().click();
    await page.waitForTimeout(1500);
    const a = await canvas.screenshot();
    await page.waitForTimeout(2000);
    const b = await canvas.screenshot();
    expect(a.equals(b)).toBe(false);
    await expect(page.getByText(/Collision sounds played this session: [1-9]/)).toBeVisible();

    // 7. Music and effects have independent controls, plus mute
    for (const name of ['Master', 'MIDI music', 'Ball drops', 'Collision effects', 'Ambient']) {
      await expect(page.getByRole('slider', { name })).toBeVisible();
    }
    await page.getByRole('button', { name: /Mute/ }).click();
    await expect(page.getByRole('button', { name: /Muted/ })).toBeVisible();

    // Scrub
    await page.getByTestId('midi-timeline').click({ position: { x: 300, y: 60 } });
    expect(errors).toEqual([]);
  });

  test('malformed MIDI files show a clear error', async ({ page }) => {
    for (const f of ['not-midi.mid', 'bad-header.mid', 'truncated.mid']) {
      await upload(page, f);
      await expect(page.getByRole('alert')).toContainText(/MIDI/i);
      await expect(page.getByTestId('track-summary')).toHaveCount(0);
    }
  });

  test('silent, tempo-change, missing-instrument and dense files', async ({ page }) => {
    await upload(page, 'silent.mid');
    await expect(page.getByTestId('warnings')).toContainText(/silent/i);

    await upload(page, 'tempo-change.mid');
    await expect(page.getByTestId('bpm')).toHaveText(/100 BPM \(varies\)/);

    await upload(page, 'missing-instrument.mid');
    await expect(page.getByTestId('warnings')).toContainText(/no matching sound/i);

    await upload(page, 'dense.mid');
    await expect(page.getByTestId('warnings')).toContainText(/dense/i);
    await page.getByRole('button', { name: /Continue/ }).click();
    await page.getByTestId('target-duration').selectOption('15');
    await page.getByTestId('generate').click();
    await expect(page.getByTestId('alignment')).toBeVisible({ timeout: 30000 });
  });

  test('export a verified MP4 with audio', async ({ page, browserName }) => {
    const h264 = await page.evaluate(async () => {
      if (typeof VideoEncoder === 'undefined') return false;
      const r = await VideoEncoder.isConfigSupported({ codec: 'avc1.640028', width: 1080, height: 1920, bitrate: 8e6, framerate: 30 });
      return !!r.supported;
    });
    test.skip(!h264, `This ${browserName} build has no H.264 encoder (WebCodecs); real Chrome/Edge/Safari do.`);

    await upload(page, 'groove.mid');
    await page.getByRole('button', { name: /Continue/ }).click();
    await page.getByTestId('target-duration').selectOption('15');
    await page.getByTestId('generate').click();
    await page.getByTestId('to-preview').click({ timeout: 30000 });
    await page.getByTestId('to-export').click();
    await page.getByTestId('res-1080').click();
    await page.getByTestId('start-export').click();
    await expect(page.getByTestId('export-result')).toBeVisible({ timeout: 600000 });
    await expect(page.getByTestId('verify-dims')).toContainText('1080×1920');
    await expect(page.getByTestId('verify-duration')).toContainText(/1[45]\.\d\ds/);
    await expect(page.getByTestId('verify-audio')).toContainText(/mp4a|aac/i);
    await expect(page.getByText('Verified MP4')).toBeVisible();
  });
});
