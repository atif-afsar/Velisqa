/**
 * Centralized Analytics Layer for Velisqa.
 *
 * All application code should use the `analytics` export below instead
 * of calling gtag() / fbq() directly. This ensures consistent event
 * formatting across GA4, Google Ads, and Meta Pixel, and provides
 * deduplication for purchases.
 *
 * Usage:
 *   import { analytics } from '@/lib/analytics'
 *   analytics.viewItem(product)
 *   analytics.addToCart(product, quantity)
 *   analytics.purchase(order)
 */

import { trackGoogleAdsConversion } from './googleAds'
import {
  trackMetaViewContent,
  trackMetaAddToCart,
  trackInitiateCheckout as metaInitiateCheckout,
  trackMetaPurchase,
} from './metaPixel'
import { invokeEdgeFunction } from './invokeEdgeFunction'

const IS_DEV = import.meta.env.DEV

// ── Helpers ──────────────────────────────────────────────────

/** Push an event to the dataLayer and fire gtag(). */
function trackEvent(name, params = {}) {
  if (typeof window === 'undefined') return

  // dataLayer push (for GTM)
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ event: name, ...params })

  // Direct gtag call (for GA4 / Google Ads)
  if (typeof window.gtag === 'function') {
    window.gtag('event', name, params)
  }

  if (IS_DEV) {
    console.debug('[Analytics]', name, params)
  }
}

/**
 * Format a product into a GA4 ecommerce item.
 * Accepts either a raw product object or a cart line item.
 */
function toGA4Item(product, quantity = 1) {
  return {
    item_id: product.productId || product.id,
    item_name: product.name,
    price: Number(product.price) || 0,
    quantity: Number(quantity) || 1,
    item_brand: product.brand || 'Velisqa',
    item_category: product.category || product.item_category || undefined,
  }
}

/** Format cart items array to GA4 items. */
function cartToGA4Items(cartItems) {
  return cartItems.map((line) =>
    toGA4Item(line, line.quantity),
  )
}

// ── Purchase deduplication ──────────────────────────────────

const DEDUP_KEY = 'velisqa:tracked_purchases'

function hasFiredPurchase(transactionId) {
  if (typeof window === 'undefined') return true
  try {
    const fired = JSON.parse(sessionStorage.getItem(DEDUP_KEY) || '[]')
    return fired.includes(transactionId)
  } catch {
    return false
  }
}

function markPurchaseFired(transactionId) {
  if (typeof window === 'undefined') return
  try {
    const fired = JSON.parse(sessionStorage.getItem(DEDUP_KEY) || '[]')
    fired.push(transactionId)
    sessionStorage.setItem(DEDUP_KEY, JSON.stringify(fired))
  } catch {
    /* ignore */
  }
}

// ── Begin Checkout deduplication ─────────────────────────────

const CHECKOUT_DEDUP_KEY = 'velisqa:checkout_fired'

function hasFiredBeginCheckout() {
  if (typeof window === 'undefined') return true
  try {
    return sessionStorage.getItem(CHECKOUT_DEDUP_KEY) === '1'
  } catch {
    return false
  }
}

function markBeginCheckoutFired() {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(CHECKOUT_DEDUP_KEY, '1')
  } catch {
    /* ignore */
  }
}

function clearBeginCheckoutFlag() {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(CHECKOUT_DEDUP_KEY)
  } catch {
    /* ignore */
  }
}

// ── Public API ──────────────────────────────────────────────

export const analytics = {
  /**
   * Track a page view.
   * Fired on every SPA route change.
   */
  pageView(data = {}) {
    trackEvent('page_view', {
      page_location: window.location.href,
      page_path: window.location.pathname,
      page_title: document.title,
      ...data,
    })
    // Meta PageView is fired automatically by the pixel init,
    // but we also fire on SPA route changes
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'PageView')
    }
  },

  /**
   * Track product view (product detail page).
   * @param {object} product — must have id, name, price, category
   */
  viewItem(product) {
    const item = toGA4Item(product)
    trackEvent('view_item', {
      currency: 'INR',
      value: item.price,
      items: [item],
    })
    trackMetaViewContent(item)
  },

  /**
   * Track product list view (collection/category page).
   * @param {string} listName
   * @param {Array} products
   */
  viewItemList(listName, products) {
    trackEvent('view_item_list', {
      item_list_name: listName,
      items: products.map((p, i) => ({ ...toGA4Item(p), index: i })),
    })
  },

  /**
   * Track add to cart.
   * @param {object} product
   * @param {number} quantity
   */
  addToCart(product, quantity = 1) {
    const item = toGA4Item(product, quantity)
    trackEvent('add_to_cart', {
      currency: 'INR',
      value: item.price * item.quantity,
      items: [item],
    })
    trackMetaAddToCart(item, quantity)
  },

  /**
   * Track remove from cart.
   * @param {object} product
   * @param {number} quantity
   */
  removeFromCart(product, quantity = 1) {
    const item = toGA4Item(product, quantity)
    trackEvent('remove_from_cart', {
      currency: 'INR',
      value: item.price * item.quantity,
      items: [item],
    })
  },

  /**
   * Track cart view.
   * @param {{ items: Array, total: number }} cart
   */
  viewCart(cart) {
    trackEvent('view_cart', {
      currency: 'INR',
      value: Number(cart.total) || 0,
      items: cartToGA4Items(cart.items),
    })
  },

  /**
   * Track begin checkout — fires only once per session.
   * @param {{ items: Array, total: number }} cart
   */
  beginCheckout(cart) {
    if (hasFiredBeginCheckout()) return
    markBeginCheckoutFired()

    const items = cartToGA4Items(cart.items)
    trackEvent('begin_checkout', {
      currency: 'INR',
      value: Number(cart.total) || 0,
      items,
    })
    metaInitiateCheckout({
      value: cart.total,
      itemCount: cart.items.length,
      contentIds: cart.items.map((line) => line.productId || line.id),
    })
  },

  /**
   * Track shipping info added.
   * @param {{ items: Array, total: number }} cart
   * @param {string} shippingTier — e.g. 'standard', 'express'
   */
  addShippingInfo(cart, shippingTier = 'standard') {
    trackEvent('add_shipping_info', {
      currency: 'INR',
      value: Number(cart.total) || 0,
      shipping_tier: shippingTier,
      items: cartToGA4Items(cart.items),
    })
  },

  /**
   * Track payment method selection.
   * @param {{ items: Array, total: number }} cart
   * @param {string} paymentType — e.g. 'online', 'cod'
   */
  addPaymentInfo(cart, paymentType) {
    trackEvent('add_payment_info', {
      currency: 'INR',
      value: Number(cart.total) || 0,
      payment_type: paymentType,
      items: cartToGA4Items(cart.items),
    })
  },

  /**
   * Track a successful purchase.
   * Fires GA4 purchase, Google Ads conversion, Meta Pixel Purchase,
   * and Meta CAPI (server-side) — all with deduplication.
   *
   * @param {{
   *   transaction_id: string,
   *   value: number,
   *   tax?: number,
   *   shipping?: number,
   *   coupon?: string,
   *   items: Array,
   *   customer_email?: string,
   *   customer_phone?: string,
   * }} order
   */
  purchase(order) {
    if (!order.transaction_id) return
    if (hasFiredPurchase(order.transaction_id)) {
      if (IS_DEV) console.debug('[Analytics] Skipping duplicate purchase:', order.transaction_id)
      return
    }

    markPurchaseFired(order.transaction_id)
    clearBeginCheckoutFlag()

    const items = (order.items || []).map((item) => toGA4Item(item, item.quantity))

    // 1. GA4 purchase
    trackEvent('purchase', {
      transaction_id: order.transaction_id,
      value: Number(order.value) || 0,
      tax: Number(order.tax) || 0,
      shipping: Number(order.shipping) || 0,
      currency: 'INR',
      coupon: order.coupon || undefined,
      items,
    })

    // 2. Google Ads conversion
    trackGoogleAdsConversion({
      transaction_id: order.transaction_id,
      value: order.value,
      currency: 'INR',
    })

    // 3. Meta Pixel Purchase (browser-side, with event_id)
    trackMetaPurchase({
      transaction_id: order.transaction_id,
      value: order.value,
      items,
    })

    // 4. Meta Conversions API (server-side, fire-and-forget)
    sendMetaCAPI(order, items).catch((err) => {
      if (IS_DEV) console.warn('[Analytics] Meta CAPI failed:', err)
    })
  },

  /**
   * Track a search query.
   * @param {string} searchTerm
   */
  search(searchTerm) {
    trackEvent('search', { search_term: searchTerm })
  },

  /**
   * Track login.
   * @param {string} method — e.g. 'google', 'email'
   */
  login(method) {
    trackEvent('login', { method })
  },

  /**
   * Track sign up.
   * @param {string} method
   */
  signUp(method) {
    trackEvent('sign_up', { method })
  },
}

// ── Meta CAPI (server-side) ─────────────────────────────────

async function sendMetaCAPI(order, items) {
  try {
    await invokeEdgeFunction('meta-conversions', {
      event_name: 'Purchase',
      event_id: order.transaction_id,
      event_source_url: window.location.href,
      value: Number(order.value) || 0,
      currency: 'INR',
      content_ids: items.map((item) => item.item_id),
      customer_email: order.customer_email || null,
      customer_phone: order.customer_phone || null,
    })
  } catch {
    // Meta CAPI is best-effort — don't block the purchase flow
  }
}
