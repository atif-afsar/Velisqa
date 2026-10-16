import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SEOHead from '../Components/SEO/SEOHead'
import CartLine from '../Components/Cart/CartLine'
import CouponField from '../Components/Cart/CouponField'
import { GiftPicker, OfferProgress } from '../Components/Cart/CartOffers'
import ProductCard from '../Components/Product/ProductCard'
import { useCart } from '../context/CartContext'
import { useProducts } from '../hooks/useProducts'
import { useCoupon } from '../hooks/useCoupon'
import { formatInr, isProductSoldOut } from '../lib/cartStock'
import { isFreeGiftItem } from '../lib/cartOffers'
import { computeCheckoutTotals, GIFT_WRAP_FEE } from '../lib/checkoutPricing'
import { readGiftWrap, saveGiftWrap } from '../lib/coupons'
import { displayProductName } from '../lib/productDisplay'
import { analytics } from '../lib/analytics'
import { LockIcon } from '../Components/UI/Icons'

export default function Cart() {
  const navigate = useNavigate()
  const { items, cartTotal, stockIssues, syncing, setQuantity, removeFromCart, syncStockFromServer, eligibleSubtotal } = useCart()
  const { products } = useProducts()
  const coupon = useCoupon(eligibleSubtotal)
  const [giftWrap, setGiftWrap] = useState(readGiftWrap)
  const [localIssues, setLocalIssues] = useState([])

  const lines = items.filter((line) => !isFreeGiftItem(line))
  const gift = items.find(isFreeGiftItem)
  const issues = localIssues.length ? localIssues : stockIssues
  const canCheckout = lines.length > 0 && issues.length === 0 && !syncing
  const totals = computeCheckoutTotals({ subtotal: eligibleSubtotal, couponDiscount: coupon.discount, giftWrap })
  const inBag = new Set(items.map((l) => l.productId))
  const suggestions = products.filter((p) => !isProductSoldOut(p) && !inBag.has(p.id)).slice(0, 4)

  useEffect(() => {
    let cancelled = false
    syncStockFromServer().then((result) => {
      if (!cancelled) setLocalIssues(result?.issues ?? [])
    })
    if (items.length > 0) analytics.viewCart({ items, total: cartTotal })
    return () => {
      cancelled = true
    }
    // Run once on page view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <SEOHead title="Your Bag | Velisqa" description="Review your bag and check out securely." canonicalPath="/cart" noindex />
      <main className="page-offset-nav min-h-svh bg-paper text-ink">
        <div className="container-lux pb-20 pt-10 lg:pt-14">
          <h1 className="type-display text-center">Your bag</h1>

          {lines.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-body">Your bag is empty.</p>
              <Link to="/collections" className="btn btn-primary mt-8">
                Shop the collection
              </Link>
            </div>
          ) : (
            <div className="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-16">
              <section aria-label="Items in your bag">
                <div className="border-y border-line py-5">
                  <OfferProgress />
                </div>
                <ul className="divide-y divide-line border-b border-line">
                  {lines.map((line) => (
                    <CartLine
                      key={line.productId}
                      line={line}
                      size="lg"
                      issue={issues.find((s) => s.line.productId === line.productId)}
                      onQuantityChange={setQuantity}
                      onRemove={removeFromCart}
                    />
                  ))}
                </ul>
                {gift && (
                  <p className="border-b border-line py-4 text-sm text-body">
                    <span className="eyebrow mr-2 text-accent-ink">Gift</span>
                    {displayProductName(gift.name)} — complimentary
                  </p>
                )}
                <div className="mt-6">
                  <GiftPicker />
                </div>
              </section>

              <aside aria-label="Order summary" className="bg-mist p-6 lg:sticky lg:top-[calc(var(--nav-height)+1.5rem)] sm:p-8">
                <h2 className="eyebrow text-ink">Summary</h2>
                <div className="mt-6">
                  <CouponField coupon={coupon} />
                </div>
                <label className="mt-5 flex min-h-11 cursor-pointer items-center gap-3 text-sm text-body">
                  <input
                    type="checkbox"
                    checked={giftWrap}
                    onChange={(e) => {
                      setGiftWrap(e.target.checked)
                      saveGiftWrap(e.target.checked)
                    }}
                    className="h-[18px] w-[18px] accent-ink"
                  />
                  Add gift wrap ({formatInr(GIFT_WRAP_FEE)})
                </label>

                <dl className="mt-6 space-y-3 border-t border-line pt-6 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-body">Subtotal</dt>
                    <dd className="type-price">{formatInr(totals.subtotal)}</dd>
                  </div>
                  {totals.discount > 0 && (
                    <div className="flex justify-between text-accent-ink">
                      <dt>Coupon ({coupon.code})</dt>
                      <dd className="type-price">−{formatInr(totals.discount)}</dd>
                    </div>
                  )}
                  {totals.giftWrapFee > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-body">Gift wrap</dt>
                      <dd className="type-price">{formatInr(totals.giftWrapFee)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-body">Shipping</dt>
                    <dd>Free (prepaid)</dd>
                  </div>
                  <div className="flex justify-between border-t border-line pt-4 text-base">
                    <dt className="text-ink">Total</dt>
                    <dd className="type-price text-ink">{formatInr(totals.total)}</dd>
                  </div>
                </dl>
                <p className="mt-2 text-xs text-muted">Cash on delivery adds a ₹50 fee and 2% GST, shown at checkout.</p>

                {issues.length > 0 && (
                  <p className="mt-4 text-xs text-danger" role="alert">
                    Some items are unavailable in the selected quantity. Update them to continue.
                  </p>
                )}
                <button type="button" disabled={!canCheckout} onClick={() => navigate('/checkout')} className="btn btn-primary mt-6 w-full">
                  <LockIcon size={16} />
                  {syncing ? 'Checking stock…' : 'Secure checkout'}
                </button>
                <Link to="/collections" className="btn btn-link mx-auto mt-3 flex w-fit">
                  Continue shopping
                </Link>
              </aside>
            </div>
          )}

          {suggestions.length > 0 && (
            <section aria-labelledby="suggest-heading" className="mt-20 border-t border-line pt-14">
              <h2 id="suggest-heading" className="type-section">
                You may also like
              </h2>
              <ul className="mt-10 grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6">
                {suggestions.map((p) => (
                  <li key={p.id}>
                    <ProductCard product={p} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>
    </>
  )
}
