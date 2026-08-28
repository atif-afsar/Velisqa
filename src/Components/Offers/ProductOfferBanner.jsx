import { Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { formatOfferAmount, CART_OFFERS } from '../../lib/cartOffers'

/**
 * ProductOfferBanner — Compact promotional module for product pages
 *
 * Placed near the Add to Bag CTA.
 * Shows both offers, with dynamic messaging if adding the current product
 * brings the customer close to a threshold.
 */
export default function ProductOfferBanner({ productPrice = 0 }) {
  const { cartOffers, eligibleSubtotal, itemCount } = useCart()
  const { coupon, freeGift } = CART_OFFERS

  // Calculate hypothetical subtotal if this product were added
  const hypotheticalSubtotal = eligibleSubtotal + productPrice
  const hypotheticalAmountToGift = Math.max(0, freeGift.threshold - hypotheticalSubtotal)
  const hypotheticalAmountToCoupon = Math.max(0, coupon.threshold - hypotheticalSubtotal)

  // Show a dynamic nudge if adding this product brings customer close
  const showDynamicNudge =
    productPrice > 0 &&
    itemCount > 0 &&
    !cartOffers.freeGiftEligible &&
    hypotheticalAmountToGift > 0 &&
    hypotheticalAmountToGift < 400

  return (
    <div
      className="rounded-xl border border-[#D4AF37]/15 bg-[#FFFDF5] p-3.5 sm:p-4 space-y-2.5"
      role="complementary"
      aria-label="Shopping benefits"
    >
      {/* Header */}
      <p className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.12em] text-[#8B6914]">
        <span className="text-[#D4AF37]">✦</span>
        Special Shopping Benefits
      </p>

      {/* Offer list */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-[11px] sm:text-xs text-[#3d0a21]">
          <span className={`shrink-0 w-4 text-center ${cartOffers.couponEligible ? 'text-[#8B6914]' : 'text-[#847377]'}`}>
            {cartOffers.couponEligible ? '✓' : '○'}
          </span>
          <span className={cartOffers.couponEligible ? 'font-semibold' : ''}>
            Shop {formatOfferAmount(coupon.threshold)} → Get {coupon.label}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] sm:text-xs text-[#3d0a21]">
          <span className={`shrink-0 w-4 text-center ${cartOffers.freeGiftEligible ? 'text-[#8B6914]' : 'text-[#847377]'}`}>
            {cartOffers.freeGiftEligible ? '✓' : '○'}
          </span>
          <span className={cartOffers.freeGiftEligible ? 'font-semibold' : ''}>
            Shop {formatOfferAmount(freeGift.threshold)} → Get a FREE {formatOfferAmount(freeGift.value)}+ Gift
          </span>
        </div>
      </div>

      {/* Dynamic nudge */}
      {showDynamicNudge && (
        <p className="text-[10px] sm:text-[11px] text-[#8B6914] font-semibold leading-relaxed pt-1 border-t border-[#D4AF37]/10">
          Add this to your bag and you're {formatOfferAmount(hypotheticalAmountToGift)} away from unlocking your FREE {formatOfferAmount(freeGift.value)}+ gift
        </p>
      )}

      {/* View Bag link */}
      {itemCount > 0 && (
        <Link
          to="/cart"
          className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.08em] text-[#3d0a21] hover:text-[#8B6914] transition pt-0.5"
        >
          View Bag
          <span className="rounded-full bg-[#8B6914] px-1.5 py-0.5 text-[9px] text-white font-bold">
            {itemCount}
          </span>
        </Link>
      )}
    </div>
  )
}
