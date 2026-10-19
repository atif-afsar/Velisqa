import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CART_OFFERS } from '../../lib/cartOffers'

const MESSAGES = [
  { text: 'Free shipping on prepaid orders', to: '/shipping-delivery' },
  CART_OFFERS.freeGift.enabled && {
    text: `Complimentary gift on orders over ₹${CART_OFFERS.freeGift.threshold.toLocaleString('en-IN')}`,
    to: '/collections',
  },
  { text: 'Cash on delivery available', to: '/faq' },
  { text: '5-day easy returns', to: '/refund-cancellation' },
].filter(Boolean)

const ROTATE_MS = 3500

/** Announcement bar: one rotating message on mobile, all messages inline on desktop. Hidden on admin routes. */
export default function PromoAnnouncementBar() {
  const { pathname } = useLocation()
  const hidden = pathname.startsWith('/admin')
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const root = document.documentElement
    if (hidden) root.style.setProperty('--announcement-height', '0px')
    else root.style.removeProperty('--announcement-height')
    return () => root.style.removeProperty('--announcement-height')
  }, [hidden])

  useEffect(() => {
    if (hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const t = window.setInterval(() => setIndex((i) => (i + 1) % MESSAGES.length), ROTATE_MS)
    return () => window.clearInterval(t)
  }, [hidden])

  if (hidden) return null
  const current = MESSAGES[index]

  return (
    <div
      className="fixed inset-x-0 top-0 z-[60] flex h-[var(--announcement-height)] items-center justify-center bg-ink px-4 text-white"
      role="region"
      aria-label="Store highlights"
    >
      <Link
        key={current.text}
        to={current.to}
        className="fade-in truncate text-[0.6875rem] font-medium uppercase tracking-[0.16em] hover:text-white/80 md:hidden"
      >
        {current.text}
      </Link>
      <p className="hidden truncate text-[0.6875rem] font-medium uppercase tracking-[0.16em] md:block">
        {MESSAGES.map((m, i) => (
          <span key={m.text}>
            {i > 0 && <span className="mx-4 text-white/40" aria-hidden="true">·</span>}
            <Link to={m.to} className="hover:text-white/80">
              {m.text}
            </Link>
          </span>
        ))}
      </p>
    </div>
  )
}
