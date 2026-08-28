import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { formatOfferAmount, CART_OFFERS } from '../../lib/cartOffers'

/**
 * OfferToast — Milestone notification toast for offer achievements
 *
 * Rendered via portal at the bottom of the viewport.
 * Triggered externally via the exposed show function (used by CartContext).
 * Session-level deduplication to avoid repeated spam.
 * Dismissible, auto-hides after 5s, respects prefers-reduced-motion.
 */

const TOAST_DURATION = 5000

const MILESTONE_MESSAGES = {
  coupon: {
    icon: '✦',
    title: `You unlocked ${formatOfferAmount(CART_OFFERS.coupon.discount)} OFF`,
    body: `Your cart qualifies for the ${formatOfferAmount(CART_OFFERS.coupon.discount)} OFF offer.`,
  },
  gift: {
    icon: '🎁',
    title: `You've unlocked a FREE ${formatOfferAmount(CART_OFFERS.freeGift.value)}+ gift!`,
    body: 'Your complimentary gift has been added to your bag.',
  },
  giftRemoved: {
    icon: '💫',
    title: 'Free gift removed',
    body: '',
    dynamic: true,
  },
  nearGift: {
    icon: '✦',
    title: 'Almost there',
    body: '',
    dynamic: true,
  },
}

export default function OfferToast({ milestone, amountToGift = 0, onDismiss }) {
  const [visible, setVisible] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!milestone) {
      setVisible(false)
      return
    }

    setVisible(true)

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setVisible(false)
      if (onDismiss) onDismiss()
    }, TOAST_DURATION)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [milestone, onDismiss])

  function handleDismiss() {
    setVisible(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (onDismiss) onDismiss()
  }

  if (!milestone || !visible || typeof document === 'undefined') return null

  const msg = MILESTONE_MESSAGES[milestone]
  if (!msg) return null

  // Build dynamic body text
  let bodyText = msg.body
  if (milestone === 'giftRemoved') {
    bodyText = `Your cart is now below ${formatOfferAmount(CART_OFFERS.freeGift.threshold)}. Add ${formatOfferAmount(amountToGift)} more to unlock it again.`
  } else if (milestone === 'nearGift') {
    bodyText = `Add just ${formatOfferAmount(amountToGift)} more to unlock your FREE ${formatOfferAmount(CART_OFFERS.freeGift.value)}+ gift.`
  }

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[200] flex justify-center px-3 sm:px-4"
      role="status"
      aria-live="polite"
    >
      <div
        className={`offer-toast pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-[#D4AF37]/30 bg-[#FFFCF0] px-4 py-3 shadow-[0_12px_40px_rgba(19,0,6,0.18)] transition-all duration-300 ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}
      >
        <span className="shrink-0 text-lg mt-0.5" role="img" aria-hidden="true">
          {msg.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-bold text-[#3d0a21]">
            {msg.title}
          </p>
          {bodyText && (
            <p className="mt-0.5 text-[10px] sm:text-[11px] leading-relaxed text-[#514347]">
              {bodyText}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 text-lg leading-none text-[#847377] hover:text-[#3d0a21] transition"
          aria-label="Dismiss notification"
        >
          ×
        </button>
      </div>
    </div>,
    document.body,
  )
}
