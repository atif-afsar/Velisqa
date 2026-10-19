import { api } from './apiClient'

/** `{ data, error }` result shape the pages used with the old Edge Function helper. */
async function asResult(promise) {
  try {
    return { data: await promise, error: null }
  } catch (error) {
    return { data: null, error: error?.message || 'Request failed.' }
  }
}

const tokenHeaders = (accessToken) => (accessToken ? { 'X-Order-Access-Token': accessToken } : {})
const privatePath = (orderRef) => `/orders/private/${encodeURIComponent(orderRef)}`

/**
 * Places an order. The API prices everything from the catalogue; only product
 * ids, quantities and the gift flag are sent. `idempotencyKey` makes retries safe.
 */
export async function createOrder({ customer, items, idempotencyKey }) {
  const data = await api.post('/orders', {
    customer,
    items: items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      ...(item.isFreeGift ? { isFreeGift: true } : {}),
    })),
    ...(idempotencyKey ? { idempotencyKey } : {}),
  })
  if (!data?.order_ref || !data?.access_token) throw new Error('The order was created without a payment reference.')
  return data
}

/** Buy-now modal helper: same `{ orderRef, accessToken, grandTotal }` shape as before. */
export async function createManualPaymentOrder({ customer, items, paymentMethod = 'online' }) {
  const order = await createOrder({ customer: { ...customer, paymentMethod: paymentMethod === 'cod' ? 'cod' : 'online' }, items })
  return { orderRef: order.order_ref, accessToken: order.access_token, grandTotal: Number(order.grand_total) || 0 }
}

/** Private order (guest token, or the signed-in owner when no token is in the link). */
export async function getManualPaymentOrder(orderRef, accessToken) {
  if (!orderRef) throw new Error('This order link is incomplete.')
  const data = await api.get(privatePath(orderRef), { headers: tokenHeaders(accessToken) })
  return data.order
}

export function orderPrivateUrl(path, orderRef, accessToken) {
  if (!accessToken) return `${path}/${encodeURIComponent(orderRef)}`
  const query = new URLSearchParams({ token: accessToken })
  return `${path}/${encodeURIComponent(orderRef)}?${query.toString()}`
}

export const cancelCustomerOrder = (orderRef, accessToken) =>
  asResult(api.post(`${privatePath(orderRef)}/cancel`, {}, { headers: tokenHeaders(accessToken) }))

export const fetchOrderLiveTracking = (orderRef, accessToken) =>
  asResult(api.get(`${privatePath(orderRef)}/tracking`, { headers: tokenHeaders(accessToken), retries: 0 }))

export const createRazorpayPaymentOrder = (orderRef, accessToken) =>
  asResult(api.post('/payments/razorpay/orders', { orderRef, accessToken: accessToken || null }))

export const verifyRazorpayPayment = ({ orderRef, response }) =>
  asResult(
    api.post('/payments/razorpay/verify', {
      orderRef,
      razorpay_order_id: response.razorpay_order_id,
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_signature: response.razorpay_signature,
    }),
  )
