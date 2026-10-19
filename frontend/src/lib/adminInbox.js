import { api } from './apiClient'
import { validateIndianPhone } from './indianPhone'
import { isValidAwb } from './nimbusAwb'

export function orderNeedsShipment(order) {
  if (validateIndianPhone(order.customer_phone).ok === false) return false
  if ((order.nimbuspost_awb && isValidAwb(order.nimbuspost_awb)) || order.order_status === 'cancelled') return false
  if (order.payment_status === 'payment_submitted' || order.payment_status === 'awaiting_payment') {
    return false
  }
  if (order.payment_method === 'cod') {
    return order.payment_status === 'pending' || order.payment_status === 'paid'
  }
  return order.payment_status === 'paid'
}

export function orderNeedsPaymentReview(order) {
  return order.payment_status === 'payment_submitted'
}

/** `{ counts, paymentReviews, needsShipment, recentOrders }` computed on the server with the same rules. */
export function fetchAdminInboxSummary() {
  return api.get('/admin/inbox')
}
