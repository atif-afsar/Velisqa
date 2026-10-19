import { C, getDb } from '../config/db.js'
import { conflict, notFound } from '../lib/errors.js'
import { isValidAwb } from '../providers/nimbuspost.js'
import { audit, recordOrderHistory } from './auditService.js'
import { serializeOrderRow } from './orderSerializers.js'

const LIVE = { is_enquiry: { $ne: true }, deleted_at: null }

const validPhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '')
  return digits.length === 10 || (digits.length === 12 && digits.startsWith('91'))
}

/** Same rule as src/lib/adminInbox.js orderNeedsShipment. */
export function orderNeedsShipment(order) {
  if (!validPhone(order.customer_phone)) return false
  if ((order.nimbuspost_awb && isValidAwb(order.nimbuspost_awb)) || order.order_status === 'cancelled') return false
  if (order.payment_status === 'payment_submitted' || order.payment_status === 'awaiting_payment') return false
  if (order.payment_method === 'cod') return order.payment_status === 'pending' || order.payment_status === 'paid'
  return order.payment_status === 'paid'
}

const summary = (order, fields) => {
  const row = serializeOrderRow(order)
  return Object.fromEntries(fields.map((field) => [field, row[field] ?? null]))
}

/** Start of "today" in India (IST, UTC+5:30) as a UTC Date. */
function istDayStart(now = new Date()) {
  const ist = new Date(now.getTime() + 5.5 * 3600_000)
  ist.setUTCHours(0, 0, 0, 0)
  return new Date(ist.getTime() - 5.5 * 3600_000)
}

/** Order count + value since a date (cancelled orders excluded). Money summed in paise. */
async function salesSince(since) {
  const [row] = await getDb()
    .collection(C.orders)
    .aggregate([
      { $match: { ...LIVE, order_status: { $ne: 'cancelled' }, created_at: { $gte: since } } },
      { $group: { _id: null, orders: { $sum: 1 }, paise: { $sum: { $round: [{ $multiply: ['$grand_total', 100] }, 0] } } } },
    ])
    .toArray()
  return { orders: row?.orders || 0, revenue: (row?.paise || 0) / 100 }
}

/**
 * Dashboard figures for a date range: totals, COD/online split, a day-by-day
 * series (India calendar days) and the orders placed in the range.
 * Cancelled orders are counted separately and excluded from sales.
 */
export async function salesSummary({ start, end }) {
  const range = { ...LIVE, created_at: { $gte: start, $lte: end } }
  const orders = getDb().collection(C.orders)
  const paise = { $round: [{ $multiply: ['$grand_total', 100] }, 0] }
  const [totals, byMethod, daily, cancelled, list, listTotal] = await Promise.all([
    orders.aggregate([{ $match: { ...range, order_status: { $ne: 'cancelled' } } }, { $group: { _id: null, orders: { $sum: 1 }, paise: { $sum: paise } } }]).toArray(),
    orders.aggregate([{ $match: { ...range, order_status: { $ne: 'cancelled' } } }, { $group: { _id: '$payment_method', orders: { $sum: 1 }, paise: { $sum: paise } } }]).toArray(),
    orders
      .aggregate([
        { $match: { ...range, order_status: { $ne: 'cancelled' } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at', timezone: 'Asia/Kolkata' } }, orders: { $sum: 1 }, paise: { $sum: paise } } },
        { $sort: { _id: 1 } },
      ])
      .toArray(),
    orders.countDocuments({ ...range, order_status: 'cancelled' }),
    orders.find(range).sort({ created_at: -1 }).limit(100).toArray(),
    orders.countDocuments(range),
  ])
  const total = totals[0] || { orders: 0, paise: 0 }

  // Same-length window immediately before, for "vs previous period" deltas.
  const span = end.getTime() - start.getTime()
  const prevStart = new Date(start.getTime() - span - 1)
  const prevEnd = new Date(start.getTime() - 1)
  const rangeIds = { ...range, order_status: { $ne: 'cancelled' } }
  const [prevTotals, statusRows, topProducts] = await Promise.all([
    orders.aggregate([{ $match: { ...LIVE, order_status: { $ne: 'cancelled' }, created_at: { $gte: prevStart, $lte: prevEnd } } }, { $group: { _id: null, orders: { $sum: 1 }, paise: { $sum: paise } } }]).toArray(),
    orders
      .aggregate([
        { $match: range },
        {
          $group: {
            _id: {
              $switch: {
                branches: [
                  { case: { $eq: ['$order_status', 'cancelled'] }, then: 'cancelled' },
                  { case: { $eq: ['$order_status', 'returned'] }, then: 'returned' },
                  { case: { $or: [{ $eq: ['$shipping_status', 'delivered'] }, { $eq: ['$order_status', 'delivered'] }] }, then: 'delivered' },
                  { case: { $in: ['$shipping_status', ['shipped', 'out_for_delivery']] }, then: 'in_transit' },
                  { case: { $and: [{ $eq: ['$payment_method', 'online'] }, { $not: [{ $in: ['$payment_status', ['paid', 'refunded']] }] }] }, then: 'awaiting_payment' },
                ],
                default: 'to_ship',
              },
            },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray(),
    getDb()
      .collection(C.orderItems)
      .aggregate([
        { $lookup: { from: C.orders, localField: 'order_id', foreignField: '_id', as: 'order', pipeline: [{ $match: rangeIds }, { $project: { _id: 1 } }] } },
        { $match: { 'order.0': { $exists: true }, is_free_gift: { $ne: true } } },
        { $group: { _id: { $ifNull: ['$product_id', '$product_name'] }, name: { $first: '$product_name' }, image: { $first: '$image_url' }, units: { $sum: '$quantity' }, paise: { $sum: { $round: [{ $multiply: ['$line_total', 100] }, 0] } } } },
        { $sort: { paise: -1, units: -1 } },
        { $limit: 5 },
      ])
      .toArray(),
  ])
  const prev = prevTotals[0] || { orders: 0, paise: 0 }
  const method = (name) => {
    const row = byMethod.find((entry) => entry._id === name)
    return { orders: row?.orders || 0, revenue: (row?.paise || 0) / 100 }
  }
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    orders: total.orders,
    revenue: total.paise / 100,
    avgOrderValue: total.orders ? Math.round(total.paise / total.orders) / 100 : 0,
    cancelled,
    cod: method('cod'),
    online: method('online'),
    daily: daily.map((day) => ({ date: day._id, orders: day.orders, revenue: day.paise / 100 })),
    previous: {
      start: prevStart.toISOString(),
      end: prevEnd.toISOString(),
      orders: prev.orders,
      revenue: prev.paise / 100,
      avgOrderValue: prev.orders ? Math.round(prev.paise / prev.orders) / 100 : 0,
    },
    status: Object.fromEntries(statusRows.map((row) => [row._id, row.count])),
    topProducts: topProducts.map((row) => ({ id: row._id, name: row.name, image: row.image || null, units: row.units, revenue: row.paise / 100 })),
    list: list.map((order) => summary(order, ['id', 'order_ref', 'customer_name', 'grand_total', 'payment_method', 'payment_status', 'order_status', 'shipping_status', 'created_at'])),
    listTotal,
  }
}

/** GET /admin/inbox — preserves the fetchAdminInboxSummary() contract. */
export async function adminInbox() {
  const db = getDb()
  const orders = db.collection(C.orders)
  const [paymentReviewCount, paymentReviews, awaitingUpi, inTransit, candidates, recentOrders, pendingReviews, pendingReturns] = await Promise.all([
    orders.countDocuments({ ...LIVE, payment_status: 'payment_submitted' }),
    orders.find({ ...LIVE, payment_status: 'payment_submitted' }).sort({ payment_submitted_at: 1 }).limit(8).toArray(),
    orders.countDocuments({ ...LIVE, payment_status: 'awaiting_payment' }),
    orders.countDocuments({ ...LIVE, nimbuspost_awb: { $type: 'string' }, order_status: { $ne: 'cancelled' }, shipping_status: { $nin: ['delivered', 'rto'] } }),
    orders
      .find({
        ...LIVE,
        $or: [{ nimbuspost_awb: null }, { nimbuspost_awb: { $exists: false } }],
        order_status: { $ne: 'cancelled' },
        payment_status: { $nin: ['payment_submitted', 'awaiting_payment'] },
      })
      .sort({ created_at: -1 })
      .limit(200)
      .toArray(),
    orders.find(LIVE).sort({ created_at: -1 }).limit(8).toArray(),
    db.collection(C.productReviews).countDocuments({ status: 'pending' }),
    db.collection(C.orderReturns).countDocuments({ status: 'pending' }),
  ])
  const needsShipment = candidates.filter(orderNeedsShipment)
  const todayStart = istDayStart()
  const [today, week] = await Promise.all([salesSince(todayStart), salesSince(new Date(todayStart.getTime() - 6 * 86_400_000))])
  return {
    counts: {
      paymentReviews: paymentReviewCount,
      needsShipment: needsShipment.length,
      awaitingUpi,
      inTransit,
      pendingReviews,
      pendingReturns,
      totalOpen: paymentReviewCount + needsShipment.length + pendingReviews + pendingReturns,
    },
    paymentReviews: paymentReviews.map((order) => summary(order, ['id', 'order_ref', 'customer_name', 'grand_total', 'payment_submitted_at', 'created_at'])),
    needsShipment: needsShipment
      .slice(0, 8)
      .map((order) => summary(order, ['id', 'order_ref', 'customer_name', 'customer_phone', 'grand_total', 'payment_method', 'payment_status', 'shipping_status', 'order_status', 'nimbuspost_awb', 'created_at'])),
    recentOrders: recentOrders.map((order) => summary(order, ['id', 'order_ref', 'customer_name', 'grand_total', 'payment_method', 'payment_status', 'order_status', 'shipping_status', 'created_at'])),
    // Today = since midnight IST; week = today plus the previous 6 days.
    stats: { today, week, avgOrderValue: week.orders ? Math.round((week.revenue / week.orders) * 100) / 100 : 0 },
  }
}

async function attachItems(orders) {
  const items = await getDb().collection(C.orderItems).find({ order_id: { $in: orders.map((order) => order._id) } }).sort({ created_at: 1 }).toArray()
  const byOrder = new Map()
  for (const item of items) byOrder.set(item.order_id, [...(byOrder.get(item.order_id) || []), item])
  return orders.map((order) => serializeOrderRow(order, byOrder.get(order._id) || [], { includeToken: true }))
}

/** Paginated admin order list (AdminOrders: newest first, 50 per page, exact count). */
export async function listAdminOrders({ offset = 0, limit = 50, paymentMethod } = {}) {
  const filter = { ...LIVE, ...(paymentMethod ? { payment_method: paymentMethod } : {}) }
  const orders = getDb().collection(C.orders)
  const [rows, total] = await Promise.all([
    orders.find(filter).sort({ created_at: -1 }).skip(offset).limit(Math.min(limit, 200)).toArray(),
    orders.countDocuments(filter),
  ])
  return { orders: await attachItems(rows), total }
}

/** Orders in a date range for the analytics page (it computes its metrics client-side). */
export async function analyticsOrders({ start, end }) {
  const rows = await getDb()
    .collection(C.orders)
    .find({ ...LIVE, created_at: { $gte: start, $lte: end } })
    .sort({ created_at: -1 })
    .limit(10_000)
    .toArray()
  const items = await getDb().collection(C.orderItems).find({ order_id: { $in: rows.map((row) => row._id) } }).toArray()
  const byOrder = new Map()
  for (const item of items) byOrder.set(item.order_id, [...(byOrder.get(item.order_id) || []), item])
  return rows.map((row) => ({
    id: row._id,
    order_ref: row.order_ref,
    grand_total: row.grand_total,
    payment_status: row.payment_status,
    payment_method: row.payment_method,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    order_items: (byOrder.get(row._id) || []).map((item) => ({
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.line_total,
    })),
  }))
}

/**
 * Admin "Delete order record". The old Edge Function hard-deleted the row; we
 * soft-delete (hidden everywhere, kept for payment/tax reconciliation) and audit it.
 */
export async function deleteOrder(orderId, { actorId, req }) {
  const db = getDb()
  const order = await db.collection(C.orders).findOne({ _id: String(orderId), deleted_at: null })
  if (!order) throw notFound('Order not found.')
  if (order.is_enquiry) throw conflict('Product enquiries cannot be removed here.')
  await db.collection(C.orders).updateOne({ _id: order._id }, { $set: { deleted_at: new Date(), deleted_by: actorId, updated_at: new Date() } })
  await recordOrderHistory({ orderId: order._id, oldStatus: order.order_status, newStatus: order.order_status, source: 'admin_delete', changedBy: actorId })
  await audit({ actorId, action: 'order.delete', targetType: 'order', targetId: order._id, summary: { orderRef: order.order_ref, hadAwb: Boolean(order.nimbuspost_awb) }, req })
  return { orderRef: order.order_ref, hadAwb: Boolean(order.nimbuspost_awb) }
}

export async function listAudit({ limit = 100 } = {}) {
  const rows = await getDb().collection(C.adminAuditLogs).find({}).sort({ created_at: -1 }).limit(Math.min(limit, 500)).toArray()
  return rows.map(({ _id, ...rest }) => ({ id: _id, ...rest }))
}
