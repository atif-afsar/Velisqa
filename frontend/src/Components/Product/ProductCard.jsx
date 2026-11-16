import { memo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPrimaryImageUrl, getHoverImageUrl } from '../../lib/productImages'
import { getPromoPriceDisplay, formatInr } from '../../lib/promoPricing'
import { getProductBadge, getProductRating, getProductReviewCount, displayProductName, productAlt } from '../../lib/productDisplay'
import { getProductStock, isProductSoldOut } from '../../lib/cartStock'
import { productPath } from '../../lib/productUrl'
import { bestOfferForPrice, useOffers } from '../../lib/offers'
import { useCart } from '../../context/CartContext'
import ProductImage from '../Common/ProductImage'
import ProductWishlistButton from './ProductWishlistButton'
import { BagIcon, CheckIcon, StarIcon } from '../UI/Icons'

const SIZES = '(min-width: 1280px) 22vw, (min-width: 1024px) 28vw, (min-width: 768px) 30vw, 46vw'

/** At most one badge: Sold out › Only X left › New › Bestseller. */
function CardBadge({ product, soldOut, stock }) {
  if (soldOut) return <span className="badge bg-ink/80 text-white">Sold out</span>
  if (stock > 0 && stock <= 3) return <span className="badge bg-paper text-accent-ink">Only {stock} left</span>
  const badge = getProductBadge(product)
  if (badge === 'new') return <span className="badge bg-accent-ink text-white">New</span>
  if (badge === 'bestseller') return <span className="badge bg-ink text-white">Bestseller</span>
  return null
}

/**
 * Product tile: padded 4:5 image (hover swap on desktop), one badge, wishlist, quick-add bag button
 * on the image, a 2-line name, price · MRP · % off, real rating, and the live best-offer line.
 */
function ProductCard({ product, priority = false, sizes = SIZES }) {
  const { addToCart } = useCart()
  const offers = useOffers()
  const [added, setAdded] = useState(false)
  const href = productPath(product)
  const name = displayProductName(product.name)
  const soldOut = isProductSoldOut(product)
  const stock = getProductStock(product)
  const { sale, compare, hasPromo, discountPercent } = getPromoPriceDisplay(product)
  const rating = getProductRating(product)
  const reviewCount = getProductReviewCount(product)
  const best = soldOut ? null : bestOfferForPrice(sale, offers)

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
            alt={productAlt(product)}
            width={600}
            responsiveWidths={[360, 480, 600, 800]}
            sizes={sizes}
            aspect="4 / 5"
            priority={priority}
            pad
            className={`w-full ${soldOut ? 'opacity-70' : ''}`}
            imgClassName="img-zoom"
          />
        </Link>

        <div className="pointer-events-none absolute left-2 top-2">
          <CardBadge product={product} soldOut={soldOut} stock={stock} />
        </div>
        <div className="absolute right-1 top-1">
          <ProductWishlistButton product={product} circle />
        </div>
        {!soldOut && (
          <button
            type="button"
            onClick={add}
            aria-label={added ? `${name} added to bag` : `Add ${name} to bag`}
            className={`absolute bottom-2 right-2 grid h-11 w-11 place-items-center rounded-full shadow-sm transition-colors ${
              added ? 'bg-ink text-white' : 'bg-paper/95 text-ink hover:bg-ink hover:text-white'
            }`}
          >
            {added ? <CheckIcon size={18} /> : <BagIcon size={18} />}
            {!added && (
              <span aria-hidden="true" className="absolute right-1.5 top-1.5 grid h-3.5 w-3.5 place-items-center rounded-full bg-ink text-[0.625rem] font-semibold leading-none text-white">
                +
              </span>
            )}
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col pt-2.5">
        <h3 className="min-h-[2.6em] text-[0.8125rem] leading-snug text-ink sm:text-sm">
          <Link to={href} className="line-clamp-2 hover:text-accent-ink">
            {name}
          </Link>
        </h3>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5 text-[0.8125rem] sm:text-sm">
          <span className="type-price font-semibold text-ink">{formatInr(sale)}</span>
          {hasPromo && (
            <>
              <span className="sr-only">, MRP</span>
              <s className="text-xs text-muted">{formatInr(compare)}</s>
              {discountPercent > 0 && <span className="text-xs font-semibold text-accent-ink">{discountPercent}% off</span>}
            </>
          )}
        </p>
        {reviewCount > 0 && rating > 0 && (
          <p className="mt-1 flex items-center gap-1 text-xs text-body" aria-label={`Rated ${rating.toFixed(1)} out of 5 from ${reviewCount} reviews`}>
            <StarIcon size={12} filled className="text-accent-ink" />
            <span className="font-medium text-ink">{rating.toFixed(1)}</span>
            <span className="text-muted">({reviewCount})</span>
          </p>
        )}
        {best && (
          <p className="mt-1 text-xs font-medium text-success">
            Get it for {formatInr(best.price)} with {best.code}
          </p>
        )}
      </div>
    </article>
  )
}

export default memo(ProductCard)
