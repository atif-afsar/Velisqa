import { useEffect, useState } from 'react'
import { api } from './apiClient'
import { computeCouponDiscount } from './coupons'

/**
 * Public offers = coupons the admin ticked "Show on website" (GET /offers).
 * Everything here is computed live from those coupons, so a new offer created in /admin/coupons
 * appears on cards, the product page, the bag and checkout without a code change.
 */
const CACHE_KEY = 'velisqa:offers:v1'
const TTL_MS = 5 * 60_000

let memory = null
let inflight = null
const listeners = new Set()

function readCache() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null')
    if (parsed && Array.isArray(parsed.offers) && Date.now() - parsed.at < TTL_MS) return parsed.offers
  } catch {
    /* ignore */
  }
  return null
}

function load() {
  if (inflight) return inflight
  inflight = api
    .get('/offers', { retries: 1 })
    .then((data) => {
      const offers = Array.isArray(data?.offers) ? data.offers : []
      memory = offers
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ offers, at: Date.now() }))
      } catch {
        /* ignore */
      }
      listeners.forEach((fn) => fn(offers))
      return offers
    })
    .catch(() => memory || [])
    .finally(() => {
      inflight = null
    })
  return inflight
}

export function useOffers() {
  const [offers, setOffers] = useState(() => (typeof window === 'undefined' ? [] : memory || readCache() || []))
  useEffect(() => {
    listeners.add(setOffers)
    if (!memory) {
      const cached = readCache()
      if (cached) memory = cached
      else void load()
    }
    return () => listeners.delete(setOffers)
  }, [])
  return offers
}

export function describeOffer(offer) {
  if (offer.label) return offer.label
  const value = offer.discount_type === 'percentage' ? `${offer.discount_value}% off` : `₹${Number(offer.discount_value).toLocaleString('en-IN')} off`
  return offer.min_subtotal > 0 ? `${value} on orders above ₹${Number(offer.min_subtotal).toLocaleString('en-IN')}` : value
}

/**
 * Best price for buying `quantity` of one item with a single public code.
 * Returns { code, offer, price, saving } or null when no offer applies to that basket on its own.
 */
export function bestOfferForPrice(price, offers, quantity = 1) {
  const subtotal = Number(price) * quantity
  if (!Number.isFinite(subtotal) || subtotal <= 0) return null
  let best = null
  for (const offer of offers || []) {
    const saving = computeCouponDiscount(offer, subtotal)
    if (saving > 0 && (!best || saving > best.saving)) best = { code: offer.code, offer, saving, price: Math.max(0, subtotal - saving) }
  }
  return best
}

/** Best code for a whole bag subtotal (used to auto-suggest / auto-apply in the bag and checkout). */
export function bestOfferForSubtotal(subtotal, offers) {
  return bestOfferForPrice(subtotal, offers, 1)
}

/** Cheapest unlockable offer the bag hasn't reached yet: { offer, remaining }. */
export function nextOfferToUnlock(subtotal, offers) {
  const pending = (offers || [])
    .filter((o) => o.min_subtotal > subtotal)
    .sort((a, b) => a.min_subtotal - b.min_subtotal)[0]
  return pending ? { offer: pending, remaining: pending.min_subtotal - subtotal } : null
}
