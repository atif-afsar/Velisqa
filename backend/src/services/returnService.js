import { C, getDb, withTransaction } from '../config/db.js'
import { uuid } from '../lib/crypto.js'
import { badRequest, conflict, HttpError, notFound } from '../lib/errors.js'
import { audit, recordOrderHistory } from './auditService.js'

export const RETURN_WINDOW_DAYS = 5
export const ACTIVE_RETURN_STATUSES = ['pending', 'approved', 'pickup_scheduled', 'in_transit', 'received', 'qc_passed', 'qc_failed']

const iso = (value) => (value instanceof Date ? value.toISOString() : value ?? null)

function serializeReturn(row) {
  if (!row) return null
  const { _id, ...rest } = row
  const out = { id: _id }
  for (const [key, value] of Object.entries(rest)) out[key] = iso(value)
  return out
}

const isDelivered = (order) => order.order_status === 'delivered' || order.shipping_status === 'delivered'

/** order_delivered_at(): delivered_at, else updated_at for delivered orders. */
function deliveredAt(order) {
  if (order.delivered_at) return new Date(order.delivered_at)
  return isDelivered(order) ? new Date(order.updated_at) : null
}

async function ownedOrder(orderId, userId) {
  const order = await getDb().collection(C.orders).findOne({ _id: String(orderId), user_id: userId, is_enquiry: { $ne: true }, deleted_at: null })
  if (!order) throw notFound('Order not found.')
  return order
}

/** Port of can_request_order_return (5 days from delivery, one active request, owner only). */
export async function canRequestReturn(orderId, userId) {
  if (!userId) return false
  const order = await getDb().collection(C.orders).findOne({ _id: String(orderId), user_id: userId, is_enquiry: { $ne: true }, deleted_at: null })
  if (!order || !isDelivered(order)) return false
  const active = await getDb().collection(C.orderReturns).findOne({ order_id: order._id, status: { $in: ACTIVE_RETURN_STATUSES } })
  if (active) return false
  const at = deliveredAt(order)
  if (!at) return false
  return at.getTime() >= Date.now() - RETURN_WINDOW_DAYS * 86_400_000
}

export async function submitReturn({ orderId, reason, customerNotes, userId }) {
  if (!(await canRequestReturn(orderId, userId))) throw new HttpError(409, 'This order is not eligible for a return request.')
  const order = await ownedOrder(orderId, userId)
  const returnId = uuid()
  try {
    await withTransaction(async (session) => {
      const db = getDb()
      await db.collection(C.orderReturns).insertOne(
        {
          _id: returnId,
          order_id: order._id,
          user_id: userId,
          status: 'pending',
          reason: reason.trim(),
          customer_notes: customerNotes?.trim() || null,
          admin_notes: null,
          rejection_reason: null,
          refund_amount: order.grand_total,
          reverse_awb: null,
          reverse_tracking_url: null,
          requested_at: new Date(),
          approved_at: null,
          pickup_scheduled_at: null,
          received_at: null,
          qc_completed_at: null,
          refunded_at: null,
          updated_at: new Date(),
        },
        { session },
      )
      const items = await db.collection(C.orderItems).find({ order_id: order._id }, { session }).toArray()
      if (items.length) {
        await db.collection(C.orderReturnItems).insertMany(
          items.map((item) => ({ _id: uuid(), return_id: returnId, order_item_id: item._id, quantity: item.quantity, created_at: new Date() })),
          { session },
        )
      }
    })
  } catch (error) {
    if (error?.code === 11000) throw conflict('A return request is already open for this order.')
    throw error
  }
  return returnId
}

const RETURN_FIELDS = [
  'order_id', 'status', 'reason', 'customer_notes', 'rejection_reason', 'refund_amount', 'reverse_awb', 'reverse_tracking_url',
  'requested_at', 'approved_at', 'pickup_scheduled_at', 'received_at', 'qc_completed_at', 'refunded_at',
]

function pick(row) {
  const out = { id: row._id }
  for (const key of RETURN_FIELDS) out[key] = iso(row[key] ?? null)
  return out
}

/** Latest return per order, only for orders the user owns. */
export async function returnsForOrders(orderIds, userId) {
  const ids = [...new Set(orderIds.map(String))].slice(0, 200)
  const rows = await getDb().collection(C.orderReturns).find({ order_id: { $in: ids }, user_id: userId }).sort({ requested_at: -1 }).toArray()
  const map = {}
  for (const row of rows) if (!map[row.order_id]) map[row.order_id] = pick(row)
  return map
}

// ── Admin (port of admin-manage-return) ───────────────────────────────

export async function listAdminReturns(status = 'pending') {
  const filter = {}
  if (status === 'pending') filter.status = 'pending'
  else if (status === 'active') filter.status = { $in: ['approved', 'pickup_scheduled', 'in_transit', 'received', 'qc_passed', 'qc_failed'] }
  else if (status === 'completed') filter.status = { $in: ['refunded', 'rejected', 'cancelled'] }
  const db = getDb()
  const rows = await db.collection(C.orderReturns).find(filter).sort({ requested_at: status === 'pending' ? 1 : -1 }).limit(100).toArray()
  const orders = await db
    .collection(C.orders)
    .find({ _id: { $in: rows.map((row) => row.order_id) } }, { projection: { order_ref: 1, customer_name: 1, customer_phone: 1, grand_total: 1, payment_status: 1, payment_method: 1 } })
    .toArray()
  const byId = new Map(orders.map((order) => [order._id, order]))
  return rows.map((row) => {
    const order = byId.get(row.order_id)
    return {
      ...serializeReturn(row),
      orders: order
        ? { order_ref: order.order_ref, customer_name: order.customer_name, customer_phone: order.customer_phone, grand_total: order.grand_total, payment_status: order.payment_status, payment_method: order.payment_method }
        : null,
    }
  })
}

async function restoreStockForReturn(returnId, session) {
  const db = getDb()
  const lines = await db.collection(C.orderReturnItems).find({ return_id: returnId }, { session }).toArray()
  const items = await db.collection(C.orderItems).find({ _id: { $in: lines.map((line) => line.order_item_id) } }, { session }).toArray()
  const byId = new Map(items.map((item) => [item._id, item]))
  for (const line of lines) {
    const productId = byId.get(line.order_item_id)?.product_id
    if (!productId) continue
    await db.collection(C.products).updateOne({ _id: productId }, { $inc: { stock: Number(line.quantity || 0) }, $set: { out_of_stock: false, updated_at: new Date() } }, { session })
  }
}

/**
 * Each transition is a conditional update on the current status, so double
 * clicks or two admins cannot apply the same step (or restore stock) twice.
 */
export async function manageReturn(returnId, body, { actorId, req }) {
  const db = getDb()
  const row = await db.collection(C.orderReturns).findOne({ _id: String(returnId) })
  if (!row) throw notFound('Return request not found.')
  const now = new Date()
  const action = String(body.action || '')

  const transition = async (fromStatuses, $set, session) => {
    const result = await db.collection(C.orderReturns).updateOne(
      { _id: row._id, status: { $in: fromStatuses } },
      { $set: { ...$set, updated_at: now } },
      session ? { session } : undefined,
    )
    if (result.modifiedCount !== 1) throw conflict('This return was updated by someone else. Refresh and try again.')
  }

  let message
  if (action === 'approve') {
    if (row.status !== 'pending') throw conflict('Only pending returns can be approved.')
    await transition(['pending'], { status: 'approved', approved_at: now, admin_notes: body.adminNotes || row.admin_notes || null })
    message = 'Return approved. Book reverse pickup next.'
  } else if (action === 'reject') {
    const rejectionReason = String(body.rejectionReason || '').trim()
    if (!rejectionReason) throw badRequest('Add a rejection reason for the customer.')
    if (row.status !== 'pending') throw conflict('Only pending returns can be rejected.')
    await transition(['pending'], { status: 'rejected', rejection_reason: rejectionReason.slice(0, 500), admin_notes: body.adminNotes || row.admin_notes || null })
    message = 'Return rejected.'
  } else if (action === 'set_reverse_awb') {
    const reverseAwb = String(body.reverseAwb || '').trim()
    if (!reverseAwb) throw badRequest('Reverse AWB is required.')
    const from = ['approved', 'pickup_scheduled', 'in_transit']
    if (!from.includes(row.status)) throw conflict('Approve the return before booking pickup.')
    const url = body.reverseTrackingUrl ? String(body.reverseTrackingUrl).trim() : row.reverse_tracking_url
    if (url && !/^https?:\/\//i.test(url)) throw badRequest('Tracking URL must start with http(s)://')
    await transition(from, { status: 'pickup_scheduled', reverse_awb: reverseAwb.slice(0, 40), reverse_tracking_url: url || null, pickup_scheduled_at: row.pickup_scheduled_at || now })
    message = 'Reverse pickup details saved.'
  } else if (action === 'mark_received') {
    const from = ['approved', 'pickup_scheduled', 'in_transit', 'received', 'qc_passed', 'qc_failed']
    if (!from.includes(row.status)) throw conflict('Return is not in transit yet.')
    await transition(from, { status: 'received', received_at: now })
    message = 'Return marked received at warehouse.'
  } else if (action === 'qc_pass') {
    if (row.status !== 'received' && row.status !== 'qc_failed') throw conflict('Mark the return received before QC.')
    await withTransaction(async (session) => {
      await transition(['received', 'qc_failed'], { status: 'qc_passed', qc_completed_at: now }, session)
      await restoreStockForReturn(row._id, session)
    })
    message = 'QC passed. Inventory restored. Mark refunded when payment is sent.'
  } else if (action === 'qc_fail') {
    if (row.status !== 'received') throw conflict('Mark the return received before QC.')
    await transition(['received'], { status: 'qc_failed', qc_completed_at: now })
    message = 'QC failed. Handle refund manually per policy.'
  } else if (action === 'mark_refunded') {
    if (row.status !== 'qc_passed') throw conflict('Complete QC pass before marking refunded.')
    const order = await db.collection(C.orders).findOne({ _id: row.order_id })
    const wasPaid = order?.payment_status === 'paid'
    await withTransaction(async (session) => {
      await transition(['qc_passed'], { status: 'refunded', refunded_at: now }, session)
      await db.collection(C.orders).updateOne(
        { _id: row.order_id },
        { $set: { order_status: 'returned', ...(wasPaid ? { payment_status: 'refunded' } : {}), updated_at: now } },
        { session },
      )
      await recordOrderHistory({ orderId: row.order_id, oldStatus: order?.order_status, newStatus: 'returned', source: 'admin_return', reason: 'return_refunded', changedBy: actorId }, session)
    })
    message = wasPaid ? 'Return closed and order marked refunded.' : 'Return closed. Process COD refund manually if applicable.'
  } else {
    throw badRequest('Unknown action.')
  }

  await audit({ actorId, action: `return.${action}`, targetType: 'order_return', targetId: row._id, summary: { from: row.status }, req })
  return { message }
}
