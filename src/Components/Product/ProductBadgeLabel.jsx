import { getProductBadge, getBadgeLabel } from '../../lib/productDisplay'

export default function ProductBadgeLabel({ product, className = '', placement = 'inline' }) {
  const badge = getProductBadge(product)
  const label = getBadgeLabel(badge)
  if (!label) return null

  const isBestseller = badge === 'bestseller'

  if (placement === 'image') {
    return (
      <span
        className={`pointer-events-none absolute left-2 top-10 z-[18] inline-flex rounded-md px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] shadow-[0_4px_16px_rgba(19,0,6,0.35)] sm:left-3 sm:top-11 sm:text-[10px] ${
          isBestseller
            ? 'bg-[#3d0a21] text-[#e9c349]'
            : 'bg-[#fbf7f1] text-[#130006] ring-1 ring-[#d4af37]/40'
        } ${className}`}
      >
        {label}
      </span>
    )
  }

  return (
    <span
      className={`inline-flex w-fit rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] ${
        isBestseller
          ? 'border-[#3d0a21]/20 bg-[#3d0a21]/8 text-[#3d0a21]'
          : 'border-[#d4af37]/35 bg-[#fbf7f1] text-[#6f334a]'
      } ${className}`}
    >
      {label}
    </span>
  )
}
