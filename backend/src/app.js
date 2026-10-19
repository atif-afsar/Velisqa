import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { env } from './config/env.js'
import { pingDb, supportsTransactions } from './config/db.js'
import { loadSession } from './middleware/auth.js'
import { csrfProtection } from './middleware/csrf.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { apiLimiter } from './middleware/rateLimit.js'
import { ok, requestContext } from './middleware/requestContext.js'
import { rejectOperatorKeys } from './middleware/validate.js'
import { adminRouter } from './routes/admin.js'
import { authRouter } from './routes/auth.js'
import { catalogRouter } from './routes/catalog.js'
import { eventsRouter } from './routes/events.js'
import { ordersRouter } from './routes/orders.js'
import { paymentsRouter } from './routes/payments.js'
import { returnsRouter } from './routes/returns.js'
import { reviewsRouter } from './routes/reviews.js'
import { uploadsRouter } from './routes/uploads.js'
import { webhooksRouter } from './routes/webhooks.js'
import { MEDIA_DIR } from './services/mediaService.js'

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', env.TRUST_PROXY === 'false' ? false : env.TRUST_PROXY)

  app.use(requestContext)
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }))

  const health = async (_req, res) => ok(res, { status: 'ok', uptime: Math.round(process.uptime()) })
  const ready = async (_req, res) => {
    const dbOk = await pingDb()
    const txOk = dbOk ? await supportsTransactions().catch(() => false) : false
    const status = dbOk && txOk ? 200 : 503
    res.status(status).json({ success: status === 200, data: { database: dbOk, transactions: txOk } })
  }
  app.get('/health', health)
  app.get('/health/ready', ready)
  app.get('/api/v1/health', health)
  app.get('/api/v1/health/ready', ready)

  // Self-hosted images (content-addressed file names, so they can be cached forever).
  app.use('/api/v1/media', express.static(MEDIA_DIR, { immutable: true, maxAge: '365d', fallthrough: false, index: false, dotfiles: 'deny' }))

  // Provider webhooks need the untouched raw body for HMAC checks, so they are
  // mounted before CORS/JSON parsing and authenticate by signature, not cookies.
  app.use('/api/v1/webhooks', express.raw({ type: '*/*', limit: '1mb' }), webhooksRouter)

  app.use(
    '/api/v1',
    cors({
      origin(origin, callback) {
        if (!origin || env.allowedOrigins.includes(origin.replace(/\/$/, ''))) return callback(null, true)
        return callback(null, false)
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'X-Order-Access-Token', 'X-Request-ID', 'Idempotency-Key'],
      exposedHeaders: ['X-Request-ID'],
      maxAge: 600,
    }),
  )
  // Image uploads and AI drafts carry a base64 image; everything else stays small.
  app.use(['/api/v1/uploads/image', '/api/v1/admin/ai'], express.json({ limit: '12mb' }))
  app.use('/api/v1', express.json({ limit: '200kb' }), cookieParser(), rejectOperatorKeys, apiLimiter, loadSession)

  app.use('/api/v1/auth', authRouter)
  app.use('/api/v1', csrfProtection)
  app.use('/api/v1', catalogRouter)
  app.use('/api/v1', reviewsRouter)
  app.use('/api/v1', ordersRouter)
  app.use('/api/v1', returnsRouter)
  app.use('/api/v1', paymentsRouter)
  app.use('/api/v1', uploadsRouter)
  app.use('/api/v1', eventsRouter)
  app.use('/api/v1/admin', adminRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}
