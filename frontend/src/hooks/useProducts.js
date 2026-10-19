import { useEffect, useSyncExternalStore } from 'react'
import { useCatalog } from '../context/CatalogContext'
import {
  readProductCatalogCache,
  writeProductCatalogCache,
} from '../lib/productCatalogCache'
import { fetchProductListWithRetry } from '../lib/productQuery'
import { getPrerenderData } from '../lib/prerenderData'

const FOCUS_REFRESH_MS = 60_000

/**
 * One catalogue for the whole app. Every component that calls useProducts()
 * shares this store, so the product list is fetched once per page view
 * (not once per component) and refreshed at most once a minute on focus.
 */
// First paint: the visitor's cached catalogue, else the catalogue baked into the prerendered page.
const cached = readProductCatalogCache()
const baked = getPrerenderData()?.products
const initialProducts = cached?.data?.length ? cached.data : (baked ?? [])
let state = {
  products: initialProducts,
  loading: initialProducts.length === 0,
  error: null,
  isStale: Boolean(cached?.expired),
}
let inFlight = null
let lastFetch = 0
let loadedVersion = -1
const listeners = new Set()

function setState(patch) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const getSnapshot = () => state

// Build-time render: the catalogue the prerender script provides for the current route.
let serverSnapshot = null
function getServerSnapshot() {
  const products = getPrerenderData()?.products ?? []
  if (serverSnapshot?.products !== products) serverSnapshot = { products, loading: false, error: null, isStale: false }
  return serverSnapshot
}

export function refreshProducts() {
  if (inFlight) return inFlight
  inFlight = (async () => {
    const { data, error } = await fetchProductListWithRetry()
    if (error) {
      setState({ loading: false, error: error.message, isStale: state.products.length > 0 })
    } else {
      const next = data ?? []
      writeProductCatalogCache(next)
      setState({ products: next, loading: false, error: null, isStale: false })
    }
    lastFetch = Date.now()
    return { data: data ?? [], error }
  })().finally(() => {
    inFlight = null
  })
  return inFlight
}

function maybeRefresh() {
  if (document.visibilityState !== 'visible') return
  if (Date.now() - lastFetch < FOCUS_REFRESH_MS) return
  void refreshProducts()
}

if (typeof window !== 'undefined') {
  window.addEventListener('focus', maybeRefresh)
  document.addEventListener('visibilitychange', maybeRefresh)
}

export function useProducts() {
  const { catalogVersion } = useCatalog()
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  // Fetch once per catalogue version (the admin bumps the version after edits).
  useEffect(() => {
    if (loadedVersion === catalogVersion) return
    loadedVersion = catalogVersion
    void refreshProducts()
  }, [catalogVersion])

  return { ...snapshot, refresh: refreshProducts }
}
