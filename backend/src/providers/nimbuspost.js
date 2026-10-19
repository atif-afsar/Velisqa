/**
 * NimbusPost client — port of supabase/functions/_shared/nimbuspost.ts.
 * Behaviour (v2 Partner API first, v1 login fallback, AWB discovery/validation,
 * state mapping, tracking parsing) is preserved; only the runtime changed.
 */
import { env } from '../config/env.js'
import { ProviderError } from '../lib/errors.js'
import { logger } from '../lib/logger.js'

const V1_LOGIN_URL = 'https://api.nimbuspost.com/v1/users/login'
const V1_SHIPMENT_URL = 'https://api.nimbuspost.com/v1/shipments'
const V1_CANCEL_URL = 'https://api.nimbuspost.com/v1/shipments/cancel'
const DEFAULT_V2_SHIPMENT_URL = 'https://api-v2.nimbuspost.com/v2/shipments'
const DEFAULT_V2_CANCEL_URL = 'https://api-v2.nimbuspost.com/v2/shipments/cancel'
const REQUEST_TIMEOUT_MS = 20_000

// Overridable in tests so no real HTTP call is ever made.
let fetchImpl = (...args) => fetch(...args)
export function setNimbusFetch(fn) {
  fetchImpl = fn || ((...args) => fetch(...args))
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function http(url, options = {}) {
  return fetchImpl(url, { ...options, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
}

export function isNimbusConfigured() {
  return Boolean((env.NIMBUSPOST_API_KEY || env.NIMBUSPOST_API_TOKEN) && env.NIMBUSPOST_API_SECRET) || Boolean(readLoginCredentials())
}

function readApiCredentials() {
  const apiKey = env.NIMBUSPOST_API_KEY || env.NIMBUSPOST_API_TOKEN
  const apiSecret = env.NIMBUSPOST_API_SECRET
  if (!apiKey || !apiSecret) {
    throw new ProviderError('NimbusPost is not configured. Set NIMBUSPOST_API_KEY and NIMBUSPOST_API_SECRET in the API server .env.')
  }
  return { apiKey, apiSecret }
}

function readLoginCredentials() {
  const email = String(env.NIMBUSPOST_EMAIL || '').trim()
  const password = String(env.NIMBUSPOST_PASSWORD || '').trim()
  if (!email || !password) return null
  return { email, password }
}

export function normalizePhoneDigits(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  const normalized = digits.length === 12 && digits.startsWith('91') ? digits.slice(-10) : digits
  if (/^\d{10}$/.test(normalized)) return normalized
  throw new ProviderError('Customer phone must include a valid 10-digit Indian mobile number.')
}

function normalizePincode(pincode) {
  const digits = String(pincode || '').replace(/\D/g, '')
  if (!/^\d{6}$/.test(digits)) throw new ProviderError('Delivery pincode must be a valid 6-digit Indian PIN code.')
  return digits
}

function validateShipmentOrder(order) {
  if (!Array.isArray(order.order_items) || order.order_items.length === 0) {
    throw new ProviderError('This order has no line items, so NimbusPost cannot create a shipment.')
  }
  try {
    normalizePhoneDigits(order.customer_phone)
  } catch {
    throw new ProviderError(
      `This order has phone "${order.customer_phone}". NimbusPost needs a valid 10-digit mobile number.`,
    )
  }
  normalizePincode(order.delivery_pincode)
}

const paymentMode = (order) => (order.payment_method === 'cod' ? 'cod' : 'prepaid')

function packageWeightGrams() {
  const configured = Number(env.NIMBUSPOST_PACKAGE_WEIGHT_GRAMS || '500')
  return Number.isFinite(configured) && configured > 0 ? Math.round(configured) : 500
}

/** NimbusPost v2 `package.weight` is in kilograms, not grams. */
function packageWeightKg() {
  const kg = Math.max(0.05, packageWeightGrams() / 1000)
  return Math.round(kg * 1000) / 1000
}

function packageDimensions() {
  const read = (value, fallback) => {
    const number = Number(value || fallback)
    return Number.isFinite(number) && number > 0 ? Math.round(number) : fallback
  }
  return {
    length: read(env.NIMBUSPOST_PACKAGE_LENGTH_CM, 10),
    width: read(env.NIMBUSPOST_PACKAGE_WIDTH_CM, 10),
    height: read(env.NIMBUSPOST_PACKAGE_HEIGHT_CM, 5),
  }
}

const INDIAN_STATE_CODES = {
  'andaman and nicobar islands': 'AN',
  'andhra pradesh': 'AP',
  'arunachal pradesh': 'AR',
  assam: 'AS',
  bihar: 'BR',
  chandigarh: 'CH',
  chhattisgarh: 'CG',
  'dadra and nagar haveli and daman and diu': 'DN',
  delhi: 'DL',
  goa: 'GA',
  gujarat: 'GJ',
  haryana: 'HR',
  'himachal pradesh': 'HP',
  'jammu and kashmir': 'JK',
  jharkhand: 'JH',
  karnataka: 'KA',
  kerala: 'KL',
  ladakh: 'LA',
  lakshadweep: 'LD',
  'madhya pradesh': 'MP',
  maharashtra: 'MH',
  manipur: 'MN',
  meghalaya: 'ML',
  mizoram: 'MZ',
  nagaland: 'NL',
  odisha: 'OD',
  puducherry: 'PY',
  punjab: 'PB',
  rajasthan: 'RJ',
  sikkim: 'SK',
  'tamil nadu': 'TN',
  telangana: 'TG',
  tripura: 'TR',
  'uttar pradesh': 'UP',
  uttarakhand: 'UK',
  'west bengal': 'WB',
}

/** Old orders had no state column, so the address `state:` tag / city / PIN prefix decide. New orders store `delivery_state`. */
export function shippingState(city, pincode, address, explicit) {
  const direct = String(explicit || '').trim().toLowerCase()
  if (direct && INDIAN_STATE_CODES[direct]) return INDIAN_STATE_CODES[direct]
  if (direct && /^[a-z]{2}$/i.test(direct)) return direct.toUpperCase()

  const pin = String(pincode || '').replace(/\D/g, '')
  const normalizedCity = String(city || '').trim().toLowerCase()
  const explicitState = String(address || '').match(/(?:^|,\s*)state:\s*([^,]+)/i)?.[1]?.trim().toLowerCase()
  if (explicitState && INDIAN_STATE_CODES[explicitState]) return INDIAN_STATE_CODES[explicitState]

  if (pin.startsWith('110') || normalizedCity.includes('delhi')) return 'DL'
  if (
    normalizedCity.includes('aligarh') || pin.startsWith('202') || pin.startsWith('201')
    || normalizedCity.includes('noida') || normalizedCity.includes('ghaziabad') || normalizedCity.includes('lucknow')
  ) {
    return 'UP'
  }
  if (normalizedCity.includes('mumbai') || pin.startsWith('400') || normalizedCity.includes('pune') || pin.startsWith('411')) return 'MH'
  if (normalizedCity.includes('bangalore') || normalizedCity.includes('bengaluru') || pin.startsWith('560')) return 'KA'
  if (normalizedCity.includes('kolkata') || pin.startsWith('700')) return 'WB'
  if (normalizedCity.includes('chennai') || pin.startsWith('600')) return 'TN'
  if (normalizedCity.includes('hyderabad') || pin.startsWith('500')) return 'TG'
  if (normalizedCity.includes('gurgaon') || normalizedCity.includes('gurugram') || pin.startsWith('122')) return 'HR'
  if (normalizedCity.includes('jaipur') || pin.startsWith('302')) return 'RJ'

  const configured = String(env.NIMBUSPOST_DEFAULT_STATE || '').trim()
  if (configured) return configured
  throw new ProviderError(
    `Could not determine shipping state for ${city || 'this city'} (${pincode || 'no pincode'}). Set NIMBUSPOST_DEFAULT_STATE in the API server .env.`,
  )
}

const normalizeWarehouseId = (value) => (/^\d+$/.test(value) ? Number(value) : value)

function readPickupAddress() {
  const name = String(env.NIMBUSPOST_PICKUP_NAME || 'VELISQA').trim()
  const address = String(env.NIMBUSPOST_PICKUP_ADDRESS || '').trim()
  const city = String(env.NIMBUSPOST_PICKUP_CITY || 'Aligarh').trim()
  const state = String(env.NIMBUSPOST_PICKUP_STATE || env.NIMBUSPOST_DEFAULT_STATE || 'UP').trim()
  const pincode = String(env.NIMBUSPOST_PICKUP_PINCODE || '').trim()
  const phone = String(env.NIMBUSPOST_PICKUP_PHONE || '').replace(/\D/g, '').slice(-10)
  if (!address || !/^\d{6}$/.test(pincode) || phone.length !== 10) {
    throw new ProviderError(
      'Set NIMBUSPOST_PICKUP_ADDRESS, NIMBUSPOST_PICKUP_PINCODE, and NIMBUSPOST_PICKUP_PHONE in the API server .env (must match your NimbusPost warehouse exactly).',
    )
  }
  return { name, address, city, state, pincode: Number(pincode), phone: Number(phone) }
}

function formatApiError(data, status, prefix = 'NimbusPost') {
  if (!data) return `${prefix} shipment creation failed (${status}).`
  const nested = data.data && typeof data.data === 'object' ? data.data : null
  const structuredError = data.error && typeof data.error === 'object' ? data.error : null
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
    if (typeof candidate === 'string' && candidate.trim()) return `${prefix}: ${candidate.trim()}`
  }
  const raw = JSON.stringify(data)
  if (raw && raw !== '{}') return `${prefix} rejected the shipment (${status}): ${raw.slice(0, 280)}`
  return `${prefix} shipment creation failed (${status}).`
}

function pickString(source, keys) {
  if (!source) return null
  for (const key of keys) {
    const value = source[key]
    if (value != null && String(value).trim()) return String(value).trim()
  }
  return null
}

export function isValidAwb(value) {
  if (value == null) return false
  const trimmed = String(value).trim()
  if (!trimmed || trimmed.length < 6 || trimmed.length > 20) return false
  if (/error|proxy|exception|fail|null|undefined|domain|html|http|invalid/i.test(trimmed)) return false
  if (/^\d{6,20}$/.test(trimmed)) return true
  if (/^(NMBC|IN|AWB)\d{6,15}$/i.test(trimmed)) return true
  return false
}

function pickAwb(source, keys) {
  const candidate = pickString(source, keys)
  return isValidAwb(candidate) ? candidate : null
}

function sanitizeParsedShipment(parsed) {
  const awb = isValidAwb(parsed.awb) ? parsed.awb : null
  const trackingUrl = awb
    ? parsed.trackingUrl && /^https?:\/\//i.test(parsed.trackingUrl)
      ? parsed.trackingUrl
      : `https://nimbuspost.com/tracking/?awb=${encodeURIComponent(awb)}`
    : null
  return { ...parsed, awb, trackingUrl }
}

function normalizeRecord(value) {
  if (value == null) return null
  if (Array.isArray(value)) {
    for (const item of value) {
      const record = normalizeRecord(item)
      if (record) return record
    }
    return null
  }
  return typeof value === 'object' ? value : null
}

const mergeShipmentRecords = (...records) => records.reduce((merged, record) => (record ? { ...merged, ...record } : merged), {})

const AWB_KEYS = [
  'awb_number', 'awb', 'waybill', 'waybill_number', 'tracking_number', 'awbNumber', 'airwaybill_no',
  'airway_bill_no', 'airway_bill', 'lrnumber', 'lr_number', 'lrn', 'courier_awb', 'tracking_no', 'trackingNo',
]

function deepFindAwb(value, depth = 0) {
  if (value == null || depth > 8) return null
  if (typeof value === 'number' && Number.isFinite(value)) {
    const normalized = String(Math.trunc(value))
    return /^\d{6,20}$/.test(normalized) ? normalized : null
  }
  if (typeof value === 'string') return isValidAwb(value) ? value.trim() : null
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = deepFindAwb(item, depth + 1)
      if (found) return found
    }
    return null
  }
  if (typeof value !== 'object') return null
  for (const key of AWB_KEYS) {
    const candidate = value[key]
    if (candidate != null && String(candidate).trim() && isValidAwb(String(candidate).trim())) return String(candidate).trim()
  }
  for (const nested of Object.values(value)) {
    const found = deepFindAwb(nested, depth + 1)
    if (found) return found
  }
  return null
}

const SHIPMENT_AWB_KEYS = ['awb_number', 'awb', 'waybill', 'waybill_number', 'tracking_number', 'airwaybill_no', 'airway_bill_no', 'lrnumber', 'lr_number']

export function parseShipmentResponse(data) {
  const root = normalizeRecord(data?.data) || normalizeRecord(data) || {}
  const shipment = mergeShipmentRecords(
    root,
    normalizeRecord(root.shipment),
    normalizeRecord(root.result),
    normalizeRecord(Array.isArray(root.shipments) ? root.shipments[0] : null),
    normalizeRecord(Array.isArray(root.orders) ? root.orders[0] : null),
  )
  const nestedResult = normalizeRecord(shipment.result)
  const awb = deepFindAwb(data) || pickAwb(shipment, SHIPMENT_AWB_KEYS) || pickAwb(nestedResult, SHIPMENT_AWB_KEYS)
  const trackingUrl = pickString(shipment, ['tracking_url', 'trackingUrl', 'label'])
    || pickString(nestedResult, ['tracking_url', 'trackingUrl', 'label'])
    || (awb ? `https://nimbuspost.com/tracking/?awb=${encodeURIComponent(awb)}` : null)
  return sanitizeParsedShipment({
    orderId: pickString(shipment, ['order_id', 'orderId', 'id']) || pickString(nestedResult, ['order_id', 'orderId', 'id']) || pickString(root, ['order_id', 'orderId', 'id']),
    shipmentId: pickString(shipment, ['shipment_id', 'shipmentId']) || pickString(nestedResult, ['shipment_id', 'shipmentId']) || pickString(root, ['shipment_id', 'shipmentId']),
    awb,
    courierName: pickString(shipment, ['courier_name', 'courier']) || pickString(nestedResult, ['courier_name', 'courier']),
    trackingUrl,
    raw: data,
  })
}

function nimbusApiHeaders() {
  const { apiKey, apiSecret } = readApiCredentials()
  return { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'x-api-secret': apiSecret }
}

async function tryFetchAwbFromNimbus(orderNumber, orderId, shipmentId) {
  const headers = nimbusApiHeaders()
  const urls = [
    orderId ? `https://api-v2.nimbuspost.com/v2/shipments/${encodeURIComponent(orderId)}` : null,
    shipmentId ? `https://api-v2.nimbuspost.com/v2/shipments/${encodeURIComponent(shipmentId)}` : null,
    orderId ? `https://api-v2.nimbuspost.com/v2/orders/${encodeURIComponent(orderId)}` : null,
    `https://api-v2.nimbuspost.com/v2/shipments?order_number=${encodeURIComponent(orderNumber)}`,
    `https://api-v2.nimbuspost.com/v2/orders?order_number=${encodeURIComponent(orderNumber)}`,
  ].filter(Boolean)
  for (const url of urls) {
    try {
      const response = await http(url, { method: 'GET', headers })
      if (!response.ok) continue
      const data = await response.json().catch(() => null)
      if (!data) continue
      const parsed = parseShipmentResponse(data)
      if (parsed.awb) return parsed
    } catch (error) {
      logger.warn('NimbusPost AWB lookup failed', { error })
    }
  }
  return null
}

async function finalizeV2Shipment(orderNumber, initial) {
  if (initial.awb) return initial
  for (const delayMs of [0, 1500, 3000, 6000, 10000]) {
    if (delayMs) await sleep(delayMs)
    const fetched = await tryFetchAwbFromNimbus(orderNumber, initial.orderId, initial.shipmentId)
    if (fetched?.awb) return { ...initial, ...fetched, raw: fetched.raw ?? initial.raw }
  }
  return initial
}

async function resolveExistingNimbusShipment(order) {
  const orderNumber = order.nimbus_order_number || order.order_ref
  const fetched = await tryFetchAwbFromNimbus(orderNumber)
  if (fetched?.awb) return fetched
  if (fetched?.orderId || fetched?.shipmentId) return finalizeV2Shipment(orderNumber, fetched)
  return null
}

export function buildNimbusOrderNumber(orderRef, attempt = 0) {
  return attempt <= 0 ? orderRef : `${orderRef}-R${attempt}`
}

export function isIncompleteShipment(order) {
  return !order.nimbuspost_awb && (order.shipping_status === 'shipped' || order.order_status === 'shipped')
}

async function loginV1(email, password) {
  const response = await http(V1_LOGIN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await response.json().catch(() => null)
  const token = typeof data?.data === 'string' ? data.data : null
  if (!response.ok || !token || data?.status === false) {
    throw new ProviderError(
      `${formatApiError(data, response.status, 'NimbusPost login')} Check NIMBUSPOST_EMAIL and NIMBUSPOST_PASSWORD — use your NimbusPost dashboard login, not your Velisqa admin password.`,
    )
  }
  return token
}

function buildConsignee(order) {
  return {
    name: order.customer_name,
    address: order.delivery_address,
    city: order.delivery_city || 'Aligarh',
    state: shippingState(order.delivery_city, order.delivery_pincode, order.delivery_address, order.delivery_state),
    pincode: Number(normalizePincode(order.delivery_pincode)),
    phone: Number(normalizePhoneDigits(order.customer_phone)),
  }
}

const buildOrderItems = (order) =>
  order.order_items.map((item) => ({ name: item.product_name, qty: Number(item.quantity) || 1, price: Number(item.unit_price) || 0 }))

function buildV1Bodies(order) {
  const mode = paymentMode(order)
  const weight = packageWeightGrams()
  const dimensions = packageDimensions()
  const pickup = readPickupAddress()
  const consignee = buildConsignee(order)
  const items = buildOrderItems(order)
  const amount = Number(order.grand_total)
  const common = {
    package_weight: weight,
    package_length: dimensions.length,
    package_breadth: dimensions.width,
    package_height: dimensions.height,
    consignee,
    pickup,
    order_items: items,
  }
  return [
    { order_number: order.nimbus_order_number || order.order_ref, payment_type: mode, order_amount: amount, ...common },
    { OrderNo: order.order_ref, PaymentType: mode, OrderAmount: amount, ...common },
  ]
}

async function createV1Shipment(order) {
  const login = readLoginCredentials()
  if (!login) throw new ProviderError('NimbusPost v1 login is not configured. Set NIMBUSPOST_EMAIL and NIMBUSPOST_PASSWORD in the API server .env.')
  const token = await loginV1(login.email, login.password)
  let lastError = 'NimbusPost v1 shipment creation failed.'
  for (const body of buildV1Bodies(order)) {
    const response = await http(V1_SHIPMENT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    const data = await response.json().catch(() => null)
    if (response.ok && data?.status !== false) return parseShipmentResponse(data)
    lastError = formatApiError(data, response.status, 'NimbusPost v1')
  }
  throw new ProviderError(lastError)
}

async function createV2Shipment(order) {
  const endpoint = env.NIMBUSPOST_CREATE_SHIPMENT_URL || DEFAULT_V2_SHIPMENT_URL
  const warehouseIdRaw = String(env.NIMBUSPOST_WAREHOUSE_ID || '').trim()
  const headers = nimbusApiHeaders()
  if (!warehouseIdRaw) {
    throw new ProviderError('NimbusPost warehouse is not configured. Set NIMBUSPOST_WAREHOUSE_ID to your Velisqa warehouse ID.')
  }
  const mode = paymentMode(order)
  const dimensions = packageDimensions()
  const orderNumber = order.nimbus_order_number || order.order_ref
  const body = {
    order_number: orderNumber,
    order_type: 'b2c',
    payment_mode: mode,
    order_collectable_amount: mode === 'cod' ? Number(order.grand_total) : 0,
    warehouse_id: normalizeWarehouseId(warehouseIdRaw),
    shipping_address: {
      name: order.customer_name,
      email: order.customer_email || undefined,
      address: order.delivery_address,
      pincode: Number(normalizePincode(order.delivery_pincode)),
      city: order.delivery_city || 'Aligarh',
      state: shippingState(order.delivery_city, order.delivery_pincode, order.delivery_address, order.delivery_state),
      country: 'India',
      phone: normalizePhoneDigits(order.customer_phone),
    },
    items: buildOrderItems(order),
    package: { weight: packageWeightKg(), length: dimensions.length, width: dimensions.width, height: dimensions.height },
  }
  const response = await http(endpoint, { method: 'POST', headers, body: JSON.stringify(body) })
  const data = await response.json().catch(() => null)
  if (!response.ok || data?.success === false || data?.status === false) {
    throw new ProviderError(formatApiError(data, response.status, 'NimbusPost v2'))
  }
  return finalizeV2Shipment(orderNumber, parseShipmentResponse(data))
}

/** Creates a shipment (v2 by default; NIMBUSPOST_API_MODE=v1 forces the login flow). */
export async function createNimbusPostShipment(order) {
  validateShipmentOrder(order)
  const mode = String(env.NIMBUSPOST_API_MODE || 'v2').trim().toLowerCase()
  if (mode === 'v1') return createV1Shipment(order)

  const existing = await resolveExistingNimbusShipment(order)
  if (existing?.awb && isValidAwb(existing.awb)) return existing

  try {
    const result = await createV2Shipment(order)
    if (result.awb || !readLoginCredentials()) return result
    logger.warn('NimbusPost v2 succeeded without AWB, trying v1 fallback')
    try {
      const v1Result = await createV1Shipment({ ...order, nimbus_order_number: buildNimbusOrderNumber(order.nimbus_order_number || order.order_ref, 1) })
      if (v1Result.awb) return v1Result
    } catch (v1Error) {
      logger.error('NimbusPost v1 fallback after missing AWB failed', { error: v1Error })
    }
    return result
  } catch (v2Error) {
    if (!readLoginCredentials()) throw v2Error
    logger.error('NimbusPost v2 failed, trying v1 fallback', { error: v2Error })
    try {
      return await createV1Shipment(order)
    } catch (v1Error) {
      throw new ProviderError(`NimbusPost v2 failed: ${v2Error.message} V1 fallback also failed: ${v1Error.message}`)
    }
  }
}

function cancelResponseLooksSuccessful(data, status) {
  const okish = (status >= 200 && status < 300) || data?.success === true || data?.status === true
  return okish && data?.success !== false && data?.status !== false
}

async function cancelV2Shipment(awb) {
  const endpoint = env.NIMBUSPOST_CANCEL_SHIPMENT_URL || DEFAULT_V2_CANCEL_URL
  const headers = nimbusApiHeaders()
  let lastError = 'NimbusPost v2 shipment cancellation failed.'
  for (const body of [{ awb }, { awb_number: awb }, { awbNumber: awb }]) {
    const response = await http(endpoint, { method: 'POST', headers, body: JSON.stringify(body) })
    const data = await response.json().catch(() => null)
    if (cancelResponseLooksSuccessful(data, response.status)) return { awb, raw: data }
    lastError = formatApiError(data, response.status, 'NimbusPost v2 cancel')
  }
  throw new ProviderError(lastError)
}

async function cancelV1Shipment(awb) {
  const login = readLoginCredentials()
  if (!login) throw new ProviderError('NimbusPost v1 cancel is not configured. Set NIMBUSPOST_EMAIL and NIMBUSPOST_PASSWORD in the API server .env.')
  const token = await loginV1(login.email, login.password)
  const attempts = [
    { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: { awb } },
    { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: { awb_number: awb } },
    { headers: { 'Content-Type': 'application/json' }, body: { email: login.email, password: login.password, awb } },
  ]
  let lastError = 'NimbusPost v1 shipment cancellation failed.'
  for (const attempt of attempts) {
    const response = await http(V1_CANCEL_URL, { method: 'POST', headers: attempt.headers, body: JSON.stringify(attempt.body) })
    const data = await response.json().catch(() => null)
    if (cancelResponseLooksSuccessful(data, response.status)) return { awb, raw: data }
    lastError = formatApiError(data, response.status, 'NimbusPost v1 cancel')
  }
  throw new ProviderError(lastError)
}

export async function cancelNimbusPostShipment(awb) {
  const normalizedAwb = String(awb || '').trim()
  if (!normalizedAwb) throw new ProviderError('AWB is required to cancel a NimbusPost shipment.')
  const mode = String(env.NIMBUSPOST_API_MODE || 'v2').trim().toLowerCase()
  if (mode === 'v1') return cancelV1Shipment(normalizedAwb)
  try {
    return await cancelV2Shipment(normalizedAwb)
  } catch (v2Error) {
    try {
      return await cancelV1Shipment(normalizedAwb)
    } catch (v1Error) {
      throw new ProviderError(`${v2Error.message} | Fallback v1: ${v1Error.message}`)
    }
  }
}

function normalizeTrackingScan(raw) {
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

export function parseTrackingResponse(data) {
  const root = data?.data && typeof data.data === 'object' ? data.data : data || {}
  const nested = root.tracking && typeof root.tracking === 'object' ? root.tracking : root
  const scans = []
  for (const source of [nested.scans, nested.scan_history, nested.history, nested.tracking_history, root.scans, root.history]) {
    if (!Array.isArray(source)) continue
    for (const item of source) {
      if (!item || typeof item !== 'object') continue
      const scan = normalizeTrackingScan(item)
      if (scan) scans.push(scan)
    }
  }
  const latestRaw = nested.latest_status && typeof nested.latest_status === 'object'
    ? nested.latest_status
    : nested.current_status && typeof nested.current_status === 'object'
      ? nested.current_status
      : null
  const latest = latestRaw ? normalizeTrackingScan(latestRaw) : scans[0] || null
  const seen = new Set()
  const deduped = scans.filter((scan) => {
    const key = `${scan.status}|${scan.location}|${scan.timestamp}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  return { latest, scans: deduped }
}

async function fetchV1Tracking(awb) {
  const login = readLoginCredentials()
  if (!login) return null
  const token = await loginV1(login.email, login.password)
  for (const url of [
    `https://api.nimbuspost.com/v1/shipments/track/${encodeURIComponent(awb)}`,
    `https://api.nimbuspost.com/v1/shipments/tracking/${encodeURIComponent(awb)}`,
  ]) {
    const response = await http(url, { headers: { Authorization: `Bearer ${token}` } })
    const data = await response.json().catch(() => null)
    if (!response.ok || !data) continue
    const parsed = parseTrackingResponse(data)
    if (parsed.latest || parsed.scans.length) return parsed
  }
  return null
}

export async function fetchNimbusPostTracking(awb) {
  const normalizedAwb = String(awb || '').trim()
  if (!normalizedAwb) return { latest: null, scans: [], message: 'AWB is required for tracking.' }

  if ((env.NIMBUSPOST_API_KEY || env.NIMBUSPOST_API_TOKEN) && env.NIMBUSPOST_API_SECRET) {
    const headers = nimbusApiHeaders()
    for (const url of [
      `https://api-v2.nimbuspost.com/v2/shipments/track?awb=${encodeURIComponent(normalizedAwb)}`,
      `https://api-v2.nimbuspost.com/v2/shipments/tracking?awb=${encodeURIComponent(normalizedAwb)}`,
      `https://api-v2.nimbuspost.com/v2/tracking/${encodeURIComponent(normalizedAwb)}`,
      `https://api-v2.nimbuspost.com/v2/shipments/${encodeURIComponent(normalizedAwb)}/track`,
    ]) {
      try {
        const response = await http(url, { method: 'GET', headers })
        const data = await response.json().catch(() => null)
        if (!response.ok || !data) continue
        const parsed = parseTrackingResponse(data)
        if (parsed.latest || parsed.scans.length) return parsed
      } catch (error) {
        logger.warn('NimbusPost tracking lookup failed', { error })
      }
    }
  }

  const v1 = await fetchV1Tracking(normalizedAwb).catch(() => null)
  if (v1) return v1
  return { latest: null, scans: [], message: 'Live scan details are not available yet. Use the NimbusPost tracking link for updates.' }
}
