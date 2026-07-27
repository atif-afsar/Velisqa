import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { isProductSoldOut } from '../../lib/cartStock'
import { PRODUCT_ADD_BTN_CLASS } from '../Product/ProductCardActions'

export default function AddToCartButton({
  product,
  quantity = 1,
  className = '',
  size = 'sm',
  showViewCartLink = false,
}) {
  const { addToCart, itemCount } = useCart()
  const [adding, setAdding] = useState(false)
  const soldOut = isProductSoldOut(product)

  async function handleClick(e) {
    e.preventDefault()
    e.stopPropagation()
    if (adding || soldOut) return

    setAdding(true)
    addToCart(product, quantity)
    setAdding(false)
  }

  const btnClass =
    size === 'lg'
      ? `${PRODUCT_ADD_BTN_CLASS} h-10 text-xs sm:text-sm`
      : PRODUCT_ADD_BTN_CLASS

  if (soldOut) {
    return (
      <div className={`flex w-full flex-col items-center gap-1.5 ${className}`}>
        <button
          type="button"
          disabled
          className={`${btnClass} cursor-not-allowed border-[#847377]/35 bg-[#fafafa] text-[#847377]`}
        >
          Out of stock
        </button>
        <p className="text-center text-[9px] leading-snug text-[#847377] sm:text-[10px]">
          Request this product —{' '}
          <Link to="/order" className="font-medium text-[#6f334a] underline-offset-2 hover:underline">
            order on WhatsApp
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className={`flex w-full flex-col items-center gap-1.5 ${className}`}>
      <button type="button" onClick={handleClick} disabled={adding} className={btnClass}>
        {adding ? 'Adding…' : 'Add to Cart'}
      </button>
      {showViewCartLink && itemCount > 0 && (
        <Link
          to="/cart"
          className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#6f334a] underline-offset-2 hover:underline sm:text-[10px]"
          onClick={(e) => e.stopPropagation()}
        >
          View cart ({itemCount})
        </Link>
      )}
    </div>
  )
}
