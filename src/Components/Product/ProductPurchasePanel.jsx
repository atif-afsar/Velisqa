import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { useWishlist } from '../../context/WishlistContext'
import { getProductStock } from '../../lib/cartStock'
import QuantityStepper from '../Cart/QuantityStepper'
import BuyNowButton from '../WhatsApp/BuyNowButton'

export default function ProductPurchasePanel({ product, productUrl, soldOut }) {
  const { addToCart, itemCount } = useCart()
  const { isWishlisted, toggleWishlist } = useWishlist()
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)
  const stock = getProductStock(product)
  const wishlisted = isWishlisted(product.id)

  function handleAdd() {
    if (adding || soldOut) return
    setAdding(true)
    addToCart(product, quantity)
    window.setTimeout(() => setAdding(false), 400)
  }

  if (soldOut) {
    return (
      <div className="mt-6 space-y-3">
        <BuyNowButton
          productName={product.name}
          productUrl={productUrl}
          soldOut
          className="w-full px-6 py-3.5"
        >
          Enquire on WhatsApp
        </BuyNowButton>
      </div>
    )
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#847377]">
          Qty
        </span>
        <QuantityStepper value={quantity} max={stock} onChange={setQuantity} />
        {stock <= 3 && (
          <span className="text-xs text-[#6f334a]">Only {stock} left</span>
        )}
      </div>

      <button
        type="button"
        onClick={handleAdd}
        disabled={adding}
        className="tap-target hidden min-h-[50px] w-full items-center justify-center rounded-full bg-[#3d0a21] text-sm font-bold uppercase tracking-[0.1em] text-[#e9c349] transition hover:bg-[#2a0718] disabled:opacity-60 lg:flex"
      >
        {adding ? 'Adding…' : 'Add to bag'}
      </button>

      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => toggleWishlist(product)}
          aria-pressed={wishlisted}
          className={`tap-target flex min-h-[46px] items-center justify-center gap-1.5 rounded-full border text-[11px] font-bold uppercase tracking-[0.08em] transition ${
            wishlisted
              ? 'border-[#3d0a21]/30 bg-[#3d0a21]/5 text-[#3d0a21]'
              : 'border-[#130006]/15 bg-white text-[#514347] hover:border-[#3d0a21]/25'
          }`}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill={wishlisted ? 'currentColor' : 'none'}
            aria-hidden
          >
            <path
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
          {wishlisted ? 'Saved' : 'Wishlist'}
        </button>
        <BuyNowButton productName={product.name} productUrl={productUrl} className="min-h-[46px] w-full px-3 py-2.5 text-[11px]">
          Buy now
        </BuyNowButton>
      </div>

      {itemCount > 0 && (
        <Link
          to="/cart"
          className="tap-target flex w-full items-center justify-center gap-2 rounded-full border border-[#3d0a21]/20 py-2.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[#3d0a21] transition hover:bg-[#3d0a21]/5"
        >
          View bag
          <span className="rounded-full bg-[#3d0a21] px-2 py-0.5 text-[10px] text-[#e9c349]">
            {itemCount}
          </span>
        </Link>
      )}
    </div>
  )
}
