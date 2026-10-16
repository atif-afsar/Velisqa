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
import { BagIcon, StarIcon } from '../UI/Icons'

const SIZES = '(min-width: 1280px) 22vw, (min-width: 1024px) 28vw, (min-width: 768px) 30vw, 46vw'

function CardBadge({ product, soldOut, discountPercent }) {
  if (soldOut) return <span className="badge">Sold out</span>
  const badge = getProductBadge(product)
  if (badge === 'new') return <span className="badge badge-accent">New</span>
  if (badge === 'bestseller') return <span className="badge">Bestseller</span>
  if (discountPercent >= 10) return <span className="badge">−{discountPercent}%</span>
  return null
}

/**
 * Product tile: 4:5 image with hover swap, wishlist, quick add, name, price and (real) rating.
 * `variant` is accepted for backwards compatibility with older call sites.
 */
function ProductCard({ product, priority = false, sizes = SIZES }) {
  const { addToCart } = useCart()
  const [adding, setAdding] = useState(false)
  const href = productPath(product)
  const name = displayProductName(product.name)
  const soldOut = isProductSoldOut(product)
  const { sale, compare, hasPromo, discountPercent } = getPromoPriceDisplay(product)
  const rating = getProductRating(product)
  const reviewCount = getProductReviewCount(product)

  function quickAdd(event) {
    event.preventDefault()
    event.stopPropagation()
    if (adding || soldOut) return
    setAdding(true)
    addToCart(product, 1)
    window.setTimeout(() => setAdding(false), 600)
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
            className="w-full"
            imgClassName="img-zoom"
          />
        </Link>

        <div className="pointer-events-none absolute left-2.5 top-2.5 sm:left-3 sm:top-3">
          <CardBadge product={product} soldOut={soldOut} discountPercent={hasPromo ? discountPercent : 0} />
        </div>
        <div className="absolute right-1 top-1 sm:right-1.5 sm:top-1.5">
          <ProductWishlistButton product={product} />
        </div>

        {!soldOut && (
          <>
            {/* Desktop: quick-add bar revealed on hover / focus */}
            <button
              type="button"
              onClick={quickAdd}
              className="btn btn-light absolute inset-x-3 bottom-3 hidden min-h-11 translate-y-2 opacity-0 shadow-sm transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100 md:flex"
              aria-label={`Quick add ${name} to bag`}
            >
              {adding ? 'Added' : 'Quick add'}
            </button>
            {/* Touch: compact bag button */}
            <button
              type="button"
              onClick={quickAdd}
              className="absolute bottom-2 right-2 grid h-11 w-11 place-items-center rounded-full bg-paper/95 text-ink shadow-sm md:hidden"
              aria-label={`Add ${name} to bag`}
            >
              <BagIcon size={18} />
            </button>
          </>
        )}
      </div>

      <div className="flex flex-1 flex-col pt-3">
        <h3 className="text-[0.8125rem] leading-snug text-ink sm:text-sm">
          <Link to={href} className="line-clamp-2 hover:text-accent-ink">
            {name}
          </Link>
        </h3>
        <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2 text-[0.8125rem] sm:text-sm">
          <span className="type-price text-ink">{formatInr(sale)}</span>
          {hasPromo && (
            <>
              <span className="sr-only">, was</span>
              <s className="text-muted">{formatInr(compare)}</s>
            </>
          )}
        </p>
        {reviewCount > 0 && rating > 0 && (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted" aria-label={`Rated ${rating} out of 5 from ${reviewCount} reviews`}>
            <StarIcon size={12} className="text-ink" />
            {rating.toFixed(1)} <span>({reviewCount})</span>
          </p>
        )}
      </div>
    </article>
  )
}

export default memo(ProductCard)
