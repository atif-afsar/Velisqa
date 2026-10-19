import { ZodError } from 'zod'
import { HttpError } from '../lib/errors.js'
import { logger } from '../lib/logger.js'

export function notFoundHandler(req, res) {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found.' }, requestId: req.id })
}

// eslint-disable-next-line no-unused-vars -- Express needs the 4-arg signature
export function errorHandler(error, req, res, _next) {
  if (error instanceof ZodError) {
    const first = error.issues[0]
    return res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: first?.message && first.message !== 'Required' ? first.message : `Invalid ${first?.path?.join('.') || 'request'}.`,
        details: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
      },
      requestId: req.id,
    })
  }

  if (error?.type === 'entity.too.large') {
    return res.status(413).json({ success: false, error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request is too large.' }, requestId: req.id })
  }
  if (error?.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, error: { code: 'BAD_JSON', message: 'Malformed JSON body.' }, requestId: req.id })
  }

  if (error instanceof HttpError) {
    if (error.status >= 500) logger.error('Request failed', { requestId: req.id, path: req.path, error })
    return res.status(error.status).json({
      success: false,
      error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
      requestId: req.id,
    })
  }

  // Standard http-errors from Express middleware (e.g. static files: 403 traversal, 404 missing).
  const status = Number(error?.statusCode || error?.status)
  if (status >= 400 && status < 500) {
    return res.status(status).json({ success: false, error: { code: status === 404 ? 'NOT_FOUND' : 'BAD_REQUEST', message: status === 404 ? 'Not found.' : 'Request refused.' }, requestId: req.id })
  }

  logger.error('Unhandled error', { requestId: req.id, method: req.method, path: req.path, error, stack: error?.stack })
  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL', message: 'Something went wrong. Please try again.' },
    requestId: req.id,
  })
}
