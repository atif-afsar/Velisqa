import { api } from './apiClient'

const CODE_KEY = 'velisqa:applied_coupon'
const DISCOUNT_KEY = 'velisqa:applied_coupon_discount'
const GIFT_WRAP_KEY = 'velisqa:gift_wrap'

function storage(fn, fallback = null) {
  try {
    return fn(window.localStorage)
  } catch {
    return fallback
  }
}

export function readAppliedCoupon() {
  return storage((s) => s.getItem(CODE_KEY), '') || ''
}

export function saveAppliedCoupon(code, discount) {
  storage((s) => {
    s.setItem(CODE_KEY, code)
    s.setItem(DISCOUNT_KEY, String(discount))
  })
}

export function clearAppliedCoupon() {
  storage((s) => {
    s.removeItem(CODE_KEY)
    s.removeItem(DISCOUNT_KEY)
  })
}

export function readGiftWrap() {
  return storage((s) => s.getItem(GIFT_WRAP_KEY) === 'true', false)
}

export function saveGiftWrap(on) {
  storage((s) => (on ? s.setItem(GIFT_WRAP_KEY, 'true') : s.removeItem(GIFT_WRAP_KEY)))
}

/** Same rounding as the server: whole rupees. */
export function computeCouponDiscount(coupon, subtotal) {
  if (!coupon || subtotal < Number(coupon.min_subtotal || 0)) return 0
  if (coupon.discount_type === 'percentage') return Math.round(subtotal * (Number(coupon.discount_value) / 100))
  if (coupon.discount_type === 'fixed') return Math.min(Number(coupon.discount_value), subtotal)
  return 0
}

/**
 * Validates a coupon against the live coupons collection (active coupons only).
 * Returns { ok, code, discount } or { ok: false, error }. The server re-prices at checkout.
 */
export async function validateCoupon(rawCode, subtotal) {
  const code = String(rawCode || '').toUpperCase().trim()
  if (!code) return { ok: false, error: 'Enter a coupon code.' }
  try {
    const { coupon } = await api.get(`/coupons/${encodeURIComponent(code)}`)
    if (subtotal < Number(coupon.min_subtotal || 0)) {
      return { ok: false, error: `This code needs a minimum spend of ₹${Number(coupon.min_subtotal).toLocaleString('en-IN')}.` }
    }
    return { ok: true, code, discount: computeCouponDiscount(coupon, subtotal) }
  } catch (error) {
    if (error?.status === 404) return { ok: false, error: 'This code isn’t valid or has expired.' }
    return { ok: false, error: 'We couldn’t check that code. Please try again.' }
  }
}
