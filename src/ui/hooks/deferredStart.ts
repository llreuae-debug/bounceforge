/**
 * Starts a decorative animation only after the page has loaded and gone idle, and only while
 * the element is on screen (stopped again when scrolled away). Keeps first load fast.
 * `start` returns its own stop function. Returns a cleanup for useEffect.
 */
export function startWhenIdleAndVisible(el: Element, start: () => () => void): () => void {
  let stop: (() => void) | null = null;
  let io: IntersectionObserver | null = null;
  let cancelled = false;
  let idleId: number | null = null;
  let timer: number | null = null;

  const arm = () => {
    if (cancelled) return;
    if (typeof IntersectionObserver === 'undefined') {
      stop = start();
      return;
    }
    io = new IntersectionObserver((entries) => {
      const visible = entries.some((e) => e.isIntersecting);
      if (visible && !stop) stop = start();
      else if (!visible && stop) {
        stop();
        stop = null;
      }
    });
    io.observe(el);
  };
  const afterLoad = () => {
    if (cancelled) return;
    const ric = (window as any).requestIdleCallback as ((cb: () => void, o?: { timeout: number }) => number) | undefined;
    if (ric) idleId = ric(arm, { timeout: 2500 });
    else timer = window.setTimeout(arm, 600);
  };
  if (document.readyState === 'complete') afterLoad();
  else window.addEventListener('load', afterLoad, { once: true });

  return () => {
    cancelled = true;
    window.removeEventListener('load', afterLoad);
    if (idleId !== null) (window as any).cancelIdleCallback?.(idleId);
    if (timer !== null) window.clearTimeout(timer);
    io?.disconnect();
    stop?.();
  };
}
