import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { useProducts } from '../../hooks/useProducts'
import { CART_OFFERS } from '../../lib/cartOffers'
import { isProductSoldOut } from '../../lib/cartStock'
import { buildImageUrl } from '../../lib/imageCdn'
import { getPrimaryImageUrl } from '../../lib/productImages'
import { displayProductName, productAlt } from '../../lib/productDisplay'
import { formatInr } from '../../lib/promoPricing'
import { productPath } from '../../lib/productUrl'
import { nextOfferToUnlock, useOffers } from '../../lib/offers'
import { CloseIcon, GiftIcon, PlusIcon } from '../UI/Icons'

const ADDON_MAX_PRICE = 399

/**
 * "Add one of these to unlock…": up to 3 in-stock pieces under ₹399, best sellers first,
 * preferring ones that close the gap to the next reward.
 */
export function BagAddOns({ onNavigate }) {
  const { items, addToCart, eligibleSubtotal } = useCart()
  const { products } = useProducts()
  const inBag = new Set(items.map((l) => l.productId))
  const gap = CART_OFFERS.freeGift.enabled ? Math.max(0, CART_OFFERS.freeGift.threshold - eligibleSubtotal) : 0
  const picks = products
    .filter((p) => !inBag.has(p.id) && !isProductSoldOut(p) && Number(p.price) <= ADDON_MAX_PRICE)
    .sort((a, b) => {
      const closesA = gap > 0 && Number(a.price) >= gap ? 0 : 1
      const closesB = gap > 0 && Number(b.price) >= gap ? 0 : 1
      return closesA - closesB || (Number(a.sales_rank) || 999) - (Number(b.sales_rank) || 999) || Number(a.price) - Number(b.price)
    })
    .slice(0, 3)
  if (!picks.length) return null

  return (
    <section aria-labelledby="addons-heading" className="border-t border-line py-5">
      <h3 id="addons-heading" className="text-sm font-medium text-ink">
        {gap > 0 ? `Add one of these to get closer to your free gift` : 'Complete your order'}
      </h3>
      <ul className="mt-3 grid grid-cols-3 gap-2">
        {picks.map((p) => (
          <li key={p.id} className="flex flex-col">
            <Link to={productPath(p)} onClick={onNavigate} className="block aspect-[4/5] overflow-hidden bg-mist">
              <img src={buildImageUrl(getPrimaryImageUrl(p), { width: 240, pad: true })} alt={productAlt(p)} width="240" height="300" loading="lazy" className="h-full w-full object-cover" />
            </Link>
            <p className="mt-1.5 line-clamp-2 text-[0.6875rem] leading-snug text-ink">{displayProductName(p.name)}</p>
            <p className="type-price text-xs font-semibold text-ink">{formatInr(p.price)}</p>
            <button
              type="button"
              onClick={() => addToCart(p, 1, { openDrawer: false })}
              className="mt-1.5 inline-flex min-h-11 items-center justify-center gap-1 border border-ink text-[0.6875rem] font-medium uppercase tracking-[0.1em] text-ink hover:bg-ink hover:text-white"
              aria-label={`Add ${displayProductName(p.name)} to bag`}
            >
              <PlusIcon size={12} /> Add
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

const PILL_KEY = 'velisqa:unlock_pill_dismissed'
const HIDE_ON = [/^\/checkout/, /^\/pay\//, /^\/admin/, /^\/order-confirmation\//, /^\/cart$/]

/**
 * Site-wide floating pill once a bag exists: "Add ₹500 more to unlock a free gift"
 * (or the next public offer). Dismissible for the session; hidden on bag/checkout.
 */
export function UnlockPill() {
  const { pathname } = useLocation()
  const { items, eligibleSubtotal, cartOffers, openCartDrawer, isCartDrawerOpen } = useCart()
  const offers = useOffers()
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(PILL_KEY) === '1'
    } catch {
      return false
    }
  })
  if (dismissed || isCartDrawerOpen || !items.length || HIDE_ON.some((re) => re.test(pathname))) return null

  const gift = CART_OFFERS.freeGift
  let text = ''
  if (gift.enabled && !cartOffers.freeGiftEligible) text = `Add ${formatInr(gift.threshold - eligibleSubtotal)} more to unlock a free gift`
  else {
    const next = nextOfferToUnlock(eligibleSubtotal, offers)
    if (next) text = `Add ${formatInr(next.remaining)} more to use ${next.offer.code}`
  }
  if (!text) return null

  function dismiss() {
    setDismissed(true)
    try {
      sessionStorage.setItem(PILL_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  return (
    <div className={`${pathname.startsWith('/product/') ? 'floating-above-help' : 'floating-above-cta'} unlock-pill fixed left-1/2 z-[54] flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 items-center rounded-full bg-ink pl-4 text-white shadow-lg`}>
      <button type="button" onClick={openCartDrawer} className="flex min-h-11 min-w-0 items-center gap-2 text-left text-[0.8125rem] font-medium leading-tight">
        <GiftIcon size={16} /> {text}
      </button>
      <button type="button" onClick={dismiss} className="grid h-11 w-11 place-items-center text-white/80 hover:text-white" aria-label="Dismiss">
        <CloseIcon size={14} />
      </button>
    </div>
  )
}
