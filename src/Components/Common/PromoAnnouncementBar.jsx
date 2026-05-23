import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { PROMO_DISCOUNT_PERCENT } from '../../lib/promoPricing'

const MESSAGES = [
  {
    highlight: `${PROMO_DISCOUNT_PERCENT}% OFF`,
    text: 'Your favourite pieces — now at irresistible prices',
    mobileText: 'Limited-time prices on signature styles',
    href: '/collections#signature',
  },
  {
    highlight: 'NEW IN',
    text: 'Signature edits just landed — shop before they sell out',
    mobileText: 'Fresh edits just dropped — shop now',
    href: '/collections',
  },
  {
    highlight: 'LIMITED DROP',
    text: 'Luxury artificial jewellery · Add to bag · Checkout on WhatsApp',
    mobileText: 'Add to bag · Checkout on WhatsApp',
    href: '/collections',
  },
]

const INTERVAL_MS = 4500

function useIsMobileBar() {
  const [mobile, setMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 639px)').matches
  })

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const onChange = () => setMobile(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return mobile
}

export default function PromoAnnouncementBar() {
  const { pathname } = useLocation()
  const reduceMotion = useReducedMotion()
  const isMobile = useIsMobileBar()
  const [index, setIndex] = useState(0)

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

  useEffect(() => {
    if (hidden || reduceMotion) return undefined

    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % MESSAGES.length)
    }, INTERVAL_MS)

    return () => window.clearInterval(id)
  }, [hidden, reduceMotion])

  if (hidden) return null

  const current = MESSAGES[index]
  const line = isMobile ? current.mobileText : current.text

  return (
    <div
      className="fixed left-0 right-0 top-0 z-[60] border-b border-[#d4af37]/20 bg-gradient-to-r from-[#130006] via-[#3d0a21] to-[#130006] text-center shadow-[0_4px_24px_rgba(19,0,6,0.25)]"
      style={{ minHeight: 'var(--announcement-height)' }}
      role="region"
      aria-label="Promotional offers"
    >
      <Link
        to={current.href}
        className="group flex min-h-[var(--announcement-height)] w-full flex-col items-center justify-center gap-0.5 px-3 py-1.5 sm:flex-row sm:gap-3 sm:px-10 sm:py-2 md:px-12"
      >
        <span className="shrink-0 rounded-sm bg-[#e9c349] px-2 py-0.5 text-[9px] font-black uppercase leading-none tracking-[0.04em] text-[#130006] shadow-[0_2px_8px_rgba(233,201,73,0.35)] sm:rounded-md sm:px-2.5 sm:text-[10px] sm:tracking-[0.06em]">
          {current.highlight}
        </span>

        <span className="relative w-full min-w-0 sm:w-auto sm:max-w-[min(100%,42rem)]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={line}
              initial={reduceMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="block px-0.5 text-[9px] font-medium leading-snug tracking-[0.02em] text-[#f7ead0]/95 sm:text-[11px] sm:leading-normal sm:tracking-[0.05em]"
            >
              {line}
            </motion.span>
          </AnimatePresence>
        </span>

        <span
          className="hidden shrink-0 text-[10px] font-bold uppercase tracking-[0.14em] text-[#d4af37] transition group-hover:translate-x-0.5 sm:inline"
          aria-hidden
        >
          Shop →
        </span>
      </Link>
    </div>
  )
}
