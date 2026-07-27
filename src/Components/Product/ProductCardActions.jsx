import { useState } from 'react'
import { useCart } from '../../context/CartContext'
import { isProductSoldOut } from '../../lib/cartStock'
import { SITE_URL } from '../SEO/siteConfig'
import BuyNowButton from '../WhatsApp/BuyNowButton'

/** Palmonas-style minimal add button — shared across product cards. */
export const PRODUCT_ADD_BTN_CLASS =
  'flex h-9 w-full items-center justify-center rounded-[3px] border border-[#130006] bg-white px-2 text-[11px] font-normal tracking-normal text-[#130006] transition hover:bg-[#fafafa] disabled:cursor-not-allowed disabled:opacity-50 sm:text-xs'

/** Product card footer: add to cart, or out-of-stock + enquire. */
export default function ProductCardActions({ product }) {
  const { addToCart } = useCart()
  const [adding, setAdding] = useState(false)
  const soldOut = isProductSoldOut(product)
  const productUrl = product.id ? `${SITE_URL}/product/${product.id}` : null

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
        <p className={`${PRODUCT_ADD_BTN_CLASS} cursor-default border-[#847377]/35 bg-[#fafafa] text-[#847377]`}>
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
