import { useEffect, useId, useState } from 'react'
import { PinIcon } from '../UI/Icons'
import { COD_FEE } from '../../lib/checkoutPricing'
import { deliveryByLabel, lookupPincode, savePincode, useSavedPincode } from '../../lib/delivery'

/**
 * Delivery ETA for the saved pincode (same pincode as the header chip and checkout), with COD
 * availability and its fee shown up front so the checkout total holds no surprises.
 */
export default function DeliveryEstimate() {
  const inputId = useId()
  const saved = useSavedPincode()
  const [editing, setEditing] = useState(!saved.pin)
  const [pincode, setPincode] = useState(saved.pin)
  const [status, setStatus] = useState(saved.pin ? 'ok' : 'idle') // idle | checking | ok | invalid
  const by = deliveryByLabel()

  // Another component (header chip) changed the pincode.
  useEffect(() => {
    if (!saved.pin) return
    queueMicrotask(() => {
      setPincode(saved.pin)
      setStatus('ok')
      setEditing(false)
    })
  }, [saved.pin])

  async function check(pin) {
    if (!/^\d{6}$/.test(pin)) {
      setStatus('invalid')
      return
    }
    setStatus('checking')
    const result = await lookupPincode(pin)
    if (!result.ok) {
      setStatus('invalid')
      return
    }
    savePincode(pin, result.city ? `${result.city}, ${result.state}` : '')
    setStatus('ok')
    setEditing(false)
  }

  return (
    <div className="rounded-lg border border-line p-4">
      {!editing && saved.pin ? (
        <div className="flex items-start justify-between gap-3">
          <p className="flex items-start gap-2.5 text-sm text-body" role="status">
            <PinIcon size={18} className="mt-0.5 shrink-0 text-ink" />
            <span>
              Delivered by <strong className="font-semibold text-ink">{by}</strong>
              <span className="block text-xs text-muted">
                To {saved.pin}
                {saved.place && ` · ${saved.place}`} · COD available ({`₹${COD_FEE}`} fee)
              </span>
            </span>
          </p>
          <button type="button" onClick={() => setEditing(true)} className="min-h-11 shrink-0 px-1 text-xs font-medium text-ink underline underline-offset-4">
            Change
          </button>
        </div>
      ) : (
        <>
          <label htmlFor={inputId} className="flex items-center gap-2 text-sm font-medium text-ink">
            <PinIcon size={16} />
            Check delivery date
          </label>
          <form
            className="mt-3 flex"
            onSubmit={(e) => {
              e.preventDefault()
              void check(pincode)
            }}
          >
            <input
              id={inputId}
              type="text"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={6}
              placeholder="Enter pincode"
              value={pincode}
              onChange={(e) => {
                setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))
                setStatus('idle')
              }}
              className="field min-w-0 flex-1 border-r-0"
              aria-describedby={`${inputId}-status`}
            />
            <button type="submit" className="btn btn-secondary min-h-12 shrink-0 px-5" disabled={status === 'checking'}>
              {status === 'checking' ? 'Checking' : 'Check'}
            </button>
          </form>
          <p id={`${inputId}-status`} className="mt-2 min-h-5 text-xs" role="status">
            {status === 'invalid' ? (
              <span className="text-danger">Please enter a valid 6-digit pincode we deliver to.</span>
            ) : (
              <span className="text-muted">Usually delivered in 3–5 days · Free shipping on prepaid · COD ₹{COD_FEE} fee</span>
            )}
          </p>
        </>
      )}
    </div>
  )
}
