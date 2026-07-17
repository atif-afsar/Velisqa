function fbq() {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return null
  return window.fbq
}

export function trackMetaEvent(eventName, parameters = {}, options = {}) {
  const pixel = fbq()
  if (!pixel) return false

  if (options.custom) {
    pixel('trackCustom', eventName, parameters)
  } else {
    pixel('track', eventName, parameters)
  }
  return true
}

export function trackInitiateCheckout({ value, itemCount, contentIds = [] }) {
  return trackMetaEvent('InitiateCheckout', {
    value: Number(value) || 0,
    currency: 'INR',
    num_items: Number(itemCount) || 0,
    content_ids: contentIds,
    content_type: 'product',
  })
}

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
