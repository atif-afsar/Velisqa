import { getPromoPriceDisplay } from '../../lib/promoPricing'

export default function ProductPromoBadge({ product, className = '' }) {
  const { hasPromo, discountPercent } = getPromoPriceDisplay(product)
  if (!hasPromo) return null

  return (
    <span
      className={`pointer-events-none absolute left-2 top-2 z-20 inline-flex items-center justify-center rounded-md bg-[#b88e4c] px-2 py-0.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white shadow-xs animate-badge-glow sm:left-3 sm:top-3 ${className}`}
      aria-hidden
    >
      {discountPercent}% OFF
    </span>
  )
}
