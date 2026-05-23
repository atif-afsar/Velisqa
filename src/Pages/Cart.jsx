import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import QuantityStepper from '../Components/Cart/QuantityStepper'
import OrderFormModal from '../Components/WhatsApp/OrderFormModal'
import SEOHead from '../Components/SEO/SEOHead'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { formatInr, getCartLineSubtotal, getProductStock } from '../lib/cartStock'
import ProductPriceDisplay from '../Components/Product/ProductPriceDisplay'

export default function Cart() {
  const {
    items,
    cartTotal,
    stockIssues,
    syncing,
    setQuantity,
    removeFromCart,
    clearCart,
    syncStockFromServer,
  } = useCart()
  const { requireSignIn } = useAuth()

  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [localIssues, setLocalIssues] = useState([])

  useEffect(() => {
    let cancelled = false
    syncStockFromServer().then((result) => {
      if (!cancelled) setLocalIssues(result?.issues ?? [])
    })
    return () => {
      cancelled = true
    }
    // Refresh stock once when opening the cart page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const issues = localIssues.length ? localIssues : stockIssues
  const issueMessages = issues.map((i) => i.message)
  const canCheckout = items.length > 0 && issues.length === 0 && !syncing

  function handleCheckoutClick() {
    if (issues.length > 0) return
    requireSignIn(() => setCheckoutOpen(true))
  }

  return (
    <>
      <SEOHead
        title="Your bag | Velisqa"
        description="Review your Velisqa bag and complete your order on WhatsApp."
        canonicalPath="/cart"
      />
      <main className="page-offset-nav min-h-[60vh] bg-[#fdf9f4] text-[#130006]">
        <div className="container-stitch mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
          <h1 className="font-serif text-2xl font-semibold sm:text-3xl">Your bag</h1>
          <p className="mt-2 text-sm leading-relaxed text-[#514347]">
            Review items below, then tap <span className="font-semibold text-[#130006]">Checkout on WhatsApp</span>.
            We confirm stock and delivery before dispatch.
          </p>

          {syncing && items.length > 0 && (
            <p className="mt-4 text-xs text-[#847377]">Checking latest stock…</p>
          )}

          {issues.length > 0 && (
            <div
              className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
              role="alert"
            >
              <p className="font-semibold">Stock update needed</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed">
                {issues.map((issue) => (
                  <li key={issue.line.productId}>{issue.message}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs">
                Reduce quantities or{' '}
                <Link to="/contact" className="font-medium underline-offset-2 hover:underline">
                  request out-of-stock pieces
                </Link>
                .
              </p>
            </div>
          )}

          {items.length === 0 ? (
            <div className="mt-12 text-center">
              <p className="text-sm text-[#514347]">Your cart is empty.</p>
              <Link
                to="/collections#signature"
                className="mt-6 inline-flex rounded-full bg-[#3d0a21] px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#fdf9f4] transition hover:bg-[#2a0718]"
              >
                Browse collections
              </Link>
            </div>
          ) : (
            <>
              <ul className="mt-8 divide-y divide-[#d4af37]/20 rounded-2xl border border-[#d4af37]/15 bg-[#fbf7f1]">
                {items.map((line) => {
                  const stock = getProductStock({ stock: line.stock })
                  const lineIssue = issues.find((i) => i.line.productId === line.productId)

                  return (
                    <li key={line.productId} className="flex gap-3 p-4 sm:gap-4 sm:p-5">
                      <Link
                        to={`/product/${line.productId}`}
                        className="h-20 w-16 shrink-0 overflow-hidden rounded-md bg-[#f1ede8] sm:h-24 sm:w-20"
                      >
                        {line.imageUrl ? (
                          <img
                            src={line.imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[10px] text-[#847377]">
                            No img
                          </div>
                        )}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/product/${line.productId}`}
                          className="font-serif text-base font-semibold text-[#130006] hover:text-[#6f334a] sm:text-lg"
                        >
                          {line.name}
                        </Link>
                        <div className="mt-1">
                          <ProductPriceDisplay price={line.price} size="card" />
                        </div>
                        {lineIssue && (
                          <p className="mt-1 text-[10px] font-medium text-amber-800">{lineIssue.message}</p>
                        )}
                        {!lineIssue && stock > 0 && stock <= 3 && (
                          <p className="mt-1 text-[10px] text-[#847377]">Only {stock} left</p>
                        )}
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <QuantityStepper
                            value={line.quantity}
                            max={stock}
                            disabled={stock <= 0}
                            onChange={(qty) => setQuantity(line.productId, qty)}
                            size="sm"
                          />
                          <button
                            type="button"
                            onClick={() => removeFromCart(line.productId)}
                            className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#847377] transition hover:text-red-800"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <p className="shrink-0 self-start font-medium tabular-nums text-[#3d0a21] sm:text-lg">
                        {formatInr(getCartLineSubtotal(line))}
                      </p>
                    </li>
                  )
                })}
              </ul>

              <div className="mt-8 flex flex-col items-stretch gap-4 border-t border-[#d4af37]/25 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#847377]">Estimated total</p>
                  <p className="font-serif text-2xl font-medium tabular-nums text-[#3d0a21]">{formatInr(cartTotal)}</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={clearCart}
                    className="rounded-full border border-[#847377]/30 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#514347] transition hover:bg-white"
                  >
                    Clear cart
                  </button>
                  <button
                    type="button"
                    onClick={handleCheckoutClick}
                    disabled={!canCheckout}
                    className="rounded-full border border-[#d4af37]/20 bg-[#2A0718] px-6 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[#f7ead0] shadow-[0_12px_32px_rgba(42,7,24,0.35)] transition hover:bg-[#3d0a21] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Checkout on WhatsApp
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <OrderFormModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        cartItems={items}
        stockWarnings={issueMessages}
        onCheckoutSuccess={clearCart}
      />
    </>
  )
}
