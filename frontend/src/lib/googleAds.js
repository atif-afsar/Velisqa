/**
 * Google Ads conversion tracking.
 *
 * Fires the Google Ads conversion event for purchase.
 * IDs come from environment variables — never hard-coded.
 */

const ADS_ID = String(import.meta.env.VITE_GOOGLE_ADS_ID || '').trim()
const PURCHASE_LABEL = String(import.meta.env.VITE_GOOGLE_ADS_PURCHASE_LABEL || '').trim()

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
