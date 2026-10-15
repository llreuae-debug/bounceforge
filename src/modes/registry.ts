import { SimulationMode } from './types';
import { ClassicMode } from './classic';
import { InfiniteLoopMode } from './infiniteLoop';
import { DestructionMode } from './destruction';
import { AccumulationMode } from './accumulation';
import { CollisionMode } from './collisionMode';
import { WebExpansionMode } from './webExpansion';
import { TrailExpansionMode } from './trailExpansion';
import { SpiralMode } from './spiral';
import { FragmentExpansionMode } from './fragmentExpansion';
import { WebBattleMode } from './webBattle';
import { MergeMode } from './merge';
import { BallRaceMode } from './ballRace';
import { PaintArenaMode } from './paintArena';
import { GravityFlipMode } from './gravityFlip';
import { BlackHoleMode } from './blackHole';
import { PortalRingsMode } from './portalRings';
import { PlinkoCascadeMode } from './plinkoCascade';
import { PendulumWaveMode } from './pendulumWave';
import { ShrinkingPrisonMode } from './shrinkingPrison';
import { DominoRingsMode } from './dominoRings';
import { SandFillMode } from './sandFill';
import { BallSorterMode } from './ballSorter';
import { ObstacleCourseMode } from './obstacleCourse';
import { MagneticForceFieldMode } from './magneticForceField';
import { GeometricNexusMode } from './geometricNexus';
import { RandomMarbleRunMode } from './randomMarbleRun';
import { ProceduralAIMode } from './proceduralAI';

export const ALL_MODES: SimulationMode[] = [
  ClassicMode,
  ObstacleCourseMode,
  PlinkoCascadeMode,
  BallSorterMode,
  DominoRingsMode,
  BallRaceMode,
  SpiralMode,
  PendulumWaveMode,
  MergeMode,
  AccumulationMode,
  MagneticForceFieldMode,
  GeometricNexusMode,
  RandomMarbleRunMode,
  ProceduralAIMode,
  InfiniteLoopMode,
  DestructionMode,
  CollisionMode,
  WebExpansionMode,
  TrailExpansionMode,
  FragmentExpansionMode,
  WebBattleMode,
  PaintArenaMode,
  GravityFlipMode,
  BlackHoleMode,
  PortalRingsMode,
  ShrinkingPrisonMode,
  SandFillMode,
];

export function getModeById(id: string): SimulationMode {
  const mode = ALL_MODES.find((m) => m.id === id);
  return mode || ClassicMode;
}
