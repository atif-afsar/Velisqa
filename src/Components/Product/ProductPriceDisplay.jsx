import { formatInr, getPromoPriceDisplay } from '../../lib/promoPricing'

export default function ProductPriceDisplay({ price, size = 'card' }) {
  const { sale, compare, hasPromo } = getPromoPriceDisplay(price)

  if (!hasPromo) {
    return (
      <p
        className={
          size === 'detail'
            ? 'font-serif text-3xl font-medium tabular-nums tracking-[0.02em] text-[#3d0a21] sm:text-4xl'
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
    <div className="flex flex-col items-center justify-center gap-0.5 leading-none">
      <p className="text-[0.65rem] font-medium tabular-nums text-[#847377] line-through decoration-[#847377]/60 sm:text-[0.7rem]">
        {formatInr(compare)}
      </p>
      <p className="text-[0.8rem] font-semibold tabular-nums tracking-[0.02em] text-[#3d0a21] sm:text-base lg:text-lg">
        {formatInr(sale)}
      </p>
    </div>
  )
}
