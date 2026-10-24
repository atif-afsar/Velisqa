import { api } from './apiClient'

const EMAIL_KEY = 'velisqa:lead_email'
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function storage(fn, fallback = '') {
  try {
    return fn(window.localStorage)
  } catch {
    return fallback
  }
}

/** The address a shopper opted in with, so a recovery-email link lands on a checkout that already knows them. */
export const readLeadEmail = () => storage((s) => s.getItem(EMAIL_KEY)) || ''

/**
 * Tells the server which bag this (consenting) shopper has, so we can email them if they leave.
 * Never throws and never blocks checkout.
 */
export async function saveCheckoutLead({ email, items }) {
  const clean = String(email || '').trim()
  if (!EMAIL_RE.test(clean) || !items?.length) return
  try {
    await api.post('/checkout/lead', {
      email: clean,
      consent: true,
      items: items.map((line) => ({ productId: line.productId, quantity: line.quantity })),
    })
    storage((s) => s.setItem(EMAIL_KEY, clean))
  } catch {
    /* best effort only */
  }
}
