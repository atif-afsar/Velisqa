import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { loadWishlistIds, saveWishlistIds } from '../lib/wishlistStorage'

const WishlistContext = createContext(null)

export function WishlistProvider({ children }) {
  const [ids, setIds] = useState(() => loadWishlistIds())
  const [toast, setToast] = useState(null)

  const persist = useCallback((next) => {
    setIds(next)
    saveWishlistIds(next)
  }, [])

  const showToast = useCallback((message) => {
    setToast({ message, id: Date.now() })
  }, [])

  useEffect(() => {
    if (!toast) return undefined
    const t = window.setTimeout(() => setToast(null), 3500)
    return () => window.clearTimeout(t)
  }, [toast])

  const dismissToast = useCallback(() => setToast(null), [])

  const isWishlisted = useCallback((productId) => ids.includes(productId), [ids])

  const toggleWishlist = useCallback(
    (product) => {
      if (!product?.id) return { added: false }

      const exists = ids.includes(product.id)
      if (exists) {
        persist(ids.filter((id) => id !== product.id))
        showToast(`Removed “${product.name}” from wishlist`)
        return { added: false }
      }

      persist([product.id, ...ids])
      showToast(`Saved “${product.name}” to wishlist`)
      return { added: true }
    },
    [ids, persist, showToast],
  )

  const removeFromWishlist = useCallback(
    (productId) => {
      persist(ids.filter((id) => id !== productId))
    },
    [ids, persist],
  )

  const value = useMemo(
    () => ({
      wishlistIds: ids,
      wishlistCount: ids.length,
      toast,
      dismissToast,
      isWishlisted,
      toggleWishlist,
      removeFromWishlist,
    }),
    [ids, toast, dismissToast, isWishlisted, toggleWishlist, removeFromWishlist],
  )

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export function useWishlist() {
  const ctx = useContext(WishlistContext)
  if (!ctx) {
    throw new Error('useWishlist must be used within WishlistProvider')
  }
  return ctx
}
