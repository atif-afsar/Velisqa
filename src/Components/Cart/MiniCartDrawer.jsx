import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from '../../lib/motion'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import {
  formatInr,
  getCartLineSubtotal,
  getProductStock,
} from '../../lib/cartStock'
import { getPromoPriceDisplay } from '../../lib/promoPricing'
import { isFreeGiftItem } from '../../lib/cartOffers'
import { useProducts } from '../../hooks/useProducts'
import { isProductSoldOut as isSoldOutCheck } from '../../lib/cartStock'
import QuantityStepper from './QuantityStepper'
import OfferProgressCard from '../Offers/OfferProgressCard'
import FreeGiftCard from '../Offers/FreeGiftCard'
import OfferToast from '../Offers/OfferToast'

const primaryBtnClass =
  'flex h-10 w-full items-center justify-center rounded-full bg-ink px-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-white shadow-[0_8px_20px_rgba(17, 17, 17,0.2)] transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-50 sm:h-11 sm:text-xs sm:tracking-[0.1em]'

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
    freeGiftInCart,
    eligibleSubtotal,
    offerMilestone,
    dismissOfferMilestone,
    cartOffers,
    addGiftToCart,
  } = useCart()
  const { products } = useProducts()
  const drawerRef = useRef(null)
  const closeButtonRef = useRef(null)
  const previousFocusRef = useRef(null)

  // Separate real items and the free gift
  const realItems = items.filter((line) => !isFreeGiftItem(line))
  const selectedGift = items.find(isFreeGiftItem)

  // Filter products worth <= 400 that are in stock
  const giftChoices = products
    .filter((p) => Number(p.price) <= 400 && !isSoldOutCheck(p))
    .slice(0, 4)

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
    <>
      {/* Offer milestone toast */}
      <OfferToast
        milestone={offerMilestone}
        amountToGift={cartOffers?.amountToGift || 0}
        onDismiss={dismissOfferMilestone}
      />

      <AnimatePresence>
        {isCartDrawerOpen && (
          <div className="fixed inset-0 z-[170]">
            <motion.button
              type="button"
              aria-label="Close shopping bag"
              className="absolute inset-0 bg-ink/55 backdrop-blur-[2px]"
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
              className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-paper text-ink shadow-[-20px_0_60px_rgba(17, 17, 17,0.28)]"
            >
              <header className="flex items-start justify-between gap-3 border-b border-muted/15 px-4 py-3.5 sm:items-center sm:px-5 sm:py-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Velisqa bag</p>
                  <h2 id="mini-cart-title" className="font-serif text-xl leading-tight sm:text-2xl">
                    Your bag{' '}
                    <span className="text-sm font-normal text-muted sm:text-base">({itemCount})</span>
                  </h2>
                </div>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={closeCartDrawer}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-muted/20 text-lg leading-none text-body hover:border-ink/35 sm:h-10 sm:w-10"
                  aria-label="Close shopping bag"
                >
                  ×
                </button>
              </header>

              {items.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center px-5 text-center">
                  <p className="font-serif text-xl sm:text-2xl">Your bag is empty</p>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">
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
                    {/* Offer Progress Card */}
                    <div className="mb-3">
                      <OfferProgressCard onNavigate={closeCartDrawer} compact />
                    </div>

                    {syncing && (
                      <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
                        Checking latest stock…
                      </p>
                    )}
                    <ul className="space-y-2.5 sm:space-y-3">
                      {realItems.map((line) => (
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

                    {/* Free Gift Card */}
                    {selectedGift && (
                      <div className="mt-3">
                        <FreeGiftCard variant="compact" giftItem={selectedGift} />
                      </div>
                    )}

                    {/* Choose Free Gift Options (under 400) */}
                    {cartOffers.freeGiftEligible && giftChoices.length > 0 && (
                      <div className="mt-4 rounded-xl border border-dashed border-line bg-[#FFFDF7] p-3 sm:p-3.5 space-y-3">
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent-ink flex items-center gap-1.5">
                          <span>🎁</span> {freeGiftInCart ? 'Change Your Free Gift' : 'Select Your Free Gift'}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {giftChoices.map((product) => {
                            const isCurrentGift = items.some(
                              (item) => item.productId === product.id && item.isFreeGift,
                            )
                            return (
                              <div
                                key={product.id}
                                className={`flex flex-col justify-between rounded-lg border p-2 text-center shadow-xs transition ${
                                  isCurrentGift ? 'border-line bg-[#FFFDF0]' : 'border-muted/10 bg-white'
                                }`}
                              >
                                <div className="mx-auto h-12 w-12 overflow-hidden rounded-md bg-mist border border-black/5">
                                  {product.image_url ? (
                                    <img src={product.image_url} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="grid h-full place-items-center text-[8px] text-muted">
                                      No Image
                                    </div>
                                  )}
                                </div>
                                <p className="mt-1.5 text-[10px] font-semibold text-ink line-clamp-1">
                                  {product.name}
                                </p>
                                <p className="text-[9px] text-muted line-through mt-0.5">
                                  {formatInr(product.price)}
                                </p>
                                <button
                                  type="button"
                                  disabled={isCurrentGift}
                                  onClick={() => addGiftToCart(product)}
                                  className={`mt-2 rounded-full py-1 text-[9px] font-bold uppercase tracking-wider transition-colors ${
                                    isCurrentGift
                                      ? 'bg-emerald-100 text-emerald-800 cursor-not-allowed'
                                      : 'bg-ink text-white hover:bg-ink'
                                  }`}
                                >
                                  {isCurrentGift ? 'Claimed' : 'Claim Free'}
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <footer className="border-t border-muted/15 bg-white px-4 py-3.5 sm:px-5 sm:py-4">
                    {hasStockIssues && (
                      <p className="mb-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-950">
                        Update or remove unavailable quantities before checkout.
                      </p>
                    )}
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Bag subtotal</p>
                        <p className="font-serif text-xl tabular-nums text-ink sm:text-2xl" aria-live="polite">
                          {formatInr(eligibleSubtotal)}
                        </p>
                      </div>
                      <p className="text-right text-[10px] leading-snug text-muted">
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
                        className={`${secondaryBtnClass} border-ink/20 text-ink hover:bg-paper`}
                      >
                        View bag
                      </Link>
                      <button
                        type="button"
                        onClick={closeCartDrawer}
                        className={`${secondaryBtnClass} border-muted/20 text-body hover:bg-[#fafafa]`}
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
      </AnimatePresence>
    </>,
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
          ? 'border-line bg-[#fff9e9] shadow-[0_8px_24px_-18px_rgba(17, 17, 17,0.4)]'
          : 'border-muted/12 bg-white'
      }`}
    >
      {highlighted && (
        <span className="absolute right-2 top-2 rounded-full bg-ink px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.08em] text-white">
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
            <span className="grid h-full place-items-center text-[9px] text-muted">No image</span>
          )}
        </Link>
        <div className="min-w-0 flex-1 pr-1">
          <Link
            to={`/product/${line.productId}`}
            onClick={onClose}
            className="line-clamp-2 pr-12 font-serif text-[15px] leading-snug hover:text-ink sm:pr-14 sm:text-base"
          >
            {line.name}
          </Link>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[11px] sm:text-xs">
            <span className="font-semibold tabular-nums text-ink">{formatInr(pricing.sale)}</span>
            {pricing.hasPromo && (
              <span className="tabular-nums text-muted line-through">{formatInr(pricing.compare)}</span>
            )}
            <span className="text-muted">each</span>
          </div>
          {!issue && stock > 0 && stock <= 3 && (
            <p className="mt-1 text-[10px] font-medium text-ink">Only {stock} left</p>
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
              className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted hover:text-red-700"
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
      <p className="mt-2 text-right text-[11px] font-semibold tabular-nums text-body sm:text-xs">
        Line total {formatInr(getCartLineSubtotal(line))}
      </p>
    </li>
  )
}
