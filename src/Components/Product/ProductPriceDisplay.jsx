import { formatInr, getPromoPriceDisplay } from '../../lib/promoPricing'

export default function ProductPriceDisplay({ product = null, price, mrp = null, size = 'card' }) {
  const { sale, compare, hasPromo } = getPromoPriceDisplay(product || price, mrp)

  if (!hasPromo) {
    return (
      <p
        className={
          size === 'detail'
            ? 'font-serif text-3xl font-bold tabular-nums tracking-[0.02em] text-slate-900 sm:text-4xl'
            : size === 'compact'
              ? 'text-sm font-semibold tabular-nums leading-none text-slate-900 sm:text-base'
              : 'text-sm font-bold tabular-nums leading-none tracking-[0.02em] text-slate-900 sm:text-base lg:text-lg'
        }
      >
        {formatInr(sale)}
      </p>
    )
  }

  if (size === 'detail') {
    return (
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="font-serif text-3xl font-bold tabular-nums tracking-[0.02em] text-slate-900 sm:text-4xl">
          {formatInr(sale)}
        </p>
        <p className="font-serif text-lg tabular-nums text-slate-400 line-through decoration-slate-400/70 sm:text-xl">
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
            ? 'text-xs tabular-nums text-slate-400 line-through'
            : 'text-xs font-medium tabular-nums text-slate-400 line-through decoration-slate-400/60 sm:text-xs'
        }
      >
        {formatInr(compare)}
      </p>
      <p
        className={
          size === 'compact'
            ? 'text-sm font-semibold tabular-nums text-slate-900 sm:text-base'
            : 'text-sm font-bold tabular-nums tracking-[0.02em] text-slate-900 sm:text-base lg:text-lg'
        }
      >
        {formatInr(sale)}
      </p>
    </div>
  )
}
