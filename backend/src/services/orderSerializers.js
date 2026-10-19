import { decryptOrderToken } from '../lib/crypto.js'

const iso = (value) => (value instanceof Date ? value.toISOString() : value ?? null)

/** Fields hidden from every API response. */
const INTERNAL = new Set(['access_token_hash', 'access_token_enc', 'idempotency_key', 'idempotency_hash', 'stock_applied', 'deleted_at', 'razorpay_signature'])

/** Order row in the snake_case shape PostgREST returned (admin + "my orders"). */
export function serializeOrderRow(order, items, { includeToken = false } = {}) {
  if (!order) return null
  const { _id, ...rest } = order
  const out = { id: _id }
  for (const [key, value] of Object.entries(rest)) {
    if (INTERNAL.has(key)) continue
    out[key] = value instanceof Date ? value.toISOString() : value
  }
  if (includeToken) out.order_access_token = decryptOrderToken(order.access_token_enc)
  if (items) out.order_items = items.map(serializeOrderItem)
  return out
}

export function serializeOrderItem(item) {
  return {
    id: item._id,
    order_id: item.order_id,
    product_id: item.product_id ?? null,
    product_name: item.product_name,
    product_url: item.product_url ?? null,
    image_url: item.image_url ?? null,
    unit_price: item.unit_price,
    quantity: item.quantity,
    line_total: item.line_total,
    is_free_gift: Boolean(item.is_free_gift),
    created_at: iso(item.created_at),
  }
}

/** camelCase shape of the old get_manual_payment_order RPC (private order/pay/tracking pages). */
export function serializePrivateOrder(order, items) {
  return {
    id: order._id,
    orderRef: order.order_ref,
    customerName: order.customer_name,
    customerEmail: order.customer_email ?? null,
    customerPhone: order.customer_phone,
    subtotal: order.subtotal,
    deliveryCharge: order.delivery_charge ?? 0,
    taxAmount: order.tax_amount ?? 0,
    discountAmount: order.discount_amount ?? 0,
    couponCode: order.coupon_code ?? null,
    giftWrap: Boolean(order.gift_wrap),
    giftWrapFee: order.gift_wrap_fee ?? 0,
    grandTotal: order.grand_total,
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status,
    paymentUtr: order.payment_utr ?? null,
    shippingStatus: order.shipping_status,
    orderStatus: order.order_status,
    rejectionReason: order.rejection_reason ?? null,
    awbNumber: order.nimbuspost_awb ?? null,
    courierName: order.courier_name ?? null,
    trackingUrl: order.tracking_url ?? null,
    deliveredAt: iso(order.delivered_at),
    createdAt: iso(order.created_at),
    items: items.map((item) => ({
      productId: item.product_id ?? null,
      name: item.product_name,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      lineTotal: item.line_total,
      imageUrl: item.image_url ?? null,
      isFreeGift: Boolean(item.is_free_gift),
    })),
  }
}
