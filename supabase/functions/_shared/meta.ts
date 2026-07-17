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
}) {
  const pixelId = Deno.env.get('META_PIXEL_ID')
  const token = Deno.env.get('META_CONVERSIONS_API_TOKEN')
  const apiVersion = Deno.env.get('META_GRAPH_API_VERSION') || 'v23.0'
  if (!pixelId || !token) return { skipped: true, reason: 'Meta CAPI is not configured.' }

  const userData: Record<string, string[]> = {}
  if (order.customer_email) userData.em = [await sha256(order.customer_email)]
  if (order.customer_phone) {
    const normalizedPhone = order.customer_phone.replace(/\D/g, '')
    userData.ph = [await sha256(normalizedPhone)]
  }

  const response = await fetch(
    `https://graph.facebook.com/${apiVersion}/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(token)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [{
          event_name: 'Purchase',
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'website',
          event_id: order.order_ref,
          user_data: userData,
          custom_data: {
            value: Number(order.grand_total),
            currency: 'INR',
            order_id: order.order_ref,
          },
        }],
        test_event_code: Deno.env.get('META_TEST_EVENT_CODE') || undefined,
      }),
    },
  )

  const body = await response.json()
  if (!response.ok) throw new Error(body?.error?.message || 'Meta Purchase event failed.')
  return body
}
