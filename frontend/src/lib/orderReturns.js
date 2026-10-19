import { api } from './apiClient'

export const RETURN_WINDOW_DAYS = 5

export const RETURN_REASONS = [
  { value: 'Not as described', label: 'Not as described' },
  { value: 'Damaged or defective', label: 'Damaged or defective' },
  { value: 'Wrong item received', label: 'Wrong item received' },
  { value: 'Quality not as expected', label: 'Quality not as expected' },
  { value: 'Changed my mind', label: 'Changed my mind' },
  { value: 'Other', label: 'Other' },
]

export const RETURN_STATUS_LABELS = {
  pending: 'Return requested — pending approval',
  approved: 'Return approved — pickup will be scheduled',
  rejected: 'Return request declined',
  pickup_scheduled: 'Reverse pickup scheduled',
  in_transit: 'Return parcel in transit',
  received: 'Return received at warehouse',
  qc_passed: 'Quality check passed',
  qc_failed: 'Quality check failed',
  refunded: 'Refund completed',
  cancelled: 'Return cancelled',
}

export function isOrderDelivered(order) {
  if (!order) return false
  return order.orderStatus === 'delivered' || order.shippingStatus === 'delivered'
}

export async function checkCanRequestReturn(orderId) {
  const data = await api.get('/returns/eligibility', { query: { orderId } })
  return Boolean(data.eligible)
}

export async function fetchReturnForOrder(orderId) {
  const data = await api.get('/returns', { query: { orderId } })
  return data.return || null
}

export async function submitOrderReturn({ orderId, reason, customerNotes }) {
  const data = await api.post('/returns', { orderId, reason, customerNotes: customerNotes || null })
  return data.returnId
}

/** Latest return per order id (owner-filtered on the server). */
export async function fetchReturnsForOrders(orderIds) {
  if (!orderIds.length) return {}
  const data = await api.get('/returns', { query: { orderIds: orderIds.join(',') } })
  return data.returns || {}
}
