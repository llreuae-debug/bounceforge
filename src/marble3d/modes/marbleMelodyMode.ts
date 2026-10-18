import { SimulationMode } from '../../modes/types';
import { PhysicsWorld } from '../../engine/world';
import { CollisionEvent } from '../../engine/types';
import { MARBLE_MELODY_PRESETS, DEFAULT_MARBLE_MELODY_CONFIG } from '../presets';
import { MusicToLayoutSolver } from '../musicSolver';
import { MarbleMelodyConfig } from '../types';
import { MarbleMelodyRenderer } from '../MarbleMelodyRenderer';

export const MarbleMelodyMode: SimulationMode = {
  id: 'marble_melody_3d',
  name: 'Marble Melody 3D',
  category: 'fresh_drops',
  description: '3D marble rolling down a vertical wall of tuned objects playing a real melody in sync.',
  defaultSettings: {
    ...DEFAULT_MARBLE_MELODY_CONFIG,
    presetName: 'Pastel Glass Run (Viral)',
  },
  presets: MARBLE_MELODY_PRESETS.flatMap((p) => [
    {
      name: `${p.name} (Chill)`,
      settings: {
        ...DEFAULT_MARBLE_MELODY_CONFIG,
        ...p.variants.chill,
        melodyId: p.melodyId,
        seed: p.baseSeed,
      },
    },
    {
      name: `${p.name} (Viral)`,
      settings: {
        ...DEFAULT_MARBLE_MELODY_CONFIG,
        ...p.variants.viral,
        melodyId: p.melodyId,
        seed: p.baseSeed,
      },
    },
    {
      name: `${p.name} (Insane)`,
      settings: {
        ...DEFAULT_MARBLE_MELODY_CONFIG,
        ...p.variants.insane,
        melodyId: p.melodyId,
        seed: p.baseSeed + 99,
      },
    },
  ]),
  asmrProfile: 'crystal',
  hookLines: [
    'Wait till the marble reaches the final catcher... 🎶✨',
    'Every hit plays the exact note. Oddly satisfying 3D run 🔮',
    '3 Marbles in perfect harmony down the pastel wall! 🎹',
    'The ending drop gave me full chills 🤤',
  ],

  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => {
    const config: MarbleMelodyConfig = {
      ...DEFAULT_MARBLE_MELODY_CONFIG,
      ...settings,
      seed,
    };

    // Solve complete 3D layout run deterministically
    const run = MusicToLayoutSolver.solveRun(config);
    world.customState.marbleMelodyRun = run;
    world.customState.currentTime = 0;
    world.customState.eventIdCounter = 1;
    world.customState.is3D = true;
    world.customState.modeFamily = 'marble_melody';
    world.customState.songTitle = config.customMidiName || config.melodyId.replace(/_/g, ' ');
    world.customState.counterLabel = 'NOTES';
    world.customState.totalNotes = run.objects.length;
    world.customState.hitsSoFar = 0;
    world.customState.counterValue = `0/${run.objects.length}`;

    // Instantiate and prepare 3D Three.js renderer
    const renderer3D = new MarbleMelodyRenderer();
    renderer3D.loadRun(run);
    world.customState.renderer3D = renderer3D;

    // Offscreen render canvas for blitting to 2D canvas context
    const offCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    if (offCanvas) {
      offCanvas.width = world.width || 1080;
      offCanvas.height = world.height || 1920;
      renderer3D.attachCanvas(offCanvas);
    }

    world.customState.onRenderFg = (ctx: CanvasRenderingContext2D, w: PhysicsWorld) => {
      const t = w.customState.currentTime || 0;
      if (offCanvas) {
        if (offCanvas.width !== w.width || offCanvas.height !== w.height) {
          offCanvas.width = w.width;
          offCanvas.height = w.height;
          renderer3D.attachCanvas(offCanvas);
        }
        renderer3D.renderFrameAt(t, offCanvas);
        ctx.drawImage(offCanvas, 0, 0, w.width, w.height);
      }
    };
  },

  step: (world: PhysicsWorld, dt: number, _settings: Record<string, any>) => {
    const prevTime = world.customState.currentTime || 0;
    const currTime = prevTime + dt;
    world.customState.currentTime = currTime;
    world.time = currTime;

    const run = world.customState.marbleMelodyRun;
    if (!run) return;

    if (!world.customState.eventIdCounter) {
      world.customState.eventIdCounter = 1;
    }

    // Count hits up to current time
    let hitsSoFar = 0;
    for (const lane of run.lanes) {
      for (const h of lane.hits) {
        if (h.time <= currTime) hitsSoFar++;
      }
    }
    world.customState.hitsSoFar = hitsSoFar;
    world.customState.counterValue = `${hitsSoFar}/${run.objects.length}`;

    // Emit note collision hits as simulation time crosses hit.time
    for (const lane of run.lanes) {
      for (let hIdx = 0; hIdx < lane.hits.length; hIdx++) {
        const hit = lane.hits[hIdx];
        const isTriggered = (prevTime === 0 ? hit.time >= 0 : hit.time > prevTime) && hit.time <= currTime;
        if (isTriggered) {
          const obj = run.objects.find((o) => o.id === hit.objectId);
          world.eventBus.emit({
            id: world.customState.eventIdCounter++,
            type: 'ring',
            time: hit.time,
            impulse: (hit.note.velocity || 0.85) * 50,
            position: {
              x: 540 + (hit.note.lane === 1 ? -220 : hit.note.lane === 2 ? 220 : 0),
              y: 960,
            },
            velocity: { x: 0, y: 150 },
            ballId: lane.laneIndex,
            noteIndex: hIdx,
            extra: {
              marbleMelodyHit: true,
              melodyNote: hit.note,
              objectType: obj?.type || 'glass_tube',
            },
          });
        }
      }
    }

    // Finale Downbeat event with triumphant chord burst
    if (run.catcher) {
      const isCatcherTriggered =
        (prevTime === 0 ? run.catcher.catchTime >= 0 : run.catcher.catchTime > prevTime) &&
        run.catcher.catchTime <= currTime;
      if (isCatcherTriggered) {
        world.eventBus.emit({
          id: world.customState.eventIdCounter++,
          type: 'escape',
          time: run.catcher.catchTime,
          impulse: 100,
          position: { x: 540, y: 1600 },
          velocity: { x: 0, y: 300 },
          ballId: 0,
          noteIndex: 999,
          extra: {
            marbleMelodyHit: true,
            melodyNote: {
              time: run.catcher.catchTime,
              duration: 2.2,
              midi: 72,
              freq: 523.25,
              pitchName: 'C5',
              velocity: 0.95,
              lane: 0,
            },
            objectType: 'final_catcher',
          },
        });
      }
    }

    if (currTime >= run.duration) {
      world.isFinished = true;
    }
  },

  onCollision: (_world: PhysicsWorld, _event: CollisionEvent, _settings: Record<string, any>) => {
    // Mode specific collision handling if needed
  },

  isFinished: (world: PhysicsWorld, _settings: Record<string, any>) => {
    const run = world.customState.marbleMelodyRun;
    return run ? (world.customState.currentTime || 0) >= run.duration : false;
  },
};
