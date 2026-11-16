import { useState } from 'react'
import { bestOfferForPrice, describeOffer, useOffers } from '../../lib/offers'
import { formatInr } from '../../lib/promoPricing'
import { CheckIcon, TagIcon } from '../UI/Icons'

function CopyCode({ code }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      /* clipboard blocked — the code is visible anyway */
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md border border-dashed border-accent-ink px-3 text-xs font-semibold tracking-[0.08em] text-accent-ink hover:bg-accent-tint"
      aria-label={copied ? `Code ${code} copied` : `Copy code ${code}`}
    >
      {copied ? <CheckIcon size={14} /> : null}
      {copied ? 'Copied' : code}
    </button>
  )
}

/**
 * "Best price" box + offer cards, computed live from the coupons the admin marked
 * "Show on website". Renders nothing when no public offer exists.
 */
export default function ProductOffers({ price }) {
  const offers = useOffers()
  if (!offers.length) return null
  const best = bestOfferForPrice(price, offers)
  const others = offers.filter((o) => o.code !== best?.code).slice(0, 3)

  return (
    <div className="space-y-2">
      {best && (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-accent-tint px-4 py-3">
          <p className="text-sm text-ink">
            <span className="block text-xs font-medium uppercase tracking-[0.12em] text-accent-ink">Best price</span>
            Get it for <strong className="type-price text-base font-semibold">{formatInr(best.price)}</strong> with code{' '}
            <strong className="font-semibold">{best.code}</strong>
          </p>
          <CopyCode code={best.code} />
        </div>
      )}
      {others.length > 0 && (
        <ul className="space-y-2">
          {others.map((offer) => (
            <li key={offer.code} className="flex items-center justify-between gap-3 rounded-lg border border-line px-4 py-2.5">
              <p className="flex items-start gap-2 text-[0.8125rem] text-body">
                <TagIcon size={16} className="mt-0.5 shrink-0 text-accent-ink" />
                {describeOffer(offer)}
              </p>
              <CopyCode code={offer.code} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
