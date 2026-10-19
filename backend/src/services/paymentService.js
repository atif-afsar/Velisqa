import { C, getDb, withTransaction } from '../config/db.js'
import { env } from '../config/env.js'
import { sha256, uuid } from '../lib/crypto.js'
import { badRequest, conflict, HttpError, notFound } from '../lib/errors.js'
import { logger } from '../lib/logger.js'
import { toPaise, toRupees } from '../lib/money.js'
import { createRazorpayOrder, verifyPaymentSignature, verifyWebhookSignature } from '../providers/razorpay.js'
import { audit, recordOrderHistory } from './auditService.js'
import { sendMetaPurchaseInBackground } from './metaService.js'
import { applyPaidStock, findAccessibleOrder } from './orderService.js'
import { autoShipAfterPayment } from './shippingService.js'

// ── The single "order became paid" transition ─────────────────────────

/**
 * Atomically moves an order to paid exactly once. Whichever caller wins
 * (client verify, webhook, admin approval) applies stock and writes history;
 * every later caller sees `transitioned: false` and changes nothing.
 */
export async function markOrderPaid(orderId, { source, reason, changedBy, orderPatch = {}, paymentPatch = {}, providerOrderId }) {
  return withTransaction(async (session) => {
    const db = getDb()
    const before = await db.collection(C.orders).findOne({ _id: orderId }, { session })
    if (!before) throw notFound('Order not found.')
    if (before.payment_status === 'paid') return { transitioned: false, order: before }

    const nextOrderStatus = before.order_status === 'placed' ? 'confirmed' : before.order_status
    const now = new Date()
    const result = await db.collection(C.orders).updateOne(
      { _id: orderId, payment_status: { $ne: 'paid' } },
      { $set: { ...orderPatch, payment_status: 'paid', order_status: nextOrderStatus, updated_at: now } },
      { session },
    )
    if (result.modifiedCount !== 1) return { transitioned: false, order: before }

    // Online stock leaves inventory on payment (COD reserved it at checkout).
    if (!before.stock_applied && before.order_status !== 'cancelled') {
      await applyPaidStock(orderId, session)
      await db.collection(C.orders).updateOne({ _id: orderId }, { $set: { stock_applied: true } }, { session })
    }

    const paymentFilter = providerOrderId ? { provider: 'razorpay', provider_order_id: providerOrderId } : { order_id: orderId }
    await db.collection(C.payments).updateMany(paymentFilter, { $set: { status: 'paid', captured_at: now, updated_at: now, ...paymentPatch } }, { session })

    await recordOrderHistory({ orderId, oldStatus: before.order_status, newStatus: nextOrderStatus, source, reason, changedBy }, session)
    const after = await db.collection(C.orders).findOne({ _id: orderId }, { session })
    return { transitioned: true, order: after }
  })
}

function afterPaid(order) {
  sendMetaPurchaseInBackground(order)
  if (order.payment_method === 'online' && order.order_status === 'confirmed' && !order.nimbuspost_awb) {
    autoShipAfterPayment(order._id).catch((error) => logger.error('autoShip failed', { error }))
  }
}

// ── Razorpay checkout ─────────────────────────────────────────────────

export async function createRazorpayOrderFor({ orderRef, accessToken, userId }) {
  const order = await findAccessibleOrder(orderRef, { token: accessToken, userId })
  if (order.payment_method !== 'online') throw badRequest('This order is not configured for online payment.')
  if (order.payment_status === 'paid') throw badRequest('This order is already paid.')
  if (order.order_status === 'cancelled') throw badRequest('This order has been cancelled.')

  const amountPaise = toPaise(order.grand_total)
  const db = getDb()

  // Reuse the provider order for retries: Razorpay allows several attempts on one order.
  if (order.razorpay_order_id) {
    const existing = await db.collection(C.payments).findOne({ provider: 'razorpay', provider_order_id: order.razorpay_order_id })
    if (existing && toPaise(existing.amount) === amountPaise && existing.status !== 'paid') {
      return { razorpayOrderId: order.razorpay_order_id, razorpayKeyId: env.RAZORPAY_KEY_ID, amount: amountPaise, currency: 'INR', orderRef: order.order_ref }
    }
  }

  const rzpOrder = await createRazorpayOrder({ amountPaise, receipt: order.order_ref, notes: { order_ref: order.order_ref } })
  const now = new Date()
  await db.collection(C.orders).updateOne({ _id: order._id }, { $set: { razorpay_order_id: rzpOrder.id, payment_gateway: 'razorpay', updated_at: now } })
  await db.collection(C.payments).updateOne(
    { provider: 'razorpay', provider_order_id: rzpOrder.id },
    {
      $setOnInsert: {
        _id: uuid(),
        order_id: order._id,
        provider: 'razorpay',
        provider_order_id: rzpOrder.id,
        provider_payment_id: null,
        amount: toRupees(amountPaise),
        currency: 'INR',
        status: 'pending',
        signature_verified: false,
        created_at: now,
        updated_at: now,
      },
    },
    { upsert: true },
  )
  return { razorpayOrderId: rzpOrder.id, razorpayKeyId: env.RAZORPAY_KEY_ID, amount: rzpOrder.amount, currency: 'INR', orderRef: order.order_ref }
}

export async function verifyRazorpayPayment({ orderRef, razorpay_order_id: rzpOrderId, razorpay_payment_id: rzpPaymentId, razorpay_signature: signature }) {
  if (!verifyPaymentSignature({ orderId: rzpOrderId, paymentId: rzpPaymentId, signature })) {
    logger.warn('Razorpay signature verification failed', { rzpOrderId })
    throw badRequest('Invalid payment signature. Transaction security verification failed.')
  }
  const order = await getDb().collection(C.orders).findOne({ razorpay_order_id: rzpOrderId, is_enquiry: { $ne: true }, deleted_at: null })
  if (!order) throw notFound('Order not found for this payment.')
  if (orderRef && orderRef !== order.order_ref && orderRef !== order._id) throw badRequest('This payment does not belong to this order.')
  if (order.payment_status === 'paid') return { message: 'Order is already marked as paid.' }

  const { transitioned, order: paidOrder } = await markOrderPaid(order._id, {
    source: 'razorpay_verification',
    reason: 'payment_signature_verified',
    providerOrderId: rzpOrderId,
    orderPatch: { razorpay_payment_id: rzpPaymentId, razorpay_signature: signature },
    paymentPatch: { provider_payment_id: rzpPaymentId, signature_verified: true },
  })
  if (transitioned) afterPaid(paidOrder)
  return { message: 'Payment verified and order confirmed.', shipmentWarning: null }
}

// ── Razorpay webhook ──────────────────────────────────────────────────

function extractPaymentFields(payload, eventType) {
  if (eventType === 'order.paid') {
    const orderEntity = payload.payload?.order?.entity
    const paymentEntity = payload.payload?.payment?.entity || payload.payload?.payments?.[0]?.entity || payload.payload?.payments?.[0]
    return { rzpOrderId: orderEntity?.id, payment: paymentEntity || null, amountPaid: orderEntity?.amount_paid ?? paymentEntity?.amount }
  }
  const paymentEntity = payload.payload?.payment?.entity
  return { rzpOrderId: paymentEntity?.order_id, payment: paymentEntity || null, amountPaid: paymentEntity?.amount }
}

async function handleCaptured(payload, eventType, eventId) {
  const { rzpOrderId, payment, amountPaid } = extractPaymentFields(payload, eventType)
  if (!rzpOrderId) return 'skipped:no_order_id'
  const order = await getDb().collection(C.orders).findOne({ razorpay_order_id: rzpOrderId })
  if (!order) return 'skipped:order_not_found'
  if (order.payment_status === 'paid') return 'noop:already_paid'
  if (amountPaid != null && Number(amountPaid) !== toPaise(order.grand_total)) {
    logger.error('Razorpay amount mismatch — order NOT marked paid', { orderRef: order.order_ref, eventId })
    return 'rejected:amount_mismatch'
  }
  const { transitioned, order: paidOrder } = await markOrderPaid(order._id, {
    source: 'razorpay_webhook',
    reason: `webhook_event_${eventType}`,
    providerOrderId: rzpOrderId,
    orderPatch: { razorpay_payment_id: payment?.id || order.razorpay_payment_id || null },
    paymentPatch: {
      provider_payment_id: payment?.id || null,
      method: payment?.method || null,
      email: payment?.email || null,
      contact: payment?.contact || null,
      signature_verified: true,
    },
  })
  if (transitioned) afterPaid(paidOrder)
  return transitioned ? 'paid' : 'noop:already_paid'
}

async function handleFailed(payload) {
  const payment = payload.payload?.payment?.entity
  if (!payment?.order_id) return 'skipped:no_order_id'
  // The order stays awaiting_payment so the customer can retry on /pay; only the attempt is recorded.
  await getDb().collection(C.payments).updateMany(
    { provider: 'razorpay', provider_order_id: payment.order_id, status: 'pending' },
    {
      $set: {
        status: 'failed',
        provider_payment_id: payment.id || null,
        failed_at: new Date(),
        failure_code: payment.error_code || null,
        failure_description: payment.error_description || null,
        updated_at: new Date(),
      },
    },
  )
  return 'recorded_failure'
}

async function handleRefund(payload) {
  const refund = payload.payload?.refund?.entity
  if (!refund?.id || !refund.payment_id) return 'skipped:no_refund'
  const db = getDb()
  const payment = await db.collection(C.payments).findOne({ provider_payment_id: refund.payment_id })
  if (!payment) return 'skipped:payment_not_found'
  // Idempotent on the unique provider_refund_id: a replayed refund event changes nothing.
  try {
    await db.collection(C.refunds).insertOne({
      _id: uuid(),
      order_id: payment.order_id,
      payment_id: payment._id,
      provider: 'razorpay',
      provider_refund_id: refund.id,
      amount: toRupees(Number(refund.amount) || 0),
      status: 'processed',
      initiated_at: new Date(),
      processed_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    })
  } catch (error) {
    if (error?.code === 11000) return 'noop:refund_exists'
    throw error
  }
  const order = await db.collection(C.orders).findOneAndUpdate(
    { _id: payment.order_id },
    { $set: { payment_status: 'refunded', updated_at: new Date() } },
  )
  await recordOrderHistory({ orderId: payment.order_id, oldStatus: order?.order_status, newStatus: order?.order_status || 'refunded', source: 'razorpay_webhook', reason: 'refund.processed' })
  return 'refunded'
}

/**
 * POST /webhooks/razorpay. `rawBody` is the exact bytes Razorpay signed.
 * Dedup key is the `x-razorpay-event-id` header (the old function read
 * `payload.id`, which Razorpay does not send).
 */
export async function processRazorpayWebhook(rawBody, headers) {
  const signature = headers['x-razorpay-signature']
  if (!signature) throw badRequest('Missing Razorpay signature header.')
  if (!verifyWebhookSignature(rawBody, signature)) {
    logger.warn('Razorpay webhook signature verification failed')
    throw badRequest('Invalid webhook signature.')
  }
  let payload
  try {
    payload = JSON.parse(rawBody.toString('utf8'))
  } catch {
    throw badRequest('Malformed webhook body.')
  }
  const eventType = String(payload.event || '')
  const eventId = String(headers['x-razorpay-event-id'] || payload.id || `body:${sha256(rawBody)}`)
  const db = getDb()
  const events = db.collection(C.paymentEvents)

  try {
    await events.insertOne({
      _id: uuid(),
      provider: 'razorpay',
      event_id: eventId,
      event_type: eventType,
      payment_id: payload.payload?.payment?.entity?.id || null,
      order_id: payload.payload?.payment?.entity?.order_id || payload.payload?.order?.entity?.id || null,
      payload,
      signature_verified: true,
      processed: false,
      created_at: new Date(),
    })
  } catch (error) {
    if (error?.code !== 11000) throw error
    const existing = await events.findOne({ provider: 'razorpay', event_id: eventId })
    if (existing?.processed) return { message: 'Webhook already processed (idempotent).', duplicate: true }
  }

  let outcome = 'ignored'
  if (eventType === 'payment.captured' || eventType === 'order.paid') outcome = await handleCaptured(payload, eventType, eventId)
  else if (eventType === 'payment.failed') outcome = await handleFailed(payload)
  else if (eventType === 'refund.processed') outcome = await handleRefund(payload)

  await events.updateOne({ provider: 'razorpay', event_id: eventId }, { $set: { processed: true, processed_at: new Date(), outcome } })
  return { message: 'Webhook processed successfully.', outcome }
}

// ── Admin payment review (ports of admin-approve/reject-payment) ──────

const APPROVABLE = ['payment_submitted', 'awaiting_payment', 'pending']

export async function adminApprovePayment(orderId, { actorId, razorpayPaymentId, note, req }) {
  const db = getDb()
  const order = await db.collection(C.orders).findOne({ _id: String(orderId), deleted_at: null })
  if (!order) throw notFound('Order not found.')
  if (!APPROVABLE.includes(order.payment_status)) throw conflict('This payment is already processed or not awaiting review.')
  if (order.order_status === 'cancelled') throw conflict('Cancelled orders cannot be marked paid.')

  const now = new Date()
  const { transitioned, order: paidOrder } = await markOrderPaid(order._id, {
    source: 'admin_payment_approval',
    reason: note || 'admin_confirmed_payment',
    changedBy: actorId,
    orderPatch: {
      payment_reviewed_at: now,
      payment_reviewed_by: actorId,
      rejection_reason: null,
      ...(razorpayPaymentId ? { razorpay_payment_id: razorpayPaymentId } : {}),
    },
    paymentPatch: razorpayPaymentId ? { provider_payment_id: razorpayPaymentId } : {},
  })
  if (!transitioned) throw conflict('This payment is no longer awaiting review.')

  await db.collection(C.paymentReviewLogs).insertOne({ _id: uuid(), order_id: order._id, action: 'approved', admin_note: note || 'Payment confirmed by admin.', reviewed_by: actorId, reviewed_at: now })
  await audit({ actorId, action: 'payment.approve', targetType: 'order', targetId: order._id, summary: { orderRef: order.order_ref, from: order.payment_status }, req })
  sendMetaPurchaseInBackground(paidOrder)
  return { paymentApproved: true, orderRef: order.order_ref, message: `Payment confirmed for ${order.order_ref}.` }
}

export async function adminRejectPayment(orderId, { actorId, reason, req }) {
  const text = String(reason || '').trim()
  if (!text) throw badRequest('orderId and rejection reason are required.')
  const db = getDb()
  const now = new Date()
  const order = await db.collection(C.orders).findOneAndUpdate(
    { _id: String(orderId), payment_status: 'payment_submitted', deleted_at: null },
    { $set: { payment_status: 'rejected', rejection_reason: text, payment_reviewed_at: now, payment_reviewed_by: actorId, updated_at: now } },
  )
  if (!order) throw new HttpError(409, 'This payment is no longer awaiting review.')
  await db.collection(C.paymentReviewLogs).insertOne({ _id: uuid(), order_id: order._id, action: 'rejected', admin_note: text, reviewed_by: actorId, reviewed_at: now })
  await recordOrderHistory({ orderId: order._id, oldStatus: order.order_status, newStatus: order.order_status, source: 'admin_payment_rejection', reason: text, changedBy: actorId })
  await audit({ actorId, action: 'payment.reject', targetType: 'order', targetId: order._id, summary: { orderRef: order.order_ref }, req })
  return { orderRef: order.order_ref }
}
