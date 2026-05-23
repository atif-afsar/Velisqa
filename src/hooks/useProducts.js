import { useCallback, useEffect, useRef, useState } from 'react'
import { useCatalog } from '../context/CatalogContext'
import { PRODUCT_LIST_SELECT } from '../lib/productQuery'
import { supabase } from '../lib/supabaseClient'

const FOCUS_REFRESH_MS = 60_000

export function useProducts() {
  const { catalogVersion } = useCatalog()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const lastFetchRef = useRef(0)

  const refresh = useCallback(async () => {
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
    lastFetchRef.current = Date.now()
    setLoading(false)
    return { data: data ?? [], error: fetchError }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    refresh().then(() => {
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
      refresh()
    }

    window.addEventListener('focus', maybeRefresh)
    document.addEventListener('visibilitychange', maybeRefresh)
    return () => {
      window.removeEventListener('focus', maybeRefresh)
      document.removeEventListener('visibilitychange', maybeRefresh)
    }
  }, [refresh])

  return { products, loading, error, refresh, setProducts }
}
