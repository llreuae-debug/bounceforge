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
    world.customState.is3D = true;

    // Instantiate and prepare 3D Three.js renderer
    const renderer3D = new MarbleMelodyRenderer();
    renderer3D.loadRun(run);
    world.customState.renderer3D = renderer3D;

    // Offscreen render canvas for blitting to 2D canvas context
    const offCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    if (offCanvas) {
      offCanvas.width = 1080;
      offCanvas.height = 1920;
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

    // Emit collision events into world eventBus with physical material metadata
    let eventIdCounter = 1;
    for (const lane of run.lanes) {
      for (let hIdx = 0; hIdx < lane.hits.length; hIdx++) {
        const hit = lane.hits[hIdx];
        const obj = run.objects.find((o) => o.id === hit.objectId);
        world.eventBus.emit({
          id: eventIdCounter++,
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

    // Finale Downbeat event with triumphant chord burst
    world.eventBus.emit({
      id: eventIdCounter++,
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
  },

  step: (world: PhysicsWorld, dt: number, settings: Record<string, any>) => {
    world.customState.currentTime = (world.customState.currentTime || 0) + dt;
    const run = world.customState.marbleMelodyRun;
    if (run && world.customState.currentTime >= run.duration) {
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
