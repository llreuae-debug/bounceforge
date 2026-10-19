import type { BallPhysicsSettings } from '../presets/presetService';

/**
 * Studio defaults. `gravity` is a multiplier (G) on each mode's own gravity. Ball size, color
 * and bounciness only override a mode when they differ from these defaults, so every mode keeps
 * its own look (team colors, starting sizes) until the user changes them.
 */
export const DEFAULT_BALL_PHYSICS: BallPhysicsSettings = {
  speed: 1.0,
  radius: 14,
  gravity: 1.0,
  restitution: 0.98,
  color: '#38bdf8',
  maxSpeedCap: 2600,
  bounceBoostEnabled: false,
  bounceBoostRate: 0.02,
  bounceBoostMax: 1.5,
};
