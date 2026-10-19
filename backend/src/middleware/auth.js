import { env } from '../config/env.js'
import { forbidden, unauthorized } from '../lib/errors.js'
import { resolveSession } from '../services/authService.js'

/** Attaches `req.auth = { user, profile, session } | null` from the HttpOnly session cookie. */
export async function loadSession(req, _res, next) {
  req.auth = null
  const token = req.cookies?.[env.COOKIE_NAME]
  if (token) req.auth = await resolveSession(token)
  next()
}

export function requireUser(req, _res, next) {
  if (!req.auth?.user) return next(unauthorized())
  next()
}

/** Authorization is decided from the server-side profile role, never from anything the browser sends. */
export function requireAdmin(req, _res, next) {
  if (!req.auth?.user) return next(unauthorized('Authentication required.'))
  if (req.auth.profile?.role !== 'admin') return next(forbidden('Admin access required.'))
  next()
}
