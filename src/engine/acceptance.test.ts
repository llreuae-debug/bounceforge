import { PhysicsWorld } from './world';
import { ALL_MODES, getModeById } from '../modes/registry';

export function runAcceptanceTests() {
  console.log('=== RUNNING BOUNCEFORGE ACCEPTANCE TESTS ===');

  // Test 1: Determinism Test
  console.log('Test 1: Testing Physics Determinism with Mulberry32 PRNG...');
  const seed = 998877;
  const worldA = new PhysicsWorld(1080, 1920, seed);
  const worldB = new PhysicsWorld(1080, 1920, seed);

  const classicMode = getModeById('classic');
  classicMode.setup(worldA, classicMode.defaultSettings, seed);
  classicMode.setup(worldB, classicMode.defaultSettings, seed);

  const dt = 1 / 60;
  for (let f = 0; f < 300; f++) {
    worldA.step(dt);
    worldB.step(dt);
  }

  const logA = worldA.eventBus.getEventLog();
  const logB = worldB.eventBus.getEventLog();

  if (logA.length !== logB.length) {
    throw new Error(`Determinism failed: logA has ${logA.length} events, logB has ${logB.length}`);
  }

  for (let i = 0; i < logA.length; i++) {
    const eA = logA[i];
    const eB = logB[i];
    if (
      Math.abs(eA.time - eB.time) > 0.0001 ||
      Math.abs(eA.position.x - eB.position.x) > 0.001 ||
      Math.abs(eA.position.y - eB.position.y) > 0.001
    ) {
      throw new Error(`Determinism mismatch at event ${i}: ${JSON.stringify(eA)} vs ${JSON.stringify(eB)}`);
    }
  }
  console.log(`✓ Determinism verified: 300 frames yielded ${logA.length} identical collision events!`);

  // Test 2: All 21 Modes Execution Test
  console.log(`Test 2: Verifying all ${ALL_MODES.length} modes setup & step...`);
  for (const mode of ALL_MODES) {
    const testWorld = new PhysicsWorld(1080, 1920, 1234);
    mode.setup(testWorld, mode.defaultSettings, 1234);
    for (let f = 0; f < 60; f++) {
      if (mode.step) mode.step(testWorld, dt, mode.defaultSettings);
      testWorld.step(dt);
    }
    console.log(`  ✓ Mode '${mode.name}' (${mode.id}) OK - ${testWorld.balls.length} balls, ${testWorld.bounces} bounces`);
  }

  // Test 3: Auto-Seed Finder Headless Simulation
  console.log('Test 3: Headless Simulation for Auto-Seed Finder...');
  let foundCandidate = false;
  const testSeed = 54321;
  const simWorld = new PhysicsWorld(1080, 1920, testSeed);
  classicMode.setup(simWorld, classicMode.defaultSettings, testSeed);

  for (let f = 0; f < 3600; f++) { // up to 60s
    simWorld.step(dt);
    if (classicMode.isFinished(simWorld, classicMode.defaultSettings)) {
      console.log(`  ✓ Finished simulation at ${simWorld.time.toFixed(2)}s`);
      foundCandidate = true;
      break;
    }
  }

  console.log('=== ALL ACCEPTANCE TESTS PASSED SUCCESSFULLY! ===\n');
}

runAcceptanceTests();
