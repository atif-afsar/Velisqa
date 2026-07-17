import { formatInr } from './cartStock'

const SHIPPING_RANK = {
  not_shipped: 0,
  shipped: 1,
  out_for_delivery: 2,
  delivered: 3,
  rto: -1,
}

export function getShippingProgressIndex(order) {
  if (!order) return -1
  const fromStatus = SHIPPING_RANK[order.shippingStatus] ?? -1
  const fromAwb = order.awbNumber ? 1 : -1
  return Math.max(fromStatus, fromAwb)
}

export function isOrderTerminal(order) {
  if (!order) return true
  return order.orderStatus === 'cancelled'
    || order.orderStatus === 'delivered'
    || order.shippingStatus === 'delivered'
    || order.shippingStatus === 'rto'
}

export function canCustomerCancelOrder(order) {
  if (!order || isOrderTerminal(order)) return false
  if (order.orderStatus === 'delivered' || order.shippingStatus === 'delivered') return false
  if (order.shippingStatus === 'out_for_delivery') return false
  return true
}

export function isCodOrder(order) {
  if (order.paymentMethod === 'cod') return true
  if (order.paymentMethod === 'online') return false
  return order.paymentStatus === 'pending'
}

function paymentStep(order) {
  const isCod = isCodOrder(order)

  if (order.orderStatus === 'cancelled') {
    return { label: 'Order cancelled', complete: true, active: true, detail: 'This order will not be delivered.' }
  }

  if (isCod) {
    const delivered = order.shippingStatus === 'delivered' || order.orderStatus === 'delivered'
    if (delivered) {
      return { label: 'Paid on delivery', complete: true, detail: `${formatInr(order.grandTotal)} collected at doorstep.` }
    }
    return {
      label: 'Pay on delivery (COD)',
      complete: true,
      detail: `${formatInr(order.grandTotal)} due when the parcel arrives.`,
    }
  }

  switch (order.paymentStatus) {
    case 'paid':
      return { label: 'Payment confirmed', complete: true, detail: 'Your UPI payment was approved.' }
    case 'payment_submitted':
      return {
        label: 'Payment proof under review',
        complete: false,
        active: true,
        detail: 'Our team is verifying your screenshot. This usually takes a few hours.',
      }
    case 'rejected':
      return {
        label: 'Payment needs attention',
        complete: false,
        active: true,
        detail: order.rejectionReason || 'Upload a clearer payment proof to continue.',
      }
    case 'awaiting_payment':
      return {
        label: 'Complete your UPI payment',
        complete: false,
        active: true,
        detail: 'Pay via UPI and upload your payment screenshot.',
      }
    case 'pending':
      return { label: 'Payment pending', complete: false, active: true }
    default:
      return { label: 'Payment confirmed', complete: order.paymentStatus === 'paid' }
  }
}

function shippedStep(order, shippingIndex) {
  if (order.shippingStatus === 'delivered' || order.orderStatus === 'delivered') {
    return { label: 'Shipped', complete: true }
  }
  if (order.shippingStatus === 'out_for_delivery') {
    return { label: 'Shipped — in transit', complete: true }
  }
  if (shippingIndex >= 1 || order.awbNumber) {
    return {
      label: 'Shipped — in transit',
      complete: true,
      detail: order.courierName ? `With ${order.courierName}` : null,
    }
  }
  return {
    label: 'Awaiting courier pickup',
    complete: false,
    active: shippingIndex === 0 && order.orderStatus !== 'cancelled',
    detail: 'We will hand your parcel to NimbusPost once it is packed.',
  }
}

function outForDeliveryStep(order, shippingIndex) {
  if (order.shippingStatus === 'out_for_delivery') {
    return { label: 'Out for delivery today', complete: true, active: true }
  }
  if (order.shippingStatus === 'delivered') {
    return { label: 'Out for delivery', complete: true }
  }
  return {
    label: 'Out for delivery',
    complete: shippingIndex >= 2,
    active: shippingIndex === 1,
  }
}

function deliveredStep(order, shippingIndex) {
  const done = shippingIndex >= 3 || order.shippingStatus === 'delivered'
  return {
    label: done ? 'Delivered' : 'Delivery expected soon',
    complete: done,
    active: shippingIndex === 2 && !done,
  }
}

export function buildTrackingTimeline(order) {
  const shippingIndex = getShippingProgressIndex(order)
  const cancelled = order.orderStatus === 'cancelled'

  return [
    {
      id: 'placed',
      label: 'Order received',
      complete: true,
      detail: order.createdAt
        ? `Placed ${new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`
        : null,
    },
    { id: 'payment', ...paymentStep(order) },
    { id: 'shipped', ...shippedStep(order, shippingIndex) },
    { id: 'out_for_delivery', ...outForDeliveryStep(order, shippingIndex) },
    { id: 'delivered', ...deliveredStep(order, shippingIndex), last: true },
  ].map((step) => ({
    ...step,
    muted: cancelled && step.id !== 'payment' && step.id !== 'placed',
  }))
}

export function getPaymentStatusLabel(order) {
  if (isCodOrder(order)) {
    if (order.shippingStatus === 'delivered' || order.orderStatus === 'delivered') return 'Paid on delivery'
    return 'Pay on delivery (COD)'
  }
  const labels = {
    awaiting_payment: 'Awaiting UPI payment',
    payment_submitted: 'Proof under review',
    paid: 'Payment confirmed',
    rejected: 'Proof needs attention',
    pending: 'Pending',
    refunded: 'Refunded',
    failed: 'Payment failed',
  }
  return labels[order.paymentStatus] || order.paymentStatus
}

export function getShipmentStatusLabel(order) {
  if (order.orderStatus === 'cancelled') return 'Cancelled'
  if (order.shippingStatus === 'not_shipped' && !order.awbNumber) return 'Preparing dispatch'
  const labels = {
    not_shipped: 'Awaiting pickup',
    shipped: 'In transit',
    out_for_delivery: 'Out for delivery',
    delivered: 'Delivered',
    rto: 'Returned to sender',
  }
  return labels[order.shippingStatus] || order.shippingStatus
}
