import { Link } from 'react-router-dom'
import { getProductRating, getProductReviewCount, formatReviewCount } from '../../lib/productDisplay'

function RatingShell({ linkToReviews, className, children, ariaLabel }) {
  const baseClass = `flex flex-wrap items-center gap-1.5 ${className}`

  if (linkToReviews) {
    return (
      <Link
        to="#product-reviews"
        className={`${baseClass} transition hover:text-[#3d0a21]`}
        aria-label={ariaLabel}
      >
        {children}
      </Link>
    )
  }

  return (
    <div className={baseClass} aria-label={ariaLabel}>
      {children}
    </div>
  )
}

export default function ProductRating({ product, className = '', size = 'card', linkToReviews = false }) {
  const rating = getProductRating(product)
  const reviewCount = getProductReviewCount(product)
  const stars = Math.round(rating * 2) / 2
  const fullStars = Math.floor(stars)
  const halfStar = stars - fullStars >= 0.5

  const starSize =
    size === 'detail' ? 'text-sm' : size === 'compact' ? 'text-[10px]' : 'text-[11px] sm:text-xs'
  const textSize =
    size === 'detail' ? 'text-sm' : size === 'compact' ? 'text-[10px]' : 'text-[10px] sm:text-xs'
  const alignClass = size === 'compact' ? 'justify-start' : 'justify-center'

  if (reviewCount === 0 || rating === 0) {
    return (
      <RatingShell
        linkToReviews={linkToReviews}
        className={`${alignClass} ${textSize} text-[#847377] ${className}`}
        ariaLabel="No customer reviews yet"
      >
        <span className={`${starSize} text-[#d4af37]/45`} aria-hidden>☆☆☆☆☆</span>
        <span>No reviews yet</span>
      </RatingShell>
    )
  }

  return (
    <RatingShell
      linkToReviews={linkToReviews}
      className={`${alignClass} ${textSize} text-[#514347] ${className}`}
      ariaLabel={`Rated ${rating} out of 5 from ${reviewCount} reviews`}
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
    </RatingShell>
  )
}
