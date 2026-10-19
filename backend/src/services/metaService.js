import { C, getDb } from '../config/db.js'
import { uuid } from '../lib/crypto.js'
import { logger } from '../lib/logger.js'
import { isMetaConfigured, sendMetaPurchase } from '../providers/meta.js'
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
    const contentIds = items.map((item) => String(item.product_id || '')).filter((id) => id && !id.startsWith('VELISQA_FREE_GIFT'))
    const result = await sendMetaPurchase({
      orderRef: order.order_ref,
      grandTotal: total,
      email: order.customer_email,
      phone: order.customer_phone,
      contentIds,
      eventSourceUrl: eventSourceUrl || 'https://www.velisqa.com',
      testEventCode,
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
