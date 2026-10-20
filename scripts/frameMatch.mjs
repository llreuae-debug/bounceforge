/** Preview vs export frame identity: render t=20s in the page, export, compare frame 1200 (PSNR). */
import { chromium } from '@playwright/test';
import fs from 'fs';
const BASE = process.argv[2] || 'http://localhost:4173';
const OUT = process.argv[3];
const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const p = await ctx.newPage();
await p.goto(BASE + '/drops?debug=1');
await p.getByTestId('lib-list').waitFor({ timeout: 60000 });
await p.getByTestId('preset-festive_bells').click();
await p.waitForTimeout(500);
// Render the reference frame with the page's own renderer module (via a hidden export-identical path)
const ref = await p.evaluate(async () => {
  const { scene, impacts } = window.__dropStudio;
  const c = new OffscreenCanvas(1080, 1920);
  const r3d = new window.__dropStudio.DropRenderer3D(new OffscreenCanvas(1080, 1920), 1080, 1920, { shadowSize: 1536, maxCached: 2 });
  const ctx = c.getContext('2d', { alpha: false });
  r3d.composite(ctx, scene, 20, { material: 'metal', palette: 'gold', trail: true, camera: 'follow', syncCheck: false, watermark: true, beats: impacts.beats, impacts: impacts.t });
  const blob = await c.convertToBlob({ type: 'image/png' });
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
});
fs.writeFileSync(`${OUT}/ref_t20.png`, Buffer.from(ref, 'base64'));
await p.getByTestId('tab-export').click();
await p.getByTestId('export-preset-1080').click();
await p.getByTestId('export-start').click();
await p.getByTestId('export-result').waitFor({ timeout: 600000 });
const dl = p.waitForEvent('download');
await p.getByTestId('export-download').click();
await (await dl).saveAs(`${OUT}/match_1080.mp4`);
await b.close();
