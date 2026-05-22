import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { getProductStock } from '../../lib/cartStock'

export default function AddToCartButton({
  product,
  quantity = 1,
  className = '',
  size = 'sm',
  showViewCartLink = false,
}) {
  const { addToCart, itemCount } = useCart()
  const [adding, setAdding] = useState(false)
  const stock = getProductStock(product)
  const soldOut = stock <= 0

  async function handleClick(e) {
    e.preventDefault()
    e.stopPropagation()
    if (adding || soldOut) return

    setAdding(true)
    addToCart(product, quantity)
    setAdding(false)
  }

  const sizeClass =
    size === 'lg'
      ? 'px-8 py-3.5 text-xs sm:text-sm'
      : 'px-3 py-2 text-[0.65rem] sm:px-5 sm:py-2.5 sm:text-xs'

  if (soldOut) {
    return (
      <div className={`flex w-full flex-col items-center gap-1.5 ${className}`}>
        <button
          type="button"
          disabled
          className={`tap-target w-full cursor-not-allowed rounded-full border border-[#c9a75a]/40 bg-[#c9a75a]/10 font-semibold uppercase tracking-[0.12em] text-[#8a6b1f] opacity-90 ${sizeClass}`}
        >
          Out of stock
        </button>
        <p className="text-center text-[9px] leading-snug text-[#847377] sm:text-[10px]">
          Request this product —{' '}
          <Link to="/contact" className="font-medium text-[#6f334a] underline-offset-2 hover:underline">
            contact us
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className={`flex w-full flex-col items-center gap-1.5 ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={adding}
        className={`tap-target w-full rounded-full border border-[#3d0a21]/25 bg-white font-semibold uppercase tracking-[0.12em] text-[#3d0a21] shadow-[0_8px_24px_-12px_rgba(19,0,6,0.2)] transition hover:border-[#3d0a21]/45 hover:bg-[#fdf9f4] disabled:opacity-60 ${sizeClass}`}
      >
        {adding ? 'Adding…' : 'Add to cart'}
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
