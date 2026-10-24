import { C, getDb } from '../config/db.js'
import { badRequest, HttpError } from '../lib/errors.js'
import { roundPaiseToRupee, toPaise, toRupees } from '../lib/money.js'
import { isCouponRedeemable } from './couponService.js'

/**
 * Port of public.create_manual_payment_order pricing from
 * supabase/migrations/20261016_consolidated_checkout.sql (the last, canonical
 * definition). Keep in sync with src/lib/checkoutPricing.js and src/lib/cartOffers.js.
 */
export const PRICING = Object.freeze({
  giftWrapFee: 50,
  codFee: 50,
  codGstRate: 0.02,
  giftThreshold: 1299,
  giftMaxValue: 400,
  maxLineQuantity: 50,
})

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const unavailable = (message) => new HttpError(409, message, { code: 'UNAVAILABLE' })

/** Groups raw cart lines exactly like the SQL `_checkout_lines` temp table. */
export function aggregateLines(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) throw badRequest('Your bag is empty.')
  if (rawItems.some((item) => !UUID.test(String(item?.productId || '')))) {
    throw unavailable('One or more products are unavailable.')
  }
  const lines = new Map()
  for (const item of rawItems) {
    const productId = String(item.productId).toLowerCase()
    const isGift = item.isFreeGift === true
    const key = `${productId}|${isGift}`
    const qty = Math.max(1, Math.min(Number.parseInt(item.quantity, 10) || 1, PRICING.maxLineQuantity))
    const existing = lines.get(key)
    if (isGift) lines.set(key, { productId, isGift, qty: 1 })
    else lines.set(key, { productId, isGift, qty: (existing?.qty || 0) + qty })
  }
  return [...lines.values()]
}

export function computeCouponDiscountPaise(coupon, subtotalPaise) {
  if (!coupon || !coupon.active || subtotalPaise < toPaise(coupon.min_subtotal)) return 0
  if (coupon.discount_type === 'percentage') {
    return roundPaiseToRupee((subtotalPaise * Number(coupon.discount_value)) / 100)
  }
  if (coupon.discount_type === 'fixed') return Math.min(toPaise(coupon.discount_value), subtotalPaise)
  return 0
}

/**
 * Authoritative quote. Reads prices/stock from the DB (optionally inside a
 * transaction session) and never trusts client money, gift or stock claims.
 */
export async function priceCart({ items, couponCode, giftWrap = false, paymentMethod = 'online', customerEmail = null }, session) {
  const lines = aggregateLines(items)
  const db = getDb()
  const opts = session ? { session } : undefined
  const ids = [...new Set(lines.map((line) => line.productId))]
  const products = await db.collection(C.products).find({ _id: { $in: ids } }, opts).toArray()
  const byId = new Map(products.map((product) => [String(product._id).toLowerCase(), product]))

  // Stock is checked on the TOTAL requested quantity per product (gift + paid lines).
  const totals = new Map()
  for (const line of lines) totals.set(line.productId, (totals.get(line.productId) || 0) + line.qty)
  for (const [productId, qty] of totals) {
    const product = byId.get(productId)
    if (!product || product.out_of_stock || qty > Math.max(0, Number(product.stock) || 0)) {
      throw unavailable('One or more products are unavailable in the requested quantity.')
    }
  }

  let subtotalPaise = 0
  for (const line of lines) {
    if (!line.isGift) subtotalPaise += toPaise(byId.get(line.productId).price) * line.qty
  }
  if (subtotalPaise <= 0) throw unavailable('No available products were found.')

  const giftLines = lines.filter((line) => line.isGift)
  if (giftLines.length > 0) {
    const tooValuable = giftLines.some((line) => toPaise(byId.get(line.productId).price) > toPaise(PRICING.giftMaxValue))
    if (giftLines.length > 1 || subtotalPaise < toPaise(PRICING.giftThreshold) || tooValuable) {
      throw unavailable('Your complimentary gift is no longer available — please review your bag.')
    }
  }

  let appliedCoupon = null
  let discountPaise = 0
  const code = String(couponCode || '').trim().toUpperCase()
  if (code) {
    const found = await db.collection(C.coupons).findOne({ _id: code, active: true }, opts)
    // Expired, already-used and other-shopper (email-bound) codes simply do not apply.
    const coupon = isCouponRedeemable(found, { email: customerEmail }) ? found : null
    discountPaise = computeCouponDiscountPaise(coupon, subtotalPaise)
    if (coupon && subtotalPaise >= toPaise(coupon.min_subtotal)) appliedCoupon = code
    else discountPaise = 0
  }

  const method = String(paymentMethod || 'online').toLowerCase() === 'cod' ? 'cod' : 'online'
  const giftWrapPaise = giftWrap === true ? toPaise(PRICING.giftWrapFee) : 0
  const codFeePaise = method === 'cod' ? toPaise(PRICING.codFee) : 0
  const taxPaise = method === 'cod' ? roundPaiseToRupee((subtotalPaise - discountPaise) * PRICING.codGstRate) : 0
  const grandPaise = Math.max(0, subtotalPaise - discountPaise) + giftWrapPaise + codFeePaise + taxPaise

  return {
    paymentMethod: method,
    lines: lines.map((line) => {
      const product = byId.get(line.productId)
      const unit = line.isGift ? 0 : toPaise(product.price)
      return {
        product,
        productId: product._id,
        isGift: line.isGift,
        quantity: line.qty,
        unitPrice: toRupees(unit),
        lineTotal: toRupees(unit * line.qty),
      }
    }),
    stockByProduct: totals,
    couponCode: appliedCoupon,
    giftWrap: giftWrap === true,
    subtotal: toRupees(subtotalPaise),
    discount: toRupees(discountPaise),
    giftWrapFee: toRupees(giftWrapPaise),
    codFee: toRupees(codFeePaise),
    tax: toRupees(taxPaise),
    grandTotal: toRupees(grandPaise),
  }
}

export function quoteResponse(priced) {
  return {
    subtotal: priced.subtotal,
    discount: priced.discount,
    couponCode: priced.couponCode,
    giftWrapFee: priced.giftWrapFee,
    codFee: priced.codFee,
    tax: priced.tax,
    grandTotal: priced.grandTotal,
    paymentMethod: priced.paymentMethod,
    items: priced.lines.map((line) => ({
      productId: line.productId,
      name: line.product.name,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineTotal: line.lineTotal,
      isFreeGift: line.isGift,
    })),
  }
}
