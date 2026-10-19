/**
 * BounceForge Feature Flags
 * 
 * Safety Guarantee:
 * Features and developer tools are toggled off by default to keep the UI clean
 * and fast, but never hard-deleted. They can be restored at any time.
 */

export interface FeatureFlags {
  showLegacyModes: boolean;
  showDevDiagnosticsInStudio: boolean;
  showExperimentalObstacles: boolean;
  enableAllModesInGallery: boolean;
}

const STORAGE_KEY = 'bounceforge_feature_flags';

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  showLegacyModes: false,
  showDevDiagnosticsInStudio: false,
  showExperimentalObstacles: false,
  enableAllModesInGallery: false,
};

export function getFeatureFlags(): FeatureFlags {
  if (typeof window === 'undefined') return DEFAULT_FEATURE_FLAGS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_FEATURE_FLAGS, ...JSON.parse(saved) };
    }
  } catch {
    // Ignore storage errors
  }
  return DEFAULT_FEATURE_FLAGS;
}

export function setFeatureFlag<K extends keyof FeatureFlags>(key: K, value: FeatureFlags[K]): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getFeatureFlags();
    const updated = { ...current, [key]: value };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
}
