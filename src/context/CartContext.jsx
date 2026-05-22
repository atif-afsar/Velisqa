import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { loadCartItems, saveCartItems } from '../lib/cartStorage'
import {
  findCartStockIssues,
  getCartItemCount,
  getCartTotal,
  productToCartLine,
  validateCartQuantity,
} from '../lib/cartStock'
import { supabase } from '../lib/supabaseClient'
import { getPrimaryImageUrl } from '../lib/productImages'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => loadCartItems())
  const [toast, setToast] = useState(null)
  const [syncing, setSyncing] = useState(false)

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

  const addToCart = useCallback(
    (product, quantity = 1) => {
      const existing = items.find((line) => line.productId === product.id)
      const currentQty = existing?.quantity ?? 0
      const check = validateCartQuantity(product.stock, quantity, currentQty)

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

      showToast(`Added “${product.name}” to cart`, 'success')
      return { ok: true }
    },
    [items, persist, showToast],
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

      const check = validateCartQuantity(existing.stock, qty, 0)
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
      persist(items.filter((line) => line.productId !== productId))
    },
    [items, persist],
  )

  const clearCart = useCallback(() => {
    persist([])
  }, [persist])

  const syncStockFromServer = useCallback(async () => {
    if (!items.length) return { items: [], issues: [] }

    setSyncing(true)
    try {
      const ids = items.map((line) => line.productId)
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, stock, image_url, gallery_urls')
        .in('id', ids)

      if (error) throw error

      const byId = new Map((data ?? []).map((row) => [row.id, row]))
      const next = items.map((line) => {
        const row = byId.get(line.productId)
        if (!row) return { ...line, stock: 0 }
        return {
          ...line,
          name: row.name ?? line.name,
          price: Number(row.price) ?? line.price,
          stock: Math.max(0, Math.floor(Number(row.stock) || 0)),
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

  const value = useMemo(
    () => ({
      items,
      itemCount: getCartItemCount(items),
      cartTotal: getCartTotal(items),
      stockIssues: findCartStockIssues(items),
      hasStockIssues: findCartStockIssues(items).length > 0,
      syncing,
      toast,
      dismissToast,
      addToCart,
      setQuantity,
      removeFromCart,
      clearCart,
      syncStockFromServer,
    }),
    [
      items,
      syncing,
      toast,
      dismissToast,
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
