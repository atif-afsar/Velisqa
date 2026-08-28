import { CART_OFFERS, formatOfferAmount } from '../../lib/cartOffers'

/**
 * FreeGiftCard — Renders the complimentary gift as a cart line item
 *
 * - Price shown as ₹0 with "FREE GIFT" badge
 * - No quantity stepper, no remove button
 * - Compact styling matching VELISQA cart line design
 * - Worth ₹400+ reference displayed
 */
export default function FreeGiftCard({ variant = 'default', giftItem = null }) {
  const { freeGift } = CART_OFFERS
  const isCompact = variant === 'compact'

  const title = giftItem ? giftItem.name : freeGift.title
  const imageUrl = giftItem ? giftItem.imageUrl : freeGift.imageUrl
  const value = giftItem ? (giftItem.giftValue || giftItem.price || freeGift.value) : freeGift.value

  return (
    <div
      className={`free-gift-card relative rounded-xl border transition-all duration-300 ${
        isCompact ? 'p-2.5' : 'p-3 sm:p-3.5'
      } border-[#D4AF37]/30 bg-gradient-to-r from-[#FFFCF0] to-[#FFF9E8]`}
      role="listitem"
      aria-label="Complimentary gift item"
    >
      {/* FREE GIFT badge */}
      <span className="absolute right-2 top-2 rounded-full bg-[#D4AF37] px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.1em] text-[#130006]">
        Free Gift
      </span>

      <div className="flex gap-2.5 sm:gap-3">
        {/* Gift icon / image */}
        <div className={`shrink-0 overflow-hidden rounded-lg bg-[#FFF5DC] grid place-items-center ${
          isCompact ? 'h-[3.5rem] w-[3rem]' : 'h-[4.5rem] w-[3.75rem] sm:h-20 sm:w-16'
        }`}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-2xl" role="img" aria-label="Gift">🎁</span>
          )}
        </div>

        {/* Gift details */}
        <div className="min-w-0 flex-1 pr-14">
          <p className={`font-serif leading-snug text-[#3d0a21] ${
            isCompact ? 'text-[13px]' : 'text-[14px] sm:text-[15px]'
          }`}>
            {title}
          </p>
          <p className="mt-0.5 text-[10px] sm:text-[11px] text-[#847377]">
            Worth {formatOfferAmount(value)}
          </p>
          <div className="mt-1.5 flex items-baseline gap-2 text-[11px] sm:text-xs">
            <span className="font-bold tabular-nums text-[#8B6914]">₹0</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#D4AF37]">
              Complimentary
            </span>
          </div>
          {!isCompact && (
            <p className="mt-1.5 text-[9px] sm:text-[10px] text-[#847377] leading-relaxed">
              Your complimentary gift will be included with your order
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
