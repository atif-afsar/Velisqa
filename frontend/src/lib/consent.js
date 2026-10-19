/**
 * Consent management for analytics and advertising tags.
 *
 * Categories:
 *   - necessary   — always allowed (site functionality)
 *   - analytics   — GA4, Clarity
 *   - advertising — Google Ads, Meta Pixel, Meta CAPI
 */

const STORAGE_KEY = 'velisqa:consent'

const DEFAULT_CONSENT = {
  necessary: true,
  analytics: false,
  advertising: false,
}

/** Read the current consent state from localStorage. */
export function getConsent() {
  if (typeof window === 'undefined') return { ...DEFAULT_CONSENT }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null // no decision yet
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_CONSENT, ...parsed, necessary: true }
  } catch {
    return null
  }
}

/** Persist consent choices and dispatch an event so tags can load. */
export function setConsent(categories) {
  if (typeof window === 'undefined') return
  const consent = { ...DEFAULT_CONSENT, ...categories, necessary: true }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(consent))
  window.dispatchEvent(new CustomEvent('velisqa:consent-update', { detail: consent }))
}

/** Accept all tracking categories. */
export function acceptAllConsent() {
  setConsent({ analytics: true, advertising: true })
}

/** Accept only necessary cookies. */
export function acceptNecessaryOnly() {
  setConsent({ analytics: false, advertising: false })
}

/** Check if a specific category has been consented to. */
export function hasConsent(category) {
  if (category === 'necessary') return true
  const consent = getConsent()
  if (!consent) return false
  return consent[category] === true
}

/** Check if user has made any consent decision. */
export function hasConsentDecision() {
  return getConsent() !== null
}
