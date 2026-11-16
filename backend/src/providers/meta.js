import crypto from 'node:crypto'
import { env } from '../config/env.js'

let fetchImpl = (...args) => fetch(...args)
export function setMetaFetch(fn) {
  fetchImpl = fn || ((...args) => fetch(...args))
}

export const isMetaConfigured = () => Boolean(env.META_PIXEL_ID && env.META_CONVERSIONS_API_TOKEN)

const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex')
const norm = (value) => String(value ?? '').trim().toLowerCase()
const hashed = (value) => (norm(value) ? [sha256(norm(value))] : undefined)
const hashedNoSpaces = (value) => (norm(value) ? [sha256(norm(value).replace(/[^\p{L}\p{N}]/gu, ''))] : undefined)

/** E.164 digits without "+": 10-digit Indian numbers get the 91 prefix. */
export function normalizePhone(phone) {
  const raw = String(phone || '').replace(/\D/g, '')
  if (!raw) return ''
  return raw.length === 10 ? `91${raw}` : raw
}

/**
 * CAPI user_data from what we know about the buyer. Every PII field is normalised then SHA-256
 * hashed; IP, user agent, fbp and fbc are sent as-is (as Meta requires).
 */
export function buildUserData({ email, phone, name, city, state, zip, country = 'in', externalId, ip, userAgent, fbp, fbc } = {}) {
  const [first, ...rest] = String(name || '').trim().split(/\s+/)
  const phoneDigits = normalizePhone(phone)
  const data = {
    em: hashed(email),
    ph: phoneDigits ? [sha256(phoneDigits)] : undefined,
    fn: hashed(first),
    ln: hashed(rest.join(' ')),
    ct: hashedNoSpaces(city),
    st: hashedNoSpaces(state),
    zp: hashed(zip),
    country: hashed(country),
    external_id: externalId ? [sha256(norm(externalId))] : undefined,
    client_ip_address: ip || undefined,
    client_user_agent: userAgent || undefined,
    fbp: fbp || undefined,
    fbc: fbc || undefined,
  }
  return Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined))
}

/** Sends one server event. `event_id` must equal the browser eventID for deduplication. */
export async function sendMetaEvent({ eventName, eventId, eventSourceUrl, userData, customData, testEventCode, eventTime }) {
  if (!isMetaConfigured()) return { skipped: true, reason: 'Meta CAPI is not configured.' }
  const event = {
    event_name: eventName,
    event_time: eventTime || Math.floor(Date.now() / 1000),
    action_source: 'website',
    event_id: eventId,
    user_data: userData || {},
    custom_data: customData || {},
    ...(eventSourceUrl ? { event_source_url: eventSourceUrl } : {}),
  }
  const testCode = testEventCode || env.META_TEST_EVENT_CODE || undefined
  const response = await fetchImpl(
    `https://graph.facebook.com/${env.META_GRAPH_API_VERSION}/${encodeURIComponent(env.META_PIXEL_ID)}/events?access_token=${encodeURIComponent(env.META_CONVERSIONS_API_TOKEN)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [event], ...(testCode ? { test_event_code: testCode } : {}) }),
      signal: AbortSignal.timeout(15_000),
    },
  )
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(body?.error?.message || `Meta ${eventName} event failed.`)
  return body
}

/** Purchase built from the stored order: `event_id` = order_ref, same as the browser pixel. */
export async function sendMetaPurchase({ orderRef, grandTotal, userData, contents, eventSourceUrl, testEventCode }) {
  if (!isMetaConfigured()) return { skipped: true, reason: 'Meta CAPI is not configured.' }
  const value = Number(grandTotal)
  if (!Number.isFinite(value) || value <= 0) return { skipped: true, reason: 'Order value must be greater than 0 for Meta CAPI Purchase.' }
  const customData = { value: Number(value.toFixed(2)), currency: 'INR', order_id: orderRef }
  if (contents?.length) {
    customData.content_type = 'product'
    customData.content_ids = contents.map((c) => c.id)
    customData.contents = contents
    customData.num_items = contents.reduce((n, c) => n + (Number(c.quantity) || 1), 0)
  }
  return sendMetaEvent({ eventName: 'Purchase', eventId: orderRef, eventSourceUrl, userData, customData, testEventCode })
}
