import { Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { formatOfferAmount } from '../../lib/cartOffers'
import OfferProgressBar from './OfferProgressBar'

/**
 * OfferProgressCard — Premium cart offer progress component
 *
 * Three states:
 *   A: Below ₹999 → promote coupon offer
 *   B: ₹999–₹1,298 → coupon unlocked, promote free gift
 *   C: ₹1,299+ → both unlocked, celebration
 *
 * Intelligently promotes the NEXT achievable reward.
 */
export default function OfferProgressCard({ onNavigate, compact = false }) {
  const { cartOffers, eligibleSubtotal, items, freeGiftInCart } = useCart()

  // Don't render if cart is empty
  if (!items || items.length === 0) return null

  const {
    state,
    couponEligible,
    freeGiftEligible,
    amountToCoupon,
    amountToGift,
    couponDiscount,
    giftValue,
  } = cartOffers

  function handleCta() {
    if (onNavigate) onNavigate()
  }

  return (
    <div
      className={`offer-progress-card rounded-xl border p-3.5 sm:p-4 transition-all duration-300 ${
        freeGiftEligible
          ? 'border-line bg-gradient-to-br from-[#FFFCF0] to-[#FFF8E1] shadow-[0_4px_20px_rgba(17, 17, 17,0.12)]'
          : couponEligible
            ? 'border-line bg-[#FFFDF5]'
            : 'border-muted/15 bg-paper'
      }`}
      role="region"
      aria-label="Shopping benefits progress"
    >
      {/* State C: Both unlocked — Celebration */}
      {state === 'C' && (
        <div className="text-center">
          <div className="offer-sparkle-container inline-flex items-center gap-2">
            <span className="text-xl" role="img" aria-label="Gift">🎁</span>
            <p className="font-serif text-base sm:text-lg font-semibold text-ink">
              Free Gift Unlocked
            </p>
          </div>
          <p className="mt-1 text-[11px] sm:text-xs text-body leading-relaxed">
            {freeGiftInCart
              ? 'Your chosen complimentary gift has been added to your bag.'
              : `Select your complimentary gift worth up to ${formatOfferAmount(giftValue)} in your bag.`}
          </p>
          {!freeGiftInCart && (
            <Link
              to="/cart"
              onClick={handleCta}
              className="mt-2.5 inline-flex h-7 items-center justify-center rounded-full bg-ink px-4 text-[9.5px] font-bold uppercase tracking-wider text-white hover:bg-ink transition"
            >
              Choose Free Gift
            </Link>
          )}
          <div className="mt-3">
            <OfferProgressBar subtotal={eligibleSubtotal} compact={compact} />
          </div>
        </div>
      )}

      {/* State B: Coupon unlocked, gift pending */}
      {state === 'B' && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-accent-ink text-sm">✓</span>
            <p className="text-[11px] sm:text-xs font-bold text-accent-ink uppercase tracking-[0.06em]">
              {formatOfferAmount(couponDiscount)} OFF Unlocked
            </p>
          </div>
          <div aria-live="polite">
            <p className="text-xs sm:text-sm font-semibold text-ink">
              Just {formatOfferAmount(amountToGift)} more to unlock your <span className="text-accent-ink">FREE {formatOfferAmount(giftValue)}+ gift</span>
            </p>
          </div>
          <div className="mt-3">
            <OfferProgressBar subtotal={eligibleSubtotal} compact={compact} />
          </div>
          <Link
            to="/collections#signature"
            onClick={handleCta}
            className="mt-3 flex h-8 w-full items-center justify-center rounded-full border border-ink/20 text-[10px] font-bold uppercase tracking-[0.08em] text-ink transition hover:bg-ink hover:text-white sm:h-9 sm:text-[11px]"
          >
            Add {formatOfferAmount(amountToGift)} more
          </Link>
        </div>
      )}

      {/* State A: Below ₹999 — promote coupon */}
      {state === 'A' && (
        <div>
          <div aria-live="polite">
            <p className="text-xs sm:text-sm font-semibold text-ink">
              You're {formatOfferAmount(amountToCoupon)} away from{' '}
              <span className="text-accent-ink">{formatOfferAmount(couponDiscount)} OFF</span>
            </p>
            {amountToGift > 0 && amountToGift < 500 && (
              <p className="mt-1 text-[10px] sm:text-[11px] text-muted">
                {formatOfferAmount(amountToGift)} away from a FREE {formatOfferAmount(giftValue)}+ gift
              </p>
            )}
          </div>
          <div className="mt-3">
            <OfferProgressBar subtotal={eligibleSubtotal} compact={compact} />
          </div>
          <Link
            to="/collections#signature"
            onClick={handleCta}
            className="mt-3 flex h-8 w-full items-center justify-center rounded-full border border-muted/20 text-[10px] font-bold uppercase tracking-[0.08em] text-body transition hover:bg-ink hover:text-white sm:h-9 sm:text-[11px]"
          >
            Continue shopping
          </Link>
        </div>
      )}
    </div>
  )
}
