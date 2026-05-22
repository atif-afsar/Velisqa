import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { getProductStock } from '../../lib/cartStock'
import QuantityStepper from '../Cart/QuantityStepper'
import BuyNowButton from '../WhatsApp/BuyNowButton'

/** Product page: quantity → add to bag → view cart → optional single-item WhatsApp. */
export default function ProductPurchasePanel({ product, productUrl, soldOut }) {
  const { addToCart, itemCount } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)
  const stock = getProductStock(product)

  function handleAdd() {
    if (adding || soldOut) return
    setAdding(true)
    addToCart(product, quantity)
    setAdding(false)
  }

  if (soldOut) {
    return (
      <div className="mt-6 space-y-3 sm:mt-8">
        <BuyNowButton
          productName={product.name}
          productUrl={productUrl}
          soldOut
          className="w-full px-8 py-4"
        >
          Enquire to purchase
        </BuyNowButton>
      </div>
    )
  }

  return (
    <div className="mt-6 space-y-4 sm:mt-8">
      <div className="rounded-xl border border-[#d4af37]/20 bg-[#fbf7f1] px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6f334a]">How to order</p>
        <ol className="mt-2 space-y-1.5 text-xs leading-relaxed text-[#514347]">
          <li>
            <span className="font-semibold text-[#130006]">1.</span> Choose quantity and tap{' '}
            <span className="font-semibold">Add to bag</span>
          </li>
          <li>
            <span className="font-semibold text-[#130006]">2.</span> Open{' '}
            <span className="font-semibold">Cart</span> (top menu) to review items
          </li>
          <li>
            <span className="font-semibold text-[#130006]">3.</span> Checkout on WhatsApp — we confirm
            stock &amp; delivery
          </li>
        </ol>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#847377]">Quantity</span>
        <QuantityStepper value={quantity} max={stock} onChange={setQuantity} />
        {stock <= 3 && (
          <span className="text-[10px] font-medium text-[#847377]">Only {stock} left</span>
        )}
      </div>

      <button
        type="button"
        onClick={handleAdd}
        disabled={adding}
        className="tap-target flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-[#3d0a21] px-6 py-3.5 text-xs font-bold uppercase tracking-[0.12em] text-[#e9c349] shadow-[0_12px_32px_rgba(19,0,6,0.28)] transition hover:bg-[#2a0718] disabled:opacity-60 sm:text-sm"
      >
        {adding ? 'Adding…' : 'Add to bag'}
      </button>

      {itemCount > 0 ? (
        <Link
          to="/cart"
          className="tap-target flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border-2 border-[#3d0a21]/30 bg-white px-6 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[#3d0a21] transition hover:border-[#3d0a21]/50 hover:bg-[#fdf9f4]"
        >
          View bag &amp; checkout
          <span className="rounded-full bg-[#3d0a21] px-2 py-0.5 text-[10px] text-[#e9c349]">{itemCount}</span>
        </Link>
      ) : (
        <p className="text-center text-[10px] text-[#847377]">
          Your bag is empty — add this piece, then open Cart in the menu.
        </p>
      )}

      <div className="border-t border-[#d4af37]/20 pt-4">
        <p className="mb-2 text-center text-[10px] uppercase tracking-[0.12em] text-[#847377]">
          Or buy only this item
        </p>
        <BuyNowButton productName={product.name} productUrl={productUrl} className="w-full px-6 py-3">
          WhatsApp — this item only
        </BuyNowButton>
      </div>
    </div>
  )
}
