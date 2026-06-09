import { useCallback, useEffect, useRef, useState } from 'react'
import { useCatalog } from '../context/CatalogContext'
import {
  readProductCatalogCache,
  writeProductCatalogCache,
} from '../lib/productCatalogCache'
import { collectHomeShopImageUrls, preloadImageUrls } from '../lib/preloadImages'
import { fetchProductListWithRetry } from '../lib/productQuery'
import { supabase } from '../lib/supabaseClient'

/**
 * Homepage shop grid: show cached catalogue instantly, refresh in background,
 * preload images after first paint.
 */
export function useHomeShopPreload() {
  const { catalogVersion } = useCatalog()
  const initialCache = useRef(readProductCatalogCache())
  const [products, setProducts] = useState(() => initialCache.current?.data ?? [])
  const [loading, setLoading] = useState(!(initialCache.current?.data?.length > 0))
  const [error, setError] = useState(null)

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setError(null)

    const { data, error: fetchError } = await fetchProductListWithRetry(supabase)

    if (fetchError) {
      const cached = readProductCatalogCache()
      if (cached?.data?.length) {
        setProducts(cached.data)
        setError(fetchError.message)
      } else {
        setProducts([])
        setError(fetchError.message)
      }
    } else {
      const next = data ?? []
      setProducts(next)
      writeProductCatalogCache(next)
      setError(null)
      if (next.length > 0) {
        preloadImageUrls(collectHomeShopImageUrls(next))
      }
    }

    setLoading(false)
    return data ?? []
  }, [])

  useEffect(() => {
    let cancelled = false

    const cached = initialCache.current
    if (cached?.data?.length) {
      preloadImageUrls(collectHomeShopImageUrls(cached.data))
    }

    const start = () => {
      if (cancelled) return
      refresh({ silent: Boolean(cached?.data?.length) })
    }

    if (cached?.data?.length) {
      start()
    } else if (document.readyState === 'complete') {
      start()
    } else {
      window.addEventListener('load', start, { once: true })
    }

    return () => {
      cancelled = true
      window.removeEventListener('load', start)
    }
  }, [catalogVersion, refresh])

  useEffect(() => {
    const t = window.setTimeout(() => {
      import('../Components/Home/HomeShopGrid')
    }, 1500)
    return () => window.clearTimeout(t)
  }, [])

  return { products, loading, error, refresh, setProducts }
}
