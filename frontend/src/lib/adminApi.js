import { api } from './apiClient'

/** `{ data, error }` shape the admin pages already handle (error is a display string). */
async function asResult(promise) {
  try {
    return { data: await promise, error: null }
  } catch (error) {
    return { data: null, error: error?.message || 'Request failed.' }
  }
}

const orderPath = (orderId) => `/admin/orders/${encodeURIComponent(orderId)}`

/** One page of orders with items, newest first. Returns `{ data, error, count }` like the old PostgREST query. */
export async function fetchAdminOrdersPage({ offset = 0, limit = 50, onlineOnly = false } = {}) {
  try {
    const result = await api.get(onlineOnly ? '/admin/payments' : '/admin/orders', { query: { offset, limit } })
    return { data: result.orders, error: null, count: result.total }
  } catch (error) {
    return { data: null, error, count: null }
  }
}

export const adminShipOrder = (orderId) => asResult(api.post(`${orderPath(orderId)}/ship`))
export const adminCancelOrder = (orderId) => asResult(api.post(`${orderPath(orderId)}/cancel`))
export const adminDeleteOrder = (orderId) => asResult(api.delete(orderPath(orderId)))
export const adminResetShipment = (orderId) => asResult(api.post(`${orderPath(orderId)}/reset-shipment`))

/** Marks an order paid through the audited approval command (never a raw status update). */
export const adminApprovePayment = (orderId, { razorpayPaymentId, note } = {}) =>
  asResult(api.post(`/admin/payments/${encodeURIComponent(orderId)}/approve`, { razorpayPaymentId: razorpayPaymentId || undefined, note }))

export async function fetchAdminCoupons() {
  const data = await api.get('/admin/coupons')
  return data.coupons || []
}

export const createAdminCoupon = (coupon) => api.post('/admin/coupons', coupon)
export const updateAdminCoupon = (code, patch) => api.patch(`/admin/coupons/${encodeURIComponent(code)}`, patch)
export const deleteAdminCoupon = (code) => api.delete(`/admin/coupons/${encodeURIComponent(code)}`)

export async function fetchAnalyticsOrders({ start, end }) {
  const data = await api.get('/admin/analytics/orders', { query: { start, end } })
  return data.orders || []
}
