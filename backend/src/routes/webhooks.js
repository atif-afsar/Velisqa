import { Router } from 'express'
import { ok } from '../middleware/requestContext.js'
import { verifyNimbusSecret, processNimbusWebhook } from '../services/nimbusWebhookService.js'
import { processRazorpayWebhook } from '../services/paymentService.js'

/** Mounted with express.raw(): `req.body` is the exact Buffer the provider signed. */
export const webhooksRouter = Router()

const rawBody = (req) => (Buffer.isBuffer(req.body) ? req.body : Buffer.from(''))

webhooksRouter.post('/razorpay', async (req, res) => {
  ok(res, await processRazorpayWebhook(rawBody(req), req.headers))
})

webhooksRouter.post('/nimbuspost', async (req, res) => {
  verifyNimbusSecret(req)
  ok(res, await processNimbusWebhook(rawBody(req)))
})
