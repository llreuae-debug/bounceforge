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

// Object family order for acts
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

// Play corridor constants: 60% of safe-box width (frame width ~2.32, safe ~1.85, 60% corridor = ±0.55)
export const PLAY_CORRIDOR_HALF_WIDTH = 0.55;
export const MAX_SAFE_X = 0.62;

export class MusicToLayoutSolver {
  /**
   * Solves a complete deterministic 3D marble melody run with centered framing
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

    const marbleCount = config.marbleCount || 1;
    const laneNotes: MelodyNote[][] = Array.from({ length: marbleCount }, () => []);

    // Filter <180ms overlaps: route notes to secondary marble lanes if closer than 180ms
    for (const note of filteredNotes) {
      let targetLane = Math.min(marbleCount - 1, note.lane || 0);
      const prevOnTarget = laneNotes[targetLane][laneNotes[targetLane].length - 1];

      if (prevOnTarget && Math.abs(note.time - prevOnTarget.time) < 0.18) {
        let placed = false;
        for (let l = 0; l < marbleCount; l++) {
          const prevL = laneNotes[l][laneNotes[l].length - 1];
          if (!prevL || Math.abs(note.time - prevL.time) >= 0.18) {
            targetLane = l;
            placed = true;
            break;
          }
        }
        if (!placed) {
          // If all lanes active within 180ms, space note forward slightly
          const minSpacing = 0.18;
          note.time = parseFloat((prevOnTarget.time + minSpacing).toFixed(4));
        }
      }

      laneNotes[targetLane].push({
        ...note,
        lane: targetLane,
      });
    }

    // Density Guard: Ensure gaps between consecutive hits are between 0.18s and 0.75s
    // If a gap > 0.75s exists, insert guide/rhythm notes so 3-6 objects remain ahead and screen never empties
    for (let l = 0; l < marbleCount; l++) {
      const denseList: MelodyNote[] = [];
      const current = laneNotes[l];
      for (let i = 0; i < current.length; i++) {
        denseList.push(current[i]);
        const next = current[i + 1];
        if (next && next.time - current[i].time > 0.75) {
          let insertTime = current[i].time + 0.50;
          while (insertTime < next.time - 0.25) {
            const interpolatedMidi = Math.round((current[i].midi + next.midi) / 2);
            denseList.push({
              time: parseFloat(insertTime.toFixed(4)),
              duration: 0.35,
              midi: interpolatedMidi,
              freq: 440 * Math.pow(2, (interpolatedMidi - 69) / 12),
              pitchName: 'G4',
              velocity: 0.75,
              lane: l,
            });
            insertTime += 0.55;
          }
        }
      }
      laneNotes[l] = denseList.sort((a, b) => a.time - b.time);
    }

    const lastNoteTime = Math.max(
      ...laneNotes.flatMap((ln) => ln.map((n) => n.time)),
      10.0
    );
    const catchTime = lastNoteTime + 0.25;
    const duration = lastNoteTime + 1.2;

    // 2. Setup Acts (5 acts across duration)
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

    // 3. Centered Play Corridor Offsets:
    // Single marble: centered at 0, swings ±0.30
    // 2 marbles: [-0.28, +0.28], swings ±0.08
    // 3 marbles: [-0.38, 0, +0.38], swings ±0.06
    const laneXOffsets = marbleCount === 1
      ? [0]
      : marbleCount === 2
      ? [-0.28, 0.28]
      : [-0.38, 0, 0.38];

    for (let laneIdx = 0; laneIdx < marbleCount; laneIdx++) {
      const currentNotes = laneNotes[laneIdx];
      const laneXBase = laneXOffsets[laneIdx];
      const lanePoints: MarblePathPoint[] = [];
      const laneHits: { objectId: string; time: number; note: MelodyNote }[] = [];

      let posX = laneXBase;
      let posY = 1.8; // wall top
      let posZ = 0.32;
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

      while (currentTime < duration) {
        if (nextNote && currentTime >= nextNote.time - dt * 0.5) {
          // HIT EVENT: Impact on tuned object
          const act = acts.find((a) => currentTime >= a.startTime && currentTime <= a.endTime) || acts[0];
          const objectType = act.family;
          const colors = FAMILY_COLORS[objectType] || ['#38bdf8'];
          const color = colors[noteIdx % colors.length];

          // Clamp object position strictly inside play corridor: |x| <= 0.52
          const clampedX = Math.max(-PLAY_CORRIDOR_HALF_WIDTH, Math.min(PLAY_CORRIDOR_HALF_WIDTH, posX));
          posX = clampedX;

          const objId = `obj_${laneIdx}_${noteIdx}_${currentTime.toFixed(3)}`;
          const objectPos = { x: posX, y: posY, z: posZ - 0.08 };

          const pitchRatio = Math.max(0.6, Math.min(1.8, nextNote.freq / 440));

          const objectInstance: TunedObjectInstance = {
            id: objId,
            type: objectType,
            x: objectPos.x,
            y: objectPos.y,
            z: objectPos.z,
            rotationX: rng.range(-0.08, 0.08),
            rotationY: rng.range(-0.12, 0.12),
            rotationZ: rng.range(-0.18, 0.18),
            scaleX: 1.0,
            scaleY: 1.0 / pitchRatio,
            scaleZ: 1.0,
            pinX: objectPos.x,
            pinY: objectPos.y + 0.08,
            pinZ: objectPos.z - 0.12,
            note: nextNote,
            color,
            hitTime: currentTime,
            lane: laneIdx,
            family: objectType,
            pitchRatio,
          };

          // Clearance & non-overlap check
          for (const existing of allObjects) {
            const dx = existing.x - objectInstance.x;
            const dy = existing.y - objectInstance.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 0.32) {
              // Nudge vertically or horizontally while staying within corridor
              objectInstance.x = Math.max(
                -PLAY_CORRIDOR_HALF_WIDTH,
                Math.min(PLAY_CORRIDOR_HALF_WIDTH, objectInstance.x + (dx > 0 ? -0.1 : 0.1))
              );
              objectInstance.y -= 0.12;
            }
          }

          allObjects.push(objectInstance);
          laneHits.push({ objectId: objId, time: currentTime, note: nextNote });

          // Calculate bounce velocity toward next note target
          noteIdx++;
          nextNote = currentNotes[noteIdx];

          if (nextNote) {
            const timeToNext = Math.max(0.12, nextNote.time - currentTime);
            // Targeted trajectory: nextTargetX strictly inside corridor
            let nextTargetX = laneXBase;
            const maxSwing = marbleCount === 1 ? 0.32 : marbleCount === 2 ? 0.08 : 0.05;

            if (config.pathStyle === 'zigzag') {
              nextTargetX += (noteIdx % 2 === 0 ? 1 : -1) * rng.range(0.02, maxSwing);
            } else if (config.pathStyle === 'scurve') {
              nextTargetX += Math.sin(noteIdx * 0.9) * maxSwing;
            } else {
              nextTargetX += rng.range(-maxSwing, maxSwing);
            }

            // Keep target strictly inside corridor
            nextTargetX = Math.max(-PLAY_CORRIDOR_HALF_WIDTH, Math.min(PLAY_CORRIDOR_HALF_WIDTH, nextTargetX));

            // Downward step per note (0.45 - 0.95 units)
            const targetY = posY - rng.range(0.48, 0.95);
            velX = (nextTargetX - posX) / timeToNext;
            const gravity = -9.8;
            velY = (targetY - posY - 0.5 * gravity * timeToNext * timeToNext) / timeToNext;
          } else {
            // Finale bounce into centered catcher
            velX = (laneXBase - posX) * 0.9;
            velY = 1.8;
          }

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
          // Guided ballistic trajectory
          const gravity = -9.8;
          velY += gravity * dt;
          posX += velX * dt;
          posY += velY * dt;
          posZ = 0.32 + Math.sin(currentTime * 3.5) * 0.03;

          // Corridor soft boundary spring
          if (posX > PLAY_CORRIDOR_HALF_WIDTH) {
            posX = PLAY_CORRIDOR_HALF_WIDTH;
            velX = -Math.abs(velX) * 0.6;
          } else if (posX < -PLAY_CORRIDOR_HALF_WIDTH) {
            posX = -PLAY_CORRIDOR_HALF_WIDTH;
            velX = Math.abs(velX) * 0.6;
          }

          const marbleRadius = config.marbleSize === 'small' ? 0.06 : config.marbleSize === 'large' ? 0.09 : 0.075;
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
        marbleRadius: config.marbleSize === 'small' ? 0.06 : config.marbleSize === 'large' ? 0.09 : 0.075,
        points: lanePoints,
        hits: laneHits,
      });
    }

    // 4. Finale Catcher (centered at bottom)
    const lowestY = Math.min(...allObjects.map((o) => o.y), -10);
    const catcher = {
      type: 'glass_cup' as const,
      x: 0,
      y: lowestY - 1.2,
      z: 0.28,
      catchTime: parseFloat(catchTime.toFixed(2)),
    };

    // 5. Decor Props (Placed OUTSIDE the play corridor, |x| >= 0.72)
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
      const count = Math.floor(14 * (config.decorDensity || 0.8));
      for (let i = 0; i < count; i++) {
        const dType = decorTypes[i % decorTypes.length];
        const decorY = rng.range(lowestY + 1.0, 1.2);
        // Kept outside play corridor so props never block the marble path
        const sideSign = i % 2 === 0 ? 1 : -1;
        const decorX = sideSign * rng.range(0.74, 1.05);

        decor.push({
          id: `decor_${i}`,
          type: dType,
          x: decorX,
          y: decorY,
          z: 0.12,
          rotationX: rng.range(-0.1, 0.1),
          rotationY: rng.range(-0.25, 0.25),
          rotationZ: rng.range(-0.15, 0.15),
          scale: rng.range(0.75, 1.05),
        });
      }
    }

    // 6. Embossed 3D @handle text on the wall
    const embossedHandles: EmbossedHandleInstance[] = [];
    const handleText = config.handleText || '@BounceForge';
    const totalWallHeight = Math.abs(lowestY) + 4;
    const handleCount = Math.max(2, Math.floor(totalWallHeight / 6.0));
    for (let i = 0; i < handleCount; i++) {
      embossedHandles.push({
        id: `handle_${i}`,
        text: handleText,
        x: i % 2 === 0 ? -0.72 : 0.72,
        y: 0.5 - i * 6.0,
        z: 0.02,
      });
    }

    // 7. Near Miss Tease before finale
    const nearMissTime = duration - 3.2;
    const nearMissTease = {
      time: nearMissTime,
      x: 0.22,
      y: lowestY + 0.4,
      z: 0.32,
      skimmingObjectId: 'near_miss_pin',
    };

    const run: MarbleMelodyRun = {
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

    // Automated Framing Verification Check
    const framingCheck = MusicToLayoutSolver.verifyFraming(run);
    if (!framingCheck.passed) {
      console.warn('Framing check notice:', framingCheck.reason);
    }

    return run;
  }

  /**
   * Automated Framing Verification:
   * Checks that marble and all objects stay within safe boundaries
   * and that no more than 35% empty frame occurs for >1.0s.
   */
  static verifyFraming(run: MarbleMelodyRun): { passed: boolean; reason?: string } {
    // 1. Check all object positions stay inside MAX_SAFE_X
    for (const obj of run.objects) {
      if (Math.abs(obj.x) > MAX_SAFE_X) {
        return {
          passed: false,
          reason: `Object ${obj.id} at x=${obj.x.toFixed(3)} exceeds safe corridor (${MAX_SAFE_X})`,
        };
      }
    }

    // 2. Sample trajectory frames (60fps)
    const dt = 1 / 60;
    const sampleCount = Math.floor(run.duration / dt);
    let emptySeconds = 0;

    for (let i = 0; i < sampleCount; i++) {
      const t = i * dt;
      const ptIdx = Math.min(run.lanes[0].points.length - 1, Math.floor(t * 240));
      const pt = run.lanes[0].points[ptIdx];

      if (!pt) continue;

      // Ball within safe corridor
      if (Math.abs(pt.x) > MAX_SAFE_X) {
        return {
          passed: false,
          reason: `Marble at t=${t.toFixed(2)}s wandered to x=${pt.x.toFixed(3)} outside safe corridor`,
        };
      }

      // Density check: count visible objects in current vertical viewport (height ~3.8 units)
      const camY = pt.y - 0.6;
      const visibleObjects = run.objects.filter(
        (o) => Math.abs(o.y - camY) < 2.0
      );

      if (visibleObjects.length < 2 && t < run.duration - 2.5) {
        emptySeconds += dt;
        if (emptySeconds > 1.0) {
          return {
            passed: false,
            reason: `Sparse area detected at t=${t.toFixed(2)}s (>1s with <2 objects)`,
          };
        }
      } else {
        emptySeconds = 0;
      }
    }

    return { passed: true };
  }
}
