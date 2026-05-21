import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useCatalog } from '../context/CatalogContext'
import { supabase } from '../lib/supabaseClient'

export function useProducts() {
  const { catalogVersion } = useCatalog()
  const location = useLocation()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setProducts([])
    } else {
      setProducts(data ?? [])
    }
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
  }, [catalogVersion, location.pathname, refresh])

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') {
        refresh()
      }
    }

    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh])

  return { products, loading, error, refresh, setProducts }
}
