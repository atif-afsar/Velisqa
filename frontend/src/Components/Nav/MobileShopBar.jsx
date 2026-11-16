import { useEffect, useState } from 'react'
import { OPEN_SEARCH_EVENT } from '../../lib/mobileNav'
import { deliveryByLabel, lookupPincode, savePincode, useSavedPincode } from '../../lib/delivery'
import { PinIcon, SearchIcon } from '../UI/Icons'

const HINTS = ['heart necklace', 'pearl studs', 'gifts under 499', 'gold hoops', 'stackable rings']

/**
 * Phones (home + collections): a full-width search bar with rotating hints, and the delivery
 * pincode chip ("Deliver to 202001 · by Wed, 19 Nov") shared with the product page and checkout.
 */
export default function MobileShopBar({ compact = false }) {
  const [hint, setHint] = useState(0)
  const saved = useSavedPincode()
  const [editing, setEditing] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return undefined
    const t = window.setInterval(() => setHint((h) => (h + 1) % HINTS.length), 2800)
    return () => window.clearInterval(t)
  }, [])

  async function submit(e) {
    e.preventDefault()
    setError('')
    setChecking(true)
    const result = await lookupPincode(pin)
    setChecking(false)
    if (!result.ok) {
      setError('Enter a valid 6-digit pincode.')
      return
    }
    savePincode(pin, result.city ? `${result.city}, ${result.state}` : '')
    setEditing(false)
  }

  return (
    <div className="border-b border-line bg-paper px-4 py-2 lg:hidden">
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event(OPEN_SEARCH_EVENT))}
        className="flex min-h-11 w-full items-center gap-3 rounded-full border border-line-strong bg-mist px-4 text-left text-sm text-muted"
      >
        <SearchIcon size={18} className="shrink-0 text-ink" />
        <span className="truncate">
          Search “<span key={hint} className="fade-in">{HINTS[hint]}</span>”
        </span>
      </button>

      {compact ? null : editing ? (
        <form onSubmit={submit} className="mt-2 flex items-center gap-2">
          <label htmlFor="shopbar-pin" className="sr-only">
            Delivery pincode
          </label>
          <input
            id="shopbar-pin"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={6}
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Enter delivery pincode"
            className="field min-h-11 min-w-0 flex-1 py-2 text-sm"
          />
          <button type="submit" disabled={checking || pin.length !== 6} className="btn btn-primary min-h-11 px-4 text-xs">
            {checking ? '…' : 'Apply'}
          </button>
          <button type="button" onClick={() => setEditing(false)} className="min-h-11 px-2 text-xs text-muted">
            Cancel
          </button>
        </form>
      ) : (
        <button type="button" onClick={() => setEditing(true)} className="mt-1.5 flex min-h-9 items-center gap-1.5 text-xs text-body">
          <PinIcon size={14} className="shrink-0 text-ink" />
          {saved.pin ? (
            <span>
              Deliver to <strong className="font-semibold text-ink">{saved.pin}</strong> · by {deliveryByLabel()}
            </span>
          ) : (
            <span className="underline underline-offset-2">Check delivery date for your pincode</span>
          )}
        </button>
      )}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  )
}
