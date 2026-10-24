import { Router } from 'express'
import { z } from 'zod'
import { checkoutLimiter } from '../middleware/rateLimit.js'
import { ok } from '../middleware/requestContext.js'
import { parse } from '../middleware/validate.js'
import { saveCheckoutLead, unsubscribeEmail } from '../services/marketingService.js'

const leadSchema = z.object({
  email: z.string().trim().max(254).email(),
  consent: z.boolean(),
  items: z
    .array(z.object({ productId: z.string().trim().max(64), quantity: z.coerce.number().int().min(1).max(50).optional().default(1), isFreeGift: z.boolean().optional() }).passthrough())
    .min(1)
    .max(50),
})

export const marketingRouter = Router()

/** Called (debounced) once a shopper has typed an email at checkout. Stores nothing without consent. */
marketingRouter.post('/checkout/lead', checkoutLimiter, async (req, res) => {
  ok(res, await saveCheckoutLead(parse(leadSchema, req.body)))
})

const page = (title, message) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#fafaf8;font-family:Georgia,serif;color:#111}main{max-width:420px;padding:40px 28px;text-align:center;background:#fff;border:1px solid #eaeaea}h1{font-weight:normal;font-size:24px;margin:0 0 12px}p{font:15px/1.7 system-ui,sans-serif;color:#3f3f3f;margin:0}</style></head>
<body><main><h1>${title}</h1><p>${message}</p></main></body></html>`

/** One-click link in every marketing email (signed per address, no login needed). */
marketingRouter.get('/email/unsubscribe', async (req, res) => {
  const done = await unsubscribeEmail(req.query.e, req.query.t)
  res.set('Cache-Control', 'no-store').status(done ? 200 : 400).type('html')
  res.send(
    done
      ? page('You’re unsubscribed', 'We won’t send you any more offer emails. Order and account emails will still reach you.')
      : page('This link isn’t valid', 'The unsubscribe link looks incomplete. Please use the link from your latest email.'),
  )
})
