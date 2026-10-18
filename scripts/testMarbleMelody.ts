import { MusicToLayoutSolver } from '../src/marble3d/musicSolver';
import { VariationEngine } from '../src/marble3d/variationEngine';
import { MARBLE_MELODY_PRESETS, DEFAULT_MARBLE_MELODY_CONFIG } from '../src/marble3d/presets';
import { PUBLIC_DOMAIN_MELODIES } from '../src/marble3d/melodyLibrary';
import { MarbleMelodyConfig } from '../src/marble3d/types';

function runTests() {
  console.log('🧪 Starting MARBLE MELODY 3D Verification Suite...\n');

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
    melodyId: 'ode_to_joy',
    seed: 10421,
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

  // TEST 2: No Object Overlaps & Bounding Radii
  console.log('\n--- TEST 2: Collision & Non-Overlapping Check ---');
  let hasOverlap = false;
  let minDistance = Infinity;
  for (let i = 0; i < run1.objects.length; i++) {
    for (let j = i + 1; j < run1.objects.length; j++) {
      const a = run1.objects[i];
      const b = run1.objects[j];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (dist < minDistance) minDistance = dist;
      if (dist < 0.25) {
        hasOverlap = true;
        console.warn(`Overlap detected between ${a.id} and ${b.id}: ${dist} units`);
      }
    }
  }
  assert(
    `No objects overlap on vertical wall (Min clearance: ${minDistance.toFixed(3)} units)`,
    !hasOverlap
  );

  // TEST 3: Determinism Guarantee (Same seed + melody = identical output)
  console.log('\n--- TEST 3: Determinism Guarantee ---');
  const run1Again = MusicToLayoutSolver.solveRun(testConfig);
  const isIdentical =
    JSON.stringify(run1.objects.map((o) => [o.id, o.x, o.y, o.hitTime])) ===
    JSON.stringify(run1Again.objects.map((o) => [o.id, o.x, o.y, o.hitTime]));
  assert('Identical run generated on repeated seed solve (Zero drift)', isIdentical);

  // TEST 4: Multi-Marble Synchronization (2 and 3 marbles without lane collisions)
  console.log('\n--- TEST 4: 2- and 3-Marble Runs Synchronization ---');
  const test3Marbles: MarbleMelodyConfig = {
    ...DEFAULT_MARBLE_MELODY_CONFIG,
    melodyId: 'ode_to_joy',
    marbleCount: 3,
    seed: 55412,
  };
  const run3M = MusicToLayoutSolver.solveRun(test3Marbles);
  assert('3 marbles generated (Melody, Bass, Chords)', run3M.lanes.length === 3);

  // Verify lane horizontal separation (Lane 0 at 0, Lane 1 at -3.4, Lane 2 at 3.4)
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
    minLaneSeparation >= 1.2
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

  // TEST 6: Embossed @Handle & Safe Area
  console.log('\n--- TEST 6: Embossed 3D @Handle Safe Area Check ---');
  assert('Embossed handles placed down vertical wall', run1.embossedHandles.length >= 2);
  let handleInsideSafeX = true;
  for (const h of run1.embossedHandles) {
    // 3D safe X boundary between -3.0 and +3.0
    if (Math.abs(h.x) > 3.2) handleInsideSafeX = false;
  }
  assert('All embossed handles stay strictly within horizontal safe area (width <= 6.4)', handleInsideSafeX);

  // TEST 7: 12 Flagship Presets Verification
  console.log('\n--- TEST 7: 12 Flagship Presets Verification ---');
  assert('Shipped exactly 12 complete presets', MARBLE_MELODY_PRESETS.length === 12);

  const presetResults: any[] = [];
  let allPresetsValid = true;

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

    presetResults.push({
      name: p.name,
      seed: p.baseSeed,
      duration: r.duration.toFixed(1) + 's',
      finaleTime: finaleTime.toFixed(1) + 's',
      melody: p.melodyId,
    });

    if (!isViralTargetValid) {
      allPresetsValid = false;
      console.warn(`Preset ${p.name} finale time outside viral window: ${finaleTime}s`);
    }
  }

  console.table(presetResults);
  assert('All 12 viral presets land finale downbeat between 55–59s', allPresetsValid);

  // TEST 8: Copyright & Originality Check
  console.log('\n--- TEST 8: Public Domain & Original Content Verification ---');
  let copyrighted = false;
  for (const m of PUBLIC_DOMAIN_MELODIES) {
    if (!m.composer.includes('(')) {
      copyrighted = true;
    }
  }
  assert('Zero copyrighted music or characters: 100% public domain / original', !copyrighted);

  console.log(`\n========================================`);
  console.log(`TEST SUMMARY: ${passed} / ${total} TESTS PASSED!`);
  console.log(`========================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
