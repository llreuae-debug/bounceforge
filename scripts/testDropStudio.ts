/**
 * Drop Studio tests (headless): copyright rules, library integrity, beat-sync accuracy for every
 * song × style × mode, generation speed, determinism, uploads and audio beat analysis.
 */
import credits from '../src/dropstudio/library/credits.json';
import { LIBRARY_SONGS, ORIGINAL_SONGS, PUBLIC_DOMAIN_SONGS } from '../src/dropstudio/library/songs';
import { compileSong, libraryTrack, songLaneLengths } from '../src/dropstudio/library/compile';
import { computeImpacts, DEFAULT_SYNC, type SyncMode } from '../src/dropstudio/sync';
import { buildScene, DEFAULT_STYLE_OPTIONS, STYLES } from '../src/dropstudio/styles';
import { ballAt, SEG, type Scene } from '../src/dropstudio/scene';
import { maxSyncErrorFrames } from '../src/dropstudio/render';
import { VIRAL_PRESETS, videoDescription } from '../src/dropstudio/presets';
import { analyzeAudioPCM } from '../src/dropstudio/audioAnalysis';
import { midiToTrack } from '../src/dropstudio/uploads';
import { analyzeMidi } from '../src/midi/analyzeMidi';
import { grooveMidi } from './midiFixtures';
import type { TrackCredit } from '../src/dropstudio/track';
import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  if (ok) passed++;
  else failed++;
  console.log(`  ${ok ? '✅' : '❌'} ${name}${detail ? ` (${detail})` : ''}`);
}

const YEAR = new Date().getFullYear();
const C = credits as TrackCredit[];

console.log('\n--- 1. Copyright rules ---');
{
  check('41 built-in songs (29 public domain + 12 originals)', PUBLIC_DOMAIN_SONGS.length === 29 && ORIGINAL_SONGS.length === 12);
  const ids = new Set(LIBRARY_SONGS.map((s) => s.id));
  check('Every song has a credits.json entry', LIBRARY_SONGS.every((s) => C.some((c) => c.id === s.id)), `${C.length} credits`);
  check('No credit without a song', C.every((c) => ids.has(c.id)));
  const pdBad = C.filter((c) => c.status === 'Public Domain').filter((c) => {
    if (c.composerDeathYear !== null) return c.composerDeathYear > YEAR - 100;
    const pub = (c.basis || '').match(/first published (\d{4})/);
    return !pub || parseInt(pub[1], 10) > YEAR - 100;
  });
  check(`Public-domain composers died ${YEAR - 100} or earlier (or tune first published then)`, pdBad.length === 0, pdBad.map((c) => c.id).join(', '));
  check('Originals are marked Original and credited to BounceForge', C.filter((c) => c.status === 'Original').every((c) => c.composer === 'BounceForge' && c.id.startsWith('bf_')));
  check('Every credit names who sequenced it and the sound license', C.every((c) => c.sequencedBy.length > 10 && /no samples/i.test(c.soundfont)));
  const banned = /mario|pirate|hedwig|potter|zelda|tetris|minecraft|pokemon|star wars|eilish|imagine dragons|crazy frog|money heist|astronomia|undertale|megalovania|astley|interstellar|in the style of|remix|cover/i;
  check('No modern song / artist / film / game names in the library or presets', ![...LIBRARY_SONGS.map((s) => s.title), ...VIRAL_PRESETS.map((p) => p.name)].some((n) => banned.test(n)));
  check('Every library track compiles as Copyright Safe', LIBRARY_SONGS.every((s) => compileSong(s).copyrightSafe));
  check('Every viral preset uses a built-in song', VIRAL_PRESETS.every((p) => ids.has(p.songId)));
  const d = videoDescription(libraryTrack('moonlight_sonata'), 'Classic Drop');
  check('Description auto-credits public-domain music', d.includes('Music: Moonlight Sonata (1st movement) — Ludwig van Beethoven (Public Domain)'));
}

console.log('\n--- 2. Library integrity ---');
for (const s of LIBRARY_SONGS) {
  const L = songLaneLengths(s);
  const whole = (x: number) => Math.abs(x / s.beatsPerBar - Math.round(x / s.beatsPerBar)) < 1e-6;
  const t = compileSong(s);
  const ok = whole(L.melody) && (L.acc === null || Math.abs(L.acc - L.melody) < 1e-6) && whole(L.intro) && t.duration === 60 && t.notes.length > 20 && t.beats.length > 20;
  if (!ok) check(`${s.title}: whole bars, accompaniment aligned, 60s reel`, false, `melody ${L.melody}, acc ${L.acc}, intro ${L.intro}`);
  else passed++;
}
console.log(`  ✅ ${LIBRARY_SONGS.length} songs parse, fill whole bars, align melody/accompaniment and loop to 60s`);

console.log('\n--- 3. Beat sync: every impact within ±1 frame (all songs × styles × modes) ---');
const out = new Float64Array(4);
function continuity(s: Scene): number {
  let jumps = 0;
  const parts = s.parts ? s.parts.map((p) => p.scene) : [s];
  for (const sc of parts) {
    for (let b = 0; b < sc.ballR.length; b++) {
      for (let k = sc.ballSeg0[b]; k + 1 < sc.ballSeg1[b]; k++) {
        const tEnd = sc.segs[k * SEG + 2];
        const tNext = sc.segs[(k + 1) * SEG + 1];
        if (Math.abs(tNext - tEnd) > 1e-6) continue;
        ballAt(sc, b, tEnd - 1e-7, out);
        const ax = out[0];
        const ay = out[1];
        ballAt(sc, b, tEnd + 1e-7, out);
        if (Math.hypot(out[0] - ax, out[1] - ay) > 3) jumps++;
      }
    }
  }
  return jumps;
}
{
  let combos = 0;
  let worst = 0;
  let worstMs = 0;
  let missing = 0;
  let jumps = 0;
  const failures: string[] = [];
  for (const song of LIBRARY_SONGS) {
    const track = libraryTrack(song.id);
    for (const mode of ['note', 'beat', 'major', 'veryslow'] as SyncMode[]) {
      const imp = computeImpacts(track, { ...DEFAULT_SYNC, mode, freezeFrames: mode === 'beat' ? 3 : 0 });
      for (const st of STYLES) {
        const t0 = performance.now();
        const scene = buildScene(st.id, imp, { ...DEFAULT_STYLE_OPTIONS, ballCount: 3, freezeFrames: mode === 'beat' ? 3 : 0 }, track);
        worstMs = Math.max(worstMs, performance.now() - t0);
        const err = maxSyncErrorFrames(scene, imp.t);
        const parts = scene.parts ? scene.parts.map((p) => p.scene) : [scene];
        const covered = new Set<number>();
        for (const sc of parts) for (let h = 0; h < sc.hitImpact.length; h++) if (sc.hitImpact[h] >= 0) covered.add(sc.hitImpact[h]);
        const miss = imp.t.length - covered.size;
        const j = continuity(scene);
        combos++;
        worst = Math.max(worst, err);
        missing += miss;
        jumps += j;
        if (err > 1 || miss || j) failures.push(`${song.id}/${mode}/${st.id}: err ${err.toFixed(2)}f miss ${miss} jumps ${j}`);
      }
    }
  }
  check(`${combos} combinations: every impact has a contact keyframe`, missing === 0, `${missing} missing`);
  check('Every impact lands within ±1 frame at 60fps', worst <= 1, `worst ${worst.toFixed(4)} frames`);
  check('Balls never teleport between keyframes', jumps === 0, `${jumps} jumps`);
  check('Scene generation under 1s (worst case)', worstMs < 1000, `worst ${worstMs.toFixed(1)} ms`);
  if (failures.length) console.log('    ' + failures.slice(0, 8).join('\n    '));
}

console.log('\n--- 4. Determinism, offsets, edits ---');
{
  const track = libraryTrack('mountain_king');
  const a = buildScene('split', computeImpacts(track, DEFAULT_SYNC), DEFAULT_STYLE_OPTIONS, track);
  const b = buildScene('split', computeImpacts(track, DEFAULT_SYNC), DEFAULT_STYLE_OPTIONS, track);
  check('Same settings → identical keyframes (seeded)', a.segs.length === b.segs.length && a.segs.every((v, i) => v === b.segs[i]));
  const base = computeImpacts(track, DEFAULT_SYNC);
  const shifted = computeImpacts(track, { ...DEFAULT_SYNC, offsetMs: 120 });
  const mid = Math.floor(base.t.length / 2);
  check('Sync offset shifts impacts by exactly the offset', Math.abs(shifted.t[mid] - base.t[mid] - 0.12) < 1e-9 || Math.abs(shifted.t[mid + 1] - base.t[mid] - 0.12) < 1e-9);
  const edited = [...track.beats];
  edited.splice(10, 1);
  edited[20] += 0.1;
  const e = computeImpacts(track, { ...DEFAULT_SYNC, beatOverride: edited });
  check('Edited beat markers drive the impacts', e.t.some((t) => Math.abs(t - edited[20]) < 1e-9) && e.beats.length === track.beats.length - 1);
  const slow = computeImpacts(libraryTrack('flight_bumblebee'), { ...DEFAULT_SYNC, mode: 'veryslow' });
  const gaps = Array.from(slow.t).slice(1).map((t, i) => t - slow.t[i]);
  check('Very Slow groups fast runs into readable drops', Math.min(...gaps) >= 0.25, `min gap ${Math.min(...gaps).toFixed(2)}s, ${slow.t.length} drops`);
  const freqs = (['beat', '2beats', 'bar', '2bars', 'major'] as const).map((f) => Array.from(computeImpacts(libraryTrack('ode_to_joy'), { ...DEFAULT_SYNC, frequency: f }).tier).filter((x) => x === 1).length);
  check('Drop Frequency controls how many major drops there are', freqs[0] > freqs[1] && freqs[1] > freqs[2] && freqs[2] > freqs[3] && freqs[4] > 0, freqs.join(' > '));
}

console.log('\n--- 5. Uploads ---');
{
  const a = analyzeMidi(grooveMidi(8, 120), 'groove.mid');
  const t = midiToTrack(a);
  check('Uploaded MIDI: notes and beats read straight from the file', t.beats.length > 100 && t.notes.length > 100 && Math.abs(t.beats[1] - t.beats[0] - 0.5) < 1e-6);
  check('Uploaded MIDI loops to fill 60s', t.duration === 60 && t.notes[t.notes.length - 1].t > 50);
  check('Uploaded tracks are never Copyright Safe', !t.copyrightSafe);

  // Synthetic recording: kick on every beat (louder on the downbeat) + noise, 22.05kHz
  for (const bpm of [96, 120, 140]) {
    const sr = 22050;
    const dur = 20;
    const pcm = new Float32Array(sr * dur);
    let seed = 1;
    for (let i = 0; i < pcm.length; i++) {
      seed = (seed * 16807) % 2147483647;
      pcm[i] = ((seed / 2147483647) * 2 - 1) * 0.02;
    }
    const beat = 60 / bpm;
    for (let k = 0; k * beat < dur; k++) {
      const s0 = Math.round(k * beat * sr);
      const amp = k % 4 === 0 ? 0.9 : 0.5;
      for (let i = 0; i < 0.12 * sr && s0 + i < pcm.length; i++) pcm[s0 + i] += amp * Math.sin((2 * Math.PI * 60 * i) / sr) * Math.exp(-i / (0.03 * sr));
    }
    const r = analyzeAudioPCM(pcm, sr);
    const beatErr = r.beats.slice(2, -2).map((t) => {
      const k = Math.round(t / beat);
      return Math.abs(t - k * beat);
    });
    const meanErr = beatErr.reduce((x, y) => x + y, 0) / beatErr.length;
    check(`Audio analysis: ${bpm} BPM click track`, Math.abs(r.bpm - bpm) < 2 && meanErr < 0.03, `found ${r.bpm.toFixed(1)} BPM, beats off by ${(meanErr * 1000).toFixed(0)}ms, ${r.analysisMs.toFixed(0)}ms for ${dur}s`);
  }
}

// Fixture for the browser test: a 20s, 120 BPM kick track as a 16-bit mono WAV
{
  const sr = 44100;
  const n = sr * 20;
  const pcm = new Int16Array(n);
  for (let k = 0; k * 0.5 < 20; k++) {
    const s0 = Math.round(k * 0.5 * sr);
    const amp = k % 4 === 0 ? 0.9 : 0.55;
    for (let i = 0; i < 0.15 * sr && s0 + i < n; i++) pcm[s0 + i] += Math.round(32767 * amp * Math.sin((2 * Math.PI * 70 * i) / sr) * Math.exp(-i / (0.035 * sr)));
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + n * 2, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sr, 24);
  header.writeUInt32LE(sr * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(n * 2, 40);
  fs.mkdirSync(path.resolve('tests/fixtures'), { recursive: true });
  fs.writeFileSync(path.resolve('tests/fixtures/click120.wav'), Buffer.concat([header, Buffer.from(pcm.buffer)]));
}

console.log(`\nDROP STUDIO TESTS: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
