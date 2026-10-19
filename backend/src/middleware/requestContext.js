import { uuid } from '../lib/crypto.js'
import { logger } from '../lib/logger.js'

const REQUEST_ID = /^[A-Za-z0-9._-]{8,80}$/

/** Request ID (honours Nginx `X-Request-ID`) + one access-log line without query strings or bodies. */
export function requestContext(req, res, next) {
  const incoming = req.get('x-request-id')
  req.id = incoming && REQUEST_ID.test(incoming) ? incoming : uuid()
  res.setHeader('X-Request-ID', req.id)

  const started = process.hrtime.bigint()
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - started) / 1e6
    logger.info('http', {
      requestId: req.id,
      method: req.method,
      // Path only: query strings can carry private order tokens.
      path: req.path,
      status: res.statusCode,
      ms: Math.round(ms),
    })
  })
  next()
}

/** Successful JSON envelope used by every route. */
export function ok(res, data, status = 200) {
  return res.status(status).json({ success: true, data })
}
