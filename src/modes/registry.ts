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

// 20 New Engagement-First Modes (Fresh Drops)
import { CountdownEscapeMode } from './countdownEscape';
import { NearMissHellMode } from './nearMissHell';
import { PickUrColorMode } from './pickUrColor';
import { OnePercentMode } from './onePercent';
import { NameBattleMode } from './nameBattle';
import { ChaosToOrderMode } from './chaosToOrder';
import { PerfectLoopMode } from './perfectLoop';
import { GrowTillItCracksMode } from './growTillItCracks';
import { HundredRingsMode } from './hundredRings';
import { OddOneOutMode } from './oddOneOut';
import { FillRaceMode } from './fillRace';
import { SoapCubeCutMode } from './soapCubeCut';
import { MarbleXylophoneRainMode } from './marbleXylophoneRain';
import { BassDropEscapeMode } from './bassDropEscape';
import { DayToNightMode } from './dayToNight';
import { MirrorRaceMode } from './mirrorRace';
import { EliminationWheelMode } from './eliminationWheel';
import { EndlessFallMode } from './endlessFall';
import { StackTheTowerMode } from './stackTheTower';
import { BubblePopChainMode } from './bubblePopChain';
import { TargetMode } from './target';
import { ColorMatchMode } from './colorMatch';
import { LinesMode } from './lines';

export const ALL_MODES: SimulationMode[] = [
  // 10 Featured Game Modes (from Reference UI)
  ClassicMode,
  AccumulationMode,
  InfiniteLoopMode, // Multiply
  LinesMode,
  PaintArenaMode, // Paint
  TargetMode,
  GrowTillItCracksMode, // Grow
  DestructionMode, // Shatter
  ColorMatchMode,
  PortalRingsMode, // Portal

  // Additional 20 Engagement Drops & Advanced Modes
  CountdownEscapeMode,
  NearMissHellMode,
  PickUrColorMode,
  OnePercentMode,
  NameBattleMode,
  ChaosToOrderMode,
  PerfectLoopMode,
  HundredRingsMode,
  OddOneOutMode,
  FillRaceMode,
  SoapCubeCutMode,
  MarbleXylophoneRainMode,
  BassDropEscapeMode,
  DayToNightMode,
  MirrorRaceMode,
  EliminationWheelMode,
  EndlessFallMode,
  StackTheTowerMode,
  BubblePopChainMode,
  ObstacleCourseMode,
  PlinkoCascadeMode,
  BallSorterMode,
  DominoRingsMode,
  BallRaceMode,
  SpiralMode,
  PendulumWaveMode,
  MergeMode,
  MagneticForceFieldMode,
  GeometricNexusMode,
  RandomMarbleRunMode,
  ProceduralAIMode,
  CollisionMode,
  WebExpansionMode,
  TrailExpansionMode,
  FragmentExpansionMode,
  WebBattleMode,
  GravityFlipMode,
  BlackHoleMode,
  ShrinkingPrisonMode,
  SandFillMode,
];

export function getModeById(id: string): SimulationMode {
  // Support exact aliases matching viral reference names
  const cleanId = id.toLowerCase().replace(/[\s-]/g, '_');
  if (cleanId === 'multiply' || cleanId === 'infinite_loop') return InfiniteLoopMode;
  if (cleanId === 'lines' || cleanId === 'line') return LinesMode;
  if (cleanId === 'paint' || cleanId === 'paint_arena') return PaintArenaMode;
  if (cleanId === 'target' || cleanId === 'targets') return TargetMode;
  if (cleanId === 'grow' || cleanId === 'grow_till_it_cracks') return GrowTillItCracksMode;
  if (cleanId === 'shatter' || cleanId === 'destruction') return DestructionMode;
  if (cleanId === 'color_match' || cleanId === 'colormatch') return ColorMatchMode;
  if (cleanId === 'portal' || cleanId === 'portal_rings') return PortalRingsMode;
  if (cleanId === 'classic') return ClassicMode;
  if (cleanId === 'accumulation') return AccumulationMode;

  const mode = ALL_MODES.find((m) => m.id === id);
  return mode || ClassicMode;
}
