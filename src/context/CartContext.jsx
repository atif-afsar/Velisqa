import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { loadCartItems, saveCartItems } from '../lib/cartStorage'
import {
  findCartStockIssues,
  getCartItemCount,
  getCartTotal,
  isProductSoldOut,
  productToCartLine,
  validateCartQuantity,
} from '../lib/cartStock'
import { supabase } from '../lib/supabaseClient'
import { getPrimaryImageUrl } from '../lib/productImages'
import { analytics } from '../lib/analytics'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => loadCartItems())
  const [toast, setToast] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false)
  const [lastAddedProductId, setLastAddedProductId] = useState(null)

  const persist = useCallback((next) => {
    setItems(next)
    saveCartItems(next)
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
  const openCartDrawer = useCallback(() => setIsCartDrawerOpen(true), [])
  const closeCartDrawer = useCallback(() => {
    setIsCartDrawerOpen(false)
    setLastAddedProductId(null)
  }, [])

  const addToCartInternal = useCallback(
    (product, quantity = 1) => {
      const existing = items.find((line) => line.productId === product.id)
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
          items.map((item) =>
            item.productId === product.id ? { ...item, ...line, quantity: line.quantity } : item,
          ),
        )
      } else {
        persist([...items, line])
      }

      setLastAddedProductId(product.id)
      setIsCartDrawerOpen(true)
      analytics.addToCart(product, quantity)
      return { ok: true }
    },
    [items, persist, showToast],
  )

  const addToCart = useCallback(
    (product, quantity = 1) => addToCartInternal(product, quantity),
    [addToCartInternal],
  )

  const setQuantity = useCallback(
    (productId, quantity) => {
      const existing = items.find((line) => line.productId === productId)
      if (!existing) return { ok: false }

      const qty = Math.floor(Number(quantity) || 0)
      if (qty <= 0) {
        persist(items.filter((line) => line.productId !== productId))
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
        items.map((line) => (line.productId === productId ? { ...line, quantity: qty } : line)),
      )
      return { ok: true }
    },
    [items, persist, showToast],
  )

  const removeFromCart = useCallback(
    (productId) => {
      const removedItem = items.find((line) => line.productId === productId)
      persist(items.filter((line) => line.productId !== productId))
      if (removedItem) {
        analytics.removeFromCart(removedItem, removedItem.quantity)
      }
    },
    [items, persist],
  )

  const clearCart = useCallback(() => {
    persist([])
    setLastAddedProductId(null)
  }, [persist])

  const syncStockFromServer = useCallback(async () => {
    if (!items.length) return { items: [], issues: [] }

    setSyncing(true)
    try {
      const ids = items.map((line) => line.productId)
      const run = (columns) => supabase.from('products').select(columns).in('id', ids)
      let supportsMrp = true
      let { data, error } = await run(
        'id, name, price, mrp, stock, out_of_stock, image_url, gallery_urls',
      )

      if (error?.message?.includes('mrp')) {
        supportsMrp = false
        ;({ data, error } = await run(
          'id, name, price, stock, out_of_stock, image_url, gallery_urls',
        ))
      }
      if (error?.message?.includes('out_of_stock')) {
        ;({ data, error } = await run(
          supportsMrp
            ? 'id, name, price, mrp, stock, image_url, gallery_urls'
            : 'id, name, price, stock, image_url, gallery_urls',
        ))
      }

      if (error) throw error

      const byId = new Map((data ?? []).map((row) => [row.id, row]))
      const next = items.map((line) => {
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
      const issues = findCartStockIssues(next)
      return { items: next, issues }
    } catch {
      return { items, issues: findCartStockIssues(items) }
    } finally {
      setSyncing(false)
    }
  }, [items, persist])

  const itemCount = useMemo(() => getCartItemCount(items), [items])
  const cartTotal = useMemo(() => getCartTotal(items), [items])
  const stockIssues = useMemo(() => findCartStockIssues(items), [items])

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
