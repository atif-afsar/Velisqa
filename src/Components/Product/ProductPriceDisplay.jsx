import { formatInr, getPromoPriceDisplay } from '../../lib/promoPricing'

export default function ProductPriceDisplay({ product = null, price, mrp = null, size = 'card' }) {
  const { sale, compare, hasPromo } = getPromoPriceDisplay(product || price, mrp)

  if (!hasPromo) {
    return (
      <p
        className={
          size === 'detail'
            ? 'font-serif text-3xl font-medium tabular-nums tracking-[0.02em] text-[#3d0a21] sm:text-4xl'
            : size === 'compact'
              ? 'text-[13px] font-semibold tabular-nums leading-none text-[#130006] sm:text-sm'
              : 'text-[0.8rem] font-semibold tabular-nums leading-none tracking-[0.02em] text-[#3d0a21] sm:text-base lg:text-lg'
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
    <div
      className={
        size === 'compact'
          ? 'flex items-baseline gap-2 leading-none'
          : 'flex flex-col items-center justify-center gap-0.5 leading-none'
      }
    >
      <p
        className={
          size === 'compact'
            ? 'text-[11px] tabular-nums text-[#888] line-through'
            : 'text-[0.65rem] font-medium tabular-nums text-[#847377] line-through decoration-[#847377]/60 sm:text-[0.7rem]'
        }
      >
        {formatInr(compare)}
      </p>
      <p
        className={
          size === 'compact'
            ? 'text-[13px] font-semibold tabular-nums text-[#130006] sm:text-sm'
            : 'text-[0.8rem] font-semibold tabular-nums tracking-[0.02em] text-[#3d0a21] sm:text-base lg:text-lg'
        }
      >
        {formatInr(sale)}
      </p>
    </div>
  )
}
