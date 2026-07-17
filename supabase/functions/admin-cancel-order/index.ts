import { corsHeaders, jsonResponse } from '../_shared/http.ts'
import { requireAdmin } from '../_shared/admin.ts'
import { cancelNimbusPostShipment } from '../_shared/nimbuspost.ts'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ success: false, message: 'Method not allowed.' }, 405)

  try {
    const { adminClient } = await requireAdmin(request)
    const { orderId } = await request.json()
    if (!orderId) return jsonResponse({ success: false, message: 'orderId is required.' }, 400)

    const { data: order, error: orderError } = await adminClient
      .from('orders')
      .select(`
        id,
        order_ref,
        order_status,
        shipping_status,
        payment_status,
        payment_method,
        nimbuspost_awb
      `)
      .eq('id', orderId)
      .eq('is_enquiry', false)
      .maybeSingle()

    if (orderError) throw orderError
    if (!order) return jsonResponse({ success: false, message: 'Order not found.' }, 404)

    if (order.order_status === 'cancelled') {
      return jsonResponse({ success: false, message: 'This order is already cancelled.' }, 409)
    }

    if (order.order_status === 'delivered' || order.shipping_status === 'delivered') {
      return jsonResponse({ success: false, message: 'Delivered orders cannot be cancelled here.' }, 409)
    }

    let nimbusResult: { awb: string; raw: unknown } | null = null
    if (order.nimbuspost_awb) {
      nimbusResult = await cancelNimbusPostShipment(order.nimbuspost_awb)
    }

    const { error: updateError } = await adminClient
      .from('orders')
      .update({
        order_status: 'cancelled',
        shipping_status: order.nimbuspost_awb ? 'rto' : 'not_shipped',
        payment_status: order.payment_status === 'paid' ? 'refunded' : order.payment_status,
      })
      .eq('id', order.id)

    if (updateError) throw updateError

    return jsonResponse({
      success: true,
      orderRef: order.order_ref,
      cancelledOnNimbusPost: Boolean(nimbusResult),
      awb: order.nimbuspost_awb,
      walletNote: order.nimbuspost_awb
        ? 'If pickup has not happened, NimbusPost usually credits shipping freight back to your wallet within 1–2 days.'
        : null,
    })
  } catch (error) {
    console.error('admin-cancel-order:', error)
    const message = error instanceof Error ? error.message : 'Order cancellation failed.'
    const status = message.includes('Admin access') || message.includes('Authentication')
      ? 403
      : message.includes('NimbusPost') || message.includes('AWB') || message.includes('configured')
        ? 400
        : 500
    return jsonResponse({ success: false, message }, status)
  }
})
