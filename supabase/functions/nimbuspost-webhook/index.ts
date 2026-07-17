import { createClient } from 'npm:@supabase/supabase-js@2'
import { jsonResponse } from '../_shared/http.ts'

const STATUS_MAP: Record<string, string> = {
  booked: 'shipped',
  picked_up: 'shipped',
  pickup_done: 'shipped',
  shipped: 'shipped',
  in_transit: 'shipped',
  reached_at_destination: 'shipped',
  out_for_delivery: 'out_for_delivery',
  delivered: 'delivered',
  rto: 'rto',
  rto_delivered: 'rto',
  rto_in_transit: 'rto',
  cancelled: 'rto',
}

function normalizeStatus(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
}

function readWebhookSecret(request: Request) {
  const url = new URL(request.url)
  return (
    url.searchParams.get('secret') ||
    request.headers.get('x-velisqa-webhook-secret') ||
    request.headers.get('x-webhook-secret') ||
    ''
  )
}

function readPayloadFields(payload: Record<string, unknown>) {
  const nested = payload.data && typeof payload.data === 'object'
    ? payload.data as Record<string, unknown>
    : {}

  return {
    awb: payload.awb_number || payload.awb || nested.awb_number || nested.awb || null,
    orderRef: payload.order_number || payload.order_ref || nested.order_number || nested.order_ref || null,
    rawStatus: normalizeStatus(
      payload.status ||
      payload.shipment_status ||
      payload.tracking_status ||
      nested.status ||
      nested.shipment_status ||
      nested.tracking_status,
    ),
    courierName: payload.courier_name || payload.courier || nested.courier_name || nested.courier || null,
    trackingUrl: payload.tracking_url || payload.trackingUrl || nested.tracking_url || nested.trackingUrl || null,
  }
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return jsonResponse({ success: false }, 405)

  const expectedSecret = Deno.env.get('NIMBUSPOST_WEBHOOK_SECRET')
  const receivedSecret = readWebhookSecret(request)
  if (!expectedSecret || receivedSecret !== expectedSecret) {
    return jsonResponse({ success: false, message: 'Invalid webhook signature.' }, 401)
  }

  try {
    const payload = await request.json()
    const { awb, orderRef, rawStatus, courierName, trackingUrl } = readPayloadFields(payload)
    const shippingStatus = STATUS_MAP[rawStatus]

    if (!shippingStatus) {
      return jsonResponse({ success: true, ignored: true, reason: 'unmapped_status', status: rawStatus })
    }

    const url = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !serviceKey) throw new Error('Supabase function secrets are incomplete.')

    const adminClient = createClient(url, serviceKey)
    const orderStatus = shippingStatus === 'delivered' ? 'delivered' : shippingStatus === 'rto' ? 'returned' : 'shipped'
    const updatePayload: Record<string, string> = {
      shipping_status: shippingStatus,
      order_status: orderStatus,
    }
    if (courierName) updatePayload.courier_name = String(courierName)
    if (trackingUrl) updatePayload.tracking_url = String(trackingUrl)

    let query = adminClient.from('orders').update(updatePayload)
    if (awb) {
      query = query.eq('nimbuspost_awb', String(awb))
    } else if (orderRef) {
      query = query.eq('order_ref', String(orderRef))
    } else {
      return jsonResponse({ success: true, ignored: true, reason: 'missing_identifiers' })
    }

    const { data, error } = await query.select('id')
    if (error) throw error
    if (!data?.length) {
      return jsonResponse({ success: true, ignored: true, reason: 'order_not_found' })
    }

    return jsonResponse({ success: true })
  } catch (error) {
    console.error('nimbuspost-webhook:', error)
    return jsonResponse({
      success: false,
      message: error instanceof Error ? error.message : 'Webhook processing failed.',
    }, 500)
  }
})
