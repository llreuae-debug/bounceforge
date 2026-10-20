/** Music QC in a real browser (needs the Vite dev server on :5199). */
import { chromium } from '@playwright/test';
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage();
p.on('pageerror', (e) => console.log('PAGEERR', e.message));
await p.goto('http://localhost:5199/drops');
await p.waitForTimeout(3000);
const r = await p.evaluate(async () => {
  const A = await import('/src/dropstudio/audio.ts');
  const C = await import('/src/dropstudio/library/compile.ts');
  const Sy = await import('/src/dropstudio/sync.ts');
  const out = { decay: {}, drone: {}, determinism: {}, fx: { ...A.FX, defaults: { reverb: A.DEFAULT_MIX.reverb, echo: A.DEFAULT_MIX.echo } } };
  const db = (x) => 20 * Math.log10(Math.max(1e-9, x));
  const rmsAt = (d, a, b) => { let s = 0; for (let i = a; i < b; i++) s += d[i] * d[i]; return Math.sqrt(s / Math.max(1, b - a)); };
  // 1. Every voice: level 1.5s after note-off vs its peak
  const mix = { ...A.DEFAULT_MIX, reverb: true, echo: true }; // worst case: effects on
  for (const inst of ['piano', 'marimba', 'musicBox', 'glassBells', 'synthPluck', 'harp', 'eightBit']) {
    for (const lead of [true, false]) {
      const ev = [{ t: 0.5, kind: 'note', midi: 60, dur: 2.5, vel: 1, lead, tier: 0, pan: 0 }];
      const buf = await A.renderDropAudio({ events: ev, instrument: inst, duration: 6 }, mix);
      const d = buf.getChannelData(0);
      let pk = 0; for (const x of d) pk = Math.max(pk, Math.abs(x));
      const off = 0.5 + 2.5;
      const tail = rmsAt(d, Math.round((off + 1.5) * 48000), Math.round((off + 1.6) * 48000));
      out.decay[`${inst}${lead ? '' : ' (acc)'}`] = +(db(tail) - db(pk)).toFixed(1);
    }
  }
  for (const tier of [1, 2, 3]) {
    const ev = [{ t: 0.5, kind: 'impact', midi: tier === 1 ? 36 : 84, dur: 0.25, vel: 1, lead: false, tier, pan: 0 }];
    const buf = await A.renderDropAudio({ events: ev, instrument: 'piano', duration: 4 }, mix);
    const d = buf.getChannelData(0); let pk = 0; for (const x of d) pk = Math.max(pk, Math.abs(x));
    const off = 0.5 + (tier === 1 ? 0.6 : 0.2);
    out.decay[`impact tier ${tier}`] = +(db(rmsAt(d, Math.round((off + 1.5) * 48000), Math.round((off + 1.6) * 48000))) - db(pk)).toFixed(1);
  }
  // 2. Drone check: is any frequency bin loud in (nearly) every 0.5s window of a full reel?
  for (const song of ['moonlight_sonata', 'jingle_bells', 'clair_de_lune']) {
    const tr = C.libraryTrack(song);
    const imp = Sy.computeImpacts(tr, Sy.DEFAULT_SYNC);
    const events = A.buildAudioEvents(tr, imp, 'beat', null);
    const buf = await A.renderDropAudio({ events, instrument: tr.instrument, duration: 60 }, A.DEFAULT_MIX);
    const d = buf.getChannelData(0);
    const N = 4096, win = 24000, frames = Math.floor(d.length / win);
    const active = new Float32Array(N / 2);
    for (let f = 0; f < frames; f++) {
      const re = new Float32Array(N), im = new Float32Array(N);
      for (let i = 0; i < N; i++) re[i] = d[f * win + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
      // naive DFT on a coarse set of bins (40Hz..2kHz) is enough to spot a drone
      for (let k = 4; k < 180; k++) {
        let sr = 0, si = 0;
        for (let i = 0; i < N; i += 2) { const a = (2 * Math.PI * k * i) / N; sr += re[i] * Math.cos(a); si -= re[i] * Math.sin(a); }
        const mag = Math.hypot(sr, si);
        if (mag > 0.5) active[k]++;
      }
    }
    let worst = 0, wk = 0; for (let k = 4; k < 180; k++) if (active[k] > worst) { worst = active[k]; wk = k; }
    out.drone[song] = `busiest bin ${(wk * 48000 / N).toFixed(0)}Hz active in ${(100 * worst / frames).toFixed(0)}% of windows`;
  }
  // 3. Same song rendered 3 times: identical
  {
    const tr = C.libraryTrack('ode_to_joy');
    const bufs = [];
    for (let k = 0; k < 3; k++) {
      const imp = Sy.computeImpacts(tr, Sy.DEFAULT_SYNC);
      const events = A.buildAudioEvents(tr, imp, 'beat', null);
      bufs.push(await A.renderDropAudio({ events, instrument: 'piano', duration: 60 }, A.DEFAULT_MIX));
    }
    let maxDiff = 0;
    const a = bufs[0].getChannelData(0);
    for (const bb of bufs.slice(1)) { const c = bb.getChannelData(0); for (let i = 0; i < a.length; i++) maxDiff = Math.max(maxDiff, Math.abs(a[i] - c[i])); }
    out.determinism = { renders: 3, maxSampleDifference: maxDiff };
  }
  return out;
});
console.log(JSON.stringify(r, null, 1));
await b.close();
