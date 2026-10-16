import { useCart } from '../../context/CartContext'
import { useProducts } from '../../hooks/useProducts'
import { CART_OFFERS, isFreeGiftItem } from '../../lib/cartOffers'
import { formatInr } from '../../lib/promoPricing'
import { isProductSoldOut } from '../../lib/cartStock'
import { displayProductName } from '../../lib/productDisplay'
import { getPrimaryImageUrl } from '../../lib/productImages'
import { GiftIcon, TruckIcon } from '../UI/Icons'

/** Free shipping (prepaid) status + progress towards the complimentary gift. */
export function OfferProgress() {
  const { eligibleSubtotal, cartOffers } = useCart()
  const { freeGift } = CART_OFFERS
  const remaining = Math.max(0, freeGift.threshold - eligibleSubtotal)
  const percent = Math.min(100, (eligibleSubtotal / freeGift.threshold) * 100)

  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 text-sm text-body">
        <TruckIcon size={16} className="shrink-0 text-accent-ink" />
        <span>
          <strong className="font-medium text-ink">Free shipping</strong> on prepaid orders
        </span>
      </p>
      {freeGift.enabled && (
        <div>
          <p className="flex items-center gap-2 text-sm text-body">
            <GiftIcon size={16} className="shrink-0 text-accent-ink" />
            {cartOffers.freeGiftEligible ? (
              <span>
                <strong className="font-medium text-ink">Complimentary gift unlocked</strong> — choose it below
              </span>
            ) : (
              <span>
                Spend <strong className="font-medium text-ink">{formatInr(remaining)}</strong> more for a complimentary gift
              </span>
            )}
          </p>
          <div
            className="mt-2.5 h-[3px] w-full bg-line"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={freeGift.threshold}
            aria-valuenow={Math.min(eligibleSubtotal, freeGift.threshold)}
            aria-label="Progress to complimentary gift"
          >
            <div className="offer-progress-bar-fill h-full bg-accent" style={{ width: `${percent}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}

/** Choose / change the free gift once the threshold is reached. */
export function GiftPicker({ compact = false }) {
  const { items, cartOffers, addGiftToCart, removeGiftFromCart } = useCart()
  const { products } = useProducts()
  if (!cartOffers.freeGiftEligible) return null

  const currentGift = items.find(isFreeGiftItem)
  const choices = products
    .filter((p) => Number(p.price) <= CART_OFFERS.freeGift.maxValue && !isProductSoldOut(p))
    .slice(0, compact ? 4 : 6)
  if (!choices.length) return null

  return (
    <section aria-label="Choose your complimentary gift" className="border border-line p-4">
      <p className="eyebrow text-ink">{currentGift ? 'Your complimentary gift' : 'Choose your complimentary gift'}</p>
      <ul className={`mt-4 grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
        {choices.map((p) => {
          const selected = currentGift?.productId === p.id
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => (selected ? removeGiftFromCart() : addGiftToCart(p))}
                aria-pressed={selected}
                className={`group block w-full border text-left transition-colors ${selected ? 'border-ink' : 'border-line hover:border-ink'}`}
              >
                <span className="block aspect-square bg-mist">
                  <img src={getPrimaryImageUrl(p)} alt="" loading="lazy" className="h-full w-full object-cover" width="160" height="160" />
                </span>
                <span className="block px-2.5 py-2">
                  <span className="line-clamp-1 text-xs text-ink">{displayProductName(p.name)}</span>
                  <span className="mt-0.5 flex items-baseline gap-1.5 text-xs">
                    <s className="text-muted">{formatInr(p.price)}</s>
                    <span className={selected ? 'text-accent-ink' : 'text-ink'}>{selected ? 'Selected' : 'Free'}</span>
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
