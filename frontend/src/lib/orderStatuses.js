export const PAYMENT_STATUS_LABELS = {
  awaiting_payment: 'Awaiting payment',
  payment_submitted: 'Proof under review',
  paid: 'Payment confirmed',
  rejected: 'Proof needs attention',
  refunded: 'Refunded',
  failed: 'Payment failed',
  pending: 'Pending',
}

export const SHIPPING_STATUS_LABELS = {
  not_shipped: 'Not shipped',
  shipped: 'Shipped',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  rto: 'Cancelled / returned',
}

export const ORDER_STATUS_LABELS = {
  placed: 'Placed',
  confirmed: 'Confirmed',
  packed: 'Packed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
}

export function buildNimbusPostTrackingUrl({ awbNumber, orderRef, trackingUrl }) {
  if (trackingUrl) return trackingUrl
  if (awbNumber) {
    const params = new URLSearchParams({ awb: String(awbNumber) })
    return `https://nimbuspost.com/tracking/?${params.toString()}`
  }
  if (orderRef) {
    const params = new URLSearchParams({ order_id: String(orderRef) })
    return `https://nimbuspost.com/tracking/?${params.toString()}`
  }
  return null
}
