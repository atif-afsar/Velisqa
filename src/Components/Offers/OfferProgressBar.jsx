import { formatOfferAmount, CART_OFFERS } from '../../lib/cartOffers'

/**
 * OfferProgressBar — Dual-milestone smooth progress bar
 *
 * Milestones: ₹999 (₹90 OFF) and ₹1,299 (FREE GIFT)
 * Smooth CSS transition on fill changes.
 * Accessible: aria-valuenow, aria-valuemin, aria-valuemax.
 * Respects prefers-reduced-motion.
 */
export default function OfferProgressBar({ subtotal = 0, compact = false }) {
  const { coupon, freeGift } = CART_OFFERS
  const maxVal = freeGift.threshold
  const clampedSubtotal = Math.min(subtotal, maxVal)
  const percent = Math.min(100, (clampedSubtotal / maxVal) * 100)

  // Milestone positions as percentages
  const couponPos = (coupon.threshold / maxVal) * 100
  const giftPos = 100

  const couponReached = subtotal >= coupon.threshold
  const giftReached = subtotal >= freeGift.threshold

  return (
    <div className="offer-progress-bar-container w-full" role="group" aria-label="Shopping benefits progress">
      {/* Progress track */}
      <div
        className="relative h-2 w-full rounded-full bg-[#ebe6df] overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.round(clampedSubtotal)}
        aria-valuemin={0}
        aria-valuemax={maxVal}
        aria-label={`Cart progress: ${formatOfferAmount(subtotal)} of ${formatOfferAmount(maxVal)}`}
      >
        {/* Fill */}
        <div
          className="offer-progress-bar-fill absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${percent}%`,
            background: giftReached
              ? 'linear-gradient(90deg, #D4AF37, #E9C349)'
              : couponReached
                ? 'linear-gradient(90deg, #D4AF37, #C9A96E)'
                : 'linear-gradient(90deg, #847377, #a08589)',
          }}
        />

        {/* Coupon milestone marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-4 w-0.5"
          style={{ left: `${couponPos}%` }}
        >
          <div
            className={`h-full w-full rounded-full transition-colors duration-300 ${
              couponReached ? 'bg-[#D4AF37]' : 'bg-[#b9b0a8]'
            }`}
          />
        </div>
      </div>

      {/* Milestone labels */}
      {!compact && (
        <div className="relative mt-2 h-8 text-[9px] sm:text-[10px] font-semibold tracking-wide">
          {/* Coupon milestone */}
          <div
            className="absolute flex flex-col items-center -translate-x-1/2"
            style={{ left: `${couponPos}%` }}
          >
            <span className={couponReached ? 'text-[#8B6914]' : 'text-[#847377]'}>
              {formatOfferAmount(coupon.threshold)}
            </span>
            <span className={`mt-0.5 uppercase tracking-[0.06em] whitespace-nowrap ${couponReached ? 'text-[#8B6914] font-bold' : 'text-[#847377]'}`}>
              {coupon.label}
            </span>
          </div>

          {/* Gift milestone */}
          <div
            className="absolute flex flex-col items-end right-0"
            style={{ right: '0px' }}
          >
            <span className={giftReached ? 'text-[#8B6914]' : 'text-[#847377]'}>
              {formatOfferAmount(freeGift.threshold)}
            </span>
            <span className={`mt-0.5 uppercase tracking-[0.06em] whitespace-nowrap ${giftReached ? 'text-[#8B6914] font-bold' : 'text-[#847377]'}`}>
              🎁 Free Gift
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
