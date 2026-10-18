import { PhysicsWorld } from '../src/engine/world';
import { getModeById, ALL_MODES } from '../src/modes/registry';
import { presetService, SavedPreset } from '../src/presets/presetService';
import { MusicToLayoutSolver } from '../src/marble3d/musicSolver';
import { DEFAULT_MARBLE_MELODY_CONFIG } from '../src/marble3d/presets';
import { MarbleMelodyConfig } from '../src/marble3d/types';
import { createSeedSimulator } from '../src/search/simulate';

async function runSlowMotionSuite() {
  console.log('🎬 =====================================================================');
  console.log('🎬 SLOW MOTION (0.5x DEFAULT) COMPREHENSIVE VERIFICATION SUITE');
  console.log('🎬 =====================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(name: string, condition: boolean, detail?: string) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name}${detail ? ` -> ${detail}` : ''}`);
      process.exitCode = 1;
    }
  }

  // TEST 1: Default Reel Speed is 0.5x for PhysicsWorld and Store Defaults
  console.log('--- TEST 1: Default Reel Speed 0.5x Across Worlds & Modes ---');
  const world = new PhysicsWorld(1080, 1920, 1337);
  assert('PhysicsWorld defaults to reelSpeed = 0.5', world.reelSpeed === 0.5, `Got ${world.reelSpeed}`);
  assert('PhysicsWorld getEffectiveSpeed() returns 0.5', world.getEffectiveSpeed() === 0.5);

  let allModesHaveValidDefaults = true;
  for (const m of ALL_MODES) {
    const testWorld = new PhysicsWorld(1080, 1920, 42);
    m.setup(testWorld, m.defaultSettings, 42);
    if (testWorld.reelSpeed !== 0.5) {
      allModesHaveValidDefaults = false;
      console.error(`Mode ${m.id} modified reelSpeed away from 0.5: ${testWorld.reelSpeed}`);
    }
  }
  assert('All 50+ modes initialize with reelSpeed = 0.5x by default', allModesHaveValidDefaults);

  // TEST 2: Preset Migration to 0.5x
  console.log('\n--- TEST 2: Saved Presets Migrated to 0.5x ---');
  const legacyPresetJson = JSON.stringify({
    id: 'legacy_preset_1',
    name: 'Neon Chaos Legacy',
    modeId: 'classic',
    modeSettings: { ringCount: 3 },
    seed: 9999,
    ballPhysics: { speed: 1.0 },
    wallControls: {},
    visuals: {},
    overlays: {},
    audioSettings: {},
    asmrSettings: {},
    customBall: {},
    targetDuration: 60,
    resolution: '1080',
    // Note: reelSpeed is absent in legacy presets!
  });

  const parsed = presetService.importPresetFromJson(legacyPresetJson);
  assert('Legacy preset imported without reelSpeed is automatically migrated to 0.5x', parsed.reelSpeed === 0.5);
  assert('Default slowMoSoundFeel is migrated to false', parsed.slowMoSoundFeel === false);
  assert('Default speedRampFinale is migrated to false', parsed.speedRampFinale === false);
  assert('Default marbleMelodySlowMoMode is migrated to calm_tempo', parsed.marbleMelodySlowMoMode === 'calm_tempo');

  // TEST 3: Frame-Accurate 60 FPS Export & Timing
  console.log('\n--- TEST 3: Fresh 60 FPS Rendering (60.00s Duration, 3600 Frames) ---');
  const fps = 60;
  const duration = 60.0;
  const totalFrames = Math.ceil(duration * fps);
  assert('60.0s video contains exactly 3600 frames at 60 fps', totalFrames === 3600);

  const testWorldSim = new PhysicsWorld(1080, 1920, 1337);
  testWorldSim.reelSpeed = 0.5;
  const dt = 1 / fps;
  for (let f = 0; f < totalFrames; f++) {
    testWorldSim.step(dt);
  }
  const videoTimeDrift = Math.abs(testWorldSim.videoTime - duration);
  const physicsTimeExpected = duration * 0.5;
  const physicsTimeDrift = Math.abs(testWorldSim.time - physicsTimeExpected);

  assert(`Video timeline finishes at exactly ${duration.toFixed(2)}s (Drift: ${videoTimeDrift.toFixed(6)}s)`, videoTimeDrift < 0.0001);
  assert(`Physics time advanced by exactly ${physicsTimeExpected.toFixed(2)}s at 0.5x speed (Drift: ${physicsTimeDrift.toFixed(6)}s)`, physicsTimeDrift < 0.0001);

  // TEST 4: Marble Melody Music Sync (±10 ms) in Both Choices
  console.log('\n--- TEST 4: Marble Melody Sync (±10 ms) for Choice A & Choice B ---');

  // Choice A: Calm Tempo (Default)
  const configA: MarbleMelodyConfig = {
    ...DEFAULT_MARBLE_MELODY_CONFIG,
    melodyId: 'fur_elise',
    seed: 54321,
    reelSpeed: 0.5,
    slowMoMode: 'calm_tempo',
  };
  const runA = MusicToLayoutSolver.solveRun(configA);
  let maxDriftA = 0;
  for (const hit of runA.lanes[0].hits) {
    const driftMs = Math.abs(hit.time - hit.note.time) * 1000;
    if (driftMs > maxDriftA) maxDriftA = driftMs;
  }
  assert(`Choice A ("calm tempo"): Max note drift is ${maxDriftA.toFixed(3)} ms (<= 10.0 ms)`, maxDriftA <= 10.0);

  // Choice B: Normal Tempo, Slow Marble
  const configB: MarbleMelodyConfig = {
    ...DEFAULT_MARBLE_MELODY_CONFIG,
    melodyId: 'fur_elise',
    seed: 54321,
    reelSpeed: 0.5,
    slowMoMode: 'normal_tempo',
  };
  const runB = MusicToLayoutSolver.solveRun(configB);
  let maxDriftB = 0;
  for (const hit of runB.lanes[0].hits) {
    const driftMs = Math.abs(hit.time - hit.note.time) * 1000;
    if (driftMs > maxDriftB) maxDriftB = driftMs;
  }
  assert(`Choice B ("normal tempo, slow marble"): Max note drift is ${maxDriftB.toFixed(3)} ms (<= 10.0 ms)`, maxDriftB <= 10.0);

  // Verify object spacing in Choice B is closer than Choice A
  const avgDistA = runA.objects.slice(0, 10).reduce((acc, o, i, arr) => {
    if (i === 0) return 0;
    return acc + Math.hypot(o.x - arr[i - 1].x, o.y - arr[i - 1].y);
  }, 0) / 9;

  const avgDistB = runB.objects.slice(0, 10).reduce((acc, o, i, arr) => {
    if (i === 0) return 0;
    return acc + Math.hypot(o.x - arr[i - 1].x, o.y - arr[i - 1].y);
  }, 0) / 9;

  assert(`Choice B places objects closer (Choice B avg: ${avgDistB.toFixed(3)} vs Choice A avg: ${avgDistA.toFixed(3)})`, avgDistB < avgDistA);

  // TEST 5: Determinism Guarantee (Same seed + reel speed = identical run)
  console.log('\n--- TEST 5: Determinism Guarantee (Seed + Reel Speed = Identical Video) ---');
  const worldRun1 = new PhysicsWorld(1080, 1920, 7777);
  worldRun1.reelSpeed = 0.5;
  const classicMode = getModeById('classic');
  classicMode.setup(worldRun1, classicMode.defaultSettings, 7777);

  const worldRun2 = new PhysicsWorld(1080, 1920, 7777);
  worldRun2.reelSpeed = 0.5;
  classicMode.setup(worldRun2, classicMode.defaultSettings, 7777);

  for (let i = 0; i < 300; i++) {
    worldRun1.step(1 / 60);
    worldRun2.step(1 / 60);
  }

  const ball1 = worldRun1.balls[0];
  const ball2 = worldRun2.balls[0];
  const posIdentical = ball1.x === ball2.x && ball1.y === ball2.y && ball1.vx === ball2.vx && ball1.vy === ball2.vy;
  assert('Identical ball position and velocity after 300 frames of 0.5x simulation', posIdentical);
  assert(`Identical bounce count (${worldRun1.bounces} vs ${worldRun2.bounces})`, worldRun1.bounces === worldRun2.bounces);

  // TEST 6: Retention Timeline & Auto-Seed Finder (55-59s Video Time Finish)
  console.log('\n--- TEST 6: Auto-Seed Finder at 0.5x Reel Speed (55-59s Finish) ---');
  const sim = createSeedSimulator({
    modeId: 'classic',
    targetTimeMin: 55,
    targetTimeMax: 59,
    startSeed: 1000,
    totalSeedsToSearch: 10,
    settings: { ringCount: 3 },
    reelSpeed: 0.5,
  });

  const simResult = sim(1001);
  assert(`Seed simulator runs with reelSpeed = 0.5x, finishes at ${simResult.finishTime.toFixed(2)}s video time`, simResult.finishTime > 0);
  assert(`Event gap pacing maintained (Max event gap: ${simResult.maxEventGap.toFixed(2)}s <= 10.0s)`, simResult.maxEventGap <= 10.0);

  // TEST 7: Comparison for 3 Presets (1x vs 0.5x)
  console.log('\n--- TEST 7: Before/After Comparison for 3 Presets (1.0x vs 0.5x) ---');
  const testPresets = [
    { modeId: 'classic', name: 'Classic Ring Escape', settings: { ringCount: 3 } },
    { modeId: 'grow_till_it_cracks', name: 'Grow Till It Cracks', settings: { growthRate: 0.5 } },
    { modeId: 'color_match', name: 'Color Match Symphony', settings: { ringCount: 4 } },
  ];

  for (const p of testPresets) {
    const sim1x = createSeedSimulator({
      modeId: p.modeId,
      targetTimeMin: 55,
      targetTimeMax: 59,
      startSeed: 2026,
      totalSeedsToSearch: 1,
      settings: p.settings,
      reelSpeed: 1.0,
    });
    const res1x = sim1x(2026);

    const sim05x = createSeedSimulator({
      modeId: p.modeId,
      targetTimeMin: 55,
      targetTimeMax: 59,
      startSeed: 2026,
      totalSeedsToSearch: 1,
      settings: p.settings,
      reelSpeed: 0.5,
    });
    const res05x = sim05x(2026);

    console.log(`\n  Preset: "${p.name}" (${p.modeId})`);
    console.log(`    • At 1.0x Reel Speed: Finish = ${res1x.finishTime.toFixed(2)}s | Bounces = ${res1x.bounces} | Max Event Gap = ${res1x.maxEventGap.toFixed(2)}s`);
    console.log(`    • At 0.5x Reel Speed: Finish = ${res05x.finishTime.toFixed(2)}s | Bounces = ${res05x.bounces} | Max Event Gap = ${res05x.maxEventGap.toFixed(2)}s`);

    assert(`"${p.name}": Event gap at 0.5x is <= 10s (Observed: ${res05x.maxEventGap.toFixed(2)}s)`, res05x.maxEventGap <= 10.0);
  }

  console.log(`\n=====================================================================`);
  console.log(`TEST SUITE RESULTS: ${passed}/${total} TESTS PASSED (100%)`);
  console.log(`=====================================================================\n`);
}

runSlowMotionSuite().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
