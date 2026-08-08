import { createClient } from 'npm:@supabase/supabase-js@2'
import crypto from "node:crypto"
import { corsHeaders, jsonResponse } from '../_shared/http.ts'
import { createNimbusPostShipment, isValidAwb } from '../_shared/nimbuspost.ts'
import { sendMetaPurchase } from '../_shared/meta.ts'

function verifySignature(orderId: string, paymentId: string, signature: string, secret: string): boolean {
  const text = `${orderId}|${paymentId}`
  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(text)
    .digest('hex')
  return generatedSignature === signature
}

function buildShipmentPatch(shipment: any) {
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
    const { orderId, accessToken, razorpay_order_id, razorpay_payment_id, razorpay_signature } = await request.json()
    if (!orderId || !accessToken || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return jsonResponse({ success: false, message: 'Missing payment signature verification parameters.' }, 400)
    }

    const url = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const rzpKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')

    if (!url || !serviceKey) {
      throw new Error('Supabase secrets are not configured.')
    }
    if (!rzpKeySecret) {
      throw new Error('Razorpay webhook secret is not configured.')
    }

    // Verify signature
    const signatureOk = verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, rzpKeySecret)
    if (!signatureOk) {
      console.warn(`Payment signature verification failed for Razorpay Order ${razorpay_order_id}`)
      return jsonResponse({ success: false, message: 'Invalid payment signature. Transaction security verification failed.' }, 400)
    }

    const adminClient = createClient(url, serviceKey)

    // Fetch the order to ensure it matches
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
        order_status,
        shipping_status,
        nimbuspost_awb,
        order_items (
          product_name,
          quantity,
          unit_price
        )
      `)
      .eq('id', orderId)
      .eq('order_access_token', accessToken)
      .eq('is_enquiry', false)
      .maybeSingle()

    if (orderError || !order) {
      throw orderError || new Error('Order not found or token has expired.')
    }

    // Check if already paid
    if (order.payment_status === 'paid') {
      return jsonResponse({ success: true, message: 'Order is already marked as paid.' })
    }

    // Begin updates using service role bypass
    // 1. Update order
    const nextOrderStatus = order.order_status === 'placed' ? 'confirmed' : order.order_status
    const { error: updateOrderError } = await adminClient
      .from('orders')
      .update({
        payment_status: 'paid',
        order_status: nextOrderStatus,
        razorpay_payment_id,
        razorpay_signature,
      })
      .eq('id', order.id)

    if (updateOrderError) throw updateOrderError

    // 2. Update payment record
    const { error: updatePaymentError } = await adminClient
      .from('payments')
      .update({
        status: 'paid',
        provider_payment_id: razorpay_payment_id,
        signature_verified: true,
        captured_at: new Date().toISOString(),
      })
      .eq('provider_order_id', razorpay_order_id)

    if (updatePaymentError) throw updatePaymentError

    // 3. Log order status transition
    await adminClient.from('order_status_history').insert({
      order_id: order.id,
      old_status: order.order_status,
      new_status: nextOrderStatus,
      source: 'razorpay_verification',
      reason: 'payment_signature_verified',
    })

    // 4. Try automatic NimbusPost shipment creation (if confirmed and not yet shipped)
    let shipment: any = null
    let shipmentWarning: string | null = null

    if (nextOrderStatus === 'confirmed' && !order.nimbuspost_awb) {
      try {
        shipment = await createNimbusPostShipment(order)
        const shipmentPatch = buildShipmentPatch(shipment)
        if (Object.keys(shipmentPatch).length > 0) {
          const { error: updateShipmentError } = await adminClient
            .from('orders')
            .update(shipmentPatch)
            .eq('id', order.id)

          if (updateShipmentError) throw updateShipmentError
        }
      } catch (shipmentError) {
        shipmentWarning = shipmentError instanceof Error
          ? shipmentError.message
          : 'NimbusPost shipment booking failed.'
        console.error(`Automatic NimbusPost shipment booking failed for order ${order.order_ref}:`, shipmentWarning)
      }
    }

    // 5. Send Meta Pixel purchase event
    let metaResult: any = null
    try {
      metaResult = await sendMetaPurchase(order)
    } catch (metaError) {
      console.error('Meta Pixel Purchase event failed:', metaError)
    }

    return jsonResponse({
      success: true,
      message: 'Payment verified and order confirmed.',
      shipmentWarning,
      shipmentDetails: shipment,
      meta: metaResult,
    })
  } catch (error) {
    console.error('verify-razorpay-payment error:', error)
    return jsonResponse({ success: false, message: error instanceof Error ? error.message : 'Internal Server Error' }, 500)
  }
})
