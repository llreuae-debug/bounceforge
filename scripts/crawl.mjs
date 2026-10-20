/**
 * Live crawl: every route (+ refresh), every header/footer item, every <a href>, all network
 * requests and console messages. Usage: node scripts/crawl.mjs [baseURL]
 */
import { chromium } from '@playwright/test';
const BASE = process.argv[2] || 'http://localhost:4173';
const ROUTES = ['/', '/studio', '/create', '/drops', '/library', '/drop-styles', '/presets', '/export', '/midi', '/my-videos', '/settings', '/faq', '/help', '/credits', '/licenses', '/privacy', '/terms', '/about', '/showcase', '/feedback', '/disclaimer', '/contact', '/pricing', '/account', '/blog', '/blog/how-to-create-viral-bouncing-ball-videos', '/affiliate-terms', '/refunds', '/diagnostics', '/checkout/success', '/checkout/cancelled', '/es/drops', '/this-page-does-not-exist'];
const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } });
const page = await ctx.newPage();
const consoleMsgs = [];
const badRequests = [];
let currentRoute = '';
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') consoleMsgs.push(`${currentRoute} [${m.type()}] ${m.text().slice(0, 220)}`); });
page.on('pageerror', (e) => consoleMsgs.push(`${currentRoute} [pageerror] ${e.message}`));
page.on('response', (r) => { if (r.status() >= 400) badRequests.push(`${currentRoute} ${r.status()} ${r.url()}`); });
page.on('requestfailed', (r) => { const f = r.failure()?.errorText || ''; if (!/ERR_ABORTED/.test(f)) badRequests.push(`${currentRoute} FAILED ${r.url()} ${f}`); });

async function ready() {
  await page.waitForFunction(() => !document.body.innerText.includes('LOADING BOUNCEFORGE') && document.body.innerText.trim().length > 80, null, { timeout: 30000 });
  await page.waitForTimeout(400);
}
const rows = [];
for (const r of ROUTES) {
  currentRoute = r;
  const resp = await page.goto(BASE + r, { waitUntil: 'domcontentloaded' });
  let status = resp?.status() ?? 0;
  let note = '';
  try { await ready(); } catch { note = 'did not render'; }
  const is404 = await page.evaluate(() => /404|not found|page.*doesn.?t exist/i.test(document.querySelector('main, body')?.innerText.slice(0, 600) || ''));
  const title = await page.title();
  // Refresh keeps the route
  const before = page.url();
  await page.reload({ waitUntil: 'domcontentloaded' });
  try { await ready(); } catch { note += ' reload did not render'; }
  if (page.url() !== before) note += ` reload changed URL to ${page.url()}`;
  const expect404 = r === '/this-page-does-not-exist';
  const ok = status === 200 && !note && is404 === expect404;
  rows.push({ source: 'route', element: r, target: page.url().replace(BASE, ''), status: `${status}${is404 ? ' (404 page)' : ''}`, ok, note: `${note} ${title}`.trim() });
}

// Header + footer items (click each, record where it goes)
async function clickAll(fromRoute, selector, label) {
  currentRoute = fromRoute;
  await page.goto(BASE + fromRoute);
  await ready();
  const count = await page.locator(selector).count();
  for (let i = 0; i < count; i++) {
    await page.goto(BASE + fromRoute);
    await ready();
    const el = page.locator(selector).nth(i);
    if (!(await el.isVisible())) continue;
    const text = ((await el.innerText().catch(() => '')) || (await el.getAttribute('aria-label')) || '').replace(/\s+/g, ' ').trim().slice(0, 40);
    const href = await el.getAttribute('href');
    const tgt = await el.getAttribute('target');
    if (tgt === '_blank') {
      const rel = (await el.getAttribute('rel')) || '';
      const res = await page.request.get(new URL(href, BASE).toString()).catch(() => null);
      rows.push({ source: `${fromRoute} ${label}`, element: text || href, target: href, status: `${res?.status() ?? 'ERR'} new tab`, ok: res?.status() === 200 && /noopener/.test(rel), note: rel });
      continue;
    }
    const urlBefore = page.url();
    let opened = '';
    const popup = page.waitForEvent('popup', { timeout: 1500 }).then((p) => { opened = p.url(); p.close(); }).catch(() => {});
    await el.click({ timeout: 5000 }).catch((e) => (opened = 'CLICK FAILED ' + e.message.slice(0, 60)));
    await popup;
    await page.waitForTimeout(700);
    const after = page.url();
    const modal = await page.locator('[role="dialog"], .fixed.inset-0').count();
    const is404 = await page.evaluate(() => /404|not found/i.test(document.querySelector('main, body')?.innerText.slice(0, 400) || ''));
    const effect = opened ? `popup ${opened}` : after !== urlBefore ? after.replace(BASE, '') : modal ? 'opened panel/modal' : 'same page (scroll/toggle)';
    rows.push({ source: `${fromRoute} ${label}`, element: text, target: effect, status: is404 ? '404' : opened.startsWith('CLICK FAILED') ? 'dead' : '200', ok: !is404 && !opened.startsWith('CLICK FAILED'), note: '' });
  }
}
await clickAll('/', 'header button, header a', 'header');
await clickAll('/', 'footer button, footer a', 'footer');
await clickAll('/drops', '[role="tab"]', 'tab');
await clickAll('/drops', '[data-testid^="preset-"]', 'preset');

console.log('| Source | Element | Target | Status | OK |');
console.log('|---|---|---|---|---|');
for (const r of rows) console.log(`| ${r.source} | ${r.element} | ${r.target} | ${r.status} | ${r.ok ? '✅' : '❌ ' + r.note} |`);
const uniq = (a) => [...new Set(a)];
console.log(`\nBAD REQUESTS (${uniq(badRequests).length}):\n` + uniq(badRequests).join('\n'));
console.log(`\nCONSOLE (${uniq(consoleMsgs).length}):\n` + uniq(consoleMsgs).join('\n'));
console.log(`\nSUMMARY: ${rows.filter((r) => r.ok).length}/${rows.length} ok`);
await b.close();
