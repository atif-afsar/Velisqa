/**
 * Checkout totals — the single client-side source of truth.
 * Must match public.create_manual_payment_order in
 * supabase/migrations/20261016_consolidated_checkout.sql (the server recomputes everything).
 */
export const GIFT_WRAP_FEE = 50
export const COD_FEE = 50
export const COD_GST_RATE = 0.02

export function computeCheckoutTotals({ subtotal, couponDiscount = 0, giftWrap = false, paymentMethod = 'online' }) {
  const merchandise = Math.max(0, Number(subtotal) || 0)
  const discount = Math.min(merchandise, Math.max(0, Number(couponDiscount) || 0))
  const afterDiscount = merchandise - discount
  const giftWrapFee = giftWrap ? GIFT_WRAP_FEE : 0
  const cod = paymentMethod === 'cod'
  const codFee = cod ? COD_FEE : 0
  const codGst = cod ? Math.round(afterDiscount * COD_GST_RATE) : 0
  return {
    subtotal: merchandise,
    discount,
    giftWrapFee,
    codFee,
    codGst,
    total: afterDiscount + giftWrapFee + codFee + codGst,
  }
}
