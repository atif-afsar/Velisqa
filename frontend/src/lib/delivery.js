import { useEffect, useState } from 'react'

/**
 * Delivery pincode + ETA, shared by the header chip, product page, bag and checkout so the
 * promised date is the same everywhere. Orders ship in 3–5 days (see Shipping & Delivery policy).
 */
export const PINCODE_KEY = 'velisqa:delivery_pincode'
const PLACE_KEY = 'velisqa:delivery_place'
const EVENT = 'velisqa:pincode-change'

export const DELIVERY_MIN_DAYS = 3
export const DELIVERY_MAX_DAYS = 5

export function readSavedPincode() {
  try {
    const saved = localStorage.getItem(PINCODE_KEY) || ''
    return /^\d{6}$/.test(saved) ? saved : ''
  } catch {
    return ''
  }
}

export function readSavedPlace() {
  try {
    return localStorage.getItem(PLACE_KEY) || ''
  } catch {
    return ''
  }
}

export function savePincode(pin, place = '') {
  try {
    localStorage.setItem(PINCODE_KEY, pin)
    if (place) localStorage.setItem(PLACE_KEY, place)
    else localStorage.removeItem(PLACE_KEY)
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { pin, place } }))
}

/** India Post lookup. Resolves { ok, city, state } — `ok: true` without a place when the service is down. */
export async function lookupPincode(pin) {
  if (!/^\d{6}$/.test(pin)) return { ok: false }
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`)
    const data = await res.json()
    const office = data?.[0]?.Status === 'Success' ? data[0].PostOffice?.[0] : null
    if (!office) return { ok: false }
    return { ok: true, city: office.District, state: office.State }
  } catch {
    return { ok: true, city: '', state: '' }
  }
}

function addDays(days, from = new Date()) {
  const d = new Date(from)
  d.setDate(d.getDate() + days)
  return d
}

/** Latest expected delivery date, e.g. "Wed, 19 Nov". */
export function deliveryByLabel(from = new Date()) {
  return addDays(DELIVERY_MAX_DAYS, from).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}

/** Window, e.g. "19 Nov – 21 Nov". */
export function deliveryWindowLabel(from = new Date()) {
  const fmt = { day: 'numeric', month: 'short' }
  return `${addDays(DELIVERY_MIN_DAYS, from).toLocaleDateString('en-IN', fmt)} – ${addDays(DELIVERY_MAX_DAYS, from).toLocaleDateString('en-IN', fmt)}`
}

/** Live saved pincode (updates across components and tabs). */
export function useSavedPincode() {
  const [state, setState] = useState(() => (typeof window === 'undefined' ? { pin: '', place: '' } : { pin: readSavedPincode(), place: readSavedPlace() }))
  useEffect(() => {
    const sync = () => setState({ pin: readSavedPincode(), place: readSavedPlace() })
    window.addEventListener(EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])
  return state
}
