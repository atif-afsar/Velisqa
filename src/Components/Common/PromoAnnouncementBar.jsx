import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useReducedMotion } from 'framer-motion'

export default function PromoAnnouncementBar() {
  const { pathname } = useLocation()
  const reduceMotion = useReducedMotion()
  const hidden = pathname.startsWith('/admin')

  useEffect(() => {
    const root = document.documentElement
    if (hidden) {
      root.style.setProperty('--announcement-height', '0px')
    } else {
      root.style.removeProperty('--announcement-height')
    }
    return () => root.style.removeProperty('--announcement-height')
  }, [hidden])

  if (hidden) return null

  return (
    <div
      className="fixed left-0 right-0 top-0 z-[60] flex items-center overflow-hidden bg-[#130006] border-b border-[#C9A96E]/20"
      style={{ height: 'var(--announcement-height)', minHeight: 'var(--announcement-height)' }}
      role="region"
      aria-label="Store highlights"
    >
      <Link
        to="/collections"
        className="group flex h-full w-full items-center overflow-hidden"
        aria-label="Trusted by Amazon & Myntra — Luxury Fine Jewellery"
      >
        <div className="promo-marquee-viewport relative flex h-full w-full items-center overflow-hidden">
          <div
            className={`promo-marquee-track flex min-w-full items-center whitespace-nowrap ${
              reduceMotion ? '' : 'promo-marquee-animate'
            }`}
          >
            {[0, 1].map((copy) => (
              <span
                key={copy}
                className="flex shrink-0 items-center px-6 text-[10px] leading-none sm:text-[11px] font-medium tracking-[0.18em] uppercase text-white/90 sm:px-8"
                aria-hidden={copy === 1}
              >
                <span className="font-semibold text-[#D4AF37]">
                  TRUSTED BY AMAZON & MYNTRA
                </span>
                <span className="px-5 text-[#D4AF37]/50" aria-hidden>✦</span>
                <span>100% CERTIFIED FINE JEWELLERY</span>
                <span className="px-5 text-[#D4AF37]/50" aria-hidden>✦</span>
                <span>EXPRESS PAN INDIA SHIPPING</span>
                <span className="px-5 text-[#D4AF37]/50" aria-hidden>✦</span>
                <span>50,000+ SATISFIED CUSTOMERS</span>
                <span className="px-5 text-[#D4AF37]/50" aria-hidden>✦</span>
              </span>
            ))}
          </div>
        </div>
      </Link>
    </div>
  )
}
