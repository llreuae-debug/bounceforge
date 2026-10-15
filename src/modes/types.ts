import { PhysicsWorld } from '../engine/world';
import { CollisionEvent } from '../engine/types';

export interface ModePreset {
  name: string;
  settings: Record<string, any>;
}

export interface SimulationMode {
  id: string;
  name: string;
  category: 'core' | 'advanced';
  description: string;
  defaultSettings: Record<string, any>;
  presets: ModePreset[];
  setup: (world: PhysicsWorld, settings: Record<string, any>, seed: number) => void;
  step?: (world: PhysicsWorld, dt: number, settings: Record<string, any>) => void;
  onCollision?: (world: PhysicsWorld, event: CollisionEvent, settings: Record<string, any>) => void;
  isFinished: (world: PhysicsWorld, settings: Record<string, any>) => boolean;
}
