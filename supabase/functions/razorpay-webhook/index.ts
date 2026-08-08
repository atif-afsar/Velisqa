import { createClient } from 'npm:@supabase/supabase-js@2'
import crypto from "node:crypto"
import { corsHeaders, jsonResponse } from '../_shared/http.ts'
import { createNimbusPostShipment, isValidAwb } from '../_shared/nimbuspost.ts'
import { sendMetaPurchase } from '../_shared/meta.ts'

function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
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
  // CORS is only needed if frontend calls this, but webhook is server-to-server.
  // Standard practice is to keep options handler just in case.
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ success: false, message: 'Method not allowed.' }, 405)

  const signature = request.headers.get('x-razorpay-signature')
  if (!signature) {
    return jsonResponse({ success: false, message: 'Missing Razorpay signature header.' }, 400)
  }

  try {
    const rawBody = await request.text()
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')
    if (!webhookSecret) {
      throw new Error('RAZORPAY_WEBHOOK_SECRET is not configured in Supabase secrets.')
    }

    const signatureOk = verifyWebhookSignature(rawBody, signature, webhookSecret)
    if (!signatureOk) {
      console.warn('Razorpay webhook signature verification failed.')
      return jsonResponse({ success: false, message: 'Invalid webhook signature.' }, 400)
    }

    const payload = JSON.parse(rawBody)
    const eventId = payload.id
    const eventType = payload.event

    const url = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !serviceKey) {
      throw new Error('Supabase secrets are incomplete.')
    }

    const adminClient = createClient(url, serviceKey)

    // Enforce idempotency: check if event already processed
    const { data: existingEvent, error: eventCheckError } = await adminClient
      .from('payment_events')
      .select('id, processed')
      .eq('event_id', eventId)
      .maybeSingle()

    if (eventCheckError) throw eventCheckError
    if (existingEvent?.processed) {
      console.info(`Webhook event ${eventId} already processed. Skipping.`)
      return jsonResponse({ success: true, message: 'Webhook already processed (idempotent).' })
    }

    // Insert or update event log as pending
    if (!existingEvent) {
      const { error: insertError } = await adminClient
        .from('payment_events')
        .insert({
          provider: 'razorpay',
          event_id: eventId,
          event_type: eventType,
          payload: payload,
          processed: false,
        })
      if (insertError) throw insertError
    }

    // Process event types
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      let rzpOrderId = ''
      let rzpPaymentId = ''
      let method = ''
      let email = ''
      let contact = ''

      if (eventType === 'order.paid') {
        const orderEntity = payload.payload.order?.entity
        rzpOrderId = orderEntity?.id
        // Try to find the payment ID linked to this order paid event
        const paymentsArray = payload.payload.payments || []
        const paymentEntity = paymentsArray[0]?.entity || paymentsArray[0]
        if (paymentEntity) {
          rzpPaymentId = paymentEntity.id
          method = paymentEntity.method
          email = paymentEntity.email
          contact = paymentEntity.contact
        }
      } else {
        const paymentEntity = payload.payload.payment?.entity
        rzpOrderId = paymentEntity?.order_id
        rzpPaymentId = paymentEntity?.id
        method = paymentEntity?.method
        email = paymentEntity?.email
        contact = paymentEntity?.contact
      }

      if (!rzpOrderId) {
        console.warn(`No Razorpay order ID found in webhook event ${eventId}`)
        return jsonResponse({ success: true, message: 'Skipped: No order ID.' })
      }

      // Fetch the order
      const { data: order, error: orderFetchError } = await adminClient
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
        .eq('razorpay_order_id', rzpOrderId)
        .maybeSingle()

      if (orderFetchError) throw orderFetchError
      if (!order) {
        console.warn(`No matching order found for Razorpay order ID ${rzpOrderId}`)
      } else if (order.payment_status !== 'paid') {
        // Update Order
        const nextOrderStatus = order.order_status === 'placed' ? 'confirmed' : order.order_status
        const { error: updateOrderError } = await adminClient
          .from('orders')
          .update({
            payment_status: 'paid',
            order_status: nextOrderStatus,
            razorpay_payment_id: rzpPaymentId || order.razorpay_payment_id,
          })
          .eq('id', order.id)

        if (updateOrderError) throw updateOrderError

        // Update Payment record
        const { error: updatePaymentError } = await adminClient
          .from('payments')
          .update({
            status: 'paid',
            provider_payment_id: rzpPaymentId || null,
            method: method || null,
            email: email || null,
            contact: contact || null,
            signature_verified: true,
            captured_at: new Date().toISOString(),
          })
          .eq('provider_order_id', rzpOrderId)

        if (updatePaymentError) throw updatePaymentError

        // Log Order Status History
        await adminClient.from('order_status_history').insert({
          order_id: order.id,
          old_status: order.order_status,
          new_status: nextOrderStatus,
          source: 'razorpay_webhook',
          reason: `webhook_event_${eventType}`,
        })

        // Idempotently trigger NimbusPost shipment
        if (nextOrderStatus === 'confirmed' && !order.nimbuspost_awb) {
          try {
            const shipment = await createNimbusPostShipment(order)
            const shipmentPatch = buildShipmentPatch(shipment)
            if (Object.keys(shipmentPatch).length > 0) {
              const { error: updateShipmentError } = await adminClient
                .from('orders')
                .update(shipmentPatch)
                .eq('id', order.id)
              if (updateShipmentError) throw updateShipmentError
            }
          } catch (shipmentError) {
            console.error(`Automatic NimbusPost shipment failed in webhook for order ${order.order_ref}:`, shipmentError)
          }
        }

        // Fire Meta Pixel purchase event
        try {
          await sendMetaPurchase(order)
        } catch (metaError) {
          console.error('Meta Pixel Purchase event failed in webhook:', metaError)
        }
      }
    } else if (eventType === 'payment.failed') {
      const paymentEntity = payload.payload.payment?.entity
      const rzpOrderId = paymentEntity?.order_id
      const rzpPaymentId = paymentEntity?.id

      if (rzpOrderId) {
        const { data: order, error: orderFetchError } = await adminClient
          .from('orders')
          .select('id, order_ref')
          .eq('razorpay_order_id', rzpOrderId)
          .maybeSingle()

        if (orderFetchError) throw orderFetchError
        if (order) {
          // Update Order and Payment to failed
          await adminClient
            .from('orders')
            .update({ payment_status: 'failed' })
            .eq('id', order.id)
            .eq('payment_status', 'pending')

          await adminClient
            .from('payments')
            .update({
              status: 'failed',
              provider_payment_id: rzpPaymentId,
              failed_at: new Date().toISOString(),
              failure_code: paymentEntity.error_code,
              failure_description: paymentEntity.error_description,
            })
            .eq('provider_order_id', rzpOrderId)
            .eq('status', 'pending')
        }
      }
    } else if (eventType === 'refund.processed') {
      const refundEntity = payload.payload.refund?.entity
      const rzpRefundId = refundEntity?.id
      const rzpPaymentId = refundEntity?.payment_id
      const refundAmount = Number(refundEntity?.amount) / 100 // convert back to rupees

      if (rzpPaymentId) {
        // Find payment record
        const { data: payment, error: paymentFetchError } = await adminClient
          .from('payments')
          .select('id, order_id, amount')
          .eq('provider_payment_id', rzpPaymentId)
          .maybeSingle()

        if (paymentFetchError) throw paymentFetchError
        if (payment) {
          // Create refund record
          const { error: refundInsertError } = await adminClient
            .from('refunds')
            .insert({
              order_id: payment.order_id,
              payment_id: payment.id,
              provider: 'razorpay',
              provider_refund_id: rzpRefundId,
              amount: refundAmount,
              status: 'processed',
              processed_at: new Date().toISOString(),
            })

          if (refundInsertError) throw refundInsertError

          // Update order payment status
          const isFullRefund = refundAmount >= Number(payment.amount)
          await adminClient
            .from('orders')
            .update({
              payment_status: isFullRefund ? 'refunded' : 'refunded', // standard simple update or we can set status
            })
            .eq('id', payment.order_id)
        }
      }
    }

    // Mark webhook event as processed
    await adminClient
      .from('payment_events')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
      })
      .eq('event_id', eventId)

    return jsonResponse({ success: true, message: 'Webhook processed successfully.' })
  } catch (error) {
    console.error('razorpay-webhook error:', error)
    return jsonResponse({ success: false, message: error instanceof Error ? error.message : 'Internal Server Error' }, 500)
  }
})
