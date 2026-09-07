async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value.trim().toLowerCase())
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function sendMetaPurchase(order: {
  order_ref: string
  grand_total: number
  customer_email?: string | null
  customer_phone?: string | null
  content_ids?: string[] | null
  event_source_url?: string | null
  test_event_code?: string | null
}) {
  const pixelId = Deno.env.get('META_PIXEL_ID')
  const token = Deno.env.get('META_CONVERSIONS_API_TOKEN')
  const apiVersion = Deno.env.get('META_GRAPH_API_VERSION') || 'v23.0'
  if (!pixelId || !token) return { skipped: true, reason: 'Meta CAPI is not configured.' }

  const userData: Record<string, string[]> = {}
  if (order.customer_email) {
    userData.em = [await sha256(order.customer_email)]
  }
  if (order.customer_phone) {
    const raw = order.customer_phone.replace(/\D/g, '')
    // Normalize Indian 10-digit phone with country code 91
    const normalizedPhone = raw.length === 10 ? `91${raw}` : raw
    if (normalizedPhone) {
      userData.ph = [await sha256(normalizedPhone)]
    }
  }

  const customData: Record<string, unknown> = {
    value: Number(order.grand_total),
    currency: 'INR',
    order_id: order.order_ref,
  }
  if (order.content_ids && order.content_ids.length > 0) {
    customData.content_type = 'product'
    customData.content_ids = order.content_ids
  }

  const eventPayload: Record<string, unknown> = {
    event_name: 'Purchase',
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'website',
    event_id: order.order_ref,
    user_data: userData,
    custom_data: customData,
  }
  if (order.event_source_url) {
    eventPayload.event_source_url = order.event_source_url
  }

  const testCode = order.test_event_code || Deno.env.get('META_TEST_EVENT_CODE') || undefined

  const payload: Record<string, unknown> = {
    data: [eventPayload],
  }
  if (testCode) {
    payload.test_event_code = testCode
  }

  const response = await fetch(
    `https://graph.facebook.com/${apiVersion}/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(token)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  )

  const body = await response.json()
  if (!response.ok) throw new Error(body?.error?.message || 'Meta Purchase event failed.')
  return body
}
