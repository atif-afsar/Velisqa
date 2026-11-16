import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { getPrimaryImageUrl } from '../../lib/productImages'
import { buildImageUrl } from '../../lib/imageCdn'
import { displayProductName, productAlt } from '../../lib/productDisplay'
import { getPromoPriceDisplay, formatInr } from '../../lib/promoPricing'
import { productPath } from '../../lib/productUrl'
import { CheckIcon, PlusIcon } from '../UI/Icons'

/**
 * "Complete the look": this piece + up to 2 matching pieces (same colour first, other categories),
 * each with a tick-box, a running total, the MRP saving and one "Add all to bag" button.
 * One tap adds everything ticked; analytics fire one AddToCart per item.
 */
export default function CompleteTheLook({ product, matches }) {
  const { addManyToCart } = useCart()
  const look = [product, ...matches.slice(0, 2)]
  const [picked, setPicked] = useState(() => new Set(look.map((p) => p.id)))
  const [done, setDone] = useState(false)

  if (matches.length === 0) return null

  const chosen = look.filter((p) => picked.has(p.id))
  const total = chosen.reduce((sum, p) => sum + Number(p.price || 0), 0)
  const mrpTotal = chosen.reduce((sum, p) => sum + (getPromoPriceDisplay(p).compare || Number(p.price || 0)), 0)
  const saving = Math.max(0, mrpTotal - total)

  function toggle(id) {
    setDone(false)
    setPicked((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function addAll() {
    if (!chosen.length) return
    if (addManyToCart(chosen)?.ok) setDone(true)
  }

  return (
    <section aria-labelledby="ctl-heading" className="border-t border-line py-12 lg:py-20">
      <div className="container-lux">
        <p className="eyebrow text-muted">Style it with</p>
        <h2 id="ctl-heading" className="type-section mt-3 text-ink">
          Complete the look
        </h2>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center lg:gap-12">
          <ul className="grid grid-cols-3 items-start gap-2 sm:gap-4">
            {look.map((p, i) => {
              const on = picked.has(p.id)
              return (
                <li key={p.id} className="relative">
                  {i > 0 && (
                    <span aria-hidden="true" className="absolute -left-2 top-[38%] z-10 grid h-5 w-5 -translate-x-1/2 place-items-center rounded-full bg-paper text-ink shadow sm:-left-3 sm:h-6 sm:w-6">
                      <PlusIcon size={12} />
                    </span>
                  )}
                  <label className={`block cursor-pointer ${on ? '' : 'opacity-50'}`}>
                    <span className="relative block aspect-[4/5] overflow-hidden bg-mist">
                      <img
                        src={buildImageUrl(getPrimaryImageUrl(p), { width: 400, pad: true })}
                        alt={productAlt(p)}
                        width="400"
                        height="500"
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggle(p.id)}
                        className="absolute left-2 top-2 h-5 w-5 accent-ink"
                        aria-label={`${on ? 'Remove' : 'Include'} ${displayProductName(p.name)}`}
                      />
                    </span>
                  </label>
                  <Link to={productPath(p)} className="mt-2 line-clamp-2 text-xs text-ink hover:text-accent-ink sm:text-sm">
                    {i === 0 ? 'This piece: ' : ''}
                    {displayProductName(p.name)}
                  </Link>
                  <p className="type-price mt-0.5 text-xs font-semibold text-ink sm:text-sm">{formatInr(p.price)}</p>
                </li>
              )
            })}
          </ul>

          <div className="rounded-lg bg-mist p-5">
            <p className="text-sm text-body">
              {chosen.length} piece{chosen.length === 1 ? '' : 's'} selected
            </p>
            <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
              <span className="type-price text-2xl font-semibold text-ink">{formatInr(total)}</span>
              {saving > 0 && (
                <>
                  <s className="text-sm text-muted">{formatInr(mrpTotal)}</s>
                  <span className="text-sm font-semibold text-accent-ink">You save {formatInr(saving)}</span>
                </>
              )}
            </p>
            <button type="button" onClick={addAll} disabled={!chosen.length} className="btn btn-primary mt-4 min-h-12 w-full">
              {done ? (
                <>
                  <CheckIcon size={16} /> Added to bag
                </>
              ) : chosen.length > 1 ? (
                `Add all ${chosen.length} to bag`
              ) : (
                'Add to bag'
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
