import { PhysicsWorld } from '../src/engine/world';
import { getModeById } from '../src/modes/registry';
import { SequenceBreakMode } from '../src/modes/sequenceBreak';
import { ColorLockMode } from '../src/modes/colorLock';
import { PortalRingsMode } from '../src/modes/portalRings';
import { AccumulationMode } from '../src/modes/accumulation';

const FIXED_DT = 1 / 60;

function runSimulation(
  mode: any,
  settings: Record<string, any>,
  seed: number,
  maxSeconds: number = 90
) {
  const world = new PhysicsWorld(1080, 1920, seed);
  if (mode.onCollision) {
    const onCol = mode.onCollision;
    world.eventBus.subscribe((ev) => onCol(world, ev, settings));
  }
  mode.setup(world, settings, seed);

  const maxFrames = Math.ceil(maxSeconds / FIXED_DT);
  for (let f = 0; f < maxFrames; f++) {
    if (mode.step) mode.step(world, FIXED_DT, settings);
    world.step(FIXED_DT);

    if (world.isFinished || mode.isFinished(world, settings)) {
      return {
        finished: true,
        time: world.time,
        videoTime: world.videoTime,
        bounces: world.bounces,
        balls: world.balls.length,
      };
    }
  }

  return {
    finished: false,
    time: world.time,
    videoTime: world.videoTime,
    bounces: world.bounces,
    balls: world.balls.length,
  };
}

console.log('=== TEST 1: SEQUENCE BREAK VIRAL PRESET HEADLESS TEST ===');
const seqViralPreset = SequenceBreakMode.presets[1];
console.log('Sequence Break Viral Preset Settings:', seqViralPreset.settings);
const seqResult = runSimulation(SequenceBreakMode, seqViralPreset.settings, 102, 90);
console.log(`✓ Sequence Break Seed 102: finished=${seqResult.finished}, payoff=${seqResult.videoTime.toFixed(2)}s of video, bounces=${seqResult.bounces}`);
// The escape is paced to the reel (default 56s): it should land in the back half, before the end
const reelLen = new PhysicsWorld(1080, 1920, 1).targetDuration;
if (!seqResult.finished || seqResult.videoTime < reelLen * 0.6 || seqResult.videoTime > reelLen) {
  throw new Error(`Sequence Break Seed 102 unexpected result: ${JSON.stringify(seqResult)}`);
}

console.log('\n=== TEST 2: COLOR LOCK VIRAL PRESET HEADLESS TEST ===');
const colorViralPreset = ColorLockMode.presets[1];
console.log('Color Lock Viral Preset Settings:', colorViralPreset.settings);
const colorResult = runSimulation(ColorLockMode, colorViralPreset.settings, 147, 60);
console.log(`✓ Color Lock Seed 147: finished=${colorResult.finished}, payoff=${colorResult.time.toFixed(2)}s, bounces=${colorResult.bounces}`);
if (!colorResult.finished || colorResult.time <= 0) {
  throw new Error(`Color Lock Seed 147 unexpected result: ${JSON.stringify(colorResult)}`);
}

console.log('\n=== TEST 3: PORTAL RINGS WEAR UPGRADE HEADLESS TEST ===');
const portalWearPreset = PortalRingsMode.presets[1];
console.log('Portal Preset:', portalWearPreset.name, portalWearPreset.settings);
const portalResult = runSimulation(PortalRingsMode, portalWearPreset.settings, 1, 60);
console.log(`✓ Portal Wear Seed 1: finished=${portalResult.finished}, payoff=${portalResult.time.toFixed(2)}s, bounces=${portalResult.bounces}`);
if (!portalResult.finished) {
  throw new Error(`Portal Wear Seed 1 unexpected result: ${JSON.stringify(portalResult)}`);
}

console.log('\n=== TEST 4: ACCUMULATION FREEZE TIMER HEADLESS TEST ===');
const freezePreset = AccumulationMode.presets.find((p) => p.name.toLowerCase().includes('freeze')) || AccumulationMode.presets[0];
console.log('Accumulation Freeze Timer Preset Settings:', freezePreset.name, freezePreset.settings);
const freezeResult = runSimulation(AccumulationMode, freezePreset.settings, 102, 60);
console.log(`✓ Freeze Timer Seed 102: finished=${freezeResult.finished}, payoff=${freezeResult.time.toFixed(2)}s, bounces=${freezeResult.bounces}`);
if (!freezeResult.finished) {
  throw new Error(`Freeze Timer Seed 102 unexpected result: ${JSON.stringify(freezeResult)}`);
}

console.log('\n=== TEST 5: BOUNCE BOOST & RESET VERIFICATION ===');
const testWorld = new PhysicsWorld(1080, 1920, 1234);
testWorld.addRing({
  centerX: 540,
  centerY: 960,
  radius: 200,
  thickness: 16,
  color: '#CCFF00',
  gaps: [{ startAngle: -0.4, endAngle: 0.4 }],
  restitution: 1.0,
});
testWorld.addBall({
  x: 540,
  y: 960,
  vx: -600,
  vy: 0,
  radius: 18,
  color: '#00F0FF',
  label: 'Test Ball',
  restitution: 1.0,
  initialRestitution: 1.0,
  bounceBoostEnabled: true,
  bounceBoostRate: 0.05,
  bounceBoostMax: 1.5,
});

console.log('Initial bounce boost energy:', testWorld.getBounceBoostEnergy());
let hitEnergy = 0;
let energyAfterEscape = -1;
for (let i = 0; i < 150; i++) {
  testWorld.step(FIXED_DT);
  if (testWorld.bounces > 0 && hitEnergy === 0) {
    hitEnergy = testWorld.getBounceBoostEnergy();
    console.log(`On wall hit: bounces=${testWorld.bounces}, bounceBoostEnergy=${hitEnergy}%`);
  }
  if (testWorld.escapes > 0 && energyAfterEscape === -1) {
    energyAfterEscape = testWorld.getBounceBoostEnergy();
    console.log(`After escape: escapes=${testWorld.escapes}, bounceBoostEnergy=${energyAfterEscape}%`);
    break;
  }
}

if (hitEnergy > 0) {
  console.log('✓ Bounce boost energy increased dynamically with wall hit!');
} else {
  throw new Error('Bounce boost energy did not increase on wall hit');
}

if (energyAfterEscape === 0) {
  console.log('✓ Bounce boost energy automatically reset to 0 after escape!');
} else {
  throw new Error('Bounce boost energy did not reset to 0 after escape');
}

console.log('\n============================================================');
console.log('✅ ALL HEADLESS SIMULATION AND PHYSICS TESTS PASSED 100%!');
console.log('============================================================\n');
