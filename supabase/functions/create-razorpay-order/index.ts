import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, jsonResponse } from '../_shared/http.ts'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ success: false, message: 'Method not allowed.' }, 405)

  try {
    const { orderId, accessToken } = await request.json()
    if (!orderId || !accessToken) {
      return jsonResponse({ success: false, message: 'orderId and accessToken are required.' }, 400)
    }

    const url = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const rzpKeyId = Deno.env.get('RAZORPAY_KEY_ID')
    const rzpKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')

    if (!url || !serviceKey) {
      throw new Error('Supabase function secrets are incomplete.')
    }
    if (!rzpKeyId || !rzpKeySecret) {
      throw new Error('Razorpay keys are not configured in Supabase secrets.')
    }

    const adminClient = createClient(url, serviceKey)
    const { data: order, error: orderError } = await adminClient
      .from('orders')
      .select('id, order_ref, grand_total, payment_method, payment_status, order_status')
      .eq('order_ref', orderId)
      .eq('order_access_token', accessToken)
      .eq('is_enquiry', false)
      .maybeSingle()

    if (orderError) throw orderError
    if (!order) {
      return jsonResponse({ success: false, message: 'Order not found or access is invalid.' }, 404)
    }

    if (order.payment_method !== 'online') {
      return jsonResponse({ success: false, message: 'This order is not configured for online payment.' }, 400)
    }

    if (order.payment_status === 'paid') {
      return jsonResponse({ success: false, message: 'This order is already paid.' }, 400)
    }

    if (order.order_status === 'cancelled') {
      return jsonResponse({ success: false, message: 'This order has been cancelled.' }, 400)
    }

    const amountInPaise = Math.round(Number(order.grand_total) * 100)

    // Call Razorpay API to create order
    const authHeader = `Basic ${btoa(`${rzpKeyId}:${rzpKeySecret}`)}`
    const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt: order.order_ref,
      }),
    })

    if (!rzpResponse.ok) {
      const errorText = await rzpResponse.text()
      console.error('Razorpay Order API failed:', errorText)
      throw new Error(`Razorpay Order creation failed: ${errorText}`)
    }

    const rzpOrder = await rzpResponse.json()

    // Update order with the Razorpay order ID
    const { error: updateError } = await adminClient
      .from('orders')
      .update({
        razorpay_order_id: rzpOrder.id,
        payment_gateway: 'razorpay',
      })
      .eq('id', order.id)

    if (updateError) throw updateError

    // Insert pending payment record
    const { error: paymentInsertError } = await adminClient
      .from('payments')
      .insert({
        order_id: order.id,
        provider: 'razorpay',
        provider_order_id: rzpOrder.id,
        amount: order.grand_total,
        currency: 'INR',
        status: 'pending',
      })

    if (paymentInsertError) throw paymentInsertError

    return jsonResponse({
      success: true,
      razorpayOrderId: rzpOrder.id,
      razorpayKeyId: rzpKeyId,
      amount: rzpOrder.amount,
      currency: 'INR',
      orderRef: order.order_ref,
    })
  } catch (error) {
    console.error('create-razorpay-order error:', error)
    return jsonResponse({ success: false, message: error instanceof Error ? error.message : 'Internal Server Error' }, 500)
  }
})
