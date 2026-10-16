export default function ProductSoldOutBadge({ className = '' }) {
  return (
    <span
      className={`absolute left-2 top-2 z-20 rounded-full bg-ink/80 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-muted sm:left-3 sm:top-3 sm:text-[10px] ${className}`}
    >
      Out of stock
    </span>
  )
}
