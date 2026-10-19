import { C, getDb } from '../config/db.js'
import { env } from '../config/env.js'
import {
  hashPassword,
  needsRehash,
  randomToken,
  sha256,
  uuid,
  verifyPassword,
} from '../lib/crypto.js'
import { conflict, forbidden, HttpError, unauthorized } from '../lib/errors.js'
import { logger } from '../lib/logger.js'
import { sendEmail } from '../providers/email.js'

const SESSION_TOUCH_MS = 5 * 60_000
const RESET_TTL_MS = 60 * 60_000

export const normalizeEmail = (email) => String(email || '').trim().toLowerCase()

export function serializeUser(user) {
  if (!user) return null
  return {
    id: user._id,
    email: user.email,
    // Same shape the React app read from Supabase Auth.
    user_metadata: { full_name: user.full_name || null, name: user.full_name || null },
    created_at: user.created_at,
  }
}

export function serializeProfile(profile) {
  if (!profile) return null
  return {
    id: profile._id,
    full_name: profile.full_name ?? null,
    email: profile.email ?? null,
    role: profile.role === 'admin' ? 'admin' : 'user',
    created_at: profile.created_at,
  }
}

async function createUserWithProfile({ email, fullName, passwordHash = null, googleSub = null, emailVerified = false }) {
  const db = getDb()
  const now = new Date()
  const id = uuid()
  const user = {
    _id: id,
    email,
    password_hash: passwordHash,
    google_sub: googleSub,
    email_verified: emailVerified,
    full_name: fullName || null,
    disabled: false,
    created_at: now,
    updated_at: now,
  }
  try {
    await db.collection(C.users).insertOne(user)
  } catch (error) {
    if (error?.code === 11000) throw conflict('An account with this email already exists. Sign in instead.')
    throw error
  }
  // Role is always "user" here; admins are promoted only by the CLI (scripts/create-admin.mjs).
  await db.collection(C.profiles).updateOne(
    { _id: id },
    { $setOnInsert: { _id: id, full_name: fullName || null, email, role: 'user', created_at: now } },
    { upsert: true },
  )
  return user
}

export async function registerWithPassword({ email, password, fullName }) {
  const normalized = normalizeEmail(email)
  const existing = await getDb().collection(C.users).findOne({ email: normalized })
  if (existing) throw conflict('An account with this email already exists. Sign in instead.')
  return createUserWithProfile({ email: normalized, fullName, passwordHash: await hashPassword(password) })
}

export async function authenticateWithPassword({ email, password }) {
  const db = getDb()
  const user = await db.collection(C.users).findOne({ email: normalizeEmail(email) })
  // Run a hash even when the user is missing so response time does not reveal which emails exist.
  const valid = user?.password_hash
    ? await verifyPassword(password, user.password_hash)
    : (await verifyPassword(password, 'scrypt$AAAAAAAAAAAAAAAAAAAAAA==$AAAA'), false)
  if (!user || !valid) throw unauthorized('Invalid login credentials.')
  if (user.disabled) throw forbidden('This account is disabled.')
  if (needsRehash(user.password_hash)) {
    // Imported Supabase bcrypt hash: upgrade transparently on successful login.
    await db.collection(C.users).updateOne({ _id: user._id }, { $set: { password_hash: await hashPassword(password), updated_at: new Date() } })
  }
  return user
}

// ── Sessions ──────────────────────────────────────────────────────────

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'lax',
    path: '/',
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
    maxAge: env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  }
}

export async function createSession(userId, { ip, userAgent } = {}) {
  const token = randomToken(32)
  const now = new Date()
  await getDb().collection(C.sessions).insertOne({
    _id: uuid(),
    token_hash: sha256(token),
    user_id: userId,
    created_at: now,
    last_seen_at: now,
    expires_at: new Date(now.getTime() + env.SESSION_TTL_DAYS * 86_400_000),
    ip: ip || null,
    user_agent: String(userAgent || '').slice(0, 200),
  })
  await getDb().collection(C.users).updateOne({ _id: userId }, { $set: { last_sign_in_at: now } })
  return token
}

export async function resolveSession(token) {
  if (!token || typeof token !== 'string' || token.length > 200) return null
  const db = getDb()
  const session = await db.collection(C.sessions).findOne({ token_hash: sha256(token) })
  if (!session || session.expires_at <= new Date()) return null
  const [user, profile] = await Promise.all([
    db.collection(C.users).findOne({ _id: session.user_id }),
    db.collection(C.profiles).findOne({ _id: session.user_id }),
  ])
  if (!user || user.disabled) return null
  if (Date.now() - new Date(session.last_seen_at).getTime() > SESSION_TOUCH_MS) {
    const now = new Date()
    await db.collection(C.sessions).updateOne(
      { _id: session._id },
      { $set: { last_seen_at: now, expires_at: new Date(now.getTime() + env.SESSION_TTL_DAYS * 86_400_000) } },
    )
  }
  return { session, user, profile }
}

export async function destroySession(token) {
  if (!token) return
  await getDb().collection(C.sessions).deleteOne({ token_hash: sha256(token) })
}

export const destroyAllSessions = (userId) => getDb().collection(C.sessions).deleteMany({ user_id: userId })

// ── Password reset (uniform responses; no account enumeration) ─────────

export async function requestPasswordReset(email) {
  const db = getDb()
  const user = await db.collection(C.users).findOne({ email: normalizeEmail(email) })
  if (!user || user.disabled) return
  const token = randomToken(32)
  await db.collection(C.passwordResets).insertOne({
    _id: uuid(),
    token_hash: sha256(token),
    user_id: user._id,
    created_at: new Date(),
    expires_at: new Date(Date.now() + RESET_TTL_MS),
  })
  const link = `${env.frontendOrigin}/reset-password?token=${encodeURIComponent(token)}`
  try {
    await sendEmail({
      to: user.email,
      subject: 'Reset your Velisqa password',
      text: `We received a request to reset your Velisqa password.\n\nSet a new password here (valid for 1 hour):\n${link}\n\nIf you did not ask for this, you can ignore this email.`,
    })
  } catch (error) {
    // The response stays uniform either way; operators see the failure in logs.
    logger.error('Password reset email failed', { error })
  }
}

export async function resetPassword(token, password) {
  const db = getDb()
  const reset = await db.collection(C.passwordResets).findOneAndDelete({ token_hash: sha256(token) })
  if (!reset || reset.expires_at <= new Date()) {
    throw new HttpError(400, 'This reset link is invalid or has expired. Request a new one.', { code: 'RESET_INVALID' })
  }
  await db.collection(C.users).updateOne(
    { _id: reset.user_id },
    { $set: { password_hash: await hashPassword(password), updated_at: new Date() } },
  )
  await destroyAllSessions(reset.user_id)
  await db.collection(C.passwordResets).deleteMany({ user_id: reset.user_id })
}

// ── Google OAuth account linking ──────────────────────────────────────

/** Finds or creates the account for a verified Google identity. Links by email only when Google verified it. */
export async function upsertGoogleUser({ sub, email, emailVerified, name }) {
  const db = getDb()
  const bySub = await db.collection(C.users).findOne({ google_sub: sub })
  if (bySub) {
    if (bySub.disabled) throw forbidden('This account is disabled.')
    return bySub
  }
  const normalized = normalizeEmail(email)
  if (!normalized || !emailVerified) {
    throw new HttpError(400, 'Your Google account email is not verified.', { code: 'GOOGLE_EMAIL_UNVERIFIED' })
  }
  const byEmail = await db.collection(C.users).findOne({ email: normalized })
  if (byEmail) {
    if (byEmail.disabled) throw forbidden('This account is disabled.')
    if (byEmail.google_sub && byEmail.google_sub !== sub) {
      throw conflict('This email is linked to a different Google account.')
    }
    await db.collection(C.users).updateOne(
      { _id: byEmail._id },
      { $set: { google_sub: sub, email_verified: true, full_name: byEmail.full_name || name || null, updated_at: new Date() } },
    )
    return { ...byEmail, google_sub: sub }
  }
  return createUserWithProfile({ email: normalized, fullName: name, googleSub: sub, emailVerified: true })
}
