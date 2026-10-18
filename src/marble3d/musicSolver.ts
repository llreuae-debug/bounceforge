import {
  MelodyNote,
  MarbleMelodyConfig,
  MarbleMelodyRun,
  MarbleRunLane,
  MarblePathPoint,
  TunedObjectInstance,
  TunedObjectType,
  DecorInstance,
  EmbossedHandleInstance,
} from './types';
import { PUBLIC_DOMAIN_MELODIES, generateProceduralMelody } from './melodyLibrary';

// Deterministic PRNG
class LcgRng {
  private state: number;
  constructor(seed: number) {
    this.state = seed % 2147483647;
    if (this.state <= 0) this.state += 2147483646;
  }
  next(): number {
    this.state = (this.state * 16807) % 2147483647;
    return (this.state - 1) / 2147483646;
  }
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
  choice<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

// Act object families order
const ACT_FAMILIES: TunedObjectType[] = [
  'glass_tube',
  'metal_tack',
  'rainbow_xylophone',
  'drum',
  'dark_tube',
  'wire_rail',
  'kalimba_tine',
  'crystal_glass',
  'marimba_bar',
];

const FAMILY_COLORS: Record<TunedObjectType, string[]> = {
  glass_tube: ['#f472b6', '#34d399', '#c084fc', '#fbcfe8', '#38bdf8', '#fb923c'],
  metal_tack: ['#e2e8f0', '#94a3b8', '#cbd5e1', '#f8fafc'],
  rainbow_xylophone: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#6366f1', '#a855f7'],
  drum: ['#f87171', '#fbbf24', '#f43f5e', '#e11d48'],
  dark_tube: ['#1e293b', '#0f172a', '#334155'],
  wire_rail: ['#94a3b8', '#64748b', '#cbd5e1'],
  kalimba_tine: ['#d97706', '#b45309', '#f59e0b'],
  music_box_comb: ['#cbd5e1', '#94a3b8'],
  hand_bell: ['#fbbf24', '#f59e0b', '#d97706'],
  wood_block: ['#b45309', '#92400e', '#78350f'],
  steel_pan: ['#0284c7', '#0369a1', '#075985'],
  crystal_glass: ['#e0f2fe', '#bae6fd', '#7dd3fc'],
  glass_bottle: ['#6ee7b7', '#34d399', '#10b981'],
  wind_chime: ['#c084fc', '#a855f7'],
  piano_staircase: ['#f8fafc', '#0f172a'],
  marimba_bar: ['#78350f', '#92400e', '#b45309'],
  final_catcher: ['#fbcfe8', '#e0f2fe', '#fef08a'],
};

export class MusicToLayoutSolver {
  /**
   * Solves a complete deterministic 3D marble melody run
   */
  static solveRun(config: MarbleMelodyConfig, rawNotes?: MelodyNote[]): MarbleMelodyRun {
    const rng = new LcgRng(config.seed);

    // 1. Resolve Notes
    let notes: MelodyNote[] = [];
    if (rawNotes && rawNotes.length > 0) {
      notes = rawNotes;
    } else {
      const found = PUBLIC_DOMAIN_MELODIES.find((m) => m.id === config.melodyId);
      if (found) {
        notes = JSON.parse(JSON.stringify(found.notes));
      } else {
        notes = generateProceduralMelody(config.seed, config.targetDuration || 56);
      }
    }

    // Apply Transpose & Tempo Multiplier
    const tempo = config.tempoMultiplier || 1.0;
    const transpose = config.transposeSemitones || 0;
    const trimStart = config.trimStartSeconds || 0;
    const trimEnd = config.trimEndSeconds || Infinity;

    const filteredNotes = notes
      .filter((n) => n.time >= trimStart && n.time <= trimEnd)
      .map((n) => {
        const adjustedMidi = Math.max(21, Math.min(108, n.midi + transpose));
        const adjustedTime = (n.time - trimStart) / tempo;
        const adjustedDuration = n.duration / tempo;
        const freq = 440 * Math.pow(2, (adjustedMidi - 69) / 12);
        return {
          ...n,
          time: parseFloat(adjustedTime.toFixed(4)),
          duration: parseFloat(adjustedDuration.toFixed(4)),
          midi: adjustedMidi,
          freq,
        };
      })
      .sort((a, b) => a.time - b.time);

    // Filter <90ms overlaps: route notes to secondary marble lanes if closer than 90ms
    const marbleCount = config.marbleCount || 1;
    const laneNotes: MelodyNote[][] = Array.from({ length: marbleCount }, () => []);

    for (const note of filteredNotes) {
      // Determine lane: if note has explicit lane matching active marbles, use it;
      // otherwise, if too close to previous note on lane 0 (<90ms), spill to lane 1 or 2
      let targetLane = Math.min(marbleCount - 1, note.lane || 0);
      const prevOnTarget = laneNotes[targetLane][laneNotes[targetLane].length - 1];

      if (prevOnTarget && Math.abs(note.time - prevOnTarget.time) < 0.09) {
        // Try other lanes
        let placed = false;
        for (let l = 0; l < marbleCount; l++) {
          const prevL = laneNotes[l][laneNotes[l].length - 1];
          if (!prevL || Math.abs(note.time - prevL.time) >= 0.09) {
            targetLane = l;
            placed = true;
            break;
          }
        }
        if (!placed) {
          // If all lanes full at this instant, skip micro-chord duplicate to preserve clean physical bounce
          continue;
        }
      }

      laneNotes[targetLane].push({
        ...note,
        lane: targetLane,
      });
    }

    const lastNoteTime = Math.max(
      ...laneNotes.flatMap((ln) => ln.map((n) => n.time)),
      10.0
    );
    const catchTime = lastNoteTime + 0.2;
    const duration = lastNoteTime + 1.2;

    // 2. Setup Acts (6-10s each)
    const actCount = config.actCount || 5;
    const actDuration = duration / actCount;
    const acts = [];
    for (let i = 0; i < actCount; i++) {
      const family = ACT_FAMILIES[(config.seed + i) % ACT_FAMILIES.length];
      const colors = FAMILY_COLORS[family] || ['#38bdf8'];
      acts.push({
        actIndex: i,
        family,
        colorAccent: colors[i % colors.length],
        pathShape: config.pathStyle,
        startTime: i * actDuration,
        endTime: (i + 1) * actDuration,
      });
    }

    const allObjects: TunedObjectInstance[] = [];
    const lanes: MarbleRunLane[] = [];
    const marbleColors = ['#f472b6', '#38bdf8', '#facc15'];

    // 3. Solve Physics & Path for each lane
    // Lane X center offset (keeps 1, 2, 3 marbles separated horizontally without collision)
    const laneXOffsets = marbleCount === 1
      ? [0]
      : marbleCount === 2
      ? [-2.5, 2.5]
      : [-3.8, 0, 3.8];

    for (let laneIdx = 0; laneIdx < marbleCount; laneIdx++) {
      const currentNotes = laneNotes[laneIdx];
      const laneXBase = laneXOffsets[laneIdx];
      const lanePoints: MarblePathPoint[] = [];
      const laneHits: { objectId: string; time: number; note: MelodyNote }[] = [];

      // Starting Position
      let posX = laneXBase;
      let posY = 2.0; // wall top
      let posZ = 0.35;
      let velX = 0;
      let velY = 0;
      let velZ = 0;
      let rotX = 0;
      let rotY = 0;
      let rotZ = 0;

      let currentTime = 0;
      const dt = 1 / 240; // 240 Hz fixed physics

      let noteIdx = 0;
      let nextNote = currentNotes[noteIdx];

      // Initial fall to first note
      const firstNoteTime = nextNote ? nextNote.time : 1.0;

      while (currentTime < duration) {
        if (nextNote && currentTime >= nextNote.time - dt * 0.5) {
          // HIT EVENT: Impact on tuned object!
          const act = acts.find((a) => currentTime >= a.startTime && currentTime <= a.endTime) || acts[0];
          const objectType = act.family;
          const colors = FAMILY_COLORS[objectType] || ['#38bdf8'];
          const color = colors[noteIdx % colors.length];

          // Object placement with collision check
          const objId = `obj_${laneIdx}_${noteIdx}_${currentTime.toFixed(3)}`;
          const objectPos = { x: posX, y: posY, z: posZ - 0.1 };

          // Pitch ratio for scaling (e.g. crystal water height or chime length)
          const pitchRatio = Math.max(0.4, Math.min(2.5, nextNote.freq / 440));

          const objectInstance: TunedObjectInstance = {
            id: objId,
            type: objectType,
            x: objectPos.x,
            y: objectPos.y,
            z: objectPos.z,
            rotationX: rng.range(-0.15, 0.15),
            rotationY: rng.range(-0.25, 0.25),
            rotationZ: rng.range(-0.35, 0.35),
            scaleX: 1.0,
            scaleY: 1.0 / pitchRatio,
            scaleZ: 1.0,
            pinX: objectPos.x,
            pinY: objectPos.y + 0.1,
            pinZ: objectPos.z - 0.15,
            note: nextNote,
            color,
            hitTime: currentTime,
            lane: laneIdx,
            family: objectType,
            pitchRatio,
          };

          // Collision & Overlap check against previously placed objects
          let hasOverlap = false;
          for (const existing of allObjects) {
            const dx = existing.x - objectInstance.x;
            const dy = existing.y - objectInstance.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 0.45) {
              hasOverlap = true;
              break;
            }
          }

          if (hasOverlap) {
            // Deterministic nudge
            objectInstance.x += rng.range(-0.25, 0.25);
            objectInstance.y += rng.range(-0.1, 0.1);
          }

          allObjects.push(objectInstance);
          laneHits.push({ objectId: objId, time: currentTime, note: nextNote });

          // Calculate bounce velocity toward next note target
          noteIdx++;
          nextNote = currentNotes[noteIdx];

          if (nextNote) {
            const timeToNext = Math.max(0.08, nextNote.time - currentTime);
            // Targeted trajectory: solve vX and vY to land smoothly at next note
            // Next note X target oscillates in pathStyle (zigzag, scurve, etc.)
            let nextTargetX = laneXBase;
            const maxSwing = marbleCount === 1 ? 1.8 : 0.85;
            if (config.pathStyle === 'zigzag') {
              nextTargetX += (noteIdx % 2 === 0 ? 1 : -1) * rng.range(0.3, maxSwing);
            } else if (config.pathStyle === 'scurve') {
              nextTargetX += Math.sin(noteIdx * 0.8) * maxSwing;
            } else if (config.pathStyle === 'wide_swings') {
              nextTargetX += (noteIdx % 2 === 0 ? 1 : -1) * rng.range(0.4, maxSwing);
            } else {
              nextTargetX += rng.range(-maxSwing, maxSwing);
            }

            // Downward step per note
            const targetY = posY - rng.range(0.8, 1.6);
            velX = (nextTargetX - posX) / timeToNext;
            // Parabolic kinematic solve: deltaY = velY * t + 0.5 * g * t^2
            const gravity = -9.8;
            velY = (targetY - posY - 0.5 * gravity * timeToNext * timeToNext) / timeToNext;
          } else {
            // Finale bounce into catcher
            velX = (laneXBase - posX) * 0.8;
            velY = 2.0;
          }

          // Record Hit Point
          lanePoints.push({
            time: parseFloat(currentTime.toFixed(4)),
            x: parseFloat(posX.toFixed(4)),
            y: parseFloat(posY.toFixed(4)),
            z: parseFloat(posZ.toFixed(4)),
            vx: parseFloat(velX.toFixed(4)),
            vy: parseFloat(velY.toFixed(4)),
            vz: parseFloat(velZ.toFixed(4)),
            rotX: parseFloat(rotX.toFixed(4)),
            rotY: parseFloat(rotY.toFixed(4)),
            rotZ: parseFloat(rotZ.toFixed(4)),
            state: 'hit',
            hitObjectId: objId,
          });
        } else {
          // Guided ballistic motion with rolling spin
          const gravity = -9.8;
          velY += gravity * dt;
          posX += velX * dt;
          posY += velY * dt;
          posZ = 0.35 + Math.sin(currentTime * 4) * 0.05;

          // Rolling spin angular velocity
          const marbleRadius = config.marbleSize === 'small' ? 0.12 : config.marbleSize === 'large' ? 0.22 : 0.16;
          rotX += (velY / marbleRadius) * dt;
          rotZ -= (velX / marbleRadius) * dt;

          lanePoints.push({
            time: parseFloat(currentTime.toFixed(4)),
            x: parseFloat(posX.toFixed(4)),
            y: parseFloat(posY.toFixed(4)),
            z: parseFloat(posZ.toFixed(4)),
            vx: parseFloat(velX.toFixed(4)),
            vy: parseFloat(velY.toFixed(4)),
            vz: parseFloat(velZ.toFixed(4)),
            rotX: parseFloat(rotX.toFixed(4)),
            rotY: parseFloat(rotY.toFixed(4)),
            rotZ: parseFloat(rotZ.toFixed(4)),
            state: 'arc',
          });
        }

        currentTime += dt;
      }

      lanes.push({
        laneIndex: laneIdx,
        marbleColor: marbleColors[laneIdx % marbleColors.length],
        marbleRadius: config.marbleSize === 'small' ? 0.12 : config.marbleSize === 'large' ? 0.22 : 0.16,
        points: lanePoints,
        hits: laneHits,
      });
    }

    // 4. Finale Catcher (placed at bottom of wall)
    const lowestY = Math.min(...allObjects.map((o) => o.y), -10);
    const catcher = {
      type: 'glass_cup' as const,
      x: 0,
      y: lowestY - 1.5,
      z: 0.3,
      catchTime: parseFloat(catchTime.toFixed(2)),
    };

    // 5. Decor Props (100% Original: Mascot in dome, toy doors, potted plants, toy cars, origami, planets, candies)
    const decor: DecorInstance[] = [];
    if (config.decorEnabled !== false) {
      const decorTypes: Array<DecorInstance['type']> = [
        'mascot_dome',
        'potted_plant',
        'tiny_shelf',
        'toy_door',
        'origami_swan',
        'planet_rings',
        'candy_lozenge',
        'toy_car',
      ];
      const count = Math.floor(12 * (config.decorDensity || 0.8));
      for (let i = 0; i < count; i++) {
        const dType = decorTypes[i % decorTypes.length];
        const decorY = rng.range(lowestY + 1.0, 1.5);
        const decorX = rng.range(-4.2, 4.2);
        decor.push({
          id: `decor_${i}`,
          type: dType,
          x: decorX,
          y: decorY,
          z: 0.15,
          rotationX: rng.range(-0.1, 0.1),
          rotationY: rng.range(-0.3, 0.3),
          rotationZ: rng.range(-0.2, 0.2),
          scale: rng.range(0.7, 1.1),
        });
      }
    }

    // 6. Embossed 3D @handle text on the wall (soft shadow, inside safe area, repeating vertically)
    const embossedHandles: EmbossedHandleInstance[] = [];
    const handleText = config.handleText || '@BounceForge';
    const totalWallHeight = Math.abs(lowestY) + 4;
    const handleCount = Math.max(2, Math.floor(totalWallHeight / 6.0));
    for (let i = 0; i < handleCount; i++) {
      embossedHandles.push({
        id: `handle_${i}`,
        text: handleText,
        x: (i % 2 === 0 ? -1.8 : 1.8),
        y: 0.5 - i * 6.0,
        z: 0.02,
      });
    }

    // 7. Near Miss Tease before finale (skims an object without hitting it)
    const nearMissTime = duration - 3.5;
    const nearMissTease = {
      time: nearMissTime,
      x: 0.4,
      y: lowestY + 0.5,
      z: 0.35,
      skimmingObjectId: 'near_miss_pin',
    };

    return {
      seed: config.seed,
      duration,
      config,
      lanes,
      objects: allObjects,
      catcher,
      decor,
      embossedHandles,
      nearMissTease,
    };
  }
}
