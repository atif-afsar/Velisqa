import { C, getDb } from '../config/db.js'
import { conflict, notFound } from '../lib/errors.js'
import { logger } from '../lib/logger.js'
import { cancelNimbusPostShipment, isValidAwb } from '../providers/nimbuspost.js'
import { audit } from './auditService.js'
import { findAccessibleOrder, markOrderCancelled } from './orderService.js'

async function cancelCourier(awb, context) {
  try {
    await cancelNimbusPostShipment(awb)
    return { cancelledOnNimbusPost: true, nimbusCancelError: null }
  } catch (error) {
    logger.warn(`${context}: NimbusPost cancel failed`, { error })
    return { cancelledOnNimbusPost: false, nimbusCancelError: error?.message || String(error) }
  }
}

/** Port of customer-cancel-order (guest token or signed-in owner). */
export async function customerCancelOrder({ orderRef, accessToken, userId }) {
  const order = await findAccessibleOrder(orderRef, { token: accessToken, userId })
  if (order.order_status === 'cancelled') throw conflict('This order is already cancelled.')
  if (order.order_status === 'delivered' || order.shipping_status === 'delivered') throw conflict('Delivered orders cannot be cancelled online.')
  if (order.shipping_status === 'out_for_delivery') {
    throw conflict('Your parcel is out for delivery. Contact Velisqa on WhatsApp if you need help.')
  }

  const courier = order.nimbuspost_awb ? await cancelCourier(order.nimbuspost_awb, 'customer-cancel-order') : { cancelledOnNimbusPost: false, nimbusCancelError: null }
  await markOrderCancelled(order, { source: 'customer_cancel', changedBy: userId, hadAwb: Boolean(order.nimbuspost_awb) })

  let message = 'Your order was cancelled before dispatch.'
  if (order.nimbuspost_awb) {
    message = courier.cancelledOnNimbusPost
      ? 'Your order and shipment were cancelled.'
      : 'Your order was cancelled. We could not confirm courier cancellation automatically — our team will follow up if needed.'
  }
  return { message, ...courier }
}

/** Port of admin-cancel-order. */
export async function adminCancelOrder(orderId, { actorId, req }) {
  const order = await getDb().collection(C.orders).findOne({ _id: String(orderId), is_enquiry: { $ne: true }, deleted_at: null })
  if (!order) throw notFound('Order not found.')
  if (order.order_status === 'cancelled') throw conflict('This order is already cancelled.')
  if (order.order_status === 'delivered' || order.shipping_status === 'delivered') throw conflict('Delivered orders cannot be cancelled here.')

  const awb = isValidAwb(order.nimbuspost_awb) ? order.nimbuspost_awb : null
  const courier = awb ? await cancelCourier(awb, 'admin-cancel-order') : { cancelledOnNimbusPost: false, nimbusCancelError: null }
  await markOrderCancelled(order, { source: 'admin_cancel', changedBy: actorId, hadAwb: Boolean(awb) })
  await audit({ actorId, action: 'order.cancel', targetType: 'order', targetId: order._id, summary: { orderRef: order.order_ref, awb, ...courier }, req })

  return {
    orderRef: order.order_ref,
    awb,
    ...courier,
    walletNote:
      awb && courier.cancelledOnNimbusPost
        ? 'If pickup has not happened, NimbusPost usually credits shipping freight back to your wallet within 1–2 days.'
        : awb && courier.nimbusCancelError
          ? `Order cancelled in Velisqa, but NimbusPost could not confirm cancellation: ${courier.nimbusCancelError}`
          : null,
  }
}
