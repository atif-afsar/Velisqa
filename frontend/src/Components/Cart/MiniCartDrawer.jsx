import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { formatInr } from '../../lib/cartStock'
import { isFreeGiftItem } from '../../lib/cartOffers'
import { displayProductName } from '../../lib/productDisplay'
import Drawer from '../UI/Drawer'
import CartLine from './CartLine'
import { GiftPicker, OfferProgress } from './CartOffers'
import { BagAddOns } from './BagBoosters'
import { useCoupon } from '../../hooks/useCoupon'
import { bestOfferForSubtotal, useOffers } from '../../lib/offers'
import { deliveryByLabel } from '../../lib/delivery'
import { COD_FEE } from '../../lib/checkoutPricing'
import { LockIcon } from '../UI/Icons'

/** Slide-out bag. Opens automatically when a piece is added. */
export default function MiniCartDrawer() {
  const navigate = useNavigate()
  const {
    items,
    itemCount,
    stockIssues,
    hasStockIssues,
    syncing,
    isCartDrawerOpen,
    closeCartDrawer,
    setQuantity,
    removeFromCart,
    syncStockFromServer,
    eligibleSubtotal,
  } = useCart()

  const lines = items.filter((line) => !isFreeGiftItem(line))
  const gift = items.find(isFreeGiftItem)
  const coupon = useCoupon(eligibleSubtotal)
  const offers = useOffers()
  const best = bestOfferForSubtotal(eligibleSubtotal, offers)
  const mrpSaving = lines.reduce((sum, l) => sum + (Number(l.mrp) > Number(l.price) ? (Number(l.mrp) - Number(l.price)) * l.quantity : 0), 0)
  const couponSaving = coupon.code ? coupon.discount : best?.saving || 0
  const totalSaving = mrpSaving + couponSaving

  useEffect(() => {
    if (isCartDrawerOpen && items.length > 0) void syncStockFromServer()
    // Sync once each time the drawer opens; cart mutations enforce limits afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCartDrawerOpen])

  function checkout() {
    if (!items.length || hasStockIssues || syncing) return
    closeCartDrawer()
    navigate('/checkout')
  }

  return (
    <Drawer
      open={isCartDrawerOpen}
      onClose={closeCartDrawer}
      title={`Your bag (${itemCount})`}
      bodyClassName="px-5 sm:px-6"
      footer={
        lines.length > 0 && (
          <div className="space-y-3 p-5 sm:p-6">
            {hasStockIssues && (
              <p className="text-xs text-danger" role="alert">
                Update or remove unavailable items to continue.
              </p>
            )}
            <div className="flex items-baseline justify-between">
              <span className="eyebrow text-ink">Subtotal</span>
              <span className="type-price text-lg text-ink" aria-live="polite">
                {formatInr(eligibleSubtotal)}
              </span>
            </div>
            {coupon.code && coupon.discount > 0 ? (
              <p className="flex justify-between text-sm text-accent-ink">
                <span>Code {coupon.code}</span>
                <span className="type-price">−{formatInr(coupon.discount)}</span>
              </p>
            ) : best ? (
              <p className="text-sm text-accent-ink">
                Code <strong>{best.code}</strong> saves {formatInr(best.saving)} — applied at checkout
              </p>
            ) : null}
            {totalSaving > 0 && <p className="text-xs font-medium text-success">You save {formatInr(totalSaving)} on this order</p>}
            <p className="text-xs text-muted">
              Delivery by {deliveryByLabel()} · Free shipping on prepaid · COD {formatInr(COD_FEE)} fee
            </p>
            <button type="button" onClick={checkout} disabled={hasStockIssues || syncing} className="btn btn-primary w-full">
              {syncing ? 'Checking stock…' : 'Checkout'}
            </button>
            <p className="flex items-center justify-center gap-1.5 text-[0.6875rem] text-muted">
              <LockIcon size={12} /> Secure Razorpay payment · Easy returns
            </p>
            <Link to="/cart" onClick={closeCartDrawer} className="btn btn-link mx-auto flex w-fit">
              View full bag
            </Link>
          </div>
        )
      }
    >
      {lines.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center py-16 text-center">
          <p className="font-serif text-3xl text-ink">Your bag is empty</p>
          <p className="mt-3 max-w-xs text-sm text-body">Discover pieces made to be worn every day.</p>
          <Link to="/collections" onClick={closeCartDrawer} className="btn btn-primary mt-8">
            Shop the collection
          </Link>
        </div>
      ) : (
        <div className="pb-6">
          <div className="border-b border-line py-5">
            <OfferProgress />
          </div>
          <ul className="divide-y divide-line">
            {lines.map((line) => (
              <CartLine
                key={line.productId}
                line={line}
                issue={stockIssues.find((s) => s.line.productId === line.productId)}
                onNavigate={closeCartDrawer}
                onQuantityChange={setQuantity}
                onRemove={removeFromCart}
              />
            ))}
          </ul>
          {gift && (
            <p className="border-t border-line py-4 text-sm text-body">
              <span className="eyebrow mr-2 text-accent-ink">Gift</span>
              {displayProductName(gift.name)} — complimentary
            </p>
          )}
          <GiftPicker compact />
          <BagAddOns onNavigate={closeCartDrawer} />
        </div>
      )}
    </Drawer>
  )
}
