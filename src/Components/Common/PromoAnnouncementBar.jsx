import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CART_OFFERS } from '../../lib/cartOffers'

const MESSAGES = [
  'Free shipping on prepaid orders across India',
  `Complimentary gift on orders over ₹${CART_OFFERS.freeGift.threshold.toLocaleString('en-IN')}`,
  '5-day easy returns',
]

/** Single-line, static announcement bar (no marquee). Hidden on admin routes. */
export default function PromoAnnouncementBar() {
  const { pathname } = useLocation()
  const hidden = pathname.startsWith('/admin')

  useEffect(() => {
    const root = document.documentElement
    if (hidden) root.style.setProperty('--announcement-height', '0px')
    else root.style.removeProperty('--announcement-height')
    return () => root.style.removeProperty('--announcement-height')
  }, [hidden])

  if (hidden) return null

  return (
    <div
      className="fixed inset-x-0 top-0 z-[60] flex h-[var(--announcement-height)] items-center justify-center bg-ink px-4 text-white"
      role="region"
      aria-label="Store highlights"
    >
      <Link to="/collections" className="truncate text-[0.6875rem] font-medium uppercase tracking-[0.16em] hover:text-white/80">
        <span className="md:hidden">Free shipping on prepaid orders</span>
        <span className="hidden md:inline">
          {MESSAGES.map((m, i) => (
            <span key={m}>
              {i > 0 && <span className="mx-4 text-white/40" aria-hidden="true">·</span>}
              {m}
            </span>
          ))}
        </span>
      </Link>
    </div>
  )
}
