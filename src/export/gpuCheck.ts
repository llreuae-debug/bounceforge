/** WebGL texture-size check for 4K vertical export (tiny module: no exporter code). */
export function checkGpu4KCapability(): { canDo4K: boolean; maxTextureSize: number; reason?: string } {
  if (typeof window === 'undefined') return { canDo4K: true, maxTextureSize: 8192 };
  try {
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
    if (!gl) {
      return { canDo4K: false, maxTextureSize: 2048, reason: 'WebGL is disabled or unavailable' };
    }
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;
    if (maxTextureSize < 3840) {
      return {
        canDo4K: false,
        maxTextureSize,
        reason: `GPU maximum texture size is ${maxTextureSize}px (3840px required for 4K vertical)`,
      };
    }
    return { canDo4K: true, maxTextureSize };
  } catch (e: any) {
    return { canDo4K: false, maxTextureSize: 2048, reason: e?.message || 'GPU check failed' };
  }
}
