/**
 * Small accessibility helpers shared by the overlays and camera controller.
 * Kept dependency-free so it can be used from anywhere in the app.
 */

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/** Respect the user's OS-level motion preference. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** All tabbable controls inside a container, in DOM order. */
export function focusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute('hidden') && el.getAttribute('aria-hidden') !== 'true'
  );
}

/**
 * Keep Tab / Shift+Tab cycling inside a modal container.
 * Call from the container's keydown handler.
 */
export function trapFocus(container: HTMLElement, event: KeyboardEvent): void {
  if (event.key !== 'Tab') return;
  const items = focusableElements(container);
  if (items.length === 0) return;

  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement as HTMLElement | null;

  if (event.shiftKey && (active === first || !container.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || !container.contains(active))) {
    event.preventDefault();
    first.focus();
  }
}

/** Remember the element that opened a dialog so focus can return on close. */
export function rememberFocus(): HTMLElement | null {
  return document.activeElement instanceof HTMLElement ? document.activeElement : null;
}

/** Restore focus after closing a dialog, if the element is still connected. */
export function restoreFocus(el: HTMLElement | null): void {
  if (el && el.isConnected) {
    el.focus({ preventScroll: true });
  }
}

/** Focus an element on the next frame; useful after unhiding a panel. */
export function focusSoon(el: HTMLElement | null, delay = 30): void {
  if (!el) return;
  window.setTimeout(() => el.focus({ preventScroll: true }), delay);
}
