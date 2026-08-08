import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useReducedMotion } from 'framer-motion'

const MARQUEE_SEGMENTS = [
  '500+ Happy Customers',
  'Gifts For Her · Special Prices',
  'Ships in 24 Hours',
  'Premium Artificial Jewellery',
  'Easy WhatsApp Checkout',
]

const MARQUEE_LINE = MARQUEE_SEGMENTS.join('   |   ')

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
      className="fixed left-0 right-0 top-0 z-[60] overflow-hidden bg-[#130006]"
      style={{ minHeight: 'var(--announcement-height)' }}
      role="region"
      aria-label="Store highlights"
    >
      <Link
        to="/collections"
        className="group flex min-h-[var(--announcement-height)] items-center overflow-hidden"
        aria-label={MARQUEE_LINE}
      >
        <div className="promo-marquee-viewport w-full overflow-hidden">
          <div
            className={`promo-marquee-track flex min-w-full items-center whitespace-nowrap ${
              reduceMotion ? '' : 'promo-marquee-animate'
            }`}
          >
            {[0, 1].map((copy) => (
              <span
                key={copy}
                className="flex shrink-0 items-center px-6 text-[11px] font-medium tracking-[0.04em] text-white sm:px-8 sm:text-xs sm:tracking-[0.05em]"
                aria-hidden={copy === 1}
              >
                {MARQUEE_LINE}
                <span className="px-6 text-white/35 sm:px-8" aria-hidden>
                  •
                </span>
              </span>
            ))}
          </div>
        </div>
      </Link>
    </div>
  )
}
