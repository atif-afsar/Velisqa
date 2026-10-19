import { Router } from 'express'
import { z } from 'zod'
import { C, getDb } from '../config/db.js'
import { badRequest, notFound } from '../lib/errors.js'
import { ok } from '../middleware/requestContext.js'
import { parse } from '../middleware/validate.js'
import { recordAndSendMetaPurchase } from '../services/metaService.js'

const schema = z
  .object({
    event_name: z.string().max(40),
    event_id: z.string().trim().min(1, 'event_id (order_ref) is required.').max(64),
    event_source_url: z.string().max(500).optional(),
    test_event_code: z.string().max(40).optional(),
  })
  .passthrough()

export const eventsRouter = Router()

/**
 * Browser-triggered Meta CAPI Purchase (port of meta-conversions). The value,
 * customer data and eligibility come from the stored order, never the request.
 */
eventsRouter.post('/events/meta-conversions', async (req, res) => {
  const body = parse(schema, req.body)
  if (body.event_name !== 'Purchase') return ok(res, { skipped: true, reason: `Event "${body.event_name}" not supported yet.` })

  const order = await getDb().collection(C.orders).findOne({ order_ref: body.event_id, deleted_at: null })
  if (!order) throw notFound('Order not found.')
  if (order.payment_method === 'online' && order.payment_status !== 'paid') throw badRequest('Payment for online order has not been verified.')
  if (order.order_status === 'cancelled') throw badRequest('Cancelled order cannot trigger Purchase event.')

  const eventSourceUrl = body.event_source_url && /^https:\/\/(www\.)?velisqa\.com(\/|$)/.test(body.event_source_url) ? body.event_source_url : undefined
  try {
    ok(res, { ok: true, ...(await recordAndSendMetaPurchase(order, { eventSourceUrl, testEventCode: body.test_event_code })) })
  } catch {
    ok(res, { ok: false, skipped: true, reason: 'Meta CAPI event failed; it will not block the order.' })
  }
})
