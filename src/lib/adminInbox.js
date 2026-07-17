import { supabase } from './supabaseClient'
import { validateIndianPhone } from './indianPhone'

export function orderNeedsShipment(order) {
  if (!validateIndianPhone(order.customer_phone).ok) return false
  if (order.nimbuspost_awb || order.order_status === 'cancelled') return false
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

export async function fetchAdminInboxSummary() {
  const [paymentsCountResult, paymentsResult, ordersResult] = await Promise.all([
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('is_enquiry', false)
      .eq('payment_status', 'payment_submitted'),
    supabase
      .from('orders')
      .select(`
        id,
        order_ref,
        customer_name,
        grand_total,
        payment_submitted_at,
        created_at
      `)
      .eq('is_enquiry', false)
      .eq('payment_status', 'payment_submitted')
      .order('payment_submitted_at', { ascending: true })
      .limit(8),
    supabase
      .from('orders')
      .select(`
        id,
        order_ref,
        customer_name,
        customer_phone,
        grand_total,
        payment_method,
        payment_status,
        shipping_status,
        order_status,
        nimbuspost_awb,
        created_at
      `)
      .eq('is_enquiry', false)
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  if (paymentsCountResult.error) throw paymentsCountResult.error
  if (paymentsResult.error) throw paymentsResult.error
  if (ordersResult.error) throw ordersResult.error

  const paymentReviewCount = paymentsCountResult.count || 0
  const paymentReviews = paymentsResult.data || []
  const allOrders = ordersResult.data || []
  const needsShipment = allOrders.filter(orderNeedsShipment)
  const awaitingUpi = allOrders.filter((order) => order.payment_status === 'awaiting_payment')
  const inTransit = allOrders.filter(
    (order) => Boolean(order.nimbuspost_awb)
      && order.shipping_status !== 'delivered'
      && order.shipping_status !== 'rto',
  )

  return {
    counts: {
      paymentReviews: paymentReviewCount,
      needsShipment: needsShipment.length,
      awaitingUpi: awaitingUpi.length,
      inTransit: inTransit.length,
      totalOpen: paymentReviewCount + needsShipment.length,
    },
    paymentReviews,
    needsShipment: needsShipment.slice(0, 8),
    recentOrders: allOrders.slice(0, 5),
  }
}
