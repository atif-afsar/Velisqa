import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, jsonResponse } from '../_shared/http.ts'
import { cancelNimbusPostShipment } from '../_shared/nimbuspost.ts'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ success: false, message: 'Method not allowed.' }, 405)

  try {
    const { orderRef, accessToken } = await request.json()
    if (!orderRef || !accessToken) {
      return jsonResponse({ success: false, message: 'This order link is incomplete.' }, 400)
    }

    const url = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !serviceKey) throw new Error('Supabase function secrets are incomplete.')

    const adminClient = createClient(url, serviceKey)
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
      .eq('order_ref', String(orderRef))
      .eq('order_access_token', String(accessToken))
      .eq('is_enquiry', false)
      .maybeSingle()

    if (orderError) throw orderError
    if (!order) return jsonResponse({ success: false, message: 'Order not found or this link has expired.' }, 404)

    if (order.order_status === 'cancelled') {
      return jsonResponse({ success: false, message: 'This order is already cancelled.' }, 409)
    }

    if (order.order_status === 'delivered' || order.shipping_status === 'delivered') {
      return jsonResponse({ success: false, message: 'Delivered orders cannot be cancelled online.' }, 409)
    }

    if (order.shipping_status === 'out_for_delivery') {
      return jsonResponse({
        success: false,
        message: 'Your parcel is out for delivery. Contact Velisqa on WhatsApp if you need help.',
      }, 409)
    }

    if (order.nimbuspost_awb) {
      await cancelNimbusPostShipment(order.nimbuspost_awb)
    }

    const nextPaymentStatus = order.payment_status === 'paid' ? 'refunded' : order.payment_status

    const { error: updateError } = await adminClient
      .from('orders')
      .update({
        order_status: 'cancelled',
        shipping_status: order.nimbuspost_awb ? 'rto' : 'not_shipped',
        payment_status: nextPaymentStatus,
      })
      .eq('id', order.id)
      .neq('order_status', 'cancelled')

    if (updateError) throw updateError

    return jsonResponse({
      success: true,
      message: order.nimbuspost_awb
        ? 'Your order and shipment were cancelled.'
        : 'Your order was cancelled before dispatch.',
    })
  } catch (error) {
    console.error('customer-cancel-order:', error)
    const message = error instanceof Error ? error.message : 'Could not cancel this order.'
    return jsonResponse({ success: false, message }, 500)
  }
})
