/**
 * VELISQA Cart Offers — Centralized Configuration & Calculation
 *
 * All offer thresholds, gift product details, and eligibility logic live here.
 * Every component consumes the same offer state via CartContext.
 */

// ─── Offer Configuration ────────────────────────────────────────────────────
export const CART_OFFERS = {
  coupon: {
    threshold: 999,
    discount: 90,
    type: 'coupon',
    label: '₹90 OFF',
  },
  freeGift: {
    threshold: 1299,
    value: 400,
    maxValue: 400,
    type: 'free-gift',
    title: 'Complimentary Gift',
    description: 'A curated accessory from our signature collection',
    giftProductId: 'VELISQA_FREE_GIFT',
    giftVariantId: 'VELISQA_FREE_GIFT_VARIANT',
    imageUrl: null,
    enabled: true,
  },
}

// ─── Gift Item Identifier ───────────────────────────────────────────────────
export const FREE_GIFT_PRODUCT_ID = CART_OFFERS.freeGift.giftProductId

/**
 * Check whether a cart line item is the free gift.
 */
export function isFreeGiftItem(item) {
  return item?.productId === FREE_GIFT_PRODUCT_ID || item?.isFreeGift === true
}

// ─── Offer Calculation ──────────────────────────────────────────────────────

/**
 * Calculate the eligible subtotal for offer thresholds.
 * Excludes shipping, taxes, gift wrap, and the free gift item itself.
 *
 * @param {Array} items - Cart line items
 * @returns {number} Eligible merchandise subtotal
 */
export function getEligibleSubtotal(items) {
  return items.reduce((sum, item) => {
    if (isFreeGiftItem(item)) return sum
    return sum + (Number(item.price) || 0) * (Number(item.quantity) || 0)
  }, 0)
}

/**
 * Centralized offer calculation. Every component should consume this.
 *
 * @param {number} subtotal - The eligible merchandise subtotal
 * @returns {Object} Offer eligibility and progress information
 */
export function calculateCartOffers(subtotal) {
  const { coupon, freeGift } = CART_OFFERS

  const couponEligible = subtotal >= coupon.threshold
  const freeGiftEligible = freeGift.enabled && subtotal >= freeGift.threshold

  const amountToCoupon = Math.max(0, coupon.threshold - subtotal)
  const amountToGift = freeGift.enabled
    ? Math.max(0, freeGift.threshold - subtotal)
    : Infinity

  // Progress percentage towards the final milestone (₹1,299)
  const maxThreshold = freeGift.enabled ? freeGift.threshold : coupon.threshold
  const progressPercent = Math.min(100, (subtotal / maxThreshold) * 100)

  // Determine which offer state we're in
  let state = 'A' // below ₹999
  if (freeGiftEligible) {
    state = 'C' // ₹1,299+
  } else if (couponEligible) {
    state = 'B' // ₹999–₹1,298
  }

  return {
    couponEligible,
    freeGiftEligible,
    amountToCoupon,
    amountToGift,
    progressPercent,
    state,
    couponThreshold: coupon.threshold,
    giftThreshold: freeGift.threshold,
    couponDiscount: coupon.discount,
    giftValue: freeGift.value,
    giftEnabled: freeGift.enabled,
    maxGiftValue: freeGift.maxValue,
  }
}

/**
 * Build the free gift cart line item object from a catalog product.
 */
export function buildFreeGiftLineItem(product) {
  if (!product) {
    const { freeGift } = CART_OFFERS
    return {
      productId: freeGift.giftProductId,
      name: freeGift.title,
      price: 0,
      mrp: null,
      imageUrl: freeGift.imageUrl,
      productUrl: null,
      stock: 999,
      outOfStock: false,
      quantity: 1,
      isFreeGift: true,
      giftValue: freeGift.value,
      description: freeGift.description,
    }
  }
  return {
    productId: product.id,
    name: product.name,
    price: 0,
    mrp: null,
    imageUrl: product.image_url || product.imageUrl,
    productUrl: `/product/${product.id}`,
    stock: 999,
    outOfStock: false,
    quantity: 1,
    isFreeGift: true,
    giftValue: product.price,
    description: product.description || '',
  }
}

/**
 * Format INR amount for display (e.g. "₹1,299").
 * Re-exported here so offer components don't need a separate import.
 */
export function formatOfferAmount(amount) {
  return `₹${Number(amount).toLocaleString('en-IN')}`
}
