import { formatInr, getPromoPriceDisplay } from '../../lib/promoPricing'

export default function ProductPriceDisplay({ price, size = 'card' }) {
  const { sale, compare, hasPromo } = getPromoPriceDisplay(price)

  if (!hasPromo) {
    return (
      <p
        className={
          size === 'detail'
            ? 'font-serif text-3xl font-medium tabular-nums tracking-[0.02em] text-[#3d0a21] sm:text-4xl'
            : 'type-price text-[0.95rem] font-medium tabular-nums tracking-[0.04em] text-[#6f334a] sm:text-lg'
        }
      >
        {formatInr(sale)}
      </p>
    )
  }

  if (size === 'detail') {
    return (
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="font-serif text-3xl font-medium tabular-nums tracking-[0.02em] text-[#3d0a21] sm:text-4xl">
          {formatInr(sale)}
        </p>
        <p className="font-serif text-lg tabular-nums text-[#847377] line-through decoration-[#847377]/70 sm:text-xl">
          {formatInr(compare)}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      <p className="text-[0.7rem] font-medium tabular-nums tracking-[0.02em] text-[#847377] line-through decoration-[#847377]/60 sm:text-xs">
        {formatInr(compare)}
      </p>
      <p className="type-price text-[0.95rem] font-semibold tabular-nums tracking-[0.04em] text-[#3d0a21] sm:text-lg">
        {formatInr(sale)}
      </p>
    </div>
  )
}
