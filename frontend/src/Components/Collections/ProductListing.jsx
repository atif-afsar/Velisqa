import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { isProductSoldOut } from '../../lib/cartStock'
import {
  EMPTY_PRODUCT_FILTERS,
  PRICE_BANDS,
  PRODUCT_SORT_OPTIONS,
  countActiveProductFilters,
  filterAndSortProducts,
  getProductFacetOptions,
  readProductFilters,
  writeProductFilters,
} from '../../lib/productFilters'
import ProductCard from '../Product/ProductCard'
import Drawer from '../UI/Drawer'
import { ChevronDownIcon } from '../UI/Icons'
import { ActiveFilterChips, FilterFields } from './ProductFilters'

const PAGE_SIZE = 24
const GRID = 'grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4 xl:gap-x-6 xl:gap-y-14'

function SkeletonGrid() {
  return (
    <div className={GRID} aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i}>
          <div className="aspect-[4/5] animate-pulse bg-mist" />
          <div className="mt-3 h-3 w-3/4 bg-mist" />
          <div className="mt-2 h-3 w-1/3 bg-mist" />
        </div>
      ))}
    </div>
  )
}

/**
 * Product grid with sticky filter/sort toolbar, filter drawer and "load more" pagination.
 * Filters and sort live in the URL so results are shareable and back-button friendly.
 *
 * `products` is the already-scoped list (category, search results…).
 * `facetSource` lets a category page hide the category facet.
 */
export default function ProductListing({ products, loading, error, hideCategoryFacet = false, emptyMessage = 'No pieces here yet.' }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [visible, setVisible] = useState(PAGE_SIZE)
  const sortId = useId()

  const facets = useMemo(() => {
    const all = getProductFacetOptions(products)
    return hideCategoryFacet ? { ...all, categories: [] } : all
  }, [products, hideCategoryFacet])
  const filters = useMemo(() => readProductFilters(searchParams, facets), [searchParams, facets])
  // Sold-out pieces always go to the end of the grid.
  const results = useMemo(() => {
    const sorted = filterAndSortProducts(products, filters)
    return [...sorted.filter((p) => !isProductSoldOut(p)), ...sorted.filter(isProductSoldOut)]
  }, [products, filters])
  const sentinelRef = useRef(null)
  const activeCount = countActiveProductFilters(filters)
  const filterKey = searchParams.toString()

  // Reset pagination when the result set changes.
  useEffect(() => {
    queueMicrotask(() => setVisible(PAGE_SIZE))
  }, [filterKey, products])

  function update(nextFilters) {
    setSearchParams(writeProductFilters(searchParams, nextFilters), { replace: true, preventScrollReset: true })
  }
  function clearAll() {
    update({ ...EMPTY_PRODUCT_FILTERS, sort: filters.sort })
  }

  const shown = results.slice(0, visible)

  // Phones: load the next page automatically near the end of the grid (the button stays as a fallback).
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || typeof IntersectionObserver === 'undefined' || !window.matchMedia('(max-width: 767px)').matches) return undefined
    const io = new IntersectionObserver(([entry]) => entry.isIntersecting && setVisible((v) => v + PAGE_SIZE), { rootMargin: '600px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [results.length, visible])

  const activeBand = PRICE_BANDS.find((b) => b.minPrice === filters.minPrice && b.maxPrice === filters.maxPrice)

  return (
    <div>
      {/* Sticky toolbar */}
      <div className="sticky top-[var(--nav-height)] z-30 border-y border-line bg-paper/95 backdrop-blur-sm">
        <div className="container-lux flex min-h-12 items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex min-h-11 items-center gap-2 text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-ink"
            aria-haspopup="dialog"
          >
            Filter
            <span className="text-[0.6875rem] font-normal normal-case tracking-normal text-muted sm:hidden">({results.length})</span>
            {activeCount > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[0.6875rem] text-white">{activeCount}</span>
            )}
          </button>
          <p className="hidden text-xs text-muted sm:block" aria-live="polite">
            {loading && !products.length ? 'Loading…' : `${results.length} ${results.length === 1 ? 'piece' : 'pieces'}`}
          </p>
          <div className="relative flex items-center">
            <label htmlFor={sortId} className="sr-only">
              Sort by
            </label>
            <select
              id={sortId}
              value={filters.sort}
              onChange={(e) => update({ ...filters, sort: e.target.value })}
              className="min-h-11 cursor-pointer appearance-none bg-transparent pr-6 text-right text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-ink outline-none"
            >
              {PRODUCT_SORT_OPTIONS.filter((o) => o.value !== 'rating-desc').map((o) => (
                <option key={o.value} value={o.value}>
                  {o.value === 'best-selling' ? 'Sort: Best selling' : o.label}
                </option>
              ))}
            </select>
            <ChevronDownIcon size={14} className="pointer-events-none absolute right-0" />
          </div>
        </div>
      </div>

      <div className="container-lux pb-20 pt-4 lg:pb-28">
        <div className="chip-row scrollbar-none -mx-4 mb-4 hidden gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex sm:px-0" role="group" aria-label="Price">
          {PRICE_BANDS.map((band) => {
            const on = activeBand === band
            return (
              <button
                key={band.label}
                type="button"
                aria-pressed={on}
                onClick={() => update({ ...filters, minPrice: on ? '' : band.minPrice, maxPrice: on ? '' : band.maxPrice })}
                className={`min-h-11 shrink-0 rounded-full border px-4 text-xs font-medium transition-colors ${on ? 'border-ink bg-ink text-white' : 'border-line-strong text-ink hover:border-ink'}`}
              >
                {band.label}
              </button>
            )
          })}
        </div>
        {activeCount > 0 && (
          <div className="mb-6">
            <ActiveFilterChips filters={filters} onChange={update} onClear={clearAll} />
          </div>
        )}


        {error && !products.length && (
          <p className="border border-line bg-mist px-4 py-3 text-sm text-body" role="alert">
            We couldn’t load products right now. Please check your connection and try again.
          </p>
        )}

        {loading && !products.length ? (
          <SkeletonGrid />
        ) : results.length === 0 ? (
          <div className="py-20 text-center">
            <p className="font-serif text-2xl text-ink">{products.length ? 'Nothing matches those filters' : emptyMessage}</p>
            {activeCount > 0 && (
              <button type="button" onClick={clearAll} className="btn btn-secondary mt-6">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <ul className={GRID}>
              {shown.map((product, i) => (
                <li key={product.id}>
                  <ProductCard product={product} priority={i < 4} />
                </li>
              ))}
            </ul>
            {results.length > visible && (
              <div className="mt-16 flex flex-col items-center gap-4">
                <p className="text-xs text-muted">
                  Showing {shown.length} of {results.length}
                </p>
                <div className="h-px w-48 bg-line" aria-hidden="true">
                  <div className="h-px bg-ink" style={{ width: `${(shown.length / results.length) * 100}%` }} />
                </div>
                <button type="button" onClick={() => setVisible((v) => v + PAGE_SIZE)} className="btn btn-secondary mt-2">
                  Load more
                </button>
                <span ref={sentinelRef} aria-hidden="true" />
              </div>
            )}
          </>
        )}
      </div>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        side="right"
        title="Filter"
        bodyClassName="px-5 py-6 sm:px-6"
        footer={
          <div className="grid grid-cols-2 gap-3 p-4 sm:p-5">
            <button type="button" onClick={clearAll} className="btn btn-secondary" disabled={activeCount === 0}>
              Clear
            </button>
            <button type="button" onClick={() => setDrawerOpen(false)} className="btn btn-primary">
              Show {results.length}
            </button>
          </div>
        }
      >
        <fieldset className="pb-6">
          <legend className="eyebrow mb-3 text-ink">Price band</legend>
          <div className="flex flex-wrap gap-2">
            {PRICE_BANDS.map((band) => {
              const on = activeBand === band
              return (
                <button
                  key={band.label}
                  type="button"
                  aria-pressed={on}
                  onClick={() => update({ ...filters, minPrice: on ? '' : band.minPrice, maxPrice: on ? '' : band.maxPrice })}
                  className={`min-h-11 rounded-full border px-4 text-xs font-medium ${on ? 'border-ink bg-ink text-white' : 'border-line-strong text-ink'}`}
                >
                  {band.label}
                </button>
              )
            })}
          </div>
        </fieldset>
        <FilterFields facets={facets} filters={filters} onChange={update} />
      </Drawer>
    </div>
  )
}
