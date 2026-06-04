import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { formatInr, getPromoPriceDisplay } from '../../lib/promoPricing'
import { SITE_URL } from '../SEO/siteConfig'
import BuyNowButton from '../WhatsApp/BuyNowButton'

/** Mobile-only sticky add-to-bag bar (Palmonas-style) */
export default function ProductStickyBar({ product, soldOut }) {
  const { addToCart, itemCount } = useCart()
  const [adding, setAdding] = useState(false)
  const { sale } = getPromoPriceDisplay(product.price)

  function handleAdd() {
    if (adding || soldOut) return
    setAdding(true)
    addToCart(product, 1)
    window.setTimeout(() => setAdding(false), 400)
  }

  if (soldOut) {
    const productUrl = product.id ? `${SITE_URL}/product/${product.id}` : null
    return (
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#130006]/10 bg-[#fdf9f4]/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
        <div className="mx-auto max-w-lg">
          <BuyNowButton
            productName={product.name}
            productUrl={productUrl}
            soldOut
            className="w-full px-5 py-3 text-[11px]"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#130006]/10 bg-[#fdf9f4]/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
      <div className="mx-auto flex max-w-lg items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-medium text-[#514347]">{product.name}</p>
          <p className="font-serif text-lg font-medium tabular-nums text-[#130006]">{formatInr(sale)}</p>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding}
          className="tap-target shrink-0 rounded-full bg-[#3d0a21] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-[#e9c349] disabled:opacity-60"
        >
          {adding ? 'Adding…' : 'Add to bag'}
        </button>
        {itemCount > 0 && (
          <Link
            to="/cart"
            className="tap-target grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#3d0a21]/20 text-[#3d0a21]"
            aria-label={`View bag, ${itemCount} items`}
          >
            <span className="text-xs font-bold">{itemCount > 9 ? '9+' : itemCount}</span>
          </Link>
        )}
      </div>
    </div>
  )
}
