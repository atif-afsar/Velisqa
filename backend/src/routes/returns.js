import { Router } from 'express'
import { z } from 'zod'
import { requireUser } from '../middleware/auth.js'
import { ok } from '../middleware/requestContext.js'
import { parse } from '../middleware/validate.js'
import { canRequestReturn, returnsForOrders, submitReturn } from '../services/returnService.js'

const idList = z
  .string()
  .max(20_000)
  .transform((value) => value.split(',').map((id) => id.trim()).filter(Boolean))
  .pipe(z.array(z.string().max(64)).max(200))

const listSchema = z.object({ orderId: z.string().max(64).optional(), orderIds: idList.optional() })

const submitSchema = z.object({
  orderId: z.string().trim().min(1).max(64),
  reason: z.string().trim().min(3, 'Choose a return reason.').max(120),
  customerNotes: z.union([z.string().trim().max(1000), z.null()]).optional(),
})

export const returnsRouter = Router()
returnsRouter.use('/returns', requireUser)

returnsRouter.get('/returns/eligibility', async (req, res) => {
  const { orderId } = parse(z.object({ orderId: z.string().trim().min(1).max(64) }), req.query)
  ok(res, { eligible: await canRequestReturn(orderId, req.auth.user._id) })
})

/** `?orderId=` → { return } (latest for that order); `?orderIds=a,b` → { returns: { [orderId]: row } }. */
returnsRouter.get('/returns', async (req, res) => {
  const query = parse(listSchema, req.query)
  if (query.orderId) {
    const map = await returnsForOrders([query.orderId], req.auth.user._id)
    return ok(res, { return: map[query.orderId] || null })
  }
  ok(res, { returns: await returnsForOrders(query.orderIds || [], req.auth.user._id) })
})

returnsRouter.post('/returns', async (req, res) => {
  const body = parse(submitSchema, req.body)
  ok(res, { returnId: await submitReturn({ ...body, userId: req.auth.user._id }) }, 201)
})
