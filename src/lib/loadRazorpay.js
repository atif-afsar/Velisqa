const RAZORPAY_SRC = 'https://checkout.razorpay.com/v1/checkout.js'

let pending = null

/**
 * Loads the Razorpay Standard Checkout SDK on demand.
 * Only checkout/payment pages need it, so it is no longer render-blocking in index.html.
 */
export function loadRazorpay() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Razorpay needs a browser.'))
  if (window.Razorpay) return Promise.resolve(window.Razorpay)
  if (pending) return pending

  pending = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = RAZORPAY_SRC
    script.async = true
    script.onload = () => {
      if (window.Razorpay) resolve(window.Razorpay)
      else reject(new Error('Razorpay SDK failed to load. Please refresh and try again.'))
    }
    script.onerror = () => {
      pending = null
      script.remove()
      reject(new Error('Could not reach the payment gateway. Check your connection and try again.'))
    }
    document.head.appendChild(script)
  })

  return pending
}

/** Warm the SDK while the shopper fills in the checkout form. */
export function preloadRazorpay() {
  loadRazorpay().catch(() => {})
}
