import { supabase } from './supabaseClient'

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
    createdAt: row.created_at,
    items: (row.order_items || []).map((item) => ({
      name: item.product_name,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      lineTotal: item.line_total,
      imageUrl: item.image_url,
    })),
  }
}

const ORDER_LIST_SELECT = `
  id,
  order_ref,
  order_access_token,
  grand_total,
  payment_method,
  payment_status,
  shipping_status,
  order_status,
  nimbuspost_awb,
  created_at,
  order_items (product_name, quantity)
`

const ORDER_DETAIL_SELECT = `
  id,
  order_ref,
  order_access_token,
  customer_name,
  customer_email,
  customer_phone,
  grand_total,
  payment_method,
  payment_status,
  shipping_status,
  order_status,
  rejection_reason,
  nimbuspost_awb,
  courier_name,
  tracking_url,
  created_at,
  order_items (
    product_name,
    quantity,
    unit_price,
    line_total,
    image_url
  )
`

export async function fetchMyOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_LIST_SELECT)
    .eq('is_enquiry', false)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getMyOrderByRef(orderRef) {
  if (!orderRef) throw new Error('Order reference is required.')

  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_DETAIL_SELECT)
    .eq('order_ref', orderRef)
    .eq('is_enquiry', false)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('Order not found.')
  return mapOrderRow(data)
}

export function myOrderTrackUrl(orderRef, accessToken) {
  const query = new URLSearchParams({ token: accessToken })
  return `/orders/${encodeURIComponent(orderRef)}?${query.toString()}`
}

export function myOrderPayUrl(orderRef, accessToken) {
  const query = new URLSearchParams({ token: accessToken })
  return `/pay/${encodeURIComponent(orderRef)}?${query.toString()}`
}
