import { C, getDb } from '../config/db.js'
import { env } from '../config/env.js'
import { conflict, HttpError, notFound } from '../lib/errors.js'
import { logger } from '../lib/logger.js'
import {
  buildNimbusOrderNumber,
  createNimbusPostShipment,
  fetchNimbusPostTracking,
  isIncompleteShipment,
  isValidAwb,
} from '../providers/nimbuspost.js'
import { recordOrderHistory } from './auditService.js'
import { loadOrderItems } from './orderService.js'

const LOCK_MS = 90_000

function publicShipment(shipment) {
  if (!shipment) return null
  return {
    orderId: shipment.orderId || null,
    shipmentId: shipment.shipmentId || null,
    awb: shipment.awb || null,
    courierName: shipment.courierName || null,
    trackingUrl: shipment.trackingUrl || null,
  }
}

/** Shipment fields written back to the order (buildShipmentPatch in the Edge Functions). */
function shipmentPatch(shipment) {
  const patch = {}
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

/**
 * Takes a short per-order lock so double clicks / verify+webhook races cannot
 * book two shipments (NimbusPost wallet is charged per booking).
 */
async function acquireShipmentLock(orderId) {
  const now = new Date()
  const result = await getDb().collection(C.orders).findOneAndUpdate(
    {
      _id: orderId,
      $and: [
        { $or: [{ nimbuspost_awb: null }, { nimbuspost_awb: { $exists: false } }] },
        { $or: [{ shipment_lock_until: null }, { shipment_lock_until: { $exists: false } }, { shipment_lock_until: { $lt: now } }] },
      ],
    },
    { $set: { shipment_lock_until: new Date(now.getTime() + LOCK_MS) } },
    { returnDocument: 'after' },
  )
  return result
}

const releaseShipmentLock = (orderId) => getDb().collection(C.orders).updateOne({ _id: orderId }, { $set: { shipment_lock_until: null } })

/** Admin "Ship via NimbusPost" — port of admin-create-shipment. */
export async function createShipmentForOrder(orderId, { actorId } = {}) {
  const db = getDb()
  const existing = await db.collection(C.orders).findOne({ _id: String(orderId), deleted_at: null })
  if (!existing) throw notFound('Order not found.')
  if (existing.nimbuspost_awb && isValidAwb(existing.nimbuspost_awb)) throw conflict('This order already has a shipment AWB.')
  if (existing.order_status === 'cancelled') throw conflict('Cancelled orders cannot be shipped.')

  const isCod = existing.payment_method === 'cod'
  if (existing.payment_status === 'payment_submitted') throw conflict('Approve the UPI payment first, or use Payment reviews.')
  const paymentOk = existing.payment_status === 'paid' || (isCod && existing.payment_status === 'pending')
  if (!paymentOk) throw conflict(isCod ? 'COD order is not ready to ship.' : 'Online orders must be paid before shipping.')

  const order = await acquireShipmentLock(existing._id)
  if (!order) throw conflict('A shipment is already being booked for this order. Wait a moment and refresh.')

  try {
    const items = await loadOrderItems(order._id)
    const shipmentOrder = { ...order, order_items: items }
    if (isIncompleteShipment(order)) shipmentOrder.nimbus_order_number = buildNimbusOrderNumber(order.order_ref, Date.now() % 10000)

    const shipment = await createNimbusPostShipment(shipmentOrder)
    if (shipment.awb && !isValidAwb(shipment.awb)) {
      logger.error('Rejected invalid NimbusPost AWB', { orderRef: order.order_ref })
      shipment.awb = null
      shipment.trackingUrl = null
    }
    const patch = shipmentPatch(shipment)
    if (patch.nimbuspost_awb) patch.payment_status = isCod ? order.payment_status : 'paid'
    if (Object.keys(patch).length) {
      await db.collection(C.orders).updateOne({ _id: order._id }, { $set: { ...patch, updated_at: new Date() } })
    }
    if (patch.nimbuspost_awb) {
      await recordOrderHistory({ orderId: order._id, oldStatus: order.order_status, newStatus: 'shipped', source: 'admin_shipment', changedBy: actorId, metadata: { awb: patch.nimbuspost_awb } })
      return { shipment: publicShipment(shipment) }
    }
    return {
      shipment: publicShipment(shipment),
      shipmentWarning: `NimbusPost accepted ${order.order_ref} but did not return an AWB yet. If you already see it booked in NimbusPost, wait a minute and click Ship via NimbusPost again to sync the AWB.`,
    }
  } finally {
    await releaseShipmentLock(order._id)
  }
}

/**
 * Automatic booking after a confirmed online payment (verify/webhook), as the
 * Edge Functions did. Never throws: failures leave the order in "Ready to ship".
 */
export async function autoShipAfterPayment(orderId) {
  if (!env.NIMBUSPOST_AUTO_SHIP) return { skipped: true }
  const order = await acquireShipmentLock(orderId)
  if (!order || order.order_status !== 'confirmed') {
    if (order) await releaseShipmentLock(order._id)
    return { skipped: true }
  }
  try {
    const items = await loadOrderItems(order._id)
    const shipment = await createNimbusPostShipment({ ...order, order_items: items })
    const patch = shipmentPatch(shipment)
    if (Object.keys(patch).length) await getDb().collection(C.orders).updateOne({ _id: order._id }, { $set: { ...patch, updated_at: new Date() } })
    if (patch.nimbuspost_awb) {
      await recordOrderHistory({ orderId: order._id, oldStatus: order.order_status, newStatus: 'shipped', source: 'auto_shipment', metadata: { awb: patch.nimbuspost_awb } })
    }
    return { shipment: publicShipment(shipment) }
  } catch (error) {
    logger.warn('Automatic NimbusPost booking failed', { orderRef: order.order_ref, error })
    return { shipmentWarning: error?.message || 'NimbusPost shipment booking failed.' }
  } finally {
    await releaseShipmentLock(order._id)
  }
}

/** Admin "Reset shipment" recovery for a stuck/invalid AWB (was a direct browser UPDATE). */
export async function resetShipment(orderId, { actorId } = {}) {
  const db = getDb()
  const order = await db.collection(C.orders).findOne({ _id: String(orderId), deleted_at: null })
  if (!order) throw notFound('Order not found.')
  if (order.order_status === 'cancelled') throw conflict('Cancelled orders cannot be reset.')
  // Same rule as the admin UI: only stuck (no valid AWB) or invalid-AWB orders can be reset.
  if (isValidAwb(order.nimbuspost_awb)) {
    throw conflict('This order has a valid courier AWB. Cancel the shipment instead of resetting it.')
  }
  await db.collection(C.orders).updateOne(
    { _id: order._id },
    {
      $set: {
        order_status: 'placed',
        shipping_status: 'not_shipped',
        nimbuspost_awb: null,
        nimbuspost_order_id: null,
        nimbuspost_shipment_id: null,
        courier_name: null,
        tracking_url: null,
        // Previous provider values stay in the timeline, never silently lost.
        updated_at: new Date(),
      },
    },
  )
  await recordOrderHistory({
    orderId: order._id,
    oldStatus: order.order_status,
    newStatus: 'placed',
    source: 'admin_reset_shipment',
    changedBy: actorId,
    metadata: { previous_awb: order.nimbuspost_awb || null, previous_nimbus_order_id: order.nimbuspost_order_id || null },
  })
}

export async function liveTracking(order) {
  if (!order.nimbuspost_awb) {
    return { scans: [], latest: null, message: 'Tracking will appear after the parcel is shipped.' }
  }
  try {
    const tracking = await fetchNimbusPostTracking(order.nimbuspost_awb)
    return { awb: order.nimbuspost_awb, courierName: order.courier_name || null, shippingStatus: order.shipping_status, ...tracking }
  } catch (error) {
    if (error instanceof HttpError) {
      return { awb: order.nimbuspost_awb, courierName: order.courier_name || null, shippingStatus: order.shipping_status, latest: null, scans: [], message: 'Live scan details are not available yet. Use the NimbusPost tracking link for updates.' }
    }
    throw error
  }
}
