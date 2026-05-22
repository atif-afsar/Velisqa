import { PROMO_DISCOUNT_PERCENT } from '../../lib/promoPricing'

export default function ProductPromoBadge({ className = '' }) {
  return (
    <span
      className={`pointer-events-none absolute left-2 top-2 z-20 inline-flex overflow-hidden rounded-md shadow-[0_4px_20px_rgba(0,0,0,0.55),0_0_0_2px_rgba(255,255,255,0.95)] backdrop-blur-[2px] sm:left-3 sm:top-3 ${className}`}
      aria-hidden
    >
      <span className="flex items-center bg-white px-2 py-1.5 sm:px-2.5 sm:py-2">
        <span className="text-[11px] font-black uppercase leading-none tracking-[0.06em] text-[#130006] sm:text-xs">
          {PROMO_DISCOUNT_PERCENT}%
        </span>
      </span>
      <span className="flex items-center bg-[#e9c349] px-2.5 py-1.5 sm:px-3 sm:py-2">
        <span className="text-[11px] font-black uppercase leading-none tracking-[0.14em] text-[#130006] drop-shadow-[0_1px_0_rgba(255,255,255,0.35)] sm:text-xs">
          Off
        </span>
      </span>
    </span>
  )
}
