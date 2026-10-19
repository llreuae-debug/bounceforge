/**
 * MIDI → reel pipeline tests (headless): parsing, analysis, planning, physics timing.
 * Also writes the fixture .mid files used by the browser e2e test.
 */
import fs from 'fs';
import path from 'path';
import { analyzeMidi, MidiParseError } from '../src/midi/analyzeMidi';
import { buildReelPlan, defaultReelOptions } from '../src/midi/reelPlan';
import { dryRunReel } from '../src/midi/reelSimulation';
import { BUILTIN_MIDI_TRACKS, buildBuiltinMidi } from '../src/midi/builtinMidi';
import { DEFAULT_PHYSICS } from '../src/midi/types';
import { denseMidi, grooveMidi, malformedFiles, missingInstrumentMidi, silentMidi, tempoChangeMidi } from './midiFixtures';

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  if (ok) {
    passed++;
    console.log(`  ✅ ${name}${detail ? ` (${detail})` : ''}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}${detail ? ` (${detail})` : ''}`);
  }
}

const fixtureDir = path.resolve('tests/fixtures');
fs.mkdirSync(fixtureDir, { recursive: true });
const write = (name: string, bytes: Uint8Array) => fs.writeFileSync(path.join(fixtureDir, name), bytes);

function runReel(label: string, bytes: Uint8Array, target = 30) {
  const analysis = analyzeMidi(bytes, `${label}.mid`);
  const opts = { ...defaultReelOptions(analysis), targetDuration: target };
  const plan = buildReelPlan(analysis, opts);
  const dry = dryRunReel(plan, DEFAULT_PHYSICS, 1337);
  return { analysis, plan, dry };
}

console.log('\n--- 1. Groove with drums (120 BPM, 16 bars) ---');
{
  const bytes = grooveMidi(16, 120);
  write('groove.mid', bytes);
  const { analysis, plan, dry } = runReel('groove', bytes, 30);
  check('BPM detected as 120', Math.abs(analysis.bpm - 120) < 0.01, `${analysis.bpm}`);
  check('Time signature 4/4', analysis.timeSignature.join('/') === '4/4');
  check('Beat grid every 0.5s', Math.abs(analysis.beats[1].time - analysis.beats[0].time - 0.5) < 1e-6);
  check('Percussion detected (channel 10)', analysis.hasPercussion);
  check('Kicks and snares recognised', analysis.notes.some((n) => n.role === 'kick') && analysis.notes.some((n) => n.role === 'snare'));
  check('Heavy drops on kicks', plan.drops.some((d) => d.kind === 'heavy'));
  check('Accent drops on snares', plan.drops.some((d) => d.kind === 'accent'));
  const a = dry.alignment;
  check('Every planned drop hits its target', a.landed === a.total, `${a.landed}/${a.total}`);
  check('Impacts land within one frame of the music', a.withinOneFrame === a.landed, `max ${a.maxErrorMs.toFixed(1)}ms, mean ${a.meanErrorMs.toFixed(1)}ms`);
  const kickTimes = analysis.notes.filter((n) => n.role === 'kick' && n.time < 30).map((n) => n.time);
  const heavyImpacts = dry.impacts.filter((i) => i.kind === 'heavy');
  const kicksHit = kickTimes.filter((k) => heavyImpacts.some((i) => Math.abs(i.actual - k) < 1 / 60)).length;
  check('Major drops align with kick beats', kicksHit >= kickTimes.length * 0.95, `${kicksHit}/${kickTimes.length} kicks`);
  check('Physics produces follow-up collisions (pegs, ramps, spinner)', dry.collisions > plan.drops.length, `${dry.collisions} collisions`);
  // Export renders at 30fps by default: physics steps differ, timing must still hold
  const dry30 = dryRunReel(plan, DEFAULT_PHYSICS, 1337, undefined, 30);
  const e30 = dry30.impacts.map((i) => Math.abs(i.actual - i.planned) * 1000);
  check('30fps export timing: every drop within one frame (33ms)', dry30.alignment.landed === dry30.alignment.total && e30.every((e) => e <= 1000 / 30), `max ${Math.max(...e30).toFixed(1)}ms`);
  // Custom physics (heavier gravity, faster sim, bigger balls) keeps impacts on time
  const custom = { ...DEFAULT_PHYSICS, gravity: 1.6, simSpeed: 1.4, ballScale: 1.4, bounce: 0.9 };
  const dryC = dryRunReel(plan, custom, 7);
  check('Custom physics keeps impacts on time', dryC.alignment.withinOneFrame >= dryC.alignment.landed * 0.97 && dryC.alignment.landed > 0, `${dryC.alignment.withinOneFrame}/${dryC.alignment.landed}`);
}

console.log('\n--- 2. Tempo change (100 → 140 BPM) ---');
{
  const bytes = tempoChangeMidi();
  write('tempo-change.mid', bytes);
  const { analysis, dry } = runReel('tempo', bytes, 20);
  check('Two tempos found', analysis.tempoChanges.length === 2, analysis.tempoChanges.map((t) => t.bpm.toFixed(0)).join(' → '));
  const early = analysis.beats[1].time - analysis.beats[0].time;
  const lateBeat = analysis.beats.find((b) => b.time > analysis.tempoChanges[1].time + 0.1)!;
  const idx = analysis.beats.indexOf(lateBeat);
  const late = analysis.beats[idx + 1].time - lateBeat.time;
  check('Beat spacing follows the tempo map', Math.abs(early - 0.6) < 1e-3 && Math.abs(late - 60 / 140) < 1e-3, `${early.toFixed(3)}s → ${late.toFixed(3)}s`);
  check('Notes after the change are on beats', analysis.notes.filter((n) => n.time > 10).every((n) => n.onBeat));
  check('Impacts still land on time', dry.alignment.withinOneFrame === dry.alignment.landed && dry.alignment.landed > 0, `max ${dry.alignment.maxErrorMs.toFixed(1)}ms`);
}

console.log('\n--- 3. Silent MIDI ---');
{
  const bytes = silentMidi();
  write('silent.mid', bytes);
  const { analysis, plan, dry } = runReel('silent', bytes, 15);
  check('No notes found', analysis.notes.length === 0);
  check('User is told the file is silent', analysis.warnings.some((w) => /silent/i.test(w)));
  check('Animation still follows the tempo grid', plan.drops.length > 0 && plan.drops.every((d) => d.kind === 'pulse'), `${plan.drops.length} beat drops`);
  check('Beat drops land on time', dry.alignment.withinOneFrame === dry.alignment.landed && dry.alignment.landed > 0);
}

console.log('\n--- 4. Unusually dense MIDI ---');
{
  const bytes = denseMidi();
  write('dense.mid', bytes);
  const t0 = Date.now();
  const { analysis, plan, dry } = runReel('dense', bytes, 30);
  const ms = Date.now() - t0;
  const density = analysis.notes.length / analysis.duration;
  check('Dense file parsed', density > 40, `${density.toFixed(0)} notes/s`);
  check('User is told drops are thinned', analysis.warnings.some((w) => /dense/i.test(w)));
  const perSec = plan.drops.length / plan.duration;
  check('Drops capped to a readable rate', perSec <= 8.5, `${perSec.toFixed(1)} drops/s`);
  check('Fast runs detected', analysis.notes.some((n) => n.inRun));
  check('Impacts land on time under load', dry.alignment.withinOneFrame >= dry.alignment.landed * 0.97, `${dry.alignment.withinOneFrame}/${dry.alignment.landed}, max ${dry.alignment.maxErrorMs.toFixed(1)}ms`);
  check('Analysis + plan + 30s dry run stays fast', ms < 8000, `${ms}ms`);
}

console.log('\n--- 5. Instrument without a matching sound ---');
{
  const bytes = missingInstrumentMidi();
  write('missing-instrument.mid', bytes);
  const { analysis } = runReel('missing', bytes, 10);
  const t = analysis.tracks.find((tr) => tr.noteCount > 0)!;
  check('Fallback sound chosen', !!t.synth && !!t.fallbackNote, t.fallbackNote || '');
  check('Fallback explained to the user', analysis.warnings.some((w) => w.includes(t.name)));
}

console.log('\n--- 6. Malformed files ---');
for (const f of malformedFiles()) {
  write(f.name, f.bytes);
  let err: any = null;
  try {
    analyzeMidi(f.bytes, f.name);
  } catch (e) {
    err = e;
  }
  check(`${f.name} rejected with a clear message`, err instanceof MidiParseError && err.message.length > 10, err?.message?.slice(0, 70));
}

console.log('\n--- 7. Loop / extend / shorten / trim ---');
{
  const analysis = analyzeMidi(grooveMidi(4, 120), 'short.mid'); // 8s of music
  const base = defaultReelOptions(analysis);
  const loop = buildReelPlan(analysis, { ...base, targetDuration: 30, fitMode: 'loop' });
  const extend = buildReelPlan(analysis, { ...base, targetDuration: 30, fitMode: 'extend' });
  const shorten = buildReelPlan(analysis, { ...base, targetDuration: 30, fitMode: 'shorten' });
  check('Loop fills the reel', loop.duration === 30 && loop.notes[loop.notes.length - 1].time > 24, `${loop.notes.length} notes`);
  check('Extend varies the repeats', extend.notes.some((n, i) => !n.isDrum && n.midi !== loop.notes[i]?.midi));
  check('Shorten matches the music length', Math.abs(shorten.duration - analysis.duration) < 0.6, `${shorten.duration.toFixed(2)}s`);
  const long = analyzeMidi(grooveMidi(40, 120), 'long.mid'); // 80s of music
  const trimmed = buildReelPlan(long, { ...defaultReelOptions(long), sectionStart: 20, sectionEnd: 80, targetDuration: 30 });
  check('Long music is trimmed to the reel', trimmed.duration === 30 && trimmed.notes.every((n) => n.time < 30) && trimmed.sourceStart === 20);
}

console.log('\n--- 8. Built-in tracks ---');
for (const t of BUILTIN_MIDI_TRACKS) {
  const built = buildBuiltinMidi(t.id);
  const { analysis, dry } = runReel(t.id, built.bytes, 20);
  check(`${t.name}: valid MIDI, ${analysis.tracks.length} tracks, ${analysis.bpm.toFixed(0)} BPM`, analysis.notes.length > 20 && (!t.withDrums || analysis.hasPercussion));
  check(`${t.name}: impacts on time`, dry.alignment.withinOneFrame >= dry.alignment.landed * 0.97 && dry.alignment.landed > 0, `${dry.alignment.withinOneFrame}/${dry.alignment.landed}, max ${dry.alignment.maxErrorMs.toFixed(1)}ms`);
}

console.log(`\nMIDI REEL TESTS: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
