import { C, getDb } from '../config/db.js'
import { env } from '../config/env.js'
import { safeEqual, sha256, uuid } from '../lib/crypto.js'
import { HttpError } from '../lib/errors.js'
import { recordOrderHistory } from './auditService.js'

/** Courier status → shipping_status (STATUS_MAP in nimbuspost-webhook). */
export const STATUS_MAP = {
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

const RANK = { not_shipped: 0, shipped: 1, out_for_delivery: 2, delivered: 3 }

const normalizeStatus = (value) => String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_')

function readFields(payload) {
  const nested = payload.data && typeof payload.data === 'object' ? payload.data : {}
  return {
    awb: payload.awb_number || payload.awb || nested.awb_number || nested.awb || null,
    orderRef: payload.order_number || payload.order_ref || nested.order_number || nested.order_ref || null,
    rawStatus: normalizeStatus(payload.status || payload.shipment_status || payload.tracking_status || nested.status || nested.shipment_status || nested.tracking_status),
    courierName: payload.courier_name || payload.courier || nested.courier_name || nested.courier || null,
    trackingUrl: payload.tracking_url || payload.trackingUrl || nested.tracking_url || nested.trackingUrl || null,
    eventTime: payload.event_time || payload.timestamp || payload.updated_at || nested.event_time || nested.timestamp || null,
  }
}

/**
 * A status update may only move an order forward. Delivered never goes back to
 * transit, RTO is terminal, and late/duplicate courier retries become no-ops.
 */
export function nextShippingStatus(current, incoming) {
  if (current === incoming) return null
  if (current === 'delivered' || current === 'rto') return null
  if (incoming === 'rto') return 'rto'
  return (RANK[incoming] ?? -1) > (RANK[current] ?? 0) ? incoming : null
}

export function verifyNimbusSecret(req) {
  const expected = env.NIMBUSPOST_WEBHOOK_SECRET
  const received =
    req.get('x-velisqa-webhook-secret')
    || req.get('x-webhook-secret')
    || (env.NIMBUSPOST_WEBHOOK_ALLOW_QUERY_SECRET ? String(req.query.secret || '') : '')
  if (!expected || !safeEqual(received || '', expected)) {
    throw new HttpError(401, 'Invalid webhook signature.', { code: 'BAD_SIGNATURE' })
  }
}

export async function processNimbusWebhook(rawBody) {
  let payload
  try {
    payload = JSON.parse(rawBody.toString('utf8'))
  } catch {
    throw new HttpError(400, 'Malformed webhook body.')
  }
  const fields = readFields(payload)
  const incoming = STATUS_MAP[fields.rawStatus]
  if (!incoming) return { ignored: true, reason: 'unmapped_status', status: fields.rawStatus }
  if (!fields.awb && !fields.orderRef) return { ignored: true, reason: 'missing_identifiers' }

  const db = getDb()
  const eventKey = sha256(`${fields.awb || ''}|${fields.orderRef || ''}|${fields.rawStatus}|${fields.eventTime || sha256(rawBody)}`)
  try {
    await db.collection(C.webhookEvents).insertOne({ _id: uuid(), provider: 'nimbuspost', event_key: eventKey, status: fields.rawStatus, awb: fields.awb ? String(fields.awb) : null, created_at: new Date() })
  } catch (error) {
    if (error?.code === 11000) return { ignored: true, reason: 'duplicate' }
    throw error
  }

  const filter = fields.awb ? { nimbuspost_awb: String(fields.awb) } : { order_ref: String(fields.orderRef) }
  const order = await db.collection(C.orders).findOne({ ...filter, deleted_at: null })
  if (!order) return { ignored: true, reason: 'order_not_found' }

  const shippingStatus = nextShippingStatus(order.shipping_status || 'not_shipped', incoming)
  const $set = { updated_at: new Date() }
  if (fields.courierName) $set.courier_name = String(fields.courierName).slice(0, 120)
  if (fields.trackingUrl && /^https?:\/\//i.test(String(fields.trackingUrl))) $set.tracking_url = String(fields.trackingUrl)

  if (shippingStatus) {
    $set.shipping_status = shippingStatus
    // A cancelled order keeps order_status=cancelled; only courier RTO progress is recorded.
    if (order.order_status !== 'cancelled' && order.order_status !== 'returned') {
      $set.order_status = shippingStatus === 'delivered' ? 'delivered' : shippingStatus === 'rto' ? 'returned' : 'shipped'
    }
    if (shippingStatus === 'delivered' && !order.delivered_at) $set.delivered_at = new Date()
  }

  // Conditional on the status we read, so two concurrent events cannot both win.
  const result = await db.collection(C.orders).updateOne({ _id: order._id, shipping_status: order.shipping_status }, { $set })
  if (shippingStatus && result.modifiedCount === 1) {
    await recordOrderHistory({
      orderId: order._id,
      oldStatus: order.order_status,
      newStatus: $set.order_status || order.order_status,
      source: 'nimbuspost_webhook',
      reason: fields.rawStatus,
      metadata: { shipping_status: shippingStatus },
    })
  }
  return shippingStatus ? { updated: result.modifiedCount === 1 } : { ignored: true, reason: 'no_forward_transition' }
}
