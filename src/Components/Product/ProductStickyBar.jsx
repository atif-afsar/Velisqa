import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { formatInr, getPromoPriceDisplay } from '../../lib/promoPricing'
import { SITE_URL } from '../SEO/siteConfig'
import BuyNowButton from '../WhatsApp/BuyNowButton'
import { productPath } from '../../lib/productUrl'

/** Mobile-only sticky add-to-bag bar (Palmonas-style) */
export default function ProductStickyBar({ product, soldOut, quantity = 1 }) {
  const { addToCart, itemCount } = useCart()
  const [adding, setAdding] = useState(false)
  const { sale } = getPromoPriceDisplay(product)
  const addQuantity = Math.max(1, Number(quantity) || 1)

  function handleAdd() {
    if (adding || soldOut) return
    setAdding(true)
    addToCart(product, addQuantity)
    window.setTimeout(() => setAdding(false), 400)
  }

  if (soldOut) {
    const productUrl = product.id ? `${SITE_URL}${productPath(product)}` : null
    return (
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-paper/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
        <div className="mx-auto max-w-lg">
          <BuyNowButton
            product={product}
            productUrl={productUrl}
            soldOut
            className="w-full px-5 py-3 text-[11px]"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-paper/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
      <div className="mx-auto flex max-w-lg items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-medium text-body">{product.name}</p>
          <p className="font-serif text-lg font-medium tabular-nums text-ink">{formatInr(sale)}</p>
          {addQuantity > 1 ? (
            <p className="text-[10px] text-muted">Qty {addQuantity}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding}
          className="tap-target shrink-0 rounded-sm bg-ink px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.15em] text-white disabled:opacity-60"
        >
          {adding ? 'Adding…' : addQuantity > 1 ? `Add ${addQuantity}` : 'Add to bag'}
        </button>
        {itemCount > 0 && (
          <Link
            to="/cart"
            className="tap-target grid h-11 w-11 shrink-0 place-items-center rounded-full border border-ink/20 text-ink"
            aria-label={`View bag, ${itemCount} items`}
          >
            <span className="text-xs font-bold">{itemCount > 9 ? '9+' : itemCount}</span>
          </Link>
        )}
      </div>
    </div>
  )
}
