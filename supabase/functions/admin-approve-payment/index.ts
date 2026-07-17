import { corsHeaders, jsonResponse } from '../_shared/http.ts'
import { requireAdmin } from '../_shared/admin.ts'
import { createNimbusPostShipment } from '../_shared/nimbuspost.ts'
import { sendMetaPurchase } from '../_shared/meta.ts'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ success: false, message: 'Method not allowed.' }, 405)

  try {
    const { adminClient, user } = await requireAdmin(request)
    const { orderId } = await request.json()
    if (!orderId) return jsonResponse({ success: false, message: 'orderId is required.' }, 400)

    const { data: order, error: orderError } = await adminClient
      .from('orders')
      .select(`
        id,
        order_ref,
        customer_name,
        customer_phone,
        customer_email,
        delivery_address,
        delivery_city,
        delivery_pincode,
        grand_total,
        payment_method,
        payment_status,
        order_items (
          product_name,
          quantity,
          unit_price
        )
      `)
      .eq('id', orderId)
      .single()

    if (orderError || !order) throw orderError || new Error('Order not found.')
    if (order.payment_status !== 'payment_submitted') {
      return jsonResponse({ success: false, message: 'This payment is no longer awaiting review.' }, 409)
    }

    const shipment = await createNimbusPostShipment(order)
    if (!shipment.awb) {
      throw new Error(
        `NimbusPost accepted the request but did not return an AWB for ${order.order_ref}. Check your NimbusPost dashboard before approving again.`,
      )
    }

    const { error: updateError } = await adminClient
      .from('orders')
      .update({
        payment_status: 'paid',
        payment_reviewed_at: new Date().toISOString(),
        payment_reviewed_by: user.id,
        rejection_reason: null,
        order_status: 'shipped',
        shipping_status: 'shipped',
        nimbuspost_order_id: shipment.orderId,
        nimbuspost_shipment_id: shipment.shipmentId,
        nimbuspost_awb: shipment.awb,
        courier_name: shipment.courierName,
        tracking_url: shipment.trackingUrl,
      })
      .eq('id', order.id)
      .eq('payment_status', 'payment_submitted')

    if (updateError) throw updateError

    await adminClient.from('payment_review_logs').insert({
      order_id: order.id,
      action: 'approved',
      admin_note: shipment.awb ? `NimbusPost AWB: ${shipment.awb}` : 'NimbusPost shipment created.',
      reviewed_by: user.id,
    })

    let metaResult: unknown
    try {
      metaResult = await sendMetaPurchase(order)
    } catch (metaError) {
      console.error('Meta Purchase event failed:', metaError)
      metaResult = { error: metaError instanceof Error ? metaError.message : 'Unknown Meta error' }
    }

    return jsonResponse({ success: true, shipment, meta: metaResult })
  } catch (error) {
    console.error('admin-approve-payment:', error)
    const message = error instanceof Error ? error.message : 'Payment approval failed.'
    const status = message.includes('Admin access') || message.includes('Authentication')
      ? 403
      : message.includes('phone') || message.includes('pincode') || message.includes('line items')
        ? 400
        : 500
    return jsonResponse({ success: false, message }, status)
  }
})
