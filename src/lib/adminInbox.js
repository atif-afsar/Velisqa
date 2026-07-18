import { supabase } from './supabaseClient'
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

function shipmentCandidateQuery() {
  return supabase
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
    .is('nimbuspost_awb', null)
    .neq('order_status', 'cancelled')
    .not('payment_status', 'in', '("payment_submitted","awaiting_payment")')
    .or('and(payment_method.eq.cod,payment_status.in.(pending,paid)),and(payment_method.eq.online,payment_status.eq.paid)')
}

export async function fetchAdminInboxSummary() {
  const [
    paymentsCountResult,
    paymentsResult,
    awaitingUpiCountResult,
    inTransitCountResult,
    shipmentCandidatesResult,
    recentOrdersResult,
  ] = await Promise.all([
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
      .select('id', { count: 'exact', head: true })
      .eq('is_enquiry', false)
      .eq('payment_status', 'awaiting_payment'),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('is_enquiry', false)
      .not('nimbuspost_awb', 'is', null)
      .neq('order_status', 'cancelled')
      .not('shipping_status', 'eq', 'delivered')
      .not('shipping_status', 'eq', 'rto'),
    shipmentCandidateQuery()
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('orders')
      .select(`
        id,
        order_ref,
        customer_name,
        grand_total,
        payment_method,
        payment_status,
        created_at
      `)
      .eq('is_enquiry', false)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  if (paymentsCountResult.error) throw paymentsCountResult.error
  if (paymentsResult.error) throw paymentsResult.error
  if (awaitingUpiCountResult.error) throw awaitingUpiCountResult.error
  if (inTransitCountResult.error) throw inTransitCountResult.error
  if (shipmentCandidatesResult.error) throw shipmentCandidatesResult.error
  if (recentOrdersResult.error) throw recentOrdersResult.error

  const paymentReviewCount = paymentsCountResult.count || 0
  const paymentReviews = paymentsResult.data || []
  const needsShipment = (shipmentCandidatesResult.data || []).filter(orderNeedsShipment)
  const awaitingUpi = awaitingUpiCountResult.count || 0
  const inTransit = inTransitCountResult.count || 0

  return {
    counts: {
      paymentReviews: paymentReviewCount,
      needsShipment: needsShipment.length,
      awaitingUpi,
      inTransit,
      totalOpen: paymentReviewCount + needsShipment.length,
    },
    paymentReviews,
    needsShipment: needsShipment.slice(0, 8),
    recentOrders: recentOrdersResult.data || [],
  }
}
