import { Router } from 'express'
import { z } from 'zod'
import { env } from '../config/env.js'
import { hmacHex, randomToken, safeEqual } from '../lib/crypto.js'
import { forbidden } from '../lib/errors.js'
import { logger } from '../lib/logger.js'
import { safeRelativePath } from '../lib/safeRedirect.js'
import { authLimiter } from '../middleware/rateLimit.js'
import { csrfProtection, issueCsrfToken } from '../middleware/csrf.js'
import { ok } from '../middleware/requestContext.js'
import { parse } from '../middleware/validate.js'
import { buildGoogleAuthUrl, createPkcePair, exchangeGoogleCode, isGoogleConfigured } from '../providers/google.js'
import {
  authenticateWithPassword,
  createSession,
  destroySession,
  registerWithPassword,
  requestPasswordReset,
  resetPassword,
  serializeProfile,
  serializeUser,
  sessionCookieOptions,
  upsertGoogleUser,
} from '../services/authService.js'
import { getDb, C } from '../config/db.js'
import { audit } from '../services/auditService.js'

const OAUTH_COOKIE = 'velisqa.oauth'

const email = z.string().trim().toLowerCase().email('Enter a valid email address.').max(254)
const password = z.string().min(6, 'Password should be at least 6 characters.').max(200)

const registerSchema = z.object({ email, password, fullName: z.string().trim().max(120).optional().default('') })
const loginSchema = z.object({ email, password: z.string().min(1).max(200), adminOnly: z.boolean().optional() })
const forgotSchema = z.object({ email })
const resetSchema = z.object({ token: z.string().min(20).max(200), password })

function signOauthState(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${body}.${hmacHex(env.SESSION_SECRET, body)}`
}

function readOauthState(raw) {
  if (!raw || typeof raw !== 'string') return null
  const [body, signature] = raw.split('.')
  if (!body || !signature || !safeEqual(hmacHex(env.SESSION_SECRET, body), signature)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    return payload.exp > Date.now() ? payload : null
  } catch {
    return null
  }
}

async function startSession(req, res, userId) {
  const token = await createSession(userId, { ip: req.ip, userAgent: req.get('user-agent') })
  res.cookie(env.COOKIE_NAME, token, sessionCookieOptions())
}

async function mePayload(userId) {
  const db = getDb()
  const [user, profile] = await Promise.all([
    db.collection(C.users).findOne({ _id: userId }),
    db.collection(C.profiles).findOne({ _id: userId }),
  ])
  return { user: serializeUser(user), profile: serializeProfile(profile) }
}

export const authRouter = Router()

authRouter.get('/csrf', (req, res) => ok(res, { csrfToken: issueCsrfToken(req, res) }))

authRouter.get('/me', (req, res) =>
  ok(res, req.auth ? { user: serializeUser(req.auth.user), profile: serializeProfile(req.auth.profile) } : { user: null, profile: null }),
)

// ── Google OAuth (GET navigations; protected by signed state + PKCE) ──

authRouter.get('/google', authLimiter, (req, res) => {
  const next = safeRelativePath(req.query.next, '/')
  if (!isGoogleConfigured()) {
    const params = new URLSearchParams({ error_description: 'Google sign-in is not available right now. Please sign in with email.' })
    return res.redirect(302, `${env.frontendOrigin}/auth/callback?${params}`)
  }
  const state = randomToken(24)
  const { verifier, challenge } = createPkcePair()
  res.cookie(OAUTH_COOKIE, signOauthState({ state, verifier, next, exp: Date.now() + 10 * 60_000 }), {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'lax',
    path: '/api/v1/auth/google',
    maxAge: 10 * 60_000,
  })
  res.redirect(302, buildGoogleAuthUrl({ state, codeChallenge: challenge }))
})

authRouter.get('/google/callback', authLimiter, async (req, res) => {
  const stored = readOauthState(req.cookies?.[OAUTH_COOKIE])
  res.clearCookie(OAUTH_COOKIE, { path: '/api/v1/auth/google' })
  const fail = (message) =>
    res.redirect(302, `${env.frontendOrigin}/auth/callback?${new URLSearchParams({ error_description: message })}`)

  if (req.query.error) return fail('Google sign-in was cancelled.')
  if (!stored || typeof req.query.state !== 'string' || !safeEqual(stored.state, req.query.state)) {
    return fail('Sign-in could not be verified. Please try again.')
  }
  if (typeof req.query.code !== 'string') return fail('Sign-in could not be completed. Please try again.')

  try {
    const identity = await exchangeGoogleCode({ code: req.query.code, codeVerifier: stored.verifier })
    const user = await upsertGoogleUser(identity)
    await startSession(req, res, user._id)
    const params = new URLSearchParams({ next: safeRelativePath(stored.next, '/') })
    return res.redirect(302, `${env.frontendOrigin}/auth/callback?${params}`)
  } catch (error) {
    logger.warn('Google OAuth callback failed', { error })
    return fail(error?.status && error.status < 500 ? error.message : 'Google sign-in could not be completed. Please try again.')
  }
})

// ── State-changing auth calls (CSRF protected) ──

authRouter.use(csrfProtection)

authRouter.post('/register', authLimiter, async (req, res) => {
  const body = parse(registerSchema, req.body)
  const user = await registerWithPassword(body)
  ok(res, { user: serializeUser(user) }, 201)
})

authRouter.post('/login', authLimiter, async (req, res) => {
  const body = parse(loginSchema, req.body)
  const user = await authenticateWithPassword(body)
  const payload = await mePayload(user._id)
  if (body.adminOnly && payload.profile?.role !== 'admin') {
    throw forbidden('Access denied. This entrance is reserved for administrators.')
  }
  await startSession(req, res, user._id)
  if (payload.profile?.role === 'admin') await audit({ actorId: user._id, action: 'admin.login', targetType: 'user', targetId: user._id, req })
  ok(res, payload)
})

authRouter.post('/logout', async (req, res) => {
  await destroySession(req.cookies?.[env.COOKIE_NAME])
  res.clearCookie(env.COOKIE_NAME, { ...sessionCookieOptions(), maxAge: undefined })
  ok(res, { signedOut: true })
})

authRouter.post('/forgot-password', authLimiter, async (req, res) => {
  const { email: address } = parse(forgotSchema, req.body)
  await requestPasswordReset(address)
  ok(res, { message: 'If an account exists for that email, a reset link is on its way.' })
})

authRouter.post('/reset-password', authLimiter, async (req, res) => {
  const body = parse(resetSchema, req.body)
  await resetPassword(body.token, body.password)
  ok(res, { message: 'Password updated. You can sign in now.' })
})
