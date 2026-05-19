/** @type {import('lenis').default | null} */
let lenisInstance = null;

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
