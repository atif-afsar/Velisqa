/**
 * Meta Conversions API — Supabase Edge Function
 *
 * Receives purchase event data from the client and sends it
 * server-side to Meta's Conversions API for redundancy.
 *
 * This uses the same `sendMetaPurchase` shared helper already
 * used by verify-razorpay-payment, razorpay-webhook, and
 * admin-approve-payment edge functions.
 *
 * The event_id sent here matches the browser-side Meta Pixel
 * event_id, enabling Meta to deduplicate browser + server events.
 *
 * Required Supabase secrets:
 *   META_PIXEL_ID
 *   META_CONVERSIONS_API_TOKEN
 */

import { corsHeaders, jsonResponse } from '../_shared/http.ts'
import { createAdminClient } from '../_shared/admin.ts'
import { recordAndSendMetaPurchase } from '../_shared/meta.ts'

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()

    const {
      event_name,
      event_id,
      test_event_code,
    } = body

    if (!event_id) {
      return jsonResponse({ error: 'event_id (order_ref) is required.' }, 400)
    }

    // Currently only Purchase events are supported via this endpoint
    if (event_name !== 'Purchase') {
      return jsonResponse({ skipped: true, reason: `Event "${event_name}" not supported yet.` })
    }

    // Authoritative verification: check actual order in Supabase
    const adminClient = createAdminClient()
    const { data: order, error: orderError } = await adminClient
      .from('orders')
      .select(`
        id,
        order_ref,
        grand_total,
        customer_email,
        customer_phone,
        payment_status,
        payment_method,
        order_status,
        order_items (
          product_id
        )
      `)
      .eq('order_ref', event_id)
      .maybeSingle()

    if (orderError || !order) {
      return jsonResponse({ error: 'Order not found.' }, 404)
    }

    // For online payments, require verified 'paid' status
    if (order.payment_method === 'online' && order.payment_status !== 'paid') {
      return jsonResponse({ skipped: true, reason: 'Payment for online order has not been verified.' }, 400)
    }

    // For cancelled orders, skip
    if (order.order_status === 'cancelled') {
      return jsonResponse({ skipped: true, reason: 'Cancelled order cannot trigger Purchase event.' }, 400)
    }

    // Idempotently send to Meta Conversions API
    const result = await recordAndSendMetaPurchase(adminClient, {
      ...order,
      test_event_code: test_event_code || undefined,
    })

    return jsonResponse({ ok: true, ...result })
  } catch (err) {
    console.error('[meta-conversions]', err)
    return jsonResponse({ error: err instanceof Error ? err.message : 'Meta CAPI event failed.' }, 500)
  }
})
