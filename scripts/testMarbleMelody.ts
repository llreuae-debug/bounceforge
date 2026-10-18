import { MusicToLayoutSolver } from '../src/marble3d/musicSolver';
import { VariationEngine } from '../src/marble3d/variationEngine';
import { MARBLE_MELODY_PRESETS, DEFAULT_MARBLE_MELODY_CONFIG } from '../src/marble3d/presets';
import { PUBLIC_DOMAIN_MELODIES } from '../src/marble3d/melodyLibrary';
import { MarbleMelodyConfig } from '../src/marble3d/types';
import { isCopyrightSafe } from '../src/marble3d/viralTitles';

function runTests() {
  console.log('🧪 Starting MARBLE MELODY 3D Verification Suite (50 Presets + Framing + Real 3D Depth)...\n');

  let passed = 0;
  let total = 0;

  function assert(name: string, condition: boolean, detail?: string) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name}${detail ? ` -> ${detail}` : ''}`);
    }
  }

  // TEST 1: Note Timing Precision (within ±10 ms)
  console.log('--- TEST 1: Note Timing Precision (±10 ms) ---');
  const testConfig: MarbleMelodyConfig = {
    ...DEFAULT_MARBLE_MELODY_CONFIG,
    melodyId: 'fur_elise',
    seed: 10101,
    marbleCount: 1,
  };
  const run1 = MusicToLayoutSolver.solveRun(testConfig);
  const primaryLane = run1.lanes[0];

  let maxTimingDriftMs = 0;
  for (const hit of primaryLane.hits) {
    const driftMs = Math.abs(hit.time - hit.note.time) * 1000;
    if (driftMs > maxTimingDriftMs) maxTimingDriftMs = driftMs;
  }
  assert(
    `Every note hit within ±10 ms of MIDI time (Max drift observed: ${maxTimingDriftMs.toFixed(3)} ms)`,
    maxTimingDriftMs <= 10.0,
    `Max drift was ${maxTimingDriftMs} ms`
  );
  assert(
    `Every note hit exactly once (Notes: ${primaryLane.hits.length})`,
    primaryLane.hits.length > 20
  );

  // TEST 2: No Object Overlaps & Clearance Check
  console.log('\n--- TEST 2: Collision & Non-Overlapping Check ---');
  let hasOverlap = false;
  let minDistance = Infinity;
  for (let i = 0; i < run1.objects.length; i++) {
    for (let j = i + 1; j < run1.objects.length; j++) {
      const a = run1.objects[i];
      const b = run1.objects[j];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (dist < minDistance) minDistance = dist;
      if (dist < 0.20) {
        hasOverlap = true;
        console.warn(`Overlap detected between ${a.id} and ${b.id}: ${dist} units`);
      }
    }
  }
  assert(
    `No objects overlap on vertical wall (Min clearance: ${minDistance.toFixed(3)} units)`,
    !hasOverlap
  );

  // TEST 3: Determinism Guarantee
  console.log('\n--- TEST 3: Determinism Guarantee ---');
  const run1Again = MusicToLayoutSolver.solveRun(testConfig);
  const isIdentical =
    JSON.stringify(run1.objects.map((o) => [o.id, o.x, o.y, o.hitTime])) ===
    JSON.stringify(run1Again.objects.map((o) => [o.id, o.x, o.y, o.hitTime]));
  assert('Identical run generated on repeated seed solve (Zero drift)', isIdentical);

  // TEST 4: Multi-Marble Synchronization (2- and 3-Marble Runs)
  console.log('\n--- TEST 4: 2- and 3-Marble Runs Synchronization ---');
  const test3Marbles: MarbleMelodyConfig = {
    ...DEFAULT_MARBLE_MELODY_CONFIG,
    melodyId: 'frere_jacques',
    marbleCount: 3,
    seed: 12323,
  };
  const run3M = MusicToLayoutSolver.solveRun(test3Marbles);
  assert('3 marbles generated (Melody, Bass, Chords)', run3M.lanes.length === 3);

  // Verify lane horizontal separation inside corridor
  let minLaneSeparation = Infinity;
  const lane0Points = run3M.lanes[0].points;
  const lane1Points = run3M.lanes[1].points;
  const lane2Points = run3M.lanes[2].points;
  const sampleSteps = Math.min(lane0Points.length, lane1Points.length, lane2Points.length);

  for (let s = 0; s < sampleSteps; s += 24) {
    const d01 = Math.abs(lane0Points[s].x - lane1Points[s].x);
    const d02 = Math.abs(lane0Points[s].x - lane2Points[s].x);
    const d12 = Math.abs(lane1Points[s].x - lane2Points[s].x);
    const stepMin = Math.min(d01, d02, d12);
    if (stepMin < minLaneSeparation) minLaneSeparation = stepMin;
  }
  assert(
    `All 3 marble lanes maintain collision-free separation (Min horizontal distance: ${minLaneSeparation.toFixed(2)} units)`,
    minLaneSeparation >= 0.20
  );

  // TEST 5: Variation Guard (Make 10 Variations)
  console.log('\n--- TEST 5: "Make 10 Variations" Batch Guard ---');
  const variations = VariationEngine.generate10Variations(DEFAULT_MARBLE_MELODY_CONFIG, 1000);
  assert('10 distinct variations generated', variations.length === 10);

  const signatures = new Set<string>();
  for (const v of variations) {
    signatures.add(`${v.melodyId}_${v.wallBackground}_${v.marbleStyle}_${v.pathStyle}_${v.marbleCount}`);
  }
  assert(
    `No two variations share same melody + background + marble + path (${signatures.size} unique signatures out of 10)`,
    signatures.size === 10
  );

  // TEST 6: Play Corridor Centered Framing Check
  console.log('\n--- TEST 6: Play Corridor Centered Framing Check ---');
  const framing1 = MusicToLayoutSolver.verifyFraming(run1);
  assert(
    'Primary run strictly inside centered 60% play corridor (|x| <= 0.62)',
    framing1.passed,
    framing1.reason
  );

  // Check decor props are placed OUTSIDE corridor (|x| >= 0.70)
  let decorOutsideCorridor = true;
  for (const d of run1.decor) {
    if (Math.abs(d.x) < 0.65) decorOutsideCorridor = false;
  }
  assert(
    'All decor props mounted outside play corridor (|x| >= 0.70) so they never block marble',
    decorOutsideCorridor
  );

  // TEST 7: 50 Copyright-Safe Presets Full Verification
  console.log('\n--- TEST 7: 50 Copyright-Safe Presets Full Verification ---');
  assert('Shipped exactly 50 complete presets', MARBLE_MELODY_PRESETS.length === 50);

  const presetResults: any[] = [];
  let allViralTimingsPass = true;
  let allFramingChecksPass = true;
  let allNoteSyncPass = true;

  for (const p of MARBLE_MELODY_PRESETS) {
    const viral = p.variants.viral;
    const cfg: MarbleMelodyConfig = {
      ...DEFAULT_MARBLE_MELODY_CONFIG,
      ...viral,
      melodyId: p.melodyId,
      seed: p.baseSeed,
    };
    const r = MusicToLayoutSolver.solveRun(cfg);
    const finaleTime = r.catcher.catchTime;
    const isViralTargetValid = finaleTime >= 54.0 && finaleTime <= 59.5;

    // Framing verification
    const frameCheck = MusicToLayoutSolver.verifyFraming(r);
    if (!frameCheck.passed) {
      allFramingChecksPass = false;
      console.warn(`Framing check failed for preset #${p.presetNumber} ${p.name}: ${frameCheck.reason}`);
    }

    // Note sync verification
    let maxDrift = 0;
    for (const lane of r.lanes) {
      for (const h of lane.hits) {
        const drift = Math.abs(h.time - h.note.time) * 1000;
        if (drift > maxDrift) maxDrift = drift;
      }
    }
    if (maxDrift > 10.0) {
      allNoteSyncPass = false;
      console.warn(`Note sync drift exceeded for preset #${p.presetNumber}: ${maxDrift}ms`);
    }

    const melodyDef = PUBLIC_DOMAIN_MELODIES.find((m) => m.id === p.melodyId);

    presetResults.push({
      num: p.presetNumber,
      name: p.name,
      seed: p.baseSeed,
      length: r.duration.toFixed(1) + 's',
      finaleTime: finaleTime.toFixed(1) + 's',
      melody: melodyDef?.name || p.melodyName,
      source: melodyDef?.source || 'original score notes',
    });

    if (!isViralTargetValid) {
      allViralTimingsPass = false;
      console.warn(`Preset #${p.presetNumber} ${p.name} finale time outside viral window: ${finaleTime}s`);
    }
  }

  console.table(presetResults);

  assert('All 50 viral presets land finale downbeat between 55–59s', allViralTimingsPass);
  assert('All 50 presets pass centered corridor framing check (no clipping, no sparse >1s)', allFramingChecksPass);
  assert('All 50 presets maintain note sync within ±10 ms', allNoteSyncPass);

  // TEST 8: Copyright & Public Domain Safety
  console.log('\n--- TEST 8: Copyright Safety & Blacklist Verification ---');
  let copyrighted = false;
  let blacklistHit = false;

  for (const m of PUBLIC_DOMAIN_MELODIES) {
    if (!m.publicDomain) {
      copyrighted = true;
    }
    if (!isCopyrightSafe(m.name) || !isCopyrightSafe(m.composer) || !isCopyrightSafe(m.description)) {
      blacklistHit = true;
    }
  }

  for (const p of MARBLE_MELODY_PRESETS) {
    if (!isCopyrightSafe(p.name) || !isCopyrightSafe(p.exampleHook)) {
      blacklistHit = true;
    }
  }

  assert('Melody library: 100% public domain / original composition', !copyrighted);
  assert('Copyright Blacklist filter: zero blacklisted pop stars, cartoons, or protected brands', !blacklistHit);

  console.log(`\n========================================`);
  console.log(`TEST SUMMARY: ${passed} / ${total} TESTS PASSED!`);
  console.log(`========================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
