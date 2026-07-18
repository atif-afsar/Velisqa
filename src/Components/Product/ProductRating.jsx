import { getProductRating, getProductReviewCount, formatReviewCount } from '../../lib/productDisplay'

export default function ProductRating({ product, className = '', size = 'card' }) {
  const rating = getProductRating(product)
  const reviewCount = getProductReviewCount(product)
  const stars = Math.round(rating * 2) / 2
  const fullStars = Math.floor(stars)
  const halfStar = stars - fullStars >= 0.5

  const starSize = size === 'detail' ? 'text-sm' : 'text-[11px] sm:text-xs'
  const textSize = size === 'detail' ? 'text-sm' : 'text-[10px] sm:text-xs'

  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-1.5 ${textSize} text-[#514347] ${className}`}
      aria-label={`Rated ${rating} out of 5 from ${reviewCount} reviews`}
    >
      <span className={`inline-flex items-center gap-0.5 ${starSize} text-[#d4af37]`} aria-hidden>
        {Array.from({ length: 5 }, (_, i) => {
          const filled = i < fullStars
          const half = i === fullStars && halfStar
          return (
            <span key={`star-${i + 1}`} className="relative inline-block leading-none">
              <span className={filled || half ? 'text-[#d4af37]' : 'text-[#d4af37]/25'}>★</span>
              {half && (
                <span
                  className="absolute inset-0 w-1/2 overflow-hidden text-[#d4af37]"
                  style={{ clipPath: 'inset(0 50% 0 0)' }}
                >
                  ★
                </span>
              )}
            </span>
          )
        })}
      </span>
      <span className="font-semibold tabular-nums text-[#130006]">{rating.toFixed(1)}</span>
      <span className="text-[#847377]" aria-hidden>
        |
      </span>
      <span className="text-[#514347]">({formatReviewCount(reviewCount)})</span>
    </div>
  )
}
