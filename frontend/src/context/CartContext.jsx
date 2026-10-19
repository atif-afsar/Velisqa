import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { loadCartItems, saveCartItems } from '../lib/cartStorage'
import {
  findCartStockIssues,
  getCartItemCount,
  getCartTotal,
  isProductSoldOut,
  productToCartLine,
  validateCartQuantity,
} from '../lib/cartStock'
import { fetchProductsByIds } from '../lib/productQuery'
import { getPrimaryImageUrl } from '../lib/productImages'
import { analytics } from '../lib/analytics'
import {
  calculateCartOffers,
  getEligibleSubtotal,
  isFreeGiftItem,
  buildFreeGiftLineItem,
  CART_OFFERS,
} from '../lib/cartOffers'

const CartContext = createContext(null)

// Session-level milestone tracking to avoid repeated toasts
const MILESTONE_SESSION_KEY = 'velisqa:offer_milestones_shown'

function getShownMilestones() {
  try {
    return JSON.parse(sessionStorage.getItem(MILESTONE_SESSION_KEY) || '{}')
  } catch {
    return {}
  }
}

function writeShownMilestones(shown) {
  try {
    sessionStorage.setItem(MILESTONE_SESSION_KEY, JSON.stringify(shown))
  } catch {
    /* storage unavailable */
  }
}

function markMilestoneShown(milestone) {
  writeShownMilestones({ ...getShownMilestones(), [milestone]: Date.now() })
}

/** Paid line for a product (a free gift can share the same productId). */
const isPaidLine = (productId) => (line) => line.productId === productId && !isFreeGiftItem(line)

/** The free gift only stays while the paid subtotal still qualifies. */
function withValidGift(lines) {
  if (!lines.some(isFreeGiftItem)) return lines
  const paid = lines.filter((line) => !isFreeGiftItem(line))
  return paid.length && calculateCartOffers(getEligibleSubtotal(paid)).freeGiftEligible ? lines : paid
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => withValidGift(loadCartItems()))
  const [toast, setToast] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false)
  const [lastAddedProductId, setLastAddedProductId] = useState(null)

  // ── Offer milestone toast state ──
  const [offerMilestone, setOfferMilestone] = useState(null)
  const prevOffersRef = useRef(null)

  const persist = useCallback((next) => {
    const valid = withValidGift(next)
    setItems(valid)
    saveCartItems(valid)
  }, [])

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type, id: Date.now() })
  }, [])

  useEffect(() => {
    if (!toast) return undefined
    const t = window.setTimeout(() => setToast(null), 4500)
    return () => window.clearTimeout(t)
  }, [toast])

  const dismissToast = useCallback(() => setToast(null), [])
  const dismissOfferMilestone = useCallback(() => setOfferMilestone(null), [])
  const openCartDrawer = useCallback(() => setIsCartDrawerOpen(true), [])
  const closeCartDrawer = useCallback(() => {
    setIsCartDrawerOpen(false)
    setLastAddedProductId(null)
  }, [])

  const addToCartInternal = useCallback(
    (product, quantity = 1, { openDrawer = true } = {}) => {
      const existing = items.find(isPaidLine(product.id))
      const currentQty = existing?.quantity ?? 0
      const check = validateCartQuantity(product.stock, quantity, currentQty, {
        soldOut: isProductSoldOut(product),
      })

      if (!check.ok) {
        showToast(check.message, 'error')
        return { ok: false, reason: check.reason }
      }

      const line = productToCartLine(product, currentQty + quantity)

      if (existing) {
        persist(
          items.map((item) => (isPaidLine(product.id)(item) ? { ...item, ...line, quantity: line.quantity } : item)),
        )
      } else {
        persist([...items, line])
      }

      setLastAddedProductId(product.id)
      if (openDrawer) setIsCartDrawerOpen(true)
      analytics.addToCart(product, quantity)
      return { ok: true }
    },
    [items, persist, showToast],
  )

  const addToCart = useCallback(
    (product, quantity = 1, options) => addToCartInternal(product, quantity, options),
    [addToCartInternal],
  )

  const setQuantity = useCallback(
    (productId, quantity) => {
      // Prevent modifying the free gift quantity
      const existing = items.find(isPaidLine(productId))
      if (!existing) return { ok: false }

      const qty = Math.floor(Number(quantity) || 0)
      if (qty <= 0) {
        persist(items.filter((line) => !isPaidLine(productId)(line)))
        return { ok: true }
      }

      const check = validateCartQuantity(existing.stock, qty, 0, {
        soldOut: existing.outOfStock,
      })
      if (!check.ok) {
        showToast(check.message, 'error')
        return { ok: false, reason: check.reason }
      }

      persist(
        items.map((line) => (isPaidLine(productId)(line) ? { ...line, quantity: qty } : line)),
      )
      return { ok: true }
    },
    [items, persist, showToast],
  )

  const removeFromCart = useCallback(
    (productId) => {
      const removedItem = items.find(isPaidLine(productId))
      persist(items.filter((line) => !isPaidLine(productId)(line)))
      if (removedItem) {
        analytics.removeFromCart(removedItem, removedItem.quantity)
      }
    },
    [items, persist],
  )

  const clearCart = useCallback(() => {
    persist([])
    setLastAddedProductId(null)
    // Clear milestone tracking on cart clear
    writeShownMilestones({})
  }, [persist])

  const syncStockFromServer = useCallback(async () => {
    if (!items.length) return { items: [], issues: [] }

    setSyncing(true)
    try {
      // Filter out the free gift from server sync
      const realItems = items.filter((line) => !isFreeGiftItem(line))
      if (!realItems.length) {
        setSyncing(false)
        return { items, issues: [] }
      }

      const ids = realItems.map((line) => line.productId)
      const data = await fetchProductsByIds(ids)

      const byId = new Map((data ?? []).map((row) => [row.id, row]))
      const next = items.map((line) => {
        // Skip the free gift from server sync updates
        if (isFreeGiftItem(line)) return line

        const row = byId.get(line.productId)
        if (!row) return { ...line, stock: 0, outOfStock: true }
        const merged = { ...line, ...row }
        return {
          ...line,
          name: row.name ?? line.name,
          price: Number.isFinite(Number(row.price)) ? Number(row.price) : line.price,
          mrp: Number(row.mrp) > Number(row.price) ? Number(row.mrp) : null,
          stock: Math.max(0, Math.floor(Number(row.stock) || 0)),
          outOfStock: isProductSoldOut(merged),
          imageUrl: getPrimaryImageUrl(row) || line.imageUrl,
        }
      })

      persist(next)
      const issues = findCartStockIssues(next.filter((line) => !isFreeGiftItem(line)))
      return { items: next, issues }
    } catch {
      return { items, issues: findCartStockIssues(items.filter((line) => !isFreeGiftItem(line))) }
    } finally {
      setSyncing(false)
    }
  }, [items, persist])

  // ── Offer calculations (derived from items, excluding free gift) ──
  const eligibleSubtotal = useMemo(() => getEligibleSubtotal(items), [items])
  const cartOffers = useMemo(() => calculateCartOffers(eligibleSubtotal), [eligibleSubtotal])
  const freeGiftInCart = useMemo(() => items.some(isFreeGiftItem), [items])

  // ── Manual select free gift actions ──
  const addGiftToCart = useCallback((product) => {
    if (!cartOffers.freeGiftEligible) return { ok: false, message: 'You are not eligible for a free gift.' }
    if (product.price > CART_OFFERS.freeGift.maxValue) {
      return { ok: false, message: `Gift item must be worth ₹${CART_OFFERS.freeGift.maxValue} or less.` }
    }

    // Remove any existing free gift from items
    const filtered = items.filter((line) => !isFreeGiftItem(line))

    // Build the new free gift line item
    const giftLine = buildFreeGiftLineItem(product)

    // Persist the updated cart
    persist([...filtered, giftLine])
    showToast(`${product.name} added as your Free Gift!`, 'success')
    return { ok: true }
  }, [cartOffers.freeGiftEligible, items, persist, showToast])

  const removeGiftFromCart = useCallback(() => {
    persist(items.filter((line) => !isFreeGiftItem(line)))
  }, [items, persist])

  // ── Milestone toast notifications ──
  useEffect(() => {
    const prev = prevOffersRef.current
    prevOffersRef.current = cartOffers

    // Skip on first render (no previous state to compare)
    if (!prev) return

    const shown = getShownMilestones()

    // Crossed into gift eligibility
    if (cartOffers.freeGiftEligible && !prev.freeGiftEligible && !shown.gift) {
      setOfferMilestone('gift')
      markMilestoneShown('gift')
      return
    }

    // Crossed into coupon eligibility
    if (cartOffers.couponEligible && !prev.couponEligible && !shown.coupon) {
      setOfferMilestone('coupon')
      markMilestoneShown('coupon')
      return
    }

    // Gift was just removed (dropped below threshold)
    if (!cartOffers.freeGiftEligible && prev.freeGiftEligible) {
      setOfferMilestone('giftRemoved')
      // Reset the gift milestone so it can fire again if they re-qualify
      const shownNow = getShownMilestones()
      delete shownNow.gift
      writeShownMilestones(shownNow)
      return
    }

    // Near gift nudge (within ₹200 of gift threshold, and not yet shown)
    if (
      !cartOffers.freeGiftEligible &&
      cartOffers.couponEligible &&
      cartOffers.amountToGift > 0 &&
      cartOffers.amountToGift <= 200 &&
      (!prev.couponEligible || prev.amountToGift > 200) &&
      !shown.nearGift
    ) {
      setOfferMilestone('nearGift')
      markMilestoneShown('nearGift')
    }
  }, [cartOffers])

  // ── Item count and cart total (include all items for display) ──
  const itemCount = useMemo(() => getCartItemCount(items.filter((line) => !isFreeGiftItem(line))), [items])
  const cartTotal = useMemo(() => getCartTotal(items), [items])
  const stockIssues = useMemo(() => findCartStockIssues(items.filter((line) => !isFreeGiftItem(line))), [items])

  const value = useMemo(
    () => ({
      items,
      itemCount,
      cartTotal,
      stockIssues,
      hasStockIssues: stockIssues.length > 0,
      syncing,
      isCartDrawerOpen,
      lastAddedProductId,
      toast,
      dismissToast,
      openCartDrawer,
      closeCartDrawer,
      addToCart,
      setQuantity,
      removeFromCart,
      clearCart,
      syncStockFromServer,
      // ── Offer-related state ──
      cartOffers,
      eligibleSubtotal,
      freeGiftInCart,
      offerMilestone,
      dismissOfferMilestone,
      addGiftToCart,
      removeGiftFromCart,
    }),
    [
      items,
      itemCount,
      cartTotal,
      stockIssues,
      syncing,
      isCartDrawerOpen,
      lastAddedProductId,
      toast,
      dismissToast,
      openCartDrawer,
      closeCartDrawer,
      addToCart,
      setQuantity,
      removeFromCart,
      clearCart,
      syncStockFromServer,
      cartOffers,
      eligibleSubtotal,
      freeGiftInCart,
      offerMilestone,
      dismissOfferMilestone,
      addGiftToCart,
      removeGiftFromCart,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) {
    throw new Error('useCart must be used within CartProvider')
  }
  return ctx
}
