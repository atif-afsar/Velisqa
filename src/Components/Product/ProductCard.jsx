import { Link } from 'react-router-dom'
import { getPrimaryImageUrl } from '../../lib/productImages'
import ProductPromoBadge from './ProductPromoBadge'
import ProductPriceDisplay from './ProductPriceDisplay'
import ProductCardActions from './ProductCardActions'

export default function ProductCard({ product }) {
  const detailPath = `/product/${product.id}`
  const imageUrl = getPrimaryImageUrl(product)

  return (
    <article className="group flex h-full flex-col overflow-visible rounded-lg border border-[#d4af37]/15 bg-[#fbf7f1] p-2 shadow-[0_18px_44px_-28px_rgba(19,0,6,0.35)] transition duration-300 hover:-translate-y-1 hover:border-[#d4af37]/35 sm:p-3">
      <Link
        to={detailPath}
        className="relative aspect-[4/5] shrink-0 overflow-hidden rounded-md bg-[#f1ede8]"
        aria-label={`View ${product.name}`}
      >
        <ProductPromoBadge />
        {imageUrl ? (
          <img
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            src={imageUrl}
            alt={product.name}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-[#847377]">No image</div>
        )}
      </Link>

      <div className="flex flex-1 flex-col items-stretch overflow-visible px-1 pb-2 pt-2.5 text-center sm:px-1.5 sm:pb-2.5 sm:pt-4">
        <Link to={detailPath} className="block w-full shrink-0">
          <h4 className="line-clamp-2 min-h-[2.35rem] font-serif text-[0.88rem] leading-snug text-[#130006] transition hover:text-[#6f334a] sm:min-h-[2.5rem] sm:text-xl lg:text-2xl">
            {product.name}
          </h4>
        </Link>

        <div className="mt-1 flex min-h-[2.1rem] shrink-0 items-center justify-center sm:mt-1.5 sm:min-h-[2.35rem]">
          <ProductPriceDisplay price={product.price} size="card" />
        </div>

        <div className="mt-auto w-full shrink-0 pt-2">
          <ProductCardActions product={product} />
        </div>
      </div>
    </article>
  )
}
