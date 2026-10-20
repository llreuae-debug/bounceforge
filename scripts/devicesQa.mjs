/** Performance + mobile layout QA. Usage: node scripts/devicesQa.mjs [baseURL] */
import { chromium } from '@playwright/test';
const BASE = process.argv[2] || 'http://localhost:4173';
const b = await chromium.launch({ channel: 'chrome' });
const fpsOf = async (p) => {
  await p.waitForTimeout(4000);
  const txt = await p.getByTestId('debug-overlay').innerText();
  return parseInt(txt, 10);
};
async function perf(label, ctxOpts, throttle) {
  const ctx = await b.newContext(ctxOpts);
  const p = await ctx.newPage();
  if (throttle) {
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  }
  await p.goto(BASE + '/drops?debug=1');
  await p.getByTestId('lib-list').waitFor({ timeout: 120000 });
  await p.getByTestId('tab-style').click();
  await p.getByTestId('style-classic').click();
  await p.getByTestId('ball-count').fill('10');
  await p.getByTestId('trail').check().catch(() => {});
  await p.getByTestId('debug-toggle').click();
  await p.getByTestId('play').click();
  const fps = await fpsOf(p);
  console.log(`${fps >= 50 ? 'PASS' : 'FAIL'} | 5 | Preview fps, 10 balls, ${label} | ${fps} fps`);
  await ctx.close();
}
await perf('laptop 1440×1000', { viewport: { width: 1440, height: 1000 } });
await perf('phone emulation 360×780 DPR2 touch, CPU 4× slower', { viewport: { width: 360, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, 4);

// Mobile layout: 360px, no horizontal scroll, tap targets >= 44px
const ctx = await b.newContext({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
for (const r of ['/', '/drops', '/midi', '/studio', '/credits', '/faq', '/privacy', '/terms', '/pricing', '/my-videos']) {
  await p.goto(BASE + r);
  await p.waitForFunction(() => !document.body.innerText.includes('LOADING BOUNCEFORGE') && document.body.innerText.length > 80, null, { timeout: 60000 });
  await p.waitForTimeout(600);
  const res = await p.evaluate(() => {
    const sw = document.documentElement.scrollWidth;
    const small = [];
    for (const el of document.querySelectorAll('button, a[href], input[type=checkbox], select')) {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (!r.width || !r.height || cs.visibility === 'hidden' || el.closest('[aria-hidden="true"]')) continue;
      const min = el.matches('input[type=checkbox]') ? 22 : 44;
      if (r.height < min - 0.5 || r.width < min - 0.5) small.push(`${el.tagName.toLowerCase()} "${(el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 20)}" ${Math.round(r.width)}×${Math.round(r.height)}`);
    }
    return { sw, small };
  });
  console.log(`${res.sw <= 360 ? 'PASS' : 'FAIL'} | 5 | ${r} at 360px: no horizontal scroll | scrollWidth ${res.sw}`);
  console.log(`${res.small.length === 0 ? 'PASS' : 'FAIL'} | 5 | ${r} tap targets ≥ 44px | ${res.small.length} small ${res.small.slice(0, 4).join('; ')}`);
}
await b.close();
