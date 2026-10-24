import { randomBytes } from 'node:crypto'
import { C, getDb, withTransaction } from '../config/db.js'
import {
  decryptOrderToken,
  encryptOrderToken,
  hashOrderToken,
  sha256,
  uuid,
} from '../lib/crypto.js'
import { conflict, HttpError, notFound } from '../lib/errors.js'
import { logger } from '../lib/logger.js'
import { recordOrderHistory } from './auditService.js'
import { eventBus, EVENTS } from './eventBus.js'
import { consumeSingleUseCoupon } from './couponService.js'
import { priceCart } from './pricingService.js'

const BASE_FILTER = { is_enquiry: { $ne: true }, deleted_at: null }

/** VLQ-YYMMDDHHMMSS-XXXX in Asia/Kolkata, same as public.generate_order_ref(). */
export function generateOrderRef(now = new Date()) {
  const ist = new Date(now.getTime() + 5.5 * 3600_000)
  const pad = (n) => String(n).padStart(2, '0')
  const stamp = `${pad(ist.getUTCFullYear() % 100)}${pad(ist.getUTCMonth() + 1)}${pad(ist.getUTCDate())}${pad(ist.getUTCHours())}${pad(ist.getUTCMinutes())}${pad(ist.getUTCSeconds())}`
  return `VLQ-${stamp}-${randomBytes(2).toString('hex').toUpperCase()}`
}

const blank = (value) => {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  return trimmed || null
}

function requestFingerprint({ customer, items }) {
  return sha256(
    JSON.stringify({
      c: [customer.name, customer.phone, customer.email, customer.address, customer.pincode, customer.paymentMethod, customer.couponCode, customer.giftWrap],
      i: items.map((item) => [item.productId, item.quantity, Boolean(item.isFreeGift)]).sort(),
    }),
  )
}

/** Conditional decrement: the filter only matches while enough stock remains, so concurrent buyers cannot oversell. */
async function reserveStock(stockByProduct, session) {
  const products = getDb().collection(C.products)
  for (const [productId, qty] of stockByProduct) {
    const result = await products.updateOne(
      { _id: productId, stock: { $gte: qty }, out_of_stock: { $ne: true } },
      { $inc: { stock: -qty }, $set: { updated_at: new Date() } },
      { session },
    )
    if (result.modifiedCount !== 1) {
      throw new HttpError(409, 'One or more products are unavailable in the requested quantity.', { code: 'UNAVAILABLE' })
    }
  }
}

/** Online orders: stock leaves inventory once payment is confirmed (old trigger decrement_order_stock_on_payment). */
export async function applyPaidStock(orderId, session) {
  const items = await getDb().collection(C.orderItems).find({ order_id: orderId }, { session }).toArray()
  for (const [productId, qty] of aggregateItemQuantities(items)) {
    await getDb().collection(C.products).updateOne(
      { _id: productId },
      // Payment is already captured, so never block it; floor at zero instead of going negative.
      [{ $set: { stock: { $max: [0, { $subtract: [{ $ifNull: ['$stock', 0] }, qty] }] }, updated_at: '$$NOW' } }],
      { session },
    )
  }
}

export async function restoreStock(orderId, session) {
  const items = await getDb().collection(C.orderItems).find({ order_id: orderId }, { session }).toArray()
  for (const [productId, qty] of aggregateItemQuantities(items)) {
    await getDb().collection(C.products).updateOne({ _id: productId }, { $inc: { stock: qty }, $set: { updated_at: new Date() } }, { session })
  }
}

function aggregateItemQuantities(items) {
  const totals = new Map()
  for (const item of items) {
    if (!item.product_id) continue
    totals.set(item.product_id, (totals.get(item.product_id) || 0) + Number(item.quantity || 0))
  }
  return totals
}

export async function createOrder({ customer, items, idempotencyKey, userId }) {
  const db = getDb()
  const fingerprint = requestFingerprint({ customer, items })

  if (idempotencyKey) {
    const existing = await db.collection(C.orders).findOne({ idempotency_key: idempotencyKey })
    if (existing) return replayIdempotent(existing, fingerprint)
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const accessToken = uuid()
    const orderId = uuid()
    const orderRef = generateOrderRef()
    try {
      const created = await withTransaction(async (session) => {
        const priced = await priceCart(
          { items, couponCode: customer.couponCode, giftWrap: customer.giftWrap, paymentMethod: customer.paymentMethod, customerEmail: customer.email },
          session,
        )
        const now = new Date()
        const isCod = priced.paymentMethod === 'cod'
        if (isCod) await reserveStock(priced.stockByProduct, session)

        const order = {
          _id: orderId,
          order_ref: orderRef,
          user_id: userId || null,
          customer_name: customer.name.trim(),
          customer_phone: customer.phone.trim(),
          customer_email: blank(customer.email),
          delivery_address: customer.address.trim(),
          delivery_city: blank(customer.city),
          delivery_state: blank(customer.state),
          delivery_pincode: customer.pincode.trim(),
          delivery_notes: blank(customer.notes),
          location_label: blank(customer.locationLabel),
          location_maps_url: blank(customer.locationMapsUrl),
          payment_method: priced.paymentMethod,
          payment_status: isCod ? 'pending' : 'awaiting_payment',
          payment_gateway: null,
          subtotal: priced.subtotal,
          delivery_charge: priced.codFee,
          tax_amount: priced.tax,
          discount_amount: priced.discount,
          coupon_code: priced.couponCode,
          gift_wrap: priced.giftWrap,
          gift_wrap_fee: priced.giftWrapFee,
          grand_total: priced.grandTotal,
          order_status: 'placed',
          shipping_status: 'not_shipped',
          is_enquiry: false,
          access_token_hash: hashOrderToken(accessToken),
          access_token_enc: encryptOrderToken(accessToken),
          idempotency_key: idempotencyKey || null,
          idempotency_hash: idempotencyKey ? fingerprint : null,
          stock_applied: isCod,
          deleted_at: null,
          created_at: now,
          updated_at: now,
        }
        await db.collection(C.orders).insertOne(order, { session })
        await consumeSingleUseCoupon(priced.couponCode, orderRef, session)
        await db.collection(C.orderItems).insertMany(
          priced.lines.map((line, index) => ({
            _id: uuid(),
            order_id: orderId,
            product_id: line.productId,
            product_name: line.isGift ? `${line.product.name} (complimentary gift)` : line.product.name,
            product_url: `/product/${line.productId}`,
            image_url: line.product.image_url || null,
            unit_price: line.unitPrice,
            quantity: line.quantity,
            line_total: line.lineTotal,
            is_free_gift: line.isGift,
            // Distinct timestamps keep line order stable (items are listed by created_at).
            created_at: new Date(now.getTime() + index),
          })),
          { session },
        )
        await recordOrderHistory({ orderId, oldStatus: null, newStatus: 'placed', source: 'checkout', changedBy: userId }, session)
        return order
      })

      eventBus.emit(EVENTS.orderCreated, {
        id: created._id,
        order_ref: created.order_ref,
        customer_name: created.customer_name,
        grand_total: created.grand_total,
        is_enquiry: false,
      })
      return {
        order_ref: created.order_ref,
        access_token: accessToken,
        grand_total: created.grand_total,
        payment_status: created.payment_status,
        order_status: created.order_status,
      }
    } catch (error) {
      if (error?.code === 11000 && /idempotency_key/.test(error.message || '') && idempotencyKey) {
        const existing = await db.collection(C.orders).findOne({ idempotency_key: idempotencyKey })
        if (existing) return replayIdempotent(existing, fingerprint)
      }
      if (error?.code === 11000 && /order_ref/.test(error.message || '')) {
        logger.warn('order_ref collision, retrying', { attempt })
        continue
      }
      throw error
    }
  }
  throw new HttpError(503, 'We could not create your order. Please try again.')
}

function replayIdempotent(existing, fingerprint) {
  if (existing.idempotency_hash && existing.idempotency_hash !== fingerprint) {
    throw conflict('This checkout was already submitted with different details. Refresh and try again.')
  }
  return {
    order_ref: existing.order_ref,
    access_token: decryptOrderToken(existing.access_token_enc),
    grand_total: existing.grand_total,
    payment_status: existing.payment_status,
    order_status: existing.order_status,
    replayed: true,
  }
}

// ── Access ────────────────────────────────────────────────────────────

/**
 * Private order access: a matching guest token (hash compare) OR the signed-in
 * owner. Missing/invalid proof returns 404 so order refs cannot be probed.
 */
export async function findAccessibleOrder(orderRef, { token, userId } = {}) {
  const ref = String(orderRef || '').trim()
  if (!ref || ref.length > 64) throw notFound('Order not found or this private link has expired.')
  const order = await getDb().collection(C.orders).findOne({ order_ref: ref, ...BASE_FILTER })
  const tokenOk = Boolean(token && order?.access_token_hash && order.access_token_hash === hashOrderToken(token))
  const ownerOk = Boolean(userId && order?.user_id && order.user_id === userId)
  if (!order || (!tokenOk && !ownerOk)) throw notFound('Order not found or this private link has expired.')
  return order
}

export const loadOrderItems = (orderId, session) =>
  getDb().collection(C.orderItems).find({ order_id: orderId }, session ? { session } : undefined).sort({ created_at: 1 }).toArray()

export async function listMyOrders(userId) {
  const db = getDb()
  const orders = await db.collection(C.orders).find({ user_id: userId, ...BASE_FILTER }).sort({ created_at: -1 }).limit(200).toArray()
  const items = await db.collection(C.orderItems).find({ order_id: { $in: orders.map((order) => order._id) } }).sort({ created_at: 1 }).toArray()
  const byOrder = new Map()
  for (const item of items) byOrder.set(item.order_id, [...(byOrder.get(item.order_id) || []), item])
  return orders.map((order) => ({ order, items: byOrder.get(order._id) || [] }))
}

export async function getMyOrder(userId, orderRef) {
  const order = await getDb().collection(C.orders).findOne({ order_ref: String(orderRef), user_id: userId, ...BASE_FILTER })
  if (!order) throw notFound('Order not found.')
  return { order, items: await loadOrderItems(order._id) }
}

// ── Cancellation (customer + admin share the state change) ─────────────

/**
 * Marks an order cancelled and puts reserved/decremented stock back, atomically
 * and only once (the status filter makes concurrent cancels a no-op).
 */
export async function markOrderCancelled(order, { source, changedBy, hadAwb }) {
  return withTransaction(async (session) => {
    const nextPayment = order.payment_status === 'paid' ? 'refunded' : order.payment_status
    const result = await getDb().collection(C.orders).updateOne(
      { _id: order._id, order_status: { $ne: 'cancelled' } },
      {
        $set: {
          order_status: 'cancelled',
          shipping_status: hadAwb ? 'rto' : 'not_shipped',
          payment_status: nextPayment,
          stock_applied: false,
          updated_at: new Date(),
        },
      },
      { session },
    )
    if (result.modifiedCount !== 1) throw conflict('This order is already cancelled.')
    if (order.stock_applied) await restoreStock(order._id, session)
    await recordOrderHistory({ orderId: order._id, oldStatus: order.order_status, newStatus: 'cancelled', source, changedBy }, session)
  })
}
