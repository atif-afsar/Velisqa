import { Router } from 'express'
import { z } from 'zod'
import { checkoutLimiter } from '../middleware/rateLimit.js'
import { ok } from '../middleware/requestContext.js'
import { parse } from '../middleware/validate.js'
import { createRazorpayOrderFor, verifyRazorpayPayment } from '../services/paymentService.js'

const createSchema = z.object({
  orderRef: z.string().trim().min(1).max(64),
  accessToken: z.union([z.string().trim().max(100), z.null()]).optional(),
})

const verifySchema = z.object({
  orderRef: z.string().trim().max(64).optional(),
  razorpay_order_id: z.string().trim().min(1).max(64),
  razorpay_payment_id: z.string().trim().min(1).max(64),
  razorpay_signature: z.string().trim().min(1).max(256),
})

export const paymentsRouter = Router()

paymentsRouter.post('/payments/razorpay/orders', checkoutLimiter, async (req, res) => {
  const body = parse(createSchema, req.body)
  ok(res, await createRazorpayOrderFor({ orderRef: body.orderRef, accessToken: body.accessToken || req.get('x-order-access-token'), userId: req.auth?.user?._id }))
})

/** Ownership is proven by the HMAC signature, which only Razorpay + this server can produce. */
paymentsRouter.post('/payments/razorpay/verify', async (req, res) => {
  ok(res, await verifyRazorpayPayment(parse(verifySchema, req.body)))
})
