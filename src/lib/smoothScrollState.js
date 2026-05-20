/** @type {import('lenis').default | null} */
let lenisInstance = null;

/** Used for anchor duration tuning (narrow viewports scroll faster in Lenis) */
export const TOUCH_VIEW_MQ = "(max-width: 767px), (pointer: coarse)";

/**
 * Coarse pointer = touch / stylus primary. Lenis syncTouch fights OS momentum → feels “sticky”.
 * Native scroll keeps phone/tablet scrolling natural; Lenis stays for mouse/trackpad.
 */
export const COARSE_POINTER_MQ = "(pointer: coarse)";

export function isTouchViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia(TOUCH_VIEW_MQ).matches;
}

/** Use native document scroll (no Lenis): accessibility, or touch-primary devices */
export function prefersNativeScroll() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
  return window.matchMedia(COARSE_POINTER_MQ).matches;
}

export function setLenis(instance) {
  lenisInstance = instance;
}

export function getLenis() {
  return lenisInstance;
}

export function scrollToTop({ immediate = true } = {}) {
  const lenis = getLenis();
  if (lenis) {
    lenis.scrollTo(0, { immediate });
    return;
  }
  window.scrollTo({ top: 0, left: 0, behavior: immediate ? "instant" : "smooth" });
}

/** Remove Lenis DOM side-effects when tearing down */
export function cleanupLenisDom() {
  const html = document.documentElement;
  html.classList.remove("lenis", "lenis-smooth", "lenis-stopped", "lenis-scrolling");
  document.body.classList.remove("lenis", "lenis-smooth", "lenis-stopped", "lenis-scrolling");
  html.style.removeProperty("height");
  html.style.removeProperty("overflow");
  document.body.style.removeProperty("height");
  document.body.style.removeProperty("overflow");
}
