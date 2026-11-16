import { useEffect, useId, useRef, useState } from 'react'
import { bestOfferForSubtotal, describeOffer, nextOfferToUnlock, useOffers } from '../../lib/offers'
import { computeCouponDiscount } from '../../lib/coupons'
import { formatInr } from '../../lib/promoPricing'
import { TagIcon } from '../UI/Icons'

const AUTO_KEY = 'velisqa:offer_auto_applied'

/**
 * Coupon entry used on the bag and checkout summaries.
 * - Lists the offers the admin marked "Show on website", each with Apply (no guessing codes).
 * - Auto-applies the best eligible one once per session (if the shopper removes it, it stays removed).
 */
export default function CouponField({ coupon, subtotal = 0 }) {
  const id = useId()
  const [value, setValue] = useState('')
  const offers = useOffers()
  const tried = useRef(false)
  const best = bestOfferForSubtotal(subtotal, offers)

  useEffect(() => {
    if (tried.current || coupon.code || coupon.checking || !best) return
    let already = false
    try {
      already = sessionStorage.getItem(AUTO_KEY) === '1'
    } catch {
      /* ignore */
    }
    tried.current = true
    if (already) return
    try {
      sessionStorage.setItem(AUTO_KEY, '1')
    } catch {
      /* ignore */
    }
    void coupon.apply(best.code)
  }, [best, coupon])

  const unlock = nextOfferToUnlock(subtotal, offers)

  const offerList = offers.length > 0 && (
    <ul className="mt-3 space-y-2">
      {offers.slice(0, 4).map((offer) => {
        const saving = computeCouponDiscount(offer, subtotal)
        const applied = coupon.code === offer.code
        const eligible = saving > 0
        return (
          <li key={offer.code} className="flex items-center justify-between gap-3 rounded-md border border-line px-3 py-2">
            <span className="min-w-0 text-xs text-body">
              <span className="block font-semibold tracking-[0.06em] text-ink">{offer.code}</span>
              {describeOffer(offer)}
              {eligible && !applied && <span className="block text-success">Save {formatInr(saving)}</span>}
              {!eligible && offer.min_subtotal > subtotal && <span className="block text-muted">Add {formatInr(offer.min_subtotal - subtotal)} more to use</span>}
            </span>
            {applied ? (
              <span className="shrink-0 text-xs font-semibold text-accent-ink">Applied</span>
            ) : (
              <button
                type="button"
                disabled={!eligible || coupon.checking}
                onClick={() => coupon.apply(offer.code)}
                className="min-h-11 shrink-0 px-2 text-xs font-semibold uppercase tracking-[0.1em] text-ink underline underline-offset-4 disabled:text-muted disabled:no-underline"
              >
                Apply
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )

  if (coupon.code) {
    return (
      <div>
        <div className="flex items-center justify-between border border-dashed border-accent px-4 py-3 text-sm">
          <span>
            <span className="eyebrow text-accent-ink">{coupon.code}</span>
            <span className="ml-2 text-body">applied{coupon.discount > 0 ? ` · you saved ${formatInr(coupon.discount)}` : ''}</span>
          </span>
          <button type="button" onClick={coupon.remove} className="min-h-11 text-xs text-muted underline underline-offset-4 hover:text-ink">
            Remove
          </button>
        </div>
        {offers.length > 1 && offerList}
      </div>
    )
  }
  return (
    <div>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (await coupon.apply(value)) setValue('')
        }}
      >
        <label htmlFor={id} className="field-label">
          Coupon code
        </label>
        <div className="flex">
          <input
            id={id}
            value={value}
            onChange={(e) => setValue(e.target.value.toUpperCase())}
            placeholder="Enter code"
            autoComplete="off"
            className="field min-w-0 flex-1 border-r-0 uppercase"
            aria-invalid={coupon.error ? true : undefined}
            aria-describedby={coupon.error ? `${id}-error` : undefined}
          />
          <button type="submit" disabled={!value.trim() || coupon.checking} className="btn btn-secondary min-h-12 shrink-0 px-5">
            Apply
          </button>
        </div>
        {coupon.error && (
          <p id={`${id}-error`} className="mt-1.5 text-xs text-danger" role="alert">
            {coupon.error}
          </p>
        )}
      </form>
      {offerList}
      {!best && unlock && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-accent-ink">
          <TagIcon size={14} /> Add {formatInr(unlock.remaining)} more to use {unlock.offer.code}
        </p>
      )}
    </div>
  )
}
