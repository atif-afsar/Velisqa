/**
 * Meta (Facebook/Instagram) Pixel event helpers.
 *
 * All Meta browser-side events go through this module.
 * Purchase events include an event_id for deduplication with Meta CAPI.
 */

function getFbq() {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return null
  return window.fbq
}

const TEST_CODE_STORAGE_KEY = 'velisqa:meta_test_event_code'

/**
 * Retrieve an optional Meta Test Event Code for debug sessions in Meta Events Manager.
 * Checks URL query params (?test_event_code=... or ?_fb_test_code=...),
 * persistent sessionStorage, or VITE_META_TEST_EVENT_CODE.
 * Returns null in normal production traffic.
 */
export function getTestEventCode() {
  if (typeof window === 'undefined') return null
  try {
    const params = new URLSearchParams(window.location.search)
    const fromQuery = params.get('test_event_code') || params.get('_fb_test_code')
    if (fromQuery) {
      sessionStorage.setItem(TEST_CODE_STORAGE_KEY, fromQuery.trim())
      return fromQuery.trim()
    }
    const fromStorage = sessionStorage.getItem(TEST_CODE_STORAGE_KEY)
    if (fromStorage) return fromStorage.trim()
  } catch {
    /* ignore storage errors */
  }
  const fromEnv = import.meta.env.VITE_META_TEST_EVENT_CODE
  return fromEnv ? String(fromEnv).trim() : null
}

/** Tracked path to prevent duplicate PageViews on initial load, StrictMode, and remounts. */
let lastTrackedPageViewPath =
  typeof window !== 'undefined' && typeof window.fbq === 'function'
    ? window.location.pathname + window.location.search
    : null

/**
 * Fire a deduplicated Meta PageView.
 * Fired once on initial load (or upon consent grant) and on subsequent SPA route changes.
 */
export function trackMetaPageView() {
  const pixel = getFbq()
  if (!pixel || typeof window === 'undefined') return false

  const currentPath = window.location.pathname + window.location.search
  if (lastTrackedPageViewPath === currentPath) {
    return false // Suppress duplicate PageView for the same path
  }
  lastTrackedPageViewPath = currentPath

  return trackMetaEvent('PageView')
}

/**
 * Fire a standard or custom Meta Pixel event.
 * @param {string} eventName
 * @param {Record<string, unknown>} parameters
 * @param {{ custom?: boolean, eventID?: string, test_event_code?: string }} options
 */
export function trackMetaEvent(eventName, parameters = {}, options = {}) {
  const pixel = getFbq()
  if (!pixel) return false

  const eventOptions = {}
  if (options.eventID) {
    eventOptions.eventID = String(options.eventID)
  }

  const testCode = options.test_event_code || getTestEventCode()
  if (testCode) {
    eventOptions.test_event_code = testCode
  }

  const hasOptions = Object.keys(eventOptions).length > 0

  if (options.custom) {
    if (hasOptions) {
      pixel('trackCustom', eventName, parameters, eventOptions)
    } else {
      pixel('trackCustom', eventName, parameters)
    }
  } else {
    if (hasOptions) {
      pixel('track', eventName, parameters, eventOptions)
    } else {
      pixel('track', eventName, parameters)
    }
  }
  return true
}

/** Check if an ID is a valid catalog product ID (filters out virtual gift tokens, etc.). */
function isValidCatalogId(id) {
  if (!id) return false
  const str = String(id).trim()
  return str.length > 0 && !str.startsWith('VELISQA_FREE_GIFT')
}

/** Track Meta ViewContent (product page view). */
export function trackMetaViewContent(product) {
  const productId = String(product.item_id || product.id || '')
  if (!isValidCatalogId(productId)) return false

  const price = Number(product.price) || 0

  return trackMetaEvent('ViewContent', {
    content_ids: [productId],
    content_name: product.item_name || product.name || '',
    content_type: 'product',
    content_category: product.item_category || product.category || '',
    contents: [{ id: productId, quantity: 1, item_price: price }],
    value: price,
    currency: 'INR',
  })
}

/** Track Meta AddToCart. */
export function trackMetaAddToCart(product, quantity = 1) {
  const productId = String(product.item_id || product.id || '')
  if (!isValidCatalogId(productId)) return false

  const qty = Number(quantity) || 1
  const price = Number(product.price) || 0

  return trackMetaEvent('AddToCart', {
    content_ids: [productId],
    content_name: product.item_name || product.name || '',
    content_type: 'product',
    contents: [{ id: productId, quantity: qty, item_price: price }],
    value: price * qty,
    currency: 'INR',
  })
}

/** Track Meta InitiateCheckout. */
export function trackInitiateCheckout({ value, itemCount, contentIds = [] }) {
  const ids = (contentIds || []).map(String).filter(isValidCatalogId)
  const numValue = Number(value) || 0
  const params = {
    currency: 'INR',
    num_items: Number(itemCount) || 0,
    content_ids: ids,
    content_type: 'product',
  }
  if (numValue > 0) {
    params.value = Number(numValue.toFixed(2))
  }
  return trackMetaEvent('InitiateCheckout', params)
}

/**
 * Track Meta Purchase with event_id for CAPI deduplication.
 * @param {{ transaction_id: string, value: number, items: Array<{ id?: string, item_id?: string, name?: string, price?: number, quantity?: number }> }} order
 */
export function trackMetaPurchase(order) {
  const numValue = Number(order.value) || 0
  if (numValue <= 0) return false

  const rawItems = order.items || []
  const items = rawItems.filter((item) => isValidCatalogId(item.item_id || item.id))
  const contentIds = items.map((item) => String(item.item_id || item.id)).filter(Boolean)
  const contents = items.map((item) => ({
    id: String(item.item_id || item.id),
    quantity: Number(item.quantity) || 1,
    item_price: Number((Number(item.price) || 0).toFixed(2)),
  }))
  const numItems = items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0)

  return trackMetaEvent(
    'Purchase',
    {
      value: Number(numValue.toFixed(2)),
      currency: 'INR',
      content_type: 'product',
      content_ids: contentIds,
      contents,
      num_items: numItems,
    },
    { eventID: order.transaction_id },
  )
}

/** Track Meta AddPaymentInfo (payment details added or selected in checkout). */
export function trackMetaAddPaymentInfo({ value, contentIds = [], contents = [], currency = 'INR' } = {}) {
  const ids = (contentIds || []).map(String).filter(isValidCatalogId)
  const numValue = Number(value) || 0
  const params = {
    currency,
    content_type: 'product',
  }
  if (ids.length > 0) params.content_ids = ids
  if (Array.isArray(contents) && contents.length > 0) params.contents = contents
  if (numValue > 0) params.value = Number(numValue.toFixed(2))

  return trackMetaEvent('AddPaymentInfo', params)
}

/** Track Meta AddToWishlist. */
export function trackMetaAddToWishlist(product) {
  const productId = String(product.item_id || product.id || '')
  if (!isValidCatalogId(productId)) return false

  const price = Number(product.price) || 0

  return trackMetaEvent('AddToWishlist', {
    content_ids: [productId],
    content_name: product.item_name || product.name || '',
    content_category: product.item_category || product.category || '',
    content_type: 'product',
    contents: [{ id: productId, quantity: 1, item_price: price }],
    value: price,
    currency: 'INR',
  })
}

/** Track Meta Search (when a user searches products). */
export function trackMetaSearch(searchTerm) {
  const query = String(searchTerm || '').trim()
  if (!query) return false

  return trackMetaEvent('Search', {
    search_string: query,
  })
}

/** Track Meta CompleteRegistration (sign up). */
export function trackMetaCompleteRegistration(method = 'email') {
  return trackMetaEvent('CompleteRegistration', {
    content_name: method,
    status: true,
    currency: 'INR',
  })
}

/** Track Meta Contact (WhatsApp, phone, or email outreach). */
export function trackMetaContact(method = 'general') {
  return trackMetaEvent('Contact', {
    content_name: method,
  })
}

/** Track custom PaymentProofSubmitted event. */
export function trackPaymentProofSubmitted({ orderRef, value }) {
  return trackMetaEvent(
    'PaymentProofSubmitted',
    {
      order_id: orderRef,
      value: Number(value) || 0,
      currency: 'INR',
    },
    { custom: true },
  )
}

