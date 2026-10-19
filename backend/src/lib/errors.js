/** An error whose message is safe to show to the browser. */
export class HttpError extends Error {
  constructor(status, message, { code, details } = {}) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = code || defaultCode(status)
    this.details = details
  }
}

function defaultCode(status) {
  return (
    {
      400: 'BAD_REQUEST',
      401: 'UNAUTHENTICATED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'VALIDATION_FAILED',
      429: 'RATE_LIMITED',
      502: 'UPSTREAM_FAILED',
      503: 'UNAVAILABLE',
    }[status] || 'ERROR'
  )
}

export const badRequest = (message, details) => new HttpError(400, message, { details })
export const unauthorized = (message = 'Please sign in to continue.') => new HttpError(401, message)
export const forbidden = (message = 'You do not have access to this resource.') => new HttpError(403, message)
export const notFound = (message = 'Not found.') => new HttpError(404, message)
export const conflict = (message) => new HttpError(409, message)
export const unavailable = (message) => new HttpError(503, message)

/** Provider/config errors that the admin UI should see verbatim (mirrors the old Edge Function behaviour). */
export class ProviderError extends HttpError {
  constructor(message, status = 400) {
    super(status, message, { code: 'PROVIDER_ERROR' })
    this.name = 'ProviderError'
  }
}
