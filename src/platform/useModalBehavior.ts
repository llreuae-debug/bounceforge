import { useEffect, useRef } from 'react';

let lockCount = 0;
let savedScrollY = 0;

function lockBodyScroll() {
  if (lockCount === 0) {
    savedScrollY = window.scrollY;
    // position:fixed is the only reliable background-scroll lock on iOS Safari.
    const b = document.body.style;
    b.position = 'fixed';
    b.top = `-${savedScrollY}px`;
    b.left = '0';
    b.right = '0';
    b.overflow = 'hidden';
  }
  lockCount++;
}

function unlockBodyScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    const b = document.body.style;
    b.position = '';
    b.top = '';
    b.left = '';
    b.right = '';
    b.overflow = '';
    window.scrollTo(0, savedScrollY);
  }
}

/**
 * Esc closes, background scroll is locked while open, and a downward swipe
 * (>90px, mostly vertical, started near the top of the sheet) closes on touch.
 * Attach the returned ref to the sheet/card element.
 */
export function useModalBehavior<T extends HTMLElement = HTMLDivElement>(isOpen: boolean, onClose: () => void) {
  const sheetRef = useRef<T | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    lockBodyScroll();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);

    const el = sheetRef.current;
    let startY = 0;
    let startX = 0;
    let tracking = false;

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch' || !el) return;
      // Only start a dismiss gesture when the sheet is scrolled to the top,
      // so normal in-sheet scrolling still works.
      if (el.scrollTop > 0) return;
      tracking = true;
      startY = e.clientY;
      startX = e.clientX;
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!tracking) return;
      tracking = false;
      const dy = e.clientY - startY;
      const dx = Math.abs(e.clientX - startX);
      if (dy > 90 && dy > dx * 1.5) onCloseRef.current();
    };

    el?.addEventListener('pointerdown', onPointerDown);
    el?.addEventListener('pointerup', onPointerUp);

    return () => {
      unlockBodyScroll();
      window.removeEventListener('keydown', onKey);
      el?.removeEventListener('pointerdown', onPointerDown);
      el?.removeEventListener('pointerup', onPointerUp);
    };
  }, [isOpen]);

  return sheetRef;
}
