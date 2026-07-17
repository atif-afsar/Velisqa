import { corsHeaders, jsonResponse } from '../_shared/http.ts'
import { requireAdmin } from '../_shared/admin.ts'
import {
  buildNimbusOrderNumber,
  createNimbusPostShipment,
  isIncompleteShipment,
} from '../_shared/nimbuspost.ts'

function httpStatusForError(message: string) {
  if (message.includes('Admin access') || message.includes('Authentication')) return 403
  if (message.includes('already has a shipment') || message.includes('not ready to ship') || message.includes('Approve the UPI')) {
    return 409
  }
  if (
    message.includes('phone')
    || message.includes('pincode')
    || message.includes('line items')
    || message.includes('NimbusPost')
    || message.includes('weight')
    || message.includes('AWB')
    || message.includes('warehouse')
    || message.includes('configured')
  ) {
    return 400
  }
  return 500
}

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
        customer_name,
        customer_phone,
        customer_email,
        delivery_address,
        delivery_city,
        delivery_pincode,
        grand_total,
        payment_method,
        payment_status,
        shipping_status,
        nimbuspost_awb,
        order_status,
        order_items (
          product_name,
          quantity,
          unit_price
        )
      `)
      .eq('id', orderId)
      .single()

    if (orderError || !order) throw orderError || new Error('Order not found.')

    if (order.nimbuspost_awb) {
      return jsonResponse({ success: false, message: 'This order already has a shipment AWB.' }, 409)
    }

    if (order.order_status === 'cancelled') {
      return jsonResponse({ success: false, message: 'Cancelled orders cannot be shipped.' }, 409)
    }

    const isCod = order.payment_method === 'cod'
    const paymentOk = order.payment_status === 'paid' || (isCod && order.payment_status === 'pending')
    if (!paymentOk) {
      return jsonResponse({
        success: false,
        message: isCod
          ? 'COD order is not ready to ship.'
          : 'Online orders must be paid before shipping.',
      }, 409)
    }

    if (order.payment_status === 'payment_submitted') {
      return jsonResponse({
        success: false,
        message: 'Approve the UPI payment first, or use Payment reviews.',
      }, 409)
    }

    const shipmentOrder = { ...order }
    if (isIncompleteShipment(order)) {
      shipmentOrder.nimbus_order_number = buildNimbusOrderNumber(order.order_ref, Date.now() % 10000)
    }

    const shipment = await createNimbusPostShipment(shipmentOrder)
    if (!shipment.awb) {
      const responseHint = JSON.stringify(shipment.raw)?.slice(0, 400)
      console.error('NimbusPost response missing AWB:', responseHint)
      throw new Error(
        `NimbusPost created the order but did not return an AWB for ${order.order_ref}. Check NimbusPost → Orders for "${shipmentOrder.nimbus_order_number || order.order_ref}" and click Ship Now if it shows NEW. Response: ${responseHint || 'empty'}`,
      )
    }

    const { error: updateError } = await adminClient
      .from('orders')
      .update({
        payment_status: isCod ? order.payment_status : 'paid',
        order_status: 'shipped',
        shipping_status: 'shipped',
        nimbuspost_order_id: shipment.orderId,
        nimbuspost_shipment_id: shipment.shipmentId,
        nimbuspost_awb: shipment.awb,
        courier_name: shipment.courierName,
        tracking_url: shipment.trackingUrl,
      })
      .eq('id', order.id)
      .is('nimbuspost_awb', null)

    if (updateError) throw updateError

    return jsonResponse({ success: true, shipment })
  } catch (error) {
    console.error('admin-create-shipment:', error)
    const message = error instanceof Error ? error.message : 'Shipment creation failed.'
    return jsonResponse({ success: false, message }, httpStatusForError(message))
  }
})
