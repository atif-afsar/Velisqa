import { corsHeaders, jsonResponse } from '../_shared/http.ts'
import { requireAdmin } from '../_shared/admin.ts'
import {
  buildNimbusOrderNumber,
  createNimbusPostShipment,
  isIncompleteShipment,
  isValidAwb,
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

    if (order.nimbuspost_awb && isValidAwb(order.nimbuspost_awb)) {
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

    const shipmentPatch: Record<string, unknown> = {}
    if (shipment.orderId) shipmentPatch.nimbuspost_order_id = shipment.orderId
    if (shipment.shipmentId) shipmentPatch.nimbuspost_shipment_id = shipment.shipmentId
    if (shipment.courierName) shipmentPatch.courier_name = shipment.courierName
    if (shipment.trackingUrl) shipmentPatch.tracking_url = shipment.trackingUrl

    if (shipment.awb && isValidAwb(shipment.awb)) {
      shipmentPatch.payment_status = isCod ? order.payment_status : 'paid'
      shipmentPatch.order_status = 'shipped'
      shipmentPatch.shipping_status = 'shipped'
      shipmentPatch.nimbuspost_awb = shipment.awb
    } else if (shipment.awb) {
      console.error('Rejected invalid NimbusPost AWB:', shipment.awb)
      shipment.awb = null
      shipment.trackingUrl = null
    }

    if (Object.keys(shipmentPatch).length > 0) {
      const { error: updateError } = await adminClient
        .from('orders')
        .update(shipmentPatch)
        .eq('id', order.id)

      if (updateError) throw updateError
    }

    if (!shipment.awb) {
      const responseHint = JSON.stringify(shipment.raw)?.slice(0, 400)
      console.error('NimbusPost response missing AWB:', responseHint)
      return jsonResponse({
        success: true,
        shipment,
        shipmentWarning:
          `NimbusPost accepted ${order.order_ref} but did not return an AWB yet. If you already see it booked in NimbusPost, wait a minute and click Ship via NimbusPost again to sync the AWB.`,
      })
    }

    return jsonResponse({ success: true, shipment })
  } catch (error) {
    console.error('admin-create-shipment:', error)
    const message = error instanceof Error ? error.message : 'Shipment creation failed.'
    return jsonResponse({ success: false, message }, httpStatusForError(message))
  }
})
