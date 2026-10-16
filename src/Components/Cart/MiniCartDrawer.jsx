import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { formatInr } from '../../lib/cartStock'
import { isFreeGiftItem } from '../../lib/cartOffers'
import { displayProductName } from '../../lib/productDisplay'
import Drawer from '../UI/Drawer'
import CartLine from './CartLine'
import { GiftPicker, OfferProgress } from './CartOffers'

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
            <p className="text-xs text-muted">Coupons and gift wrap can be added at checkout.</p>
            <button type="button" onClick={checkout} disabled={hasStockIssues || syncing} className="btn btn-primary w-full">
              {syncing ? 'Checking stock…' : 'Checkout'}
            </button>
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
        </div>
      )}
    </Drawer>
  )
}
