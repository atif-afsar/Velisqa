import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { formatOfferAmount, CART_OFFERS } from '../../lib/cartOffers'

const DISMISS_KEY = 'velisqa:home_offer_v3'

/**
 * HomeOfferPopup — Glassmorphic floating notification for homepage offers
 */
export default function HomeOfferStrip() {
  const [visible, setVisible] = useState(false)
  const reduceMotion = useReducedMotion()
  const { coupon, freeGift } = CART_OFFERS

  useEffect(() => {
    if (sessionStorage.getItem(DISMISS_KEY)) return
    const timer = setTimeout(() => setVisible(true), 1000)
    return () => clearTimeout(timer)
  }, [])

  function handleDismiss() {
    setVisible(false)
    sessionStorage.setItem(DISMISS_KEY, '1')
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed bottom-4 left-3 right-3 z-[90] sm:left-5 sm:right-auto sm:bottom-5 cursor-pointer"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 35, scale: 0.95 }}
          animate={reduceMotion ? { opacity: 1 } : {
            opacity: 1,
            y: 0,
            scale: 1,
            boxShadow: [
              "0 8px 30px rgba(18, 60, 94, 0.08), 0 0 10px rgba(56, 189, 248, 0.15)",
              "0 8px 32px rgba(18, 60, 94, 0.14), 0 0 22px rgba(56, 189, 248, 0.45)",
              "0 8px 30px rgba(18, 60, 94, 0.08), 0 0 10px rgba(56, 189, 248, 0.15)"
            ]
          }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 15, scale: 0.96 }}
          whileHover={reduceMotion ? {} : {
            y: -4,
            scale: 1.02,
          }}
          transition={{
            opacity: { duration: 0.4 },
            y: { type: "spring", stiffness: 260, damping: 20 },
            scale: { type: "spring", stiffness: 260, damping: 20 },
            boxShadow: {
              repeat: Infinity,
              duration: 2.5,
              ease: "easeInOut"
            }
          }}
          role="dialog"
          aria-label="Shopping benefits"
        >
          <div
            className="relative w-[260px] sm:w-[275px] rounded-xl p-3.5"
            style={{
              background: 'linear-gradient(135deg, rgba(237, 243, 249, 0.96) 0%, rgba(222, 236, 251, 0.94) 100%)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1.5px solid rgba(56, 189, 248, 0.35)',
            }}
          >
            {/* Close */}
            <button
              type="button"
              onClick={handleDismiss}
              className="absolute right-2.5 top-2.5 grid h-4.5 w-4.5 place-items-center rounded-full text-slate-400 transition hover:text-slate-700 hover:bg-slate-200/50"
              aria-label="Dismiss"
            >
              <svg width="7" height="7" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M1 1l6 6M7 1l-6 6" />
              </svg>
            </button>

            {/* Header */}
            <p className="text-[8.5px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-2">
              Offers
            </p>

            {/* Offers */}
            <div className="space-y-2 pr-2">
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-[#123c5e]">✦</span>
                <p className="text-[11.5px] font-medium text-slate-700 leading-tight">
                  Shop {formatOfferAmount(coupon.threshold)} → Get <span className="font-bold text-slate-900">{coupon.label}</span>
                </p>
              </div>

              <div className="h-px bg-slate-200" />

              <div className="flex items-center gap-2">
                <span className="text-[9px] text-[#123c5e]">✦</span>
                <p className="text-[11.5px] font-medium text-slate-700 leading-tight">
                  Shop {formatOfferAmount(freeGift.threshold)} → <span className="font-bold text-slate-900">Free Gift</span> ({formatOfferAmount(freeGift.value)}+)
                </p>
              </div>
            </div>

            {/* CTA */}
            <Link
              to="/collections#signature"
              onClick={handleDismiss}
              className="mt-3 flex h-[30px] w-full items-center justify-center rounded-lg text-[9.5px] font-bold uppercase tracking-[0.12em] text-[#123c5e] transition hover:bg-[#123c5e]/5 active:scale-[0.98]"
              style={{
                border: '1px solid rgba(18, 60, 94, 0.3)',
              }}
            >
              Shop Now
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
