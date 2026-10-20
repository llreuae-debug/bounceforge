import { chromium } from '@playwright/test';
const S = '/private/tmp/claude-501/-Users-dilnawaz-antigravity-BOUNCEFORGE/cbed4bff-77a6-47f5-b54a-51ab058b0333/scratchpad/ds';
const BASE = process.argv[4] || 'https://bounceforge.vercel.app';
const b = await chromium.launch({ channel: process.argv[5] || 'chrome' });
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const p = await ctx.newPage();
const logs = []; p.on('pageerror', (e) => logs.push('PAGEERR ' + e.message)); p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.text().slice(0, 300)); });
await p.goto(BASE + '/drops');
await p.getByTestId('lib-list').waitFor({ timeout: 60000 });
await p.getByTestId(`preset-${process.argv[2] || 'festive_bells'}`).click();
await p.getByTestId('tab-export').click();
for (const res of (process.argv[3] || '1080,1440,4k').split(',')) {
  await p.getByTestId(`export-preset-${res}`).click();
  const t0 = Date.now();
  await p.getByTestId('export-start').click();
  let firstEta = null;
  while (!(await p.getByTestId('export-result').isVisible())) {
    const txt = await p.getByTestId('export-percent').textContent({ timeout: 100 }).catch(() => '');
    const m = /(\d+)% · ETA (\d+)s · (\d+) fps/.exec(txt || '');
    if (m && !firstEta && +m[1] >= 5) firstEta = { at: (Date.now() - t0) / 1000, pct: +m[1], eta: +m[2] };
    if (await p.getByRole('alert').count()) { console.log('FAIL', await p.getByRole('alert').first().innerText()); break; }
    await p.waitForTimeout(500);
  }
  const took = (Date.now() - t0) / 1000;
  console.log(`== ${res}: ${took.toFixed(1)}s; ETA at ${firstEta?.pct}% (t=${firstEta?.at.toFixed(1)}s) predicted finish ${(firstEta ? firstEta.at + firstEta.eta : 0).toFixed(0)}s`);
  console.log((await p.getByTestId('export-result').innerText()).split('\n').slice(0, 7).join(' | '));
  const dl = p.waitForEvent('download');
  await p.getByTestId('export-download').click();
  const d = await dl;
  console.log('file:', d.suggestedFilename());
  await d.saveAs(`${S}/live_${res}.mp4`);
}
console.log('console:', logs.length ? logs.join('\n') : 'clean');
await b.close();
