import { getProductBadge, getBadgeLabel } from '../../lib/productDisplay'

export default function ProductBadgeLabel({ product, className = '', placement = 'inline' }) {
  const badge = getProductBadge(product)
  const label = getBadgeLabel(badge)
  if (!label) return null

  const isBestseller = badge === 'bestseller'

  if (placement === 'image') {
    return (
      <span
        className={`pointer-events-none absolute left-2 top-10 z-[18] inline-flex rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wider shadow-xs sm:left-3 sm:top-11 ${
          isBestseller
            ? 'bg-[#8B6914] text-white shadow-[#8B6914]/20'
            : 'bg-white text-slate-900 border border-slate-200'
        } ${className}`}
      >
        {label}
      </span>
    )
  }

  return (
    <span
      className={`inline-flex w-fit rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
        isBestseller
          ? 'border-[#C9A96E] bg-[#F5EFE6] text-[#6B5210]'
          : 'border-slate-200 bg-slate-50 text-slate-700'
      } ${className}`}
    >
      {label}
    </span>
  )
}
