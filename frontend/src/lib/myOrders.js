import { api } from './apiClient'

function mapOrderRow(row) {
  if (!row) return null

  return {
    id: row.id,
    orderRef: row.order_ref,
    accessToken: row.order_access_token,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    grandTotal: row.grand_total,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    shippingStatus: row.shipping_status,
    orderStatus: row.order_status,
    rejectionReason: row.rejection_reason,
    awbNumber: row.nimbuspost_awb,
    courierName: row.courier_name,
    trackingUrl: row.tracking_url,
    deliveredAt: row.delivered_at,
    createdAt: row.created_at,
    items: (row.order_items || []).map((item) => ({
      productId: item.product_id,
      name: item.product_name,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      lineTotal: item.line_total,
      imageUrl: item.image_url,
      isFreeGift: item.is_free_gift,
    })),
  }
}

/** Signed-in customer's orders (owner-filtered on the server). */
export async function fetchMyOrders() {
  const data = await api.get('/orders/mine')
  return data.orders || []
}

export async function getMyOrderByRef(orderRef) {
  if (!orderRef) throw new Error('Order reference is required.')
  const data = await api.get(`/orders/mine/${encodeURIComponent(orderRef)}`)
  return mapOrderRow(data.order)
}

export function myOrderTrackUrl(orderRef, accessToken) {
  const query = new URLSearchParams({ token: accessToken })
  return `/orders/${encodeURIComponent(orderRef)}?${query.toString()}`
}

export function myOrderPayUrl(orderRef, accessToken) {
  const query = new URLSearchParams({ token: accessToken })
  return `/pay/${encodeURIComponent(orderRef)}?${query.toString()}`
}
