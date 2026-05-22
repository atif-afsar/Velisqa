/** Display-only promo: sale price in DB stays the same; compare-at is derived. */
export const PROMO_DISCOUNT_PERCENT = 30

export function formatInr(amount) {
  return `₹${Number(amount).toLocaleString('en-IN')}`
}

/** Original (pre-discount) price shown struck through — sale = compare × (1 − 30%). */
export function getPromoComparePrice(salePrice) {
  const price = Number(salePrice)
  if (!Number.isFinite(price) || price <= 0) return null

  const factor = 1 - PROMO_DISCOUNT_PERCENT / 100
  return Math.round(price / factor)
}

export function getPromoPriceDisplay(salePrice) {
  const sale = Number(salePrice)
  const compare = getPromoComparePrice(sale)
  if (!Number.isFinite(sale) || sale <= 0 || compare == null) {
    return { sale, compare: null, hasPromo: false }
  }
  return { sale, compare, hasPromo: compare > sale }
}
