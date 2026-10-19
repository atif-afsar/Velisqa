import { memo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPrimaryImageUrl, getHoverImageUrl } from '../../lib/productImages'
import { getPromoPriceDisplay, formatInr } from '../../lib/promoPricing'
import { getProductBadge, getProductRating, getProductReviewCount, displayProductName } from '../../lib/productDisplay'
import { isProductSoldOut } from '../../lib/cartStock'
import { productPath } from '../../lib/productUrl'
import { useCart } from '../../context/CartContext'
import ProductImage from '../Common/ProductImage'
import ProductWishlistButton from './ProductWishlistButton'
import { CheckIcon, StarIcon } from '../UI/Icons'

const SIZES = '(min-width: 1280px) 22vw, (min-width: 1024px) 28vw, (min-width: 768px) 30vw, 46vw'

function CardBadge({ product, soldOut }) {
  if (soldOut) return <span className="badge bg-ink/80 text-white">Sold out</span>
  const badge = getProductBadge(product)
  if (badge === 'new') return <span className="badge bg-accent-ink text-white">New</span>
  if (badge === 'bestseller') return <span className="badge bg-ink text-white">Bestseller</span>
  return null
}

/**
 * Product tile: 4:5 image (hover swap on desktop), badge, wishlist, rating chip,
 * name, price with saving, and an always-visible "Add to bag" button.
 */
function ProductCard({ product, priority = false, sizes = SIZES }) {
  const { addToCart } = useCart()
  const [added, setAdded] = useState(false)
  const href = productPath(product)
  const name = displayProductName(product.name)
  const soldOut = isProductSoldOut(product)
  const { sale, compare, hasPromo, discountPercent } = getPromoPriceDisplay(product)
  const rating = getProductRating(product)
  const reviewCount = getProductReviewCount(product)

  function add(event) {
    event.preventDefault()
    if (added || soldOut) return
    if (addToCart(product, 1)?.ok) {
      setAdded(true)
      window.setTimeout(() => setAdded(false), 1400)
    }
  }

  return (
    <article className="group relative flex h-full min-w-0 flex-col">
      <div className="relative">
        <Link to={href} className="block" tabIndex={-1} aria-hidden="true">
          <ProductImage
            src={getPrimaryImageUrl(product)}
            hoverSrc={getHoverImageUrl(product)}
            alt=""
            width={600}
            responsiveWidths={[360, 480, 600, 800]}
            sizes={sizes}
            aspect="4 / 5"
            priority={priority}
            className={`w-full ${soldOut ? 'opacity-70' : ''}`}
            imgClassName="img-zoom"
          />
        </Link>

        <div className="pointer-events-none absolute left-2 top-2">
          <CardBadge product={product} soldOut={soldOut} />
        </div>
        <div className="absolute right-1 top-1">
          <ProductWishlistButton product={product} circle />
        </div>
        {reviewCount > 0 && rating > 0 && (
          <p
            className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-1 bg-paper/90 px-1.5 py-0.5 text-[0.6875rem] font-medium text-ink"
            aria-label={`Rated ${rating.toFixed(1)} out of 5 from ${reviewCount} reviews`}
          >
            {rating.toFixed(1)} <StarIcon size={10} filled className="text-accent-ink" />
            <span className="text-muted">| {reviewCount}</span>
          </p>
        )}
      </div>

      <div className="flex flex-1 flex-col pt-2.5">
        <h3 className="text-[0.8125rem] leading-snug text-ink sm:text-sm">
          <Link to={href} className="line-clamp-1 hover:text-accent-ink sm:line-clamp-2">
            {name}
          </Link>
        </h3>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5 text-[0.8125rem] sm:text-sm">
          <span className="type-price font-semibold text-ink">{formatInr(sale)}</span>
          {hasPromo && (
            <>
              <span className="sr-only">, was</span>
              <s className="text-xs text-muted">{formatInr(compare)}</s>
              {discountPercent > 0 && <span className="text-xs font-medium text-accent-ink">{discountPercent}% off</span>}
            </>
          )}
        </p>
        <div className="mt-auto pt-2.5">
        <button
          type="button"
          onClick={add}
          disabled={soldOut}
          aria-label={soldOut ? `${name} is sold out` : `Add ${name} to bag`}
          className={`flex min-h-10 w-full items-center justify-center gap-1.5 border text-[0.6875rem] font-medium uppercase tracking-[0.14em] transition-colors sm:min-h-11 ${
            soldOut
              ? 'cursor-not-allowed border-line text-muted'
              : added
                ? 'border-ink bg-ink text-white'
                : 'border-ink text-ink hover:bg-ink hover:text-white'
          }`}
        >
          {soldOut ? 'Sold out' : added ? (<><CheckIcon size={14} /> Added</>) : 'Add to bag'}
        </button>
        </div>
      </div>
    </article>
  )
}

export default memo(ProductCard)
