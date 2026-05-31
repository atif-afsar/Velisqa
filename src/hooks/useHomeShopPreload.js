import { useEffect } from 'react'
import { collectHomeShopImageUrls, preloadImageUrls } from '../lib/preloadImages'
import { useProducts } from './useProducts'

/**
 * On the homepage: fetch the catalogue immediately and preload every #home-shop
 * product image in the background so the grid feels instant when scrolled into view.
 */
export function useHomeShopPreload() {
  const catalog = useProducts()

  useEffect(() => {
    import('../Components/Home/HomeShopGrid')
  }, [])

  useEffect(() => {
    if (catalog.loading || catalog.products.length === 0) return
    preloadImageUrls(collectHomeShopImageUrls(catalog.products))
  }, [catalog.loading, catalog.products])

  return catalog
}
