import { env } from '../config/env.js'
import { randomToken, safeEqual } from '../lib/crypto.js'
import { HttpError } from '../lib/errors.js'

export const CSRF_COOKIE = 'velisqa.csrf'
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export function csrfCookieOptions() {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'lax',
    path: '/',
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
    maxAge: 1000 * 60 * 60 * 24 * 30,
  }
}

/** Returns the caller's CSRF token, issuing one (HttpOnly cookie) on first use. */
export function issueCsrfToken(req, res) {
  let token = req.cookies?.[CSRF_COOKIE]
  if (!token || token.length < 32) {
    token = randomToken(32)
    res.cookie(CSRF_COOKIE, token, csrfCookieOptions())
  }
  return token
}

function originAllowed(req) {
  const origin = req.get('origin')
  if (!origin) {
    // Non-browser clients (curl, server-to-server) send no Origin; the token check still applies.
    return true
  }
  return env.allowedOrigins.includes(origin.replace(/\/$/, ''))
}

/**
 * Double-submit protection for every state-changing request: the browser must
 * echo the token from GET /auth/csrf in `X-CSRF-Token`, and the Origin (when
 * present) must be an allow-listed storefront origin. Webhooks are mounted
 * before this middleware and are authenticated by provider signatures instead.
 */
export function csrfProtection(req, _res, next) {
  if (SAFE_METHODS.has(req.method)) return next()
  if (!originAllowed(req)) return next(new HttpError(403, 'Request origin is not allowed.', { code: 'BAD_ORIGIN' }))
  const cookieToken = req.cookies?.[CSRF_COOKIE]
  const headerToken = req.get('x-csrf-token')
  if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) {
    return next(new HttpError(403, 'Your session security token expired. Please refresh and try again.', { code: 'CSRF_FAILED' }))
  }
  next()
}
