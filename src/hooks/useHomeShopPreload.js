import { useCallback, useEffect, useState } from 'react'
import { useCatalog } from '../context/CatalogContext'
import { collectHomeShopImageUrls, preloadImageUrls } from '../lib/preloadImages'
import { PRODUCT_LIST_SELECT } from '../lib/productQuery'
import { supabase } from '../lib/supabaseClient'

/**
 * On the homepage: fetch catalogue and preload #home-shop images only after the
 * hero has painted (window load + idle), so LCP/TBT are not competing with the
 * shop grid on first paint.
 */
export function useHomeShopPreload() {
  const { catalogVersion } = useCatalog()
  const [products, setProducts] = useState([])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setStatus('loading')
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('products')
      .select(PRODUCT_LIST_SELECT)
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setProducts([])
    } else {
      setProducts(data ?? [])
    }
    setStatus('ready')
    return data ?? []
  }, [])

  useEffect(() => {
    let cancelled = false

    const start = () => {
      if (cancelled) return
      refresh().then((data) => {
        if (!cancelled && data.length > 0) {
          preloadImageUrls(collectHomeShopImageUrls(data))
        }
      })
    }

    const defer = () => {
      if ('requestIdleCallback' in window) {
        return requestIdleCallback(start, { timeout: 6000 })
      }
      return window.setTimeout(start, 2000)
    }

    let idleId
    if (document.readyState === 'complete') {
      idleId = defer()
    } else {
      const onLoad = () => {
        idleId = defer()
      }
      window.addEventListener('load', onLoad, { once: true })
      return () => {
        cancelled = true
        window.removeEventListener('load', onLoad)
        if (typeof idleId === 'number') window.clearTimeout(idleId)
        else if (idleId && typeof cancelIdleCallback === 'function') cancelIdleCallback(idleId)
      }
    }

    return () => {
      cancelled = true
      if (typeof idleId === 'number') window.clearTimeout(idleId)
      else if (idleId && typeof cancelIdleCallback === 'function') cancelIdleCallback(idleId)
    }
  }, [catalogVersion, refresh])

  useEffect(() => {
    const t = window.setTimeout(() => {
      import('../Components/Home/HomeShopGrid')
    }, 2500)
    return () => window.clearTimeout(t)
  }, [])

  const loading = status !== 'ready'

  return { products, loading, error, refresh, setProducts }
}
