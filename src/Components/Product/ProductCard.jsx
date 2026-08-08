import { memo } from 'react'
import { Link } from 'react-router-dom'
import { getPrimaryImageUrl } from '../../lib/productImages'
import ProductImage from '../Common/ProductImage'
import ProductPromoBadge from './ProductPromoBadge'
import ProductPriceDisplay from './ProductPriceDisplay'
import ProductCardActions from './ProductCardActions'
import ProductRating from './ProductRating'
import ProductBadgeLabel from './ProductBadgeLabel'
import ProductWishlistButton from './ProductWishlistButton'
import ProductSoldOutBadge from './ProductSoldOutBadge'
import { isProductSoldOut } from '../../lib/cartStock'

function ProductCard({ product, priority = false, variant = 'default' }) {
  const detailPath = `/product/${product.id}`
  const imageUrl = getPrimaryImageUrl(product)
  const soldOut = isProductSoldOut(product)
  const catalog = variant === 'catalog'

  return (
    <article
      className={
        catalog
          ? 'group flex h-full flex-col max-w-safe'
          : 'group flex h-full flex-col overflow-visible rounded-lg border border-[#d4af37]/15 bg-[#fbf7f1] p-2 shadow-[0_18px_44px_-28px_rgba(19,0,6,0.35)] transition duration-300 hover:-translate-y-1 hover:border-[#d4af37]/35 sm:p-3 max-w-safe'
      }
    >
      <div className={`relative shrink-0 ${catalog ? 'isolate overflow-hidden' : ''}`}>
        <Link
          to={detailPath}
          className={`relative block overflow-hidden bg-[#f5f5f5] ${
            catalog ? '' : 'aspect-[4/5] rounded-md bg-[#f1ede8]'
          }`}
          aria-label={`View ${product.name}`}
        >
          <ProductPromoBadge product={product} />
          {soldOut && <ProductSoldOutBadge />}
          {!catalog && <ProductBadgeLabel product={product} placement="image" />}
          <ProductImage
            src={imageUrl}
            alt={product.name}
            width={catalog ? 720 : 500}
            responsiveWidths={catalog ? [400, 560, 720, 960] : [320, 500, 720]}
            sizes={
              catalog
                ? '(min-width: 1280px) 18vw, (min-width: 1024px) 22vw, (min-width: 640px) 30vw, 46vw'
                : '(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 50vw'
            }
            aspect={catalog ? '3 / 4' : '4 / 5'}
            priority={priority}
            className={catalog ? 'w-full' : 'h-full w-full'}
            imgClassName={`object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] ${catalog ? '' : 'rounded-md group-hover:scale-105'}`}
          />
        </Link>

        <div className={`absolute z-10 ${catalog ? 'right-2 top-2' : 'right-2 top-2 sm:right-3 sm:top-3'}`}>
          <ProductWishlistButton product={product} size="sm" />
        </div>
      </div>

      <div
        className={
          catalog
            ? 'flex flex-1 flex-col pt-3'
            : 'flex flex-1 flex-col items-stretch overflow-visible px-1 pb-2 pt-2.5 text-center sm:px-1.5 sm:pb-2.5 sm:pt-3'
        }
      >
        {!catalog && (
          <div className="mb-1 flex justify-center sm:hidden">
            <ProductBadgeLabel product={product} placement="inline" />
          </div>
        )}

        <Link to={detailPath} className="block w-full shrink-0">
          <h4
            className={
              catalog
                ? 'line-clamp-2 text-[13px] font-normal leading-snug text-[#130006] sm:text-sm'
                : 'line-clamp-2 min-h-[2.35rem] font-serif text-[0.88rem] leading-snug text-[#130006] transition hover:text-[#6f334a] sm:min-h-[2.5rem] sm:text-xl lg:text-2xl'
            }
          >
            {product.name}
          </h4>
        </Link>

        {!catalog && (
          <div
            className={
              'mt-1 flex min-h-[2.1rem] shrink-0 items-center justify-center sm:mt-1.5 sm:min-h-[2.35rem]'
            }
          >
            <ProductPriceDisplay product={product} size="card" />
          </div>
        )}

        {!catalog && (
          <div className="mt-1.5">
            <ProductRating product={product} className="justify-center" size="card" />
          </div>
        )}

        {catalog && (
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <ProductPriceDisplay product={product} size="compact" />
          </div>
        )}

        {catalog && (
          <div className="mt-1.5">
            <ProductRating product={product} className="justify-start" size="compact" />
          </div>
        )}

        <div className={`${catalog ? 'mt-3' : 'mt-auto w-full shrink-0 pt-2 sm:pt-2.5'}`}>
          <ProductCardActions product={product} />
        </div>
      </div>
    </article>
  )
}

export default memo(ProductCard)
