import { useEffect } from 'react'

/**
 * Sticky bottom action bars (product "Add to bag", checkout "Pay", bag "Checkout") publish their
 * height as `--sticky-cta-height` on <html>. Floating UI (cookie banner, WhatsApp help, offer pill)
 * sits above that value, so nothing ever covers a call-to-action.
 */
const VAR = '--sticky-cta-height'

export function useStickyBarHeight(ref, active = true) {
  useEffect(() => {
    const root = document.documentElement
    const el = ref.current
    root.classList.toggle('has-sticky-cta', Boolean(active && el))
    if (!active || !el) {
      root.style.setProperty(VAR, '0px')
      return undefined
    }
    const update = () => {
      // Hidden on desktop (display: none) → 0.
      const h = el.offsetParent === null && getComputedStyle(el).position !== 'fixed' ? 0 : el.getBoundingClientRect().height
      root.style.setProperty(VAR, `${Math.round(h)}px`)
    }
    update()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null
    ro?.observe(el)
    window.addEventListener('resize', update)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', update)
      root.style.setProperty(VAR, '0px')
      root.classList.remove('has-sticky-cta')
    }
  }, [ref, active])
}
