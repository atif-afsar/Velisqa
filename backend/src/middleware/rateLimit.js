import { rateLimit } from 'express-rate-limit'
import { env } from '../config/env.js'

function limiter({ windowMs, limit, message, keyGenerator }) {
  return rateLimit({
    windowMs,
    limit: env.isTest ? 10_000 : limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    ...(keyGenerator ? { keyGenerator } : {}),
    handler: (req, res) =>
      res.status(429).json({ success: false, error: { code: 'RATE_LIMITED', message }, requestId: req.id }),
  })
}

export const apiLimiter = limiter({ windowMs: 60_000, limit: 300, message: 'Too many requests. Please slow down.' })

export const authLimiter = limiter({
  windowMs: 15 * 60_000,
  limit: 20,
  message: 'Too many sign-in attempts. Please wait a few minutes and try again.',
})

export const checkoutLimiter = limiter({ windowMs: 10 * 60_000, limit: 30, message: 'Too many checkout attempts. Please wait and try again.' })

export const reportLimiter = limiter({ windowMs: 60 * 60_000, limit: 20, message: 'Too many reports. Please try later.' })
