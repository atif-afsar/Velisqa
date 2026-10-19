import crypto from 'node:crypto'
import { promisify } from 'node:util'
import bcrypt from 'bcryptjs'
import { env } from '../config/env.js'

const scrypt = promisify(crypto.scrypt)
const SCRYPT_KEYLEN = 64

export const uuid = () => crypto.randomUUID()
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url')
export const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex')
export const hmacHex = (secret, value) => crypto.createHmac('sha256', secret).update(value).digest('hex')

/** Constant-time comparison for secrets and signatures. */
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return crypto.timingSafeEqual(left, right)
}

/** Passwords: scrypt for new hashes; bcrypt ($2a/$2b) accepted for hashes imported from Supabase Auth. */
export async function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  const derived = await scrypt(password, salt, SCRYPT_KEYLEN)
  return `scrypt$${salt.toString('base64')}$${derived.toString('base64')}`
}

export async function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string') return false
  if (stored.startsWith('scrypt$')) {
    const [, saltB64, hashB64] = stored.split('$')
    const expected = Buffer.from(hashB64, 'base64')
    const derived = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length)
    return crypto.timingSafeEqual(derived, expected)
  }
  if (/^\$2[aby]\$/.test(stored)) return bcrypt.compare(password, stored)
  return false
}

export const needsRehash = (stored) => !String(stored || '').startsWith('scrypt$')

// ── Order access tokens ──────────────────────────────────────────────
// The raw token (a UUID, as in Supabase) appears in private links. We store a
// SHA-256 hash for lookups and an AES-256-GCM ciphertext so the owner/admin can
// still be shown the link; the plaintext itself never sits in the database.

const tokenKey = crypto.createHash('sha256').update(env.ORDER_TOKEN_SECRET).digest()

export const hashOrderToken = (token) => sha256(`order-token:${String(token).trim().toLowerCase()}`)

export function encryptOrderToken(token) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', tokenKey, iv)
  const encrypted = Buffer.concat([cipher.update(String(token), 'utf8'), cipher.final()])
  return `${iv.toString('base64')}.${cipher.getAuthTag().toString('base64')}.${encrypted.toString('base64')}`
}

export function decryptOrderToken(payload) {
  if (!payload) return null
  try {
    const [ivB64, tagB64, dataB64] = payload.split('.')
    const decipher = crypto.createDecipheriv('aes-256-gcm', tokenKey, Buffer.from(ivB64, 'base64'))
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
    return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8')
  } catch {
    return null
  }
}
