import { C, getDb } from '../config/db.js'
import { uuid } from '../lib/crypto.js'
import { logger } from '../lib/logger.js'
import { buildUserData, isMetaConfigured, normalizePhone, sendMetaPurchase } from '../providers/meta.js'
import { recordOrderHistory } from './auditService.js'

/**
 * Sends at most one CAPI Purchase per order. The unique (order_id, event_name)
 * claim is taken before the network call, so concurrent verify + webhook +
 * browser triggers cannot double count; a failed send releases the claim.
 */
export async function recordAndSendMetaPurchase(order, { eventSourceUrl, testEventCode } = {}) {
  if (!isMetaConfigured()) return { skipped: true, reason: 'Meta CAPI is not configured.' }
  const total = Number(order.grand_total)
  if (!Number.isFinite(total) || total <= 0) return { skipped: true, reason: 'Order grand_total must be greater than 0 for Meta CAPI.' }

  const db = getDb()
  const claimId = uuid()
  try {
    await db.collection(C.metaEvents).insertOne({ _id: claimId, order_id: order._id, event_name: 'Purchase', status: 'sending', created_at: new Date() })
  } catch (error) {
    if (error?.code === 11000) return { skipped: true, reason: 'Meta CAPI Purchase event already sent for this order.' }
    throw error
  }

  try {
    const items = await db.collection(C.orderItems).find({ order_id: order._id }).toArray()
    const contents = items
      .filter((item) => item.product_id && !String(item.product_id).startsWith('VELISQA_FREE_GIFT') && !item.is_free_gift)
      .map((item) => ({ id: String(item.product_id), quantity: Number(item.quantity) || 1, item_price: Number(item.unit_price) || 0 }))
    const tracking = order.tracking || {}
    const result = await sendMetaPurchase({
      orderRef: order.order_ref,
      grandTotal: total,
      userData: buildUserData({
        email: order.customer_email,
        phone: order.customer_phone,
        name: order.customer_name,
        city: order.delivery_city,
        state: order.delivery_state,
        zip: order.delivery_pincode,
        externalId: order.user_id || normalizePhone(order.customer_phone) || null,
        ip: tracking.client_ip_address,
        userAgent: tracking.client_user_agent,
        fbp: tracking.fbp,
        fbc: tracking.fbc,
      }),
      contents,
      eventSourceUrl: eventSourceUrl || tracking.event_source_url || 'https://www.velisqa.com/checkout',
      testEventCode: testEventCode || tracking.test_event_code,
    })
    await db.collection(C.metaEvents).updateOne({ _id: claimId }, { $set: { status: 'sent', sent_at: new Date() } })
    await recordOrderHistory({
      orderId: order._id,
      oldStatus: order.order_status,
      newStatus: order.order_status,
      source: 'meta_capi',
      reason: 'purchase_event_sent',
      metadata: { event_id: order.order_ref, event_name: 'Purchase' },
    })
    return result
  } catch (error) {
    await db.collection(C.metaEvents).deleteOne({ _id: claimId })
    logger.error('Meta CAPI Purchase failed', { orderRef: order.order_ref, error })
    throw error
  }
}

/** Fire-and-forget variant for payment flows: Meta must never block or fail a payment. */
export function sendMetaPurchaseInBackground(order) {
  recordAndSendMetaPurchase(order).catch(() => {})
}
