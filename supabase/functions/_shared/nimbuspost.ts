type OrderItem = {
  product_name: string
  quantity: number
  unit_price: number
}

type ShipmentOrder = {
  order_ref: string
  customer_name: string
  customer_phone: string
  customer_email?: string | null
  delivery_address: string
  delivery_city?: string | null
  delivery_pincode: string
  grand_total: number
  payment_method?: string | null
  order_items: OrderItem[]
  /** Used when retrying after a failed/partial shipment attempt. */
  nimbus_order_number?: string
}

const V1_LOGIN_URL = 'https://api.nimbuspost.com/v1/users/login'
const V1_SHIPMENT_URL = 'https://api.nimbuspost.com/v1/shipments'
const V1_CANCEL_URL = 'https://api.nimbuspost.com/v1/shipments/cancel'
const DEFAULT_V2_SHIPMENT_URL = 'https://api-v2.nimbuspost.com/v2/shipments'
const DEFAULT_V2_CANCEL_URL = 'https://api-v2.nimbuspost.com/v2/shipments/cancel'

function readApiCredentials() {
  const apiKey = Deno.env.get('NIMBUSPOST_API_KEY') || Deno.env.get('NIMBUSPOST_API_TOKEN')
  const apiSecret = Deno.env.get('NIMBUSPOST_API_SECRET')

  if (!apiKey || !apiSecret) {
    throw new Error(
      'NimbusPost is not configured. Set NIMBUSPOST_API_KEY and NIMBUSPOST_API_SECRET in Edge Function secrets.',
    )
  }

  return { apiKey, apiSecret }
}

function readLoginCredentials() {
  const email = String(Deno.env.get('NIMBUSPOST_EMAIL') || '').trim()
  const password = String(Deno.env.get('NIMBUSPOST_PASSWORD') || '').trim()
  if (!email || !password) return null
  return { email, password }
}

function validateShipmentOrder(order: ShipmentOrder) {
  if (!Array.isArray(order.order_items) || order.order_items.length === 0) {
    throw new Error('This order has no line items, so NimbusPost cannot create a shipment.')
  }

  try {
    normalizePhoneDigits(order.customer_phone)
  } catch {
    throw new Error(
      `This order has phone "${order.customer_phone}". NimbusPost needs a valid 10-digit mobile number. Place a new test order with a real phone like 9389030329.`,
    )
  }

  normalizePincode(order.delivery_pincode)
}
function normalizePhoneDigits(phone: string) {
  const digits = String(phone || '').replace(/\D/g, '')
  const normalized = digits.length === 12 && digits.startsWith('91') ? digits.slice(-10) : digits
  if (/^\d{10}$/.test(normalized)) return normalized
  throw new Error('Customer phone must include a valid 10-digit Indian mobile number.')
}

function normalizePincode(pincode: string) {
  const digits = String(pincode || '').replace(/\D/g, '')
  if (!/^\d{6}$/.test(digits)) {
    throw new Error('Delivery pincode must be a valid 6-digit Indian PIN code.')
  }
  return digits
}

function paymentMode(order: ShipmentOrder) {
  return order.payment_method === 'cod' ? 'cod' : 'prepaid'
}

function packageWeightGrams() {
  const configured = Number(Deno.env.get('NIMBUSPOST_PACKAGE_WEIGHT_GRAMS') || '500')
  return Number.isFinite(configured) && configured > 0 ? Math.round(configured) : 500
}

/** NimbusPost v2 `package.weight` is in kilograms, not grams. */
function packageWeightKg() {
  const grams = packageWeightGrams()
  const kg = Math.max(0.05, grams / 1000)
  return Math.round(kg * 1000) / 1000
}

function packageDimensions() {
  const length = Number(Deno.env.get('NIMBUSPOST_PACKAGE_LENGTH_CM') || '10')
  const width = Number(Deno.env.get('NIMBUSPOST_PACKAGE_WIDTH_CM') || '10')
  const height = Number(Deno.env.get('NIMBUSPOST_PACKAGE_HEIGHT_CM') || '5')
  return {
    length: Number.isFinite(length) && length > 0 ? Math.round(length) : 10,
    width: Number.isFinite(width) && width > 0 ? Math.round(width) : 10,
    height: Number.isFinite(height) && height > 0 ? Math.round(height) : 5,
  }
}

function shippingState(city?: string | null, pincode?: string | null) {
  const pin = String(pincode || '').replace(/\D/g, '')
  const normalizedCity = String(city || '').trim().toLowerCase()

  if (pin.startsWith('110') || normalizedCity.includes('delhi') || normalizedCity.includes('new delhi')) {
    return 'DL'
  }
  if (
    normalizedCity.includes('aligarh')
    || pin.startsWith('202')
    || pin.startsWith('201')
    || normalizedCity.includes('noida')
    || normalizedCity.includes('ghaziabad')
    || normalizedCity.includes('lucknow')
  ) {
    return 'UP'
  }
  if (normalizedCity.includes('mumbai') || pin.startsWith('400') || normalizedCity.includes('pune') || pin.startsWith('411')) {
    return 'MH'
  }
  if (normalizedCity.includes('bangalore') || normalizedCity.includes('bengaluru') || pin.startsWith('560')) {
    return 'KA'
  }
  if (normalizedCity.includes('kolkata') || pin.startsWith('700')) return 'WB'
  if (normalizedCity.includes('chennai') || pin.startsWith('600')) return 'TN'
  if (normalizedCity.includes('hyderabad') || pin.startsWith('500')) return 'TG'
  if (normalizedCity.includes('gurgaon') || normalizedCity.includes('gurugram') || pin.startsWith('122')) return 'HR'
  if (normalizedCity.includes('jaipur') || pin.startsWith('302')) return 'RJ'

  const configured = String(Deno.env.get('NIMBUSPOST_DEFAULT_STATE') || '').trim()
  if (configured) return configured

  throw new Error(
    `Could not determine shipping state for ${city || 'this city'} (${pincode || 'no pincode'}). Set NIMBUSPOST_DEFAULT_STATE in Supabase secrets.`,
  )
}

function normalizeWarehouseId(value: string) {
  if (/^\d+$/.test(value)) return Number(value)
  return value
}

function readPickupAddress() {
  const name = String(Deno.env.get('NIMBUSPOST_PICKUP_NAME') || 'VELISQA').trim()
  const address = String(Deno.env.get('NIMBUSPOST_PICKUP_ADDRESS') || '').trim()
  const city = String(Deno.env.get('NIMBUSPOST_PICKUP_CITY') || 'Aligarh').trim()
  const state = String(Deno.env.get('NIMBUSPOST_PICKUP_STATE') || Deno.env.get('NIMBUSPOST_DEFAULT_STATE') || 'UP').trim()
  const pincode = String(Deno.env.get('NIMBUSPOST_PICKUP_PINCODE') || '').trim()
  const phone = String(Deno.env.get('NIMBUSPOST_PICKUP_PHONE') || '').replace(/\D/g, '').slice(-10)

  if (!address || !/^\d{6}$/.test(pincode) || phone.length !== 10) {
    throw new Error(
      'Set NIMBUSPOST_PICKUP_ADDRESS, NIMBUSPOST_PICKUP_PINCODE, and NIMBUSPOST_PICKUP_PHONE in Edge Function secrets (must match your NimbusPost warehouse exactly).',
    )
  }

  return { name, address, city, state, pincode: Number(pincode), phone: Number(phone) }
}

function formatApiError(data: Record<string, unknown> | null, status: number, prefix = 'NimbusPost') {
  if (!data) return `${prefix} shipment creation failed (${status}).`

  const nested = data.data && typeof data.data === 'object'
    ? data.data as Record<string, unknown>
    : null

  const structuredError = data.error && typeof data.error === 'object'
    ? data.error as Record<string, unknown>
    : null

  const candidates = [
    structuredError?.detail,
    structuredError?.title,
    data.message,
    data.error,
    nested?.message,
    nested?.error,
    Array.isArray(data.errors) ? data.errors.map(String).join('; ') : null,
    Array.isArray(nested?.errors) ? nested.errors.map(String).join('; ') : null,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
  }

  const raw = JSON.stringify(data)
  if (raw && raw !== '{}') {
    return `${prefix} rejected the shipment (${status}): ${raw.slice(0, 280)}`
  }

  return `${prefix} shipment creation failed (${status}).`
}

function pickString(source: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!source) return null
  for (const key of keys) {
    const value = source[key]
    if (value != null && String(value).trim()) return String(value).trim()
  }
  return null
}

function deepFindAwb(value: unknown): string | null {
  if (value == null) return null

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (/^(NMBC|IN|AWB)?[A-Z0-9]{8,20}$/i.test(trimmed)) return trimmed
    return null
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = deepFindAwb(item)
      if (found) return found
    }
    return null
  }

  if (typeof value !== 'object') return null

  const obj = value as Record<string, unknown>
  for (const key of ['awb_number', 'awb', 'waybill', 'waybill_number', 'tracking_number', 'awbNumber']) {
    const candidate = obj[key]
    if (candidate != null && String(candidate).trim()) {
      const normalized = String(candidate).trim()
      if (normalized.length >= 8) return normalized
    }
  }

  for (const nested of Object.values(obj)) {
    const found = deepFindAwb(nested)
    if (found) return found
  }

  return null
}

function parseShipmentResponse(data: Record<string, unknown> | null) {
  const root = data?.data && typeof data.data === 'object'
    ? data.data as Record<string, unknown>
    : (data || {}) as Record<string, unknown>

  const shipment = root.shipment && typeof root.shipment === 'object'
    ? root.shipment as Record<string, unknown>
    : root

  const nestedResult = shipment.result && typeof shipment.result === 'object'
    ? shipment.result as Record<string, unknown>
    : null

  const awb = deepFindAwb(data)
    || pickString(shipment, ['awb_number', 'awb', 'waybill', 'waybill_number', 'tracking_number'])
    || pickString(nestedResult, ['awb_number', 'awb', 'waybill', 'waybill_number', 'tracking_number'])

  const trackingUrl = pickString(shipment, ['tracking_url', 'trackingUrl', 'label'])
    || pickString(nestedResult, ['tracking_url', 'trackingUrl', 'label'])
    || (awb ? `https://nimbuspost.com/tracking/?awb=${encodeURIComponent(awb)}` : null)

  return {
    orderId: pickString(shipment, ['order_id', 'orderId', 'id']) || pickString(nestedResult, ['order_id', 'orderId', 'id']) || pickString(root, ['order_id', 'orderId', 'id']),
    shipmentId: pickString(shipment, ['shipment_id', 'shipmentId']) || pickString(nestedResult, ['shipment_id', 'shipmentId']) || pickString(root, ['shipment_id', 'shipmentId']),
    awb,
    courierName: pickString(shipment, ['courier_name', 'courier']) || pickString(nestedResult, ['courier_name', 'courier']),
    trackingUrl,
    raw: data,
  }
}

async function nimbusApiHeaders() {
  const { apiKey, apiSecret } = readApiCredentials()
  return {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'x-api-secret': apiSecret,
  }
}

async function tryFetchAwbFromNimbus(orderNumber: string, orderId?: string | null, shipmentId?: string | null) {
  const headers = await nimbusApiHeaders()
  const urls = [
    orderId ? `https://api-v2.nimbuspost.com/v2/shipments/${orderId}` : null,
    shipmentId ? `https://api-v2.nimbuspost.com/v2/shipments/${shipmentId}` : null,
    orderId ? `https://api-v2.nimbuspost.com/v2/orders/${orderId}` : null,
    `https://api-v2.nimbuspost.com/v2/shipments?order_number=${encodeURIComponent(orderNumber)}`,
    `https://api-v2.nimbuspost.com/v2/orders?order_number=${encodeURIComponent(orderNumber)}`,
  ].filter(Boolean) as string[]

  for (const url of urls) {
    const response = await fetch(url, { method: 'GET', headers })
    const data = await response.json().catch(() => null) as Record<string, unknown> | null
    if (!data) continue
    const parsed = parseShipmentResponse(data)
    if (parsed.awb) return parsed
  }

  return null
}

async function tryBookShipmentOnNimbus(orderNumber: string, orderId?: string | null, shipmentId?: string | null) {
  const headers = await nimbusApiHeaders()
  const reference = shipmentId || orderId
  const endpoints = [
    reference ? `https://api-v2.nimbuspost.com/v2/shipments/${reference}/book` : null,
    reference ? `https://api-v2.nimbuspost.com/v2/shipments/${reference}/ship` : null,
    'https://api-v2.nimbuspost.com/v2/shipments/book',
    'https://api-v2.nimbuspost.com/v2/shipments/assign',
  ].filter(Boolean) as string[]

  const bodies = [
    { order_number: orderNumber, order_id: orderId, shipment_id: shipmentId, auto_assign_courier: true },
    { order_number: orderNumber, order_id: orderId, shipment_id: shipmentId },
    { awb_generate: true, order_number: orderNumber },
  ]

  for (const endpoint of endpoints) {
    for (const body of bodies) {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })
      const data = await response.json().catch(() => null) as Record<string, unknown> | null
      if (!data) continue
      if (response.ok && data.success !== false && data.status !== false) {
        const parsed = parseShipmentResponse(data)
        if (parsed.awb) return parsed
      }
    }
  }

  return null
}

async function resolveExistingNimbusShipment(order: ShipmentOrder) {
  const orderNumber = order.nimbus_order_number || order.order_ref
  const fetched = await tryFetchAwbFromNimbus(orderNumber)
  if (fetched?.awb) return fetched
  if (fetched?.orderId || fetched?.shipmentId) {
    return await finalizeV2Shipment(orderNumber, fetched)
  }
  return null
}

async function finalizeV2Shipment(orderNumber: string, initial: ReturnType<typeof parseShipmentResponse>) {
  if (initial.awb) return initial

  const booked = await tryBookShipmentOnNimbus(orderNumber, initial.orderId, initial.shipmentId)
  if (booked?.awb) {
    return { ...initial, ...booked, raw: booked.raw ?? initial.raw }
  }

  for (const delayMs of [0, 1500]) {
    if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs))
    const fetched = await tryFetchAwbFromNimbus(orderNumber, initial.orderId, initial.shipmentId)
    if (fetched?.awb) {
      return { ...initial, ...fetched, raw: fetched.raw ?? initial.raw }
    }
  }

  return initial
}

export function buildNimbusOrderNumber(orderRef: string, attempt = 0) {
  if (attempt <= 0) return orderRef
  return `${orderRef}-R${attempt}`
}

export function isIncompleteShipment(order: {
  nimbuspost_awb?: string | null
  shipping_status?: string | null
  order_status?: string | null
}) {
  return !order.nimbuspost_awb
    && (order.shipping_status === 'shipped' || order.order_status === 'shipped')
}

async function loginV1(email: string, password: string) {
  const response = await fetch(V1_LOGIN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  const data = await response.json().catch(() => null) as Record<string, unknown> | null
  const token = typeof data?.data === 'string' ? data.data : null

  if (!response.ok || !token || data?.status === false) {
    throw new Error(formatApiError(data, response.status, 'NimbusPost login'))
  }

  return token
}

function buildConsignee(order: ShipmentOrder) {
  return {
    name: order.customer_name,
    address: order.delivery_address,
    city: order.delivery_city || 'Aligarh',
    state: shippingState(order.delivery_city, order.delivery_pincode),
    pincode: Number(normalizePincode(order.delivery_pincode)),
    phone: Number(normalizePhoneDigits(order.customer_phone)),
  }
}

function buildOrderItems(order: ShipmentOrder) {
  return order.order_items.map((item) => ({
    name: item.product_name,
    qty: Number(item.quantity) || 1,
    price: Number(item.unit_price) || 0,
  }))
}

function buildV1Bodies(order: ShipmentOrder) {
  const mode = paymentMode(order)
  const weight = packageWeightGrams()
  const dimensions = packageDimensions()
  const pickup = readPickupAddress()
  const consignee = buildConsignee(order)
  const items = buildOrderItems(order)
  const amount = Number(order.grand_total)

  return [
    {
      order_number: order.nimbus_order_number || order.order_ref,
      payment_type: mode,
      order_amount: amount,
      package_weight: weight,
      package_length: dimensions.length,
      package_breadth: dimensions.width,
      package_height: dimensions.height,
      consignee,
      pickup,
      order_items: items,
    },
    {
      OrderNo: order.order_ref,
      PaymentType: mode,
      OrderAmount: amount,
      package_weight: weight,
      package_length: dimensions.length,
      package_breadth: dimensions.width,
      package_height: dimensions.height,
      consignee,
      pickup,
      order_items: items,
    },
  ]
}

async function createV1Shipment(order: ShipmentOrder) {
  const login = readLoginCredentials()
  if (!login) {
    throw new Error(
      'NimbusPost v1 login is not configured. Set NIMBUSPOST_EMAIL and NIMBUSPOST_PASSWORD in Edge Function secrets.',
    )
  }

  const token = await loginV1(login.email, login.password)
  const bodies = buildV1Bodies(order)
  let lastError = 'NimbusPost v1 shipment creation failed.'

  for (const body of bodies) {
    const response = await fetch(V1_SHIPMENT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })

    const data = await response.json().catch(() => null) as Record<string, unknown> | null
    if (response.ok && data?.status !== false) {
      return parseShipmentResponse(data)
    }

    lastError = formatApiError(data, response.status, 'NimbusPost v1')
  }

  throw new Error(lastError)
}

async function createV2Shipment(order: ShipmentOrder) {
  const endpoint = Deno.env.get('NIMBUSPOST_CREATE_SHIPMENT_URL') || DEFAULT_V2_SHIPMENT_URL
  const warehouseIdRaw = String(Deno.env.get('NIMBUSPOST_WAREHOUSE_ID') || '').trim()
  const { apiKey, apiSecret } = readApiCredentials()

  if (!warehouseIdRaw) {
    throw new Error(
      'NimbusPost warehouse is not configured. Set NIMBUSPOST_WAREHOUSE_ID to your Velisqa warehouse ID.',
    )
  }

  const mode = paymentMode(order)
  const dimensions = packageDimensions()
  const phone = normalizePhoneDigits(order.customer_phone)
  const orderNumber = order.nimbus_order_number || order.order_ref
  const deliveryState = shippingState(order.delivery_city, order.delivery_pincode)
  const body = {
    order_number: orderNumber,
    order_type: 'b2c',
    payment_mode: mode,
    order_collectable_amount: mode === 'cod' ? Number(order.grand_total) : 0,
    warehouse_id: normalizeWarehouseId(warehouseIdRaw),
    auto_assign_courier: true,
    shipping_address: {
      name: order.customer_name,
      email: order.customer_email || undefined,
      address: order.delivery_address,
      pincode: Number(normalizePincode(order.delivery_pincode)),
      city: order.delivery_city || 'Aligarh',
      state: deliveryState,
      country: 'India',
      phone,
    },
    items: buildOrderItems(order),
    package: {
      weight: packageWeightKg(),
      length: dimensions.length,
      width: dimensions.width,
      height: dimensions.height,
    },
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'x-api-secret': apiSecret,
    },
    body: JSON.stringify(body),
  })

  const data = await response.json().catch(() => null) as Record<string, unknown> | null
  if (!response.ok || data?.success === false || data?.status === false) {
    throw new Error(formatApiError(data, response.status, 'NimbusPost v2'))
  }

  const initial = parseShipmentResponse(data)
  return await finalizeV2Shipment(orderNumber, initial)
}

/**
 * Creates a NimbusPost shipment using Partner API v2 by default.
 * Set NIMBUSPOST_API_MODE=v1 to force email/password login flow.
 */
export async function createNimbusPostShipment(order: ShipmentOrder) {
  validateShipmentOrder(order)

  const mode = String(Deno.env.get('NIMBUSPOST_API_MODE') || 'v2').trim().toLowerCase()

  if (mode === 'v1') {
    return await createV1Shipment(order)
  }

  const existing = await resolveExistingNimbusShipment(order)
  if (existing?.awb) return existing

  try {
    const result = await createV2Shipment(order)
    if (result.awb || !readLoginCredentials()) return result

    console.warn('NimbusPost v2 succeeded without AWB, trying v1 fallback')
    try {
      const v1Order = {
        ...order,
        nimbus_order_number: buildNimbusOrderNumber(order.nimbus_order_number || order.order_ref, 1),
      }
      const v1Result = await createV1Shipment(v1Order)
      if (v1Result.awb) return v1Result
    } catch (v1Error) {
      console.error('NimbusPost v1 fallback after missing AWB failed:', v1Error)
    }

    return result
  } catch (v2Error) {
    if (!readLoginCredentials()) throw v2Error
    console.error('NimbusPost v2 failed, trying v1 fallback:', v2Error)
    return await createV1Shipment(order)
  }
}

function cancelResponseLooksSuccessful(data: Record<string, unknown> | null, status: number) {
  if (!responseOkish(status, data)) return false
  if (data?.success === false || data?.status === false) return false
  return true
}

function responseOkish(status: number, data: Record<string, unknown> | null) {
  if (status >= 200 && status < 300) return true
  if (data?.success === true || data?.status === true) return true
  return false
}

async function cancelV2Shipment(awb: string) {
  const endpoint = Deno.env.get('NIMBUSPOST_CANCEL_SHIPMENT_URL') || DEFAULT_V2_CANCEL_URL
  const { apiKey, apiSecret } = readApiCredentials()
  const bodies = [{ awb }, { awb_number: awb }, { awbNumber: awb }]
  let lastError = 'NimbusPost v2 shipment cancellation failed.'

  for (const body of bodies) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'x-api-secret': apiSecret,
      },
      body: JSON.stringify(body),
    })

    const data = await response.json().catch(() => null) as Record<string, unknown> | null
    if (cancelResponseLooksSuccessful(data, response.status)) {
      return { awb, raw: data }
    }

    lastError = formatApiError(data, response.status, 'NimbusPost v2 cancel')
  }

  throw new Error(lastError)
}

async function cancelV1Shipment(awb: string) {
  const login = readLoginCredentials()
  if (!login) {
    throw new Error(
      'NimbusPost v1 cancel is not configured. Set NIMBUSPOST_EMAIL and NIMBUSPOST_PASSWORD in Edge Function secrets.',
    )
  }

  const token = await loginV1(login.email, login.password)
  const attempts: Array<{ headers: Record<string, string>; body: Record<string, unknown> }> = [
    {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: { awb },
    },
    {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: { awb_number: awb },
    },
    {
      headers: { 'Content-Type': 'application/json' },
      body: { email: login.email, password: login.password, awb },
    },
  ]

  let lastError = 'NimbusPost v1 shipment cancellation failed.'

  for (const attempt of attempts) {
    const response = await fetch(V1_CANCEL_URL, {
      method: 'POST',
      headers: attempt.headers,
      body: JSON.stringify(attempt.body),
    })

    const data = await response.json().catch(() => null) as Record<string, unknown> | null
    if (cancelResponseLooksSuccessful(data, response.status)) {
      return { awb, raw: data }
    }

    lastError = formatApiError(data, response.status, 'NimbusPost v1 cancel')
  }

  throw new Error(lastError)
}

/**
 * Cancels a NimbusPost shipment by AWB. Uses v2 Partner API by default.
 */
export async function cancelNimbusPostShipment(awb: string) {
  const normalizedAwb = String(awb || '').trim()
  if (!normalizedAwb) throw new Error('AWB is required to cancel a NimbusPost shipment.')

  const mode = String(Deno.env.get('NIMBUSPOST_API_MODE') || 'v2').trim().toLowerCase()

  if (mode === 'v1') {
    return await cancelV1Shipment(normalizedAwb)
  }

  try {
    return await cancelV2Shipment(normalizedAwb)
  } catch (v2Error) {
    const v2Message = v2Error instanceof Error ? v2Error.message : String(v2Error)
    try {
      return await cancelV1Shipment(normalizedAwb)
    } catch (v1Error) {
      const v1Message = v1Error instanceof Error ? v1Error.message : String(v1Error)
      throw new Error(`${v2Message} | Fallback v1: ${v1Message}`)
    }
  }
}

type TrackingScan = {
  status: string
  location: string | null
  remark: string | null
  timestamp: string | null
}

function normalizeTrackingScan(raw: Record<string, unknown>): TrackingScan | null {
  const status = pickString(raw, ['status', 'shipment_status', 'tracking_status', 'clickpost_status_description'])
    || (raw.message != null ? String(raw.message) : null)
  if (!status) return null

  return {
    status,
    location: pickString(raw, ['location', 'city', 'hub', 'current_location']),
    remark: pickString(raw, ['remark', 'message', 'description', 'comments']),
    timestamp: pickString(raw, ['timestamp', 'date', 'created_at', 'updated_at', 'scan_time']),
  }
}

function parseTrackingResponse(data: Record<string, unknown> | null) {
  const root = data?.data && typeof data.data === 'object'
    ? data.data as Record<string, unknown>
    : (data || {}) as Record<string, unknown>

  const nested = root.tracking && typeof root.tracking === 'object'
    ? root.tracking as Record<string, unknown>
    : root

  const scanSources = [
    nested.scans,
    nested.scan_history,
    nested.history,
    nested.tracking_history,
    root.scans,
    root.history,
  ]

  const scans: TrackingScan[] = []
  for (const source of scanSources) {
    if (!Array.isArray(source)) continue
    for (const item of source) {
      if (!item || typeof item !== 'object') continue
      const scan = normalizeTrackingScan(item as Record<string, unknown>)
      if (scan) scans.push(scan)
    }
  }

  const latestRaw = nested.latest_status && typeof nested.latest_status === 'object'
    ? nested.latest_status as Record<string, unknown>
    : nested.current_status && typeof nested.current_status === 'object'
      ? nested.current_status as Record<string, unknown>
      : null

  const latest = latestRaw
    ? normalizeTrackingScan(latestRaw)
    : scans[0] || null

  const deduped = scans.filter((scan, index, list) => {
    const key = `${scan.status}|${scan.location}|${scan.timestamp}`
    return list.findIndex((item) => `${item.status}|${item.location}|${item.timestamp}` === key) === index
  })

  return {
    latest,
    scans: deduped,
    raw: data,
  }
}

async function fetchV1Tracking(awb: string) {
  const login = readLoginCredentials()
  if (!login) return null

  const token = await loginV1(login.email, login.password)
  const urls = [
    `https://api.nimbuspost.com/v1/shipments/track/${encodeURIComponent(awb)}`,
    `https://api.nimbuspost.com/v1/shipments/tracking/${encodeURIComponent(awb)}`,
  ]

  for (const url of urls) {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await response.json().catch(() => null) as Record<string, unknown> | null
    if (!response.ok || !data) continue
    const parsed = parseTrackingResponse(data)
    if (parsed.latest || parsed.scans.length) return parsed
  }

  return null
}

export async function fetchNimbusPostTracking(awb: string) {
  const normalizedAwb = String(awb || '').trim()
  if (!normalizedAwb) {
    return { latest: null, scans: [], message: 'AWB is required for tracking.' }
  }

  const headers = await nimbusApiHeaders()
  const urls = [
    `https://api-v2.nimbuspost.com/v2/shipments/track?awb=${encodeURIComponent(normalizedAwb)}`,
    `https://api-v2.nimbuspost.com/v2/shipments/tracking?awb=${encodeURIComponent(normalizedAwb)}`,
    `https://api-v2.nimbuspost.com/v2/tracking/${encodeURIComponent(normalizedAwb)}`,
    `https://api-v2.nimbuspost.com/v2/shipments/${encodeURIComponent(normalizedAwb)}/track`,
  ]

  for (const url of urls) {
    const response = await fetch(url, { method: 'GET', headers })
    const data = await response.json().catch(() => null) as Record<string, unknown> | null
    if (!response.ok || !data) continue
    const parsed = parseTrackingResponse(data)
    if (parsed.latest || parsed.scans.length) return parsed
  }

  const v1 = await fetchV1Tracking(normalizedAwb)
  if (v1) return v1

  return {
    latest: null,
    scans: [],
    message: 'Live scan details are not available yet. Use the NimbusPost tracking link for updates.',
  }
}
