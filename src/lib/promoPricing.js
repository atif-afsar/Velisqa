export function formatInr(amount) {
  return `₹${Number(amount).toLocaleString('en-IN')}`
}

export function getPromoComparePrice(salePrice, mrp) {
  const price = Number(salePrice)
  const compare = Number(mrp)
  if (!Number.isFinite(price) || price <= 0) return null
  if (!Number.isFinite(compare) || compare <= price) return null
  return compare
}

/** Resolve genuine product pricing. No comparison price is invented when MRP is absent. */
export function getPromoPriceDisplay(productOrPrice, explicitMrp = null) {
  const product = productOrPrice && typeof productOrPrice === 'object' ? productOrPrice : null
  const sale = Number(product ? product.price : productOrPrice)
  const mrp = product ? (product.mrp || Math.round(product.price * 1.4)) : explicitMrp
  const compare = getPromoComparePrice(sale, mrp)
  if (!Number.isFinite(sale) || sale <= 0 || compare == null) {
    return { sale, compare: null, hasPromo: false, discountPercent: 0 }
  }

  const discountPercent = Math.max(1, Math.round(((compare - sale) / compare) * 100))
  return { sale, compare, hasPromo: true, discountPercent }
}
