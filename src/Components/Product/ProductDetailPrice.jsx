import { useState } from 'react'
import { formatInr, getPromoPriceDisplay } from '../../lib/promoPricing'
import { useWishlist } from '../../context/WishlistContext'

export default function ProductDetailPrice({ product, productUrl }) {
  const { sale, compare, hasPromo, discountPercent } = getPromoPriceDisplay(product)
  const { isWishlisted, toggleWishlist } = useWishlist()
  const wishlisted = isWishlisted(product.id)
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: product.name,
          url: productUrl || window.location.href,
        })
      } else {
        throw new Error('Web Share API not supported')
      }
    } catch {
      await navigator.clipboard.writeText(productUrl || window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="flex items-center justify-between border-b border-[#D4AF37]/15 pb-4 font-sans">
      <div className="space-y-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-2xl font-extrabold text-[#3B0D23] tabular-nums">
            {formatInr(sale)}
          </span>
          {hasPromo && (
            <span className="text-xs text-[#8a8a8a] line-through tabular-nums">
              {formatInr(compare)}
            </span>
          )}
          {hasPromo && (
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider ml-1">
              ({discountPercent}% OFF)
            </span>
          )}
        </div>
        <p className="text-[10px] text-[#8a8a8a] uppercase tracking-wider leading-none">MRP Incl. of all taxes</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Wishlist Button */}
        <button
          type="button"
          onClick={() => toggleWishlist(product)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-black/5 bg-white text-[#514347] hover:bg-[#F8F6F3]/50 transition shadow-sm"
          aria-label="Save to Wishlist"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill={wishlisted ? '#3B0D23' : 'none'}
            stroke={wishlisted ? '#3B0D23' : 'currentColor'}
            strokeWidth="1.75"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </button>

        {/* Share Button */}
        <button
          type="button"
          onClick={handleShare}
          className="relative flex h-9 w-9 items-center justify-center rounded-full border border-black/5 bg-white text-[#514347] hover:bg-[#F8F6F3]/50 transition shadow-sm"
          aria-label="Share product"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          {copied && (
            <span className="absolute bottom-full mb-2 bg-[#1A1A1A] text-white text-[9px] px-2 py-0.5 rounded shadow whitespace-nowrap z-50">
              Copied!
            </span>
          )}
        </button>
      </div>
    </div>
  )
}
