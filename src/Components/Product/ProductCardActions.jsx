import { useState } from 'react'
import { useCart } from '../../context/CartContext'
import { isProductSoldOut } from '../../lib/cartStock'
import { SITE_URL } from '../SEO/siteConfig'
import BuyNowButton from '../WhatsApp/BuyNowButton'
import { productPath } from '../../lib/productUrl'

/** Palmonas-style minimal add button — shared across product cards. */
export const PRODUCT_ADD_BTN_CLASS =
  'flex h-10 w-full items-center justify-center rounded-lg border border-slate-900 bg-white px-3 text-xs sm:text-sm font-semibold tracking-wider text-slate-900 transition duration-200 hover:bg-ink hover:text-white hover:border-line active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 shadow-2xs'

/** Product card footer: add to cart, or out-of-stock + enquire. */
export default function ProductCardActions({ product }) {
  const { addToCart } = useCart()
  const [adding, setAdding] = useState(false)
  const soldOut = isProductSoldOut(product)
  const productUrl = product.id ? `${SITE_URL}${productPath(product)}` : null

  function handleAdd(e) {
    e.preventDefault()
    e.stopPropagation()
    if (adding || soldOut) return
    setAdding(true)
    addToCart(product, 1)
    window.setTimeout(() => setAdding(false), 400)
  }

  if (soldOut) {
    return (
      <div className="w-full shrink-0 space-y-1.5" onClick={(e) => e.stopPropagation()} role="presentation">
        <p className={`${PRODUCT_ADD_BTN_CLASS} cursor-default border-muted/35 bg-[#fafafa] text-muted`}>
          Out of stock
        </p>
        <BuyNowButton
          product={product}
          productUrl={productUrl}
          soldOut
          className="w-full rounded-[3px] px-3 py-2 text-[11px]"
        />
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      disabled={adding}
      className={`${PRODUCT_ADD_BTN_CLASS} shrink-0`}
    >
      {adding ? 'Adding…' : 'Add to Cart'}
    </button>
  )
}
