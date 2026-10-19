import crypto from 'node:crypto'
import { env } from '../config/env.js'

let fetchImpl = (...args) => fetch(...args)
export function setMetaFetch(fn) {
  fetchImpl = fn || ((...args) => fetch(...args))
}

export const isMetaConfigured = () => Boolean(env.META_PIXEL_ID && env.META_CONVERSIONS_API_TOKEN)

const sha256Lower = (value) => crypto.createHash('sha256').update(String(value).trim().toLowerCase()).digest('hex')

/** Port of sendMetaPurchase (supabase/functions/_shared/meta.ts). `event_id` = order_ref for pixel dedup. */
export async function sendMetaPurchase({ orderRef, grandTotal, email, phone, contentIds, eventSourceUrl, testEventCode }) {
  if (!isMetaConfigured()) return { skipped: true, reason: 'Meta CAPI is not configured.' }
  const value = Number(grandTotal)
  if (!Number.isFinite(value) || value <= 0) return { skipped: true, reason: 'Order value must be greater than 0 for Meta CAPI Purchase.' }

  const userData = {}
  if (email) userData.em = [sha256Lower(email)]
  if (phone) {
    const raw = String(phone).replace(/\D/g, '')
    const normalized = raw.length === 10 ? `91${raw}` : raw
    if (normalized) userData.ph = [sha256Lower(normalized)]
  }
  const customData = { value: Number(value.toFixed(2)), currency: 'INR', order_id: orderRef }
  if (contentIds?.length) {
    customData.content_type = 'product'
    customData.content_ids = contentIds
  }
  const event = {
    event_name: 'Purchase',
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'website',
    event_id: orderRef,
    user_data: userData,
    custom_data: customData,
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
  if (!response.ok) throw new Error(body?.error?.message || 'Meta Purchase event failed.')
  return body
}
