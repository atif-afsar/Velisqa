import { memo } from 'react'
import { Link } from 'react-router-dom'
import { getPrimaryImageUrl, getHoverImageUrl } from '../../lib/productImages'
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
  const hoverImageUrl = getHoverImageUrl(product)
  const soldOut = isProductSoldOut(product)
  const catalog = variant === 'catalog'

  return (
    <article
      className={
        catalog
          ? 'group flex h-full flex-col max-w-safe'
          : 'group flex h-full flex-col overflow-visible rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#C9A96E]/80 hover:shadow-md sm:p-3 max-w-safe'
      }
    >
      <div className={`relative shrink-0 ${catalog ? 'isolate overflow-hidden' : ''}`}>
        <Link
          to={detailPath}
          className={`relative block overflow-hidden bg-[#FAF9F6] ${
            catalog ? '' : 'aspect-[4/5] rounded-lg bg-[#FAF9F6]'
          }`}
          aria-label={`View ${product.name}`}
        >
          <ProductPromoBadge product={product} />
          {soldOut && <ProductSoldOutBadge />}
          {!catalog && <ProductBadgeLabel product={product} placement="image" />}
          <ProductImage
            src={imageUrl}
            hoverSrc={hoverImageUrl}
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
            imgClassName={`object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] ${catalog ? '' : 'rounded-lg group-hover:scale-105'}`}
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


        <Link to={detailPath} className="block w-full shrink-0">
          <h4
            className={
              catalog
                ? 'line-clamp-2 text-sm font-semibold leading-snug text-slate-900 sm:text-base hover:text-[#8B6914] transition-colors'
                : 'line-clamp-2 min-h-[2.5rem] font-sans text-sm font-bold leading-snug text-slate-900 transition hover:text-[#8B6914] sm:min-h-[2.75rem] sm:text-base lg:text-lg'
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
