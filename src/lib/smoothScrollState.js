/**
 * Scrolling uses the browser's native scroll (Lenis smooth-scroll was removed:
 * it hijacked input and hurt INP). `getLenis` stays for older call sites.
 */
export function getLenis() {
  return null
}

export function scrollToTop({ immediate = true } = {}) {
  window.scrollTo({ top: 0, left: 0, behavior: immediate ? 'instant' : 'smooth' })
}
