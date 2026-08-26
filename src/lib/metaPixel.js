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

/**
 * Fire a standard or custom Meta Pixel event.
 * @param {string} eventName
 * @param {Record<string, unknown>} parameters
 * @param {{ custom?: boolean, eventID?: string }} options
 */
export function trackMetaEvent(eventName, parameters = {}, options = {}) {
  const pixel = getFbq()
  if (!pixel) return false

  const eventOptions = options.eventID ? { eventID: options.eventID } : undefined

  if (options.custom) {
    pixel('trackCustom', eventName, parameters, eventOptions)
  } else {
    pixel('track', eventName, parameters, eventOptions)
  }
  return true
}

/** Track Meta ViewContent (product page view). */
export function trackMetaViewContent(product) {
  return trackMetaEvent('ViewContent', {
    content_ids: [product.item_id || product.id],
    content_name: product.item_name || product.name,
    content_type: 'product',
    content_category: product.item_category || product.category,
    value: Number(product.price) || 0,
    currency: 'INR',
  })
}

/** Track Meta AddToCart. */
export function trackMetaAddToCart(product, quantity = 1) {
  return trackMetaEvent('AddToCart', {
    content_ids: [product.item_id || product.id],
    content_name: product.item_name || product.name,
    content_type: 'product',
    value: (Number(product.price) || 0) * quantity,
    currency: 'INR',
  })
}

/** Track Meta InitiateCheckout. */
export function trackInitiateCheckout({ value, itemCount, contentIds = [] }) {
  return trackMetaEvent('InitiateCheckout', {
    value: Number(value) || 0,
    currency: 'INR',
    num_items: Number(itemCount) || 0,
    content_ids: contentIds,
    content_type: 'product',
  })
}

/**
 * Track Meta Purchase with event_id for CAPI deduplication.
 * @param {{ transaction_id: string, value: number, items: Array<{ id: string }> }} order
 */
export function trackMetaPurchase(order) {
  return trackMetaEvent(
    'Purchase',
    {
      value: Number(order.value) || 0,
      currency: 'INR',
      content_ids: (order.items || []).map((item) => item.item_id || item.id),
      content_type: 'product',
    },
    { eventID: order.transaction_id },
  )
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
