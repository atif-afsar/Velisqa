import { supabase } from './supabaseClient'

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

export function formatReturnMigrationHint(message = '') {
  if (/order_returns|can_request_order_return|submit_order_return/i.test(message)) {
    return ' Run supabase/order-returns.sql in the Supabase SQL Editor.'
  }
  return ''
}

export async function checkCanRequestReturn(orderId) {
  const { data, error } = await supabase.rpc('can_request_order_return', { p_order_id: orderId })
  if (error) throw error
  return Boolean(data)
}

export async function fetchReturnForOrder(orderId) {
  const { data, error } = await supabase
    .from('order_returns')
    .select(`
      id,
      order_id,
      status,
      reason,
      customer_notes,
      rejection_reason,
      refund_amount,
      reverse_awb,
      reverse_tracking_url,
      requested_at,
      approved_at,
      pickup_scheduled_at,
      received_at,
      qc_completed_at,
      refunded_at
    `)
    .eq('order_id', orderId)
    .order('requested_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function submitOrderReturn({ orderId, reason, customerNotes }) {
  const { data, error } = await supabase.rpc('submit_order_return', {
    p_order_id: orderId,
    p_reason: reason,
    p_customer_notes: customerNotes || null,
  })
  if (error) throw error
  return data
}

export async function fetchReturnsForOrders(orderIds) {
  if (!orderIds.length) return {}
  const { data, error } = await supabase
    .from('order_returns')
    .select('id, order_id, status, rejection_reason, reverse_awb, reverse_tracking_url, requested_at, refunded_at')
    .in('order_id', orderIds)
    .order('requested_at', { ascending: false })

  if (error) throw error

  const map = {}
  for (const row of data || []) {
    if (!map[row.order_id]) map[row.order_id] = row
  }
  return map
}
