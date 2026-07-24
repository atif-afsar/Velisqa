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
          ? 'group flex h-full flex-col'
          : 'group flex h-full flex-col overflow-visible rounded-lg border border-[#d4af37]/15 bg-[#fbf7f1] p-2 shadow-[0_18px_44px_-28px_rgba(19,0,6,0.35)] transition duration-300 hover:-translate-y-1 hover:border-[#d4af37]/35 sm:p-3'
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
          {!catalog && (
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#130006]/55 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 max-sm:hidden"
              aria-hidden
            />
          )}
        </Link>

        <div className={`absolute z-10 ${catalog ? 'right-2 top-2' : 'right-2 top-2 sm:right-3 sm:top-3'}`}>
          <ProductWishlistButton product={product} size="sm" />
        </div>

        {!catalog && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 hidden p-2.5 opacity-0 transition-opacity duration-300 group-hover:pointer-events-auto group-hover:opacity-100 sm:block sm:p-3">
            <ProductCardActions product={product} variant="overlay" />
          </div>
        )}

        {catalog && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 hidden p-3 opacity-0 transition-opacity duration-300 group-hover:pointer-events-auto group-hover:opacity-100 md:block">
            <ProductCardActions product={product} variant="overlay" />
          </div>
        )}
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

        {!catalog && <ProductRating product={product} className="mt-1.5 sm:mt-2" size="card" />}

        <div
          className={
            catalog
              ? 'mt-1.5 flex items-center gap-2'
              : 'mt-1 flex min-h-[2.1rem] shrink-0 items-center justify-center sm:mt-1.5 sm:min-h-[2.35rem]'
          }
        >
          <ProductPriceDisplay product={product} size={catalog ? 'compact' : 'card'} />
          {catalog && !soldOut && (
            <span className="hidden text-[11px] text-[#888] sm:inline">·</span>
          )}
          {catalog && !soldOut && (
            <ProductRating product={product} className="hidden sm:flex" size="compact" />
          )}
        </div>

        {catalog ? (
          <>
            <div className="mt-3 md:hidden">
              <ProductCardActions product={product} variant="footer" />
            </div>
            {!soldOut && (
              <div className="mt-3 hidden md:block">
                <Link
                  to={detailPath}
                  className="inline-flex text-[12px] font-medium text-[#130006] underline-offset-2 hover:underline"
                >
                  View product
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className="mt-auto w-full shrink-0 pt-2 sm:pt-2.5">
            {soldOut ? (
              <ProductCardActions product={product} variant="footer" />
            ) : (
              <>
                <div className="sm:hidden">
                  <ProductCardActions product={product} variant="footer" />
                </div>
                <div className="hidden sm:block">
                  <Link
                    to={detailPath}
                    className="tap-target flex w-full items-center justify-center rounded-full border border-[#3d0a21]/20 bg-white py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#3d0a21] transition hover:border-[#3d0a21]/40 hover:bg-[#fdf9f4]"
                  >
                    View details
                  </Link>
                </div>
              </>
            )}
          </div>
        )}

        {catalog && soldOut && (
          <div className="mt-3">
            <ProductCardActions product={product} variant="footer" />
          </div>
        )}
      </div>
    </article>
  )
}

export default memo(ProductCard)
