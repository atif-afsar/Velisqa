import { Router } from 'express'
import { z } from 'zod'
import { C, getDb } from '../config/db.js'
import { badRequest, notFound } from '../lib/errors.js'
import { ok } from '../middleware/requestContext.js'
import { parse } from '../middleware/validate.js'
import { recordAndSendMetaPurchase } from '../services/metaService.js'
import { buildUserData, sendMetaEvent } from '../providers/meta.js'

const schema = z
  .object({
    event_name: z.string().max(40),
    event_id: z.string().trim().min(1, 'event_id (order_ref) is required.').max(64),
    event_source_url: z.string().max(500).optional(),
    test_event_code: z.string().max(40).optional(),
    fbp: z.string().max(200).optional(),
    fbc: z.string().max(500).optional(),
    custom_data: z
      .object({
        currency: z.literal('INR').optional(),
        value: z.coerce.number().min(0).max(10_000_000).optional(),
        content_type: z.literal('product').optional(),
        content_ids: z.array(z.string().max(64)).max(50).optional(),
        contents: z.array(z.object({ id: z.string().max(64), quantity: z.coerce.number().int().min(1).max(50), item_price: z.coerce.number().min(0).max(1_000_000) })).max(50).optional(),
        num_items: z.coerce.number().int().min(0).max(500).optional(),
      })
      .optional(),
  })
  .passthrough()

const BROWSER_EVENTS = new Set(['AddToCart', 'InitiateCheckout'])

export const eventsRouter = Router()

/**
 * Browser-triggered Meta CAPI Purchase (port of meta-conversions). The value,
 * customer data and eligibility come from the stored order, never the request.
 */
eventsRouter.post('/events/meta-conversions', async (req, res) => {
  const body = parse(schema, req.body)
  const eventSourceUrl0 = body.event_source_url && /^https:\/\/(www\.)?velisqa\.com(\/|$)/.test(body.event_source_url) ? body.event_source_url : undefined

  // Funnel events: server copy of the browser event (same event_id). Sent only with ad consent (client-side gate).
  if (BROWSER_EVENTS.has(body.event_name)) {
    try {
      await sendMetaEvent({
        eventName: body.event_name,
        eventId: body.event_id,
        eventSourceUrl: eventSourceUrl0,
        userData: buildUserData({
          ip: req.ip,
          userAgent: String(req.get('user-agent') || '').slice(0, 500),
          fbp: body.fbp,
          fbc: body.fbc,
          externalId: req.auth?.user?._id,
          email: req.auth?.user?.email,
        }),
        customData: body.custom_data || {},
        testEventCode: body.test_event_code,
      })
      return ok(res, { ok: true })
    } catch {
      return ok(res, { ok: false, skipped: true })
    }
  }
  if (body.event_name !== 'Purchase') return ok(res, { skipped: true, reason: `Event "${body.event_name}" not supported yet.` })

  const order = await getDb().collection(C.orders).findOne({ order_ref: body.event_id, deleted_at: null })
  if (!order) throw notFound('Order not found.')
  if (order.payment_method === 'online' && order.payment_status !== 'paid') throw badRequest('Payment for online order has not been verified.')
  if (order.order_status === 'cancelled') throw badRequest('Cancelled order cannot trigger Purchase event.')

  const eventSourceUrl = body.event_source_url && /^https:\/\/(www\.)?velisqa\.com(\/|$)/.test(body.event_source_url) ? body.event_source_url : undefined
  try {
    const merged = { ...order, tracking: { ...(order.tracking || {}), ...(body.fbp && !order.tracking?.fbp ? { fbp: body.fbp } : {}), ...(body.fbc && !order.tracking?.fbc ? { fbc: body.fbc } : {}) } }
    ok(res, { ok: true, ...(await recordAndSendMetaPurchase(merged, { eventSourceUrl, testEventCode: body.test_event_code })) })
  } catch {
    ok(res, { ok: false, skipped: true, reason: 'Meta CAPI event failed; it will not block the order.' })
  }
})
