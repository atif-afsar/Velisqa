import { Link } from 'react-router-dom'
import BuyNowButton from '../WhatsApp/BuyNowButton'
import { SITE_URL } from '../SEO/siteConfig'
import { getPrimaryImageUrl } from '../../lib/productImages'
import ProductPromoBadge from './ProductPromoBadge'
import ProductPriceDisplay from './ProductPriceDisplay'

export default function ProductCard({ product }) {
  const detailPath = `/product/${product.id}`
  const productUrl = `${SITE_URL}${detailPath}`
  const soldOut = Number(product.stock) <= 0
  const imageUrl = getPrimaryImageUrl(product)

  return (
    <article className="group flex h-full flex-col rounded-lg border border-[#d4af37]/15 bg-[#fbf7f1] p-2 shadow-[0_18px_44px_-28px_rgba(19,0,6,0.35)] transition duration-300 hover:-translate-y-1 hover:border-[#d4af37]/35 sm:p-3">
      <Link
        to={detailPath}
        className="relative aspect-[4/5] overflow-hidden rounded-md bg-[#f1ede8]"
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

      <div className="flex flex-1 flex-col items-center px-1 pb-1 pt-3 text-center sm:pt-5">
        <Link to={detailPath} className="text-center">
          <h4 className="font-serif text-[1.05rem] leading-tight text-[#130006] transition hover:text-[#6f334a] sm:text-2xl">
            {product.name}
          </h4>
        </Link>
        <div className="mt-2 sm:mt-2.5">
          <ProductPriceDisplay price={product.price} size="card" />
        </div>
        {soldOut && (
          <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-[#c9a75a]">Sold out</p>
        )}
        <div className="mt-3 flex w-full justify-center sm:mt-4">
          <BuyNowButton
            productName={product.name}
            productUrl={productUrl}
            soldOut={soldOut}
            className="w-full px-3 py-2 sm:w-auto sm:px-5 sm:py-2.5"
          >
            Buy Now
          </BuyNowButton>
        </div>
      </div>
    </article>
  )
}
