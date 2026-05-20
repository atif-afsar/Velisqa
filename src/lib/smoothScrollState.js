/** @type {import('lenis').default | null} */
let lenisInstance = null;

/** Mobile / touch viewports — used for Lenis touch tuning */
export const TOUCH_VIEW_MQ = "(max-width: 767px), (pointer: coarse)";

export function isTouchViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia(TOUCH_VIEW_MQ).matches;
}

/** Only skip Lenis for accessibility */
export function prefersNativeScroll() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
