/**
 * Haptic feedback helper
 * Triggers light vibration (10ms) on supported touch devices when enabled.
 */

let hapticsEnabled = true;

export function setHapticsEnabled(enabled: boolean): void {
  hapticsEnabled = enabled;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('bounceforge_haptics', enabled ? '1' : '0');
  }
}

export function getHapticsEnabled(): boolean {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('bounceforge_haptics');
    if (saved !== null) return saved === '1';
  }
  return true;
}

export function triggerHaptic(durationMs: number = 10): void {
  if (!hapticsEnabled) return;
  if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
    try {
      navigator.vibrate(durationMs);
    } catch {
      // ignore security restrictions
    }
  }
}
