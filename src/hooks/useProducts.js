import { useCallback, useEffect, useRef, useState } from 'react'
import { useCatalog } from '../context/CatalogContext'
import {
  readProductCatalogCache,
  writeProductCatalogCache,
} from '../lib/productCatalogCache'
import { fetchProductListWithRetry } from '../lib/productQuery'
import { supabase } from '../lib/supabaseClient'

const FOCUS_REFRESH_MS = 60_000

function getInitialProducts() {
  return readProductCatalogCache()?.data ?? []
}

export function useProducts() {
  const { catalogVersion } = useCatalog()
  const initialCache = useRef(getInitialProducts())
  const [products, setProducts] = useState(initialCache.current)
  const [loading, setLoading] = useState(initialCache.current.length === 0)
  const [error, setError] = useState(null)
  const [isStale, setIsStale] = useState(false)
  const lastFetchRef = useRef(0)

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!silent && products.length === 0) {
      const cached = readProductCatalogCache()
      if (cached?.data?.length) {
        setProducts(cached.data)
        setLoading(false)
        setIsStale(Boolean(cached.expired))
      }
    }

    if (!silent) setError(null)

    const { data, error: fetchError } = await fetchProductListWithRetry(supabase)

    if (fetchError) {
      const cached = readProductCatalogCache()
      if (cached?.data?.length) {
        setProducts(cached.data)
        setIsStale(true)
        setError(fetchError.message)
      } else {
        setProducts([])
        setError(fetchError.message)
        setIsStale(false)
      }
    } else {
      const next = data ?? []
      setProducts(next)
      writeProductCatalogCache(next)
      setError(null)
      setIsStale(false)
    }

    lastFetchRef.current = Date.now()
    setLoading(false)
    return { data: data ?? [], error: fetchError }
  }, [products.length])

  useEffect(() => {
    let cancelled = false

    refresh({ silent: initialCache.current.length > 0 }).then(() => {
      if (cancelled) return
    })

    return () => {
      cancelled = true
    }
  }, [catalogVersion, refresh])

  useEffect(() => {
    function maybeRefresh() {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - lastFetchRef.current < FOCUS_REFRESH_MS) return
      refresh({ silent: true })
    }

    window.addEventListener('focus', maybeRefresh)
    document.addEventListener('visibilitychange', maybeRefresh)
    return () => {
      window.removeEventListener('focus', maybeRefresh)
      document.removeEventListener('visibilitychange', maybeRefresh)
    }
  }, [refresh])

  return { products, loading, error, isStale, refresh, setProducts }
}
