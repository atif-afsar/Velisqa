import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import {
  formatInr,
  getCartLineSubtotal,
  getProductStock,
} from '../../lib/cartStock'
import { getPromoPriceDisplay } from '../../lib/promoPricing'
import QuantityStepper from './QuantityStepper'

const primaryBtnClass =
  'flex h-10 w-full items-center justify-center rounded-full bg-[#3d0a21] px-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#f7ead0] shadow-[0_8px_20px_rgba(61,10,33,0.2)] transition hover:bg-[#2a0718] disabled:cursor-not-allowed disabled:opacity-50 sm:h-11 sm:text-xs sm:tracking-[0.1em]'

const secondaryBtnClass =
  'flex h-9 w-full items-center justify-center rounded-full border px-3 text-[10px] font-semibold uppercase tracking-[0.06em] transition sm:h-10 sm:text-[11px] sm:tracking-[0.08em]'

export default function MiniCartDrawer() {
  const navigate = useNavigate()
  const { requireSignIn } = useAuth()
  const {
    items,
    cartTotal,
    itemCount,
    stockIssues,
    hasStockIssues,
    syncing,
    isCartDrawerOpen,
    lastAddedProductId,
    closeCartDrawer,
    setQuantity,
    removeFromCart,
    syncStockFromServer,
  } = useCart()
  const drawerRef = useRef(null)
  const closeButtonRef = useRef(null)
  const previousFocusRef = useRef(null)

  useEffect(() => {
    if (!isCartDrawerOpen) return undefined

    previousFocusRef.current = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus())

    function onKeyDown(event) {
      if (event.key === 'Escape') closeCartDrawer()
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      const focusTarget = previousFocusRef.current
      window.setTimeout(() => {
        const anotherDialog = document.querySelector('[role="dialog"][aria-modal="true"]')
        if (!anotherDialog && focusTarget?.isConnected) focusTarget.focus()
      }, 360)
    }
  }, [isCartDrawerOpen, closeCartDrawer])

  useEffect(() => {
    if (isCartDrawerOpen && items.length > 0) void syncStockFromServer()
    // Sync once whenever the drawer opens; cart mutations already enforce the refreshed limits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCartDrawerOpen])

  function trapFocus(event) {
    if (event.key !== 'Tab') return
    const focusable = drawerRef.current?.querySelectorAll(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled])',
    )
    if (!focusable?.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  function handleCheckout() {
    if (!items.length || hasStockIssues || syncing) return
    closeCartDrawer()
    requireSignIn(
      () => navigate('/checkout'),
      { openCheckout: true, returnTo: '/checkout' },
    )
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isCartDrawerOpen && (
        <div className="fixed inset-0 z-[170]">
          <motion.button
            type="button"
            aria-label="Close shopping bag"
            className="absolute inset-0 bg-[#130006]/55 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCartDrawer}
          />
          <motion.aside
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mini-cart-title"
            onKeyDown={trapFocus}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-[#fdf9f4] text-[#130006] shadow-[-20px_0_60px_rgba(19,0,6,0.28)]"
          >
            <header className="flex items-start justify-between gap-3 border-b border-[#847377]/15 px-4 py-3.5 sm:items-center sm:px-5 sm:py-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#847377]">Velisqa bag</p>
                <h2 id="mini-cart-title" className="font-serif text-xl leading-tight sm:text-2xl">
                  Your bag{' '}
                  <span className="text-sm font-normal text-[#847377] sm:text-base">({itemCount})</span>
                </h2>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeCartDrawer}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#847377]/20 text-lg leading-none text-[#514347] hover:border-[#3d0a21]/35 sm:h-10 sm:w-10"
                aria-label="Close shopping bag"
              >
                ×
              </button>
            </header>

            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-5 text-center">
                <p className="font-serif text-xl sm:text-2xl">Your bag is empty</p>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-[#847377]">
                  Explore the collection and add a piece you love.
                </p>
                <Link
                  to="/collections#signature"
                  onClick={closeCartDrawer}
                  className={`${primaryBtnClass} mt-5 max-w-xs`}
                >
                  Shop collections
                </Link>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-3.5 py-3 sm:px-4 sm:py-4">
                  {syncing && (
                    <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-[#847377]">
                      Checking latest stock…
                    </p>
                  )}
                  <ul className="space-y-2.5 sm:space-y-3">
                    {items.map((line) => (
                      <MiniCartLine
                        key={line.productId}
                        line={line}
                        issue={stockIssues.find((item) => item.line.productId === line.productId)}
                        highlighted={line.productId === lastAddedProductId}
                        onClose={closeCartDrawer}
                        onQuantityChange={setQuantity}
                        onRemove={removeFromCart}
                      />
                    ))}
                  </ul>
                </div>

                <footer className="border-t border-[#847377]/15 bg-white px-4 py-3.5 sm:px-5 sm:py-4">
                  {hasStockIssues && (
                    <p className="mb-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-950">
                      Update or remove unavailable quantities before checkout.
                    </p>
                  )}
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#847377]">Bag subtotal</p>
                      <p className="font-serif text-xl tabular-nums text-[#3d0a21] sm:text-2xl" aria-live="polite">
                        {formatInr(cartTotal)}
                      </p>
                    </div>
                    <p className="text-right text-[10px] leading-snug text-[#847377]">
                      Taxes included
                      <br />
                      Free delivery
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleCheckout}
                    disabled={hasStockIssues || syncing}
                    className={`${primaryBtnClass} mt-3`}
                  >
                    Checkout securely
                  </button>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Link
                      to="/cart"
                      onClick={closeCartDrawer}
                      className={`${secondaryBtnClass} border-[#3d0a21]/20 text-[#3d0a21] hover:bg-[#fdf9f4]`}
                    >
                      View bag
                    </Link>
                    <button
                      type="button"
                      onClick={closeCartDrawer}
                      className={`${secondaryBtnClass} border-[#847377]/20 text-[#514347] hover:bg-[#fafafa]`}
                    >
                      <span className="sm:hidden">Continue</span>
                      <span className="hidden sm:inline">Continue shopping</span>
                    </button>
                  </div>
                </footer>
              </>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function MiniCartLine({
  line,
  issue,
  highlighted,
  onClose,
  onQuantityChange,
  onRemove,
}) {
  const stock = getProductStock({ stock: line.stock })
  const pricing = getPromoPriceDisplay(line)

  return (
    <li
      className={`relative rounded-xl border p-2.5 transition sm:p-3 ${
        highlighted
          ? 'border-[#d4af37]/55 bg-[#fff9e9] shadow-[0_8px_24px_-18px_rgba(19,0,6,0.4)]'
          : 'border-[#847377]/12 bg-white'
      }`}
    >
      {highlighted && (
        <span className="absolute right-2 top-2 rounded-full bg-[#d4af37] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.08em] text-[#130006]">
          Just added
        </span>
      )}
      <div className="flex gap-2.5 sm:gap-3">
        <Link
          to={`/product/${line.productId}`}
          onClick={onClose}
          className="h-[4.5rem] w-[3.75rem] shrink-0 overflow-hidden rounded-lg bg-[#eee6de] sm:h-24 sm:w-20"
        >
          {line.imageUrl ? (
            <img src={line.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="grid h-full place-items-center text-[9px] text-[#847377]">No image</span>
          )}
        </Link>
        <div className="min-w-0 flex-1 pr-1">
          <Link
            to={`/product/${line.productId}`}
            onClick={onClose}
            className="line-clamp-2 pr-12 font-serif text-[15px] leading-snug hover:text-[#6f334a] sm:pr-14 sm:text-base"
          >
            {line.name}
          </Link>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[11px] sm:text-xs">
            <span className="font-semibold tabular-nums text-[#3d0a21]">{formatInr(pricing.sale)}</span>
            {pricing.hasPromo && (
              <span className="tabular-nums text-[#847377] line-through">{formatInr(pricing.compare)}</span>
            )}
            <span className="text-[#847377]">each</span>
          </div>
          {!issue && stock > 0 && stock <= 3 && (
            <p className="mt-1 text-[10px] font-medium text-[#6f334a]">Only {stock} left</p>
          )}
          <div className="mt-2.5 flex flex-wrap items-center gap-2.5 sm:mt-3 sm:gap-3">
            <QuantityStepper
              value={line.quantity}
              max={stock}
              disabled={Boolean(issue?.issue === 'out_of_stock')}
              onChange={(quantity) => onQuantityChange(line.productId, quantity)}
              size="sm"
            />
            <button
              type="button"
              onClick={() => onRemove(line.productId)}
              className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#847377] hover:text-red-700"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
      {issue && (
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[10px] leading-relaxed text-amber-950">
          {issue.message}
        </p>
      )}
      <p className="mt-2 text-right text-[11px] font-semibold tabular-nums text-[#514347] sm:text-xs">
        Line total {formatInr(getCartLineSubtotal(line))}
      </p>
    </li>
  )
}
