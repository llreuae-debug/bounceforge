/** WebGL availability check that doesn't load three.js (the 3D renderer itself is lazy-loaded). */
let cached: boolean | null = null;
export function webglSupported(): boolean {
  if (cached !== null) return cached;
  try {
    const c: any = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(2, 2) : document.createElement('canvas');
    cached = !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    cached = false;
  }
  return cached;
}

/** Loads the Three.js renderer module on demand. */
export const loadRenderer3D = () => import('./render3d');
