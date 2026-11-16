/**
 * Google Ads conversion tracking.
 *
 * Fires the Google Ads conversion event for purchase.
 * IDs come from environment variables — never hard-coded.
 */

// Placeholder values (AW-XXXXXXXXX) are treated as unset so no fake conversion tag ever loads.
const isPlaceholder = (v) => /X{4,}/i.test(v)
const RAW_ADS_ID = String(import.meta.env.VITE_GOOGLE_ADS_ID || '').trim()
const ADS_ID = isPlaceholder(RAW_ADS_ID) ? '' : RAW_ADS_ID
const RAW_LABEL = String(import.meta.env.VITE_GOOGLE_ADS_PURCHASE_LABEL || '').trim()
const PURCHASE_LABEL = isPlaceholder(RAW_LABEL) ? '' : RAW_LABEL

/**
 * Fire a Google Ads purchase conversion.
 * @param {{ transaction_id: string, value: number, currency?: string }} order
 */
export function trackGoogleAdsConversion(order) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return false
  if (!ADS_ID || !PURCHASE_LABEL) return false

  window.gtag('event', 'conversion', {
    send_to: `${ADS_ID}/${PURCHASE_LABEL}`,
    value: Number(order.value) || 0,
    currency: order.currency || 'INR',
    transaction_id: order.transaction_id,
  })

  return true
}
