import { formatInr, getPromoPriceDisplay, PROMO_DISCOUNT_PERCENT } from '../../lib/promoPricing'

/** Palmonas-style price block for product detail */
export default function ProductDetailPrice({ price }) {
  const { sale, compare, hasPromo } = getPromoPriceDisplay(price)

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        {hasPromo && (
          <span className="text-sm font-medium tabular-nums text-[#847377] line-through sm:text-base">
            MRP {formatInr(compare)}
          </span>
        )}
        <span className="font-serif text-2xl font-medium tabular-nums text-[#130006] sm:text-[1.75rem]">
          {formatInr(sale)}
        </span>
        {hasPromo && (
          <span className="rounded-md bg-[#3d0a21] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#e9c349]">
            Save {PROMO_DISCOUNT_PERCENT}%
          </span>
        )}
      </div>
      <p className="text-xs text-[#847377]">Inclusive of all taxes</p>
    </div>
  )
}
