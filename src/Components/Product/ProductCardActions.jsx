import { useState } from 'react'
import { useCart } from '../../context/CartContext'
import { isProductSoldOut } from '../../lib/cartStock'
import { SITE_URL } from '../SEO/siteConfig'
import BuyNowButton from '../WhatsApp/BuyNowButton'

const FOOTER_BTN =
  'tap-target flex w-full max-w-full min-h-[2.375rem] shrink-0 items-center justify-center gap-1.5 overflow-visible rounded-full border-0 px-3 py-2 text-[10px] font-bold uppercase leading-normal tracking-[0.06em] transition disabled:opacity-60 sm:min-h-[2.5rem] sm:gap-2 sm:px-4 sm:text-[11px] sm:tracking-[0.08em]'

const OVERLAY_BTN =
  'tap-target flex w-full items-center justify-center gap-1.5 rounded-full border-0 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.1em] transition disabled:opacity-60 sm:text-[11px]'

/** Collection card: add to bag, or out-of-stock + enquire. */
export default function ProductCardActions({ product, variant = 'footer' }) {
  const { addToCart } = useCart()
  const [adding, setAdding] = useState(false)
  const soldOut = isProductSoldOut(product)
  const isOverlay = variant === 'overlay'
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
      <div
        className={isOverlay ? 'w-full space-y-1.5' : 'w-full shrink-0 space-y-1.5'}
        onClick={(e) => e.stopPropagation()}
        role="presentation"
      >
        <p
          className={
            isOverlay
              ? `${OVERLAY_BTN} cursor-default border border-[#c9a75a]/50 bg-[#130006]/75 text-[#e9c349]`
              : `${FOOTER_BTN} cursor-default border border-[#c9a75a]/35 bg-[#c9a75a]/10 text-[#8a6b1f]`
          }
        >
          Out of stock
        </p>
        <BuyNowButton
          productName={product.name}
          productUrl={productUrl}
          soldOut
          className="w-full px-3 py-2 text-[10px]"
        />
      </div>
    )
  }

  if (isOverlay) {
    return (
      <button
        type="button"
        onClick={handleAdd}
        disabled={adding}
        className={`${OVERLAY_BTN} bg-[#3d0a21] text-[#e9c349] shadow-[0_8px_24px_rgba(19,0,6,0.45)] hover:bg-[#2a0718]`}
      >
        <CartPlusIcon />
        <span className="whitespace-nowrap">{adding ? 'Adding…' : 'Add to bag'}</span>
      </button>
    )
  }

  return (
    <div className="w-full shrink-0 sm:space-y-1.5">
      <button
        type="button"
        onClick={handleAdd}
        disabled={adding}
        className={`${FOOTER_BTN} bg-[#3d0a21] text-[#e9c349] shadow-[0_6px_18px_-8px_rgba(19,0,6,0.35)] hover:bg-[#2a0718]`}
      >
        <CartPlusIcon />
        <span className="whitespace-nowrap">
          {adding ? (
            'Adding…'
          ) : (
            <>
              <span className="sm:hidden">Add</span>
              <span className="hidden sm:inline">Add to bag</span>
            </>
          )}
        </span>
      </button>
      <p className="mt-1 hidden text-center text-[8px] leading-snug text-[#847377] sm:block sm:text-[9px]">
        Checkout from <span className="font-semibold text-[#514347]">Bag</span> in menu
      </p>
    </div>
  )
}

function CartPlusIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="shrink-0 sm:h-3.5 sm:w-3.5"
    >
      <path
        d="M6 6h14l-1 7H7L6 6zm0 0L5 3H2M9 20a1 1 0 102 0 1 1 0 00-2 0zm8 0a1 1 0 102 0 1 1 0 00-2 0z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 10v4M10 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
