/**
 * Target simulation duration helpers.
 *
 * The user-selected target duration (e.g. 15s / 30s / 45s / 60s) is injected into the
 * settings object passed to `mode.isFinished(...)` under the `targetDuration` key, so
 * time-based modes end exactly at the chosen length and event-based modes can be
 * hard-capped by the preview / export loops.
 */

export const DURATION_PRESETS = [15, 30, 45, 60] as const;
export const DEFAULT_TARGET_DURATION = 60;

/** Read the target duration (seconds) from a settings object, falling back to 60s. */
export function getTargetDuration(settings?: Record<string, any>): number {
  const d = Number(settings?.targetDuration);
  return Number.isFinite(d) && d > 0 ? d : DEFAULT_TARGET_DURATION;
}

/** Return a copy of `settings` with the target duration injected. */
export function withTargetDuration(
  settings: Record<string, any>,
  targetDuration: number
): Record<string, any> {
  return { ...settings, targetDuration };
}

/** Seed-finder window for a given duration: finish within the last second. */
export function getTargetWindow(targetDuration: number): { min: number; max: number } {
  return { min: Math.max(0.5, targetDuration - 1), max: targetDuration };
}
