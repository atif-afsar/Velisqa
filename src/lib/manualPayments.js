import { supabase } from './supabaseClient'
import { invokeEdgeFunction } from './invokeEdgeFunction'

function normalizeRpcRow(data) {
  return Array.isArray(data) ? data[0] : data
}

export async function createManualPaymentOrder({ customer, items, paymentMethod = 'online' }) {
  const payloadItems = items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    imageUrl: item.imageUrl || null,
  }))

  const { data, error } = await supabase.rpc('create_manual_payment_order', {
    p_customer: {
      ...customer,
      paymentMethod: paymentMethod === 'cod' ? 'cod' : 'online',
    },
    p_items: payloadItems,
  })

  if (error) {
    throw new Error(error.message || 'Could not create your order in Velisqa.')
  }

  const order = normalizeRpcRow(data)
  if (!order?.order_ref || !order?.access_token) {
    throw new Error('The order was created without a payment reference.')
  }

  return {
    orderRef: order.order_ref,
    accessToken: order.access_token,
    grandTotal: Number(order.grand_total) || 0,
  }
}

export async function getManualPaymentOrder(orderRef, accessToken) {
  if (!orderRef || !accessToken) throw new Error('This order link is incomplete.')

  const { data, error } = await supabase.rpc('get_manual_payment_order', {
    p_order_ref: orderRef,
    p_access_token: accessToken,
  })

  if (error) throw error
  if (!data) throw new Error('Order not found or this private link has expired.')
  return data
}

export function orderPrivateUrl(path, orderRef, accessToken) {
  const query = new URLSearchParams({ token: accessToken })
  return `${path}/${encodeURIComponent(orderRef)}?${query.toString()}`
}

export async function cancelCustomerOrder(orderRef, accessToken) {
  return invokeEdgeFunction('customer-cancel-order', { orderRef, accessToken })
}

export async function fetchOrderLiveTracking(orderRef, accessToken) {
  return invokeEdgeFunction('order-live-tracking', { orderRef, accessToken })
}
