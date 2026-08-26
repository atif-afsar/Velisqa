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
import { sendMetaPurchase } from '../_shared/meta.ts'

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
      value,
      currency = 'INR',
      customer_email,
      customer_phone,
    } = body

    if (!event_id) {
      return jsonResponse({ error: 'event_id (transaction_id) is required.' }, 400)
    }

    // Currently only Purchase events are supported via this endpoint.
    // Other events can be added here in the future.
    if (event_name !== 'Purchase') {
      return jsonResponse({ skipped: true, reason: `Event "${event_name}" not supported yet.` })
    }

    const result = await sendMetaPurchase({
      order_ref: event_id,
      grand_total: Number(value) || 0,
      customer_email: customer_email || null,
      customer_phone: customer_phone || null,
    })

    return jsonResponse({ ok: true, ...result })
  } catch (err) {
    console.error('[meta-conversions]', err)
    return jsonResponse({ error: err.message || 'Meta CAPI event failed.' }, 500)
  }
})
