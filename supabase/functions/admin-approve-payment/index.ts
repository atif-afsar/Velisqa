import { corsHeaders, jsonResponse } from '../_shared/http.ts'
import { requireAdmin } from '../_shared/admin.ts'
import { createNimbusPostShipment, isValidAwb } from '../_shared/nimbuspost.ts'
import { sendMetaPurchase } from '../_shared/meta.ts'

function buildShipmentPatch(shipment: Awaited<ReturnType<typeof createNimbusPostShipment>>) {
  const patch: Record<string, unknown> = {}

  if (shipment.orderId) patch.nimbuspost_order_id = shipment.orderId
  if (shipment.shipmentId) patch.nimbuspost_shipment_id = shipment.shipmentId
  if (shipment.courierName) patch.courier_name = shipment.courierName
  if (shipment.trackingUrl) patch.tracking_url = shipment.trackingUrl

  if (shipment.awb && isValidAwb(shipment.awb)) {
    patch.order_status = 'shipped'
    patch.shipping_status = 'shipped'
    patch.nimbuspost_awb = shipment.awb
  }

  return patch
}

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

    const { data: paidOrder, error: payError } = await adminClient
      .from('orders')
      .update({
        payment_status: 'paid',
        payment_reviewed_at: new Date().toISOString(),
        payment_reviewed_by: user.id,
        rejection_reason: null,
      })
      .eq('id', order.id)
      .eq('payment_status', 'payment_submitted')
      .select('id')
      .maybeSingle()

    if (payError) throw payError
    if (!paidOrder) {
      return jsonResponse({ success: false, message: 'This payment is no longer awaiting review.' }, 409)
    }

    let shipment: Awaited<ReturnType<typeof createNimbusPostShipment>> | null = null
    let shipmentWarning: string | null = null

    try {
      shipment = await createNimbusPostShipment(order)
    } catch (shipmentError) {
      shipmentWarning = shipmentError instanceof Error
        ? shipmentError.message
        : 'NimbusPost shipment could not be created automatically.'

      await adminClient.from('payment_review_logs').insert({
        order_id: order.id,
        action: 'approved',
        admin_note: `Payment approved. Shipment failed: ${shipmentWarning}`,
        reviewed_by: user.id,
      })

      return jsonResponse({
        success: true,
        paymentApproved: true,
        shipmentWarning,
        message: `Payment approved for ${order.order_ref}. Shipment could not be created automatically — open Ship orders to retry.`,
      })
    }

    const shipmentPatch = buildShipmentPatch(shipment)
    if (!shipment.awb) {
      shipmentWarning =
        `Payment approved for ${order.order_ref}. NimbusPost accepted the order but did not return an AWB yet — if you already see it booked in NimbusPost, open Ship orders and click Ship via NimbusPost once to sync the AWB.`
      console.error('NimbusPost response missing AWB after approve:', JSON.stringify(shipment.raw)?.slice(0, 500))
    }

    if (Object.keys(shipmentPatch).length > 0) {
      const { error: shipmentUpdateError } = await adminClient
        .from('orders')
        .update(shipmentPatch)
        .eq('id', order.id)

      if (shipmentUpdateError) throw shipmentUpdateError
    }

    await adminClient.from('payment_review_logs').insert({
      order_id: order.id,
      action: 'approved',
      admin_note: shipment.awb
        ? `NimbusPost AWB: ${shipment.awb}`
        : shipmentWarning || 'Payment approved; shipment pending AWB sync.',
      reviewed_by: user.id,
    })

    let metaResult: unknown
    try {
      metaResult = await sendMetaPurchase(order)
    } catch (metaError) {
      console.error('Meta Purchase event failed:', metaError)
      metaResult = { error: metaError instanceof Error ? metaError.message : 'Unknown Meta error' }
    }

    return jsonResponse({
      success: true,
      paymentApproved: true,
      shipment,
      shipmentWarning,
      message: shipment.awb
        ? `Payment approved and shipment booked (AWB ${shipment.awb}).`
        : shipmentWarning,
      meta: metaResult,
    })
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
