import { useEffect, useId, useMemo, useState } from 'react'
import { PinIcon } from '../UI/Icons'

const PINCODE_KEY = 'velisqa:delivery_pincode'

function readSavedPincode() {
  try {
    const saved = localStorage.getItem(PINCODE_KEY) || ''
    return /^\d{6}$/.test(saved) ? saved : ''
  } catch {
    return ''
  }
}

function deliveryWindow() {
  const fmt = { day: 'numeric', month: 'short' }
  const start = new Date()
  start.setDate(start.getDate() + 3)
  const end = new Date()
  end.setDate(end.getDate() + 5)
  return `${start.toLocaleDateString('en-IN', fmt)} – ${end.toLocaleDateString('en-IN', fmt)}`
}

/** Pincode serviceability check (India Post lookup) with an estimated delivery window. */
export default function DeliveryEstimate() {
  const inputId = useId()
  const [pincode, setPincode] = useState(readSavedPincode)
  const [status, setStatus] = useState('idle') // idle | checking | ok | invalid
  const [place, setPlace] = useState('')
  const estimate = useMemo(() => deliveryWindow(), [])

  async function check(pin) {
    if (!/^\d{6}$/.test(pin)) {
      setStatus('invalid')
      setPlace('')
      return
    }
    setStatus('checking')
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`)
      const data = await res.json()
      const office = data?.[0]?.Status === 'Success' ? data[0].PostOffice?.[0] : null
      if (office) {
        setPlace(`${office.District}, ${office.State}`)
        setStatus('ok')
        try {
          localStorage.setItem(PINCODE_KEY, pin)
        } catch {
          /* storage unavailable */
        }
      } else {
        setPlace('')
        setStatus('invalid')
      }
    } catch {
      // Lookup service unreachable: don't block the shopper.
      setPlace('')
      setStatus('ok')
    }
  }

  useEffect(() => {
    const saved = readSavedPincode()
    if (saved) queueMicrotask(() => void check(saved))
  }, [])

  return (
    <div className="border-t border-line pt-6">
      <label htmlFor={inputId} className="eyebrow flex items-center gap-2 text-ink">
        <PinIcon size={16} />
        Delivery
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
      <p id={`${inputId}-status`} className="mt-2 min-h-5 text-sm" role="status">
        {status === 'ok' && (
          <span className="text-body">
            Estimated delivery <strong className="font-medium text-ink">{estimate}</strong>
            {place && <span className="text-muted"> · {place}</span>}
          </span>
        )}
        {status === 'invalid' && <span className="text-danger">Please enter a valid 6-digit pincode we deliver to.</span>}
        {status === 'idle' && <span className="text-muted">Free shipping on prepaid orders.</span>}
      </p>
    </div>
  )
}
