import { useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getLenis } from '../../lib/smoothScrollState'
import {
  PRODUCT_CATEGORIES,
  getCategoryFromParam,
  getCategoryParamSlug,
  groupProductsByCategory,
} from '../../lib/productCategories'
import {
  EMPTY_PRODUCT_FILTERS,
  filterAndSortProducts,
  getProductFacetOptions,
  readProductFilters,
  writeProductFilters,
  PRODUCT_SORT_OPTIONS,
  countActiveProductFilters,
} from '../../lib/productFilters'
import { useProducts } from '../../hooks/useProducts'
import { CategoryPill, CategoryPillRow } from '../Common/CategoryPills'
import ProductCard from '../Product/ProductCard'
import ProductFilters, { ProductFilterSidebar } from './ProductFilters'

export default function SignatureCollection() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { products, loading, error: fetchError } = useProducts()
  const stickyBarRef = useRef(null)

  const grouped = useMemo(
    () => groupProductsByCategory(products, PRODUCT_CATEGORIES),
    [products],
  )

  const categoryFromUrl = getCategoryFromParam(searchParams.get('category'))
  const activeCategory =
    categoryFromUrl && PRODUCT_CATEGORIES.includes(categoryFromUrl)
      ? categoryFromUrl
      : PRODUCT_CATEGORIES[0]

  const categoryProducts = useMemo(
    () => grouped[activeCategory] ?? [],
    [grouped, activeCategory],
  )
  const totalPieces = PRODUCT_CATEGORIES.reduce((sum, cat) => sum + (grouped[cat]?.length ?? 0), 0)
  const facets = useMemo(() => getProductFacetOptions(products), [products])
  const collectionFacets = useMemo(() => ({ ...facets, categories: [] }), [facets])
  const filters = useMemo(
    () => readProductFilters(searchParams, collectionFacets),
    [searchParams, collectionFacets],
  )
  const filteredProducts = useMemo(
    () => filterAndSortProducts(categoryProducts, filters),
    [categoryProducts, filters],
  )

  useEffect(() => {
    const el = stickyBarRef.current
    if (!el) return undefined

    const syncStickyBarHeight = () => {
      const height = Math.ceil(el.getBoundingClientRect().height)
      if (height > 0) {
        document.documentElement.style.setProperty('--collection-sticky-bar', `${height}px`)
      }
    }

    syncStickyBarHeight()
    const observer = new ResizeObserver(syncStickyBarHeight)
    observer.observe(el)
    window.addEventListener('resize', syncStickyBarHeight)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', syncStickyBarHeight)
      document.documentElement.style.removeProperty('--collection-sticky-bar')
    }
  }, [activeCategory])

  useEffect(() => {
    if (!categoryFromUrl) return

    requestAnimationFrame(() => {
      const target = document.getElementById('signature')
      if (!target) return
      const lenis = getLenis()
      if (lenis) {
        lenis.scrollTo(target, { offset: -88, duration: 1.05 })
      } else {
        target.scrollIntoView({ block: 'start', behavior: 'instant' })
      }
    })
  }, [categoryFromUrl])

  function handleCategoryChange(categoryTitle) {
    const next = new URLSearchParams(searchParams)
    next.set('category', getCategoryParamSlug(categoryTitle))
    setSearchParams(next)
  }

  function handleFiltersChange(nextFilters) {
    setSearchParams(writeProductFilters(searchParams, nextFilters))
  }

  function handleSortChange(sort) {
    setSearchParams(writeProductFilters(searchParams, { ...filters, sort }))
  }

  function clearFilters() {
    setSearchParams(writeProductFilters(searchParams, EMPTY_PRODUCT_FILTERS))
  }

  return (
    <section
      id="signature"
      className="scroll-mt-[calc(var(--nav-height)+0.5rem)] pb-16 md:pb-24"
    >
      <div
        ref={stickyBarRef}
        className="sticky top-[calc(var(--nav-height)+env(safe-area-inset-top,0px))] z-40 isolate border-b border-black/8 bg-white shadow-[0_4px_16px_rgba(19,0,6,0.06)]"
      >
        <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-10">
          <p className="pt-4 pb-2 text-center text-[12px] font-medium uppercase tracking-[0.24em] text-[#130006] sm:pt-5 sm:text-[13px] sm:tracking-[0.28em]">
            {activeCategory}
          </p>
          <div className="flex items-center gap-2 pb-3 sm:gap-3 md:pb-3.5">
            <CategoryPillRow scrollable className="flex-1">
              {PRODUCT_CATEGORIES.map((category) => {
                const isActive = category === activeCategory
                const count = grouped[category]?.length ?? 0

                return (
                  <CategoryPill
                    key={category}
                    active={isActive}
                    label={category}
                    count={count}
                    onClick={() => handleCategoryChange(category)}
                  />
                )
              })}
            </CategoryPillRow>

            <label className="hidden shrink-0 items-center lg:flex">
              <span className="sr-only">Sort products</span>
              <select
                value={filters.sort}
                onChange={(event) => handleSortChange(event.target.value)}
                className="h-8 rounded-full border border-black/10 bg-white px-3.5 text-[12px] text-[#333] outline-none"
              >
                {PRODUCT_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="relative z-0 mx-auto w-full max-w-[1600px] px-4 pt-5 sm:px-6 sm:pt-6 lg:px-10 lg:pt-8">
        <div className="lg:hidden">
          <ProductFilters
            facets={collectionFacets}
            filters={filters}
            onChange={handleFiltersChange}
            onClear={clearFilters}
            resultCount={filteredProducts.length}
          />
        </div>

        {fetchError && (
          <p className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            Could not load products. Check your connection and try again.
          </p>
        )}

        <div className="flex items-start gap-8 xl:gap-10">
          <ProductFilterSidebar
            facets={collectionFacets}
            filters={filters}
            onChange={handleFiltersChange}
            onClear={clearFilters}
            stickyTopClass="top-[calc(var(--nav-height)+var(--collection-sticky-bar,5.5rem)+0.75rem)]"
          />

          <div className="min-w-0 flex-1">
            <p className="mb-4 hidden text-[13px] text-[#666] lg:block">
              {loading ? 'Loading…' : `${filteredProducts.length} products`}
            </p>

            {loading && categoryProducts.length === 0 && (
              <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-2 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-5 lg:gap-y-10 xl:grid-cols-4">
                {Array.from({ length: 9 }, (_, i) => (
                  <div key={`signature-skeleton-${i}`} className="animate-pulse">
                    <div className="aspect-[3/4] bg-[#f0f0f0]" />
                    <div className="mt-3 h-3 w-3/4 bg-[#f0f0f0]" />
                    <div className="mt-2 h-3 w-1/3 bg-[#f0f0f0]" />
                  </div>
                ))}
              </div>
            )}

            {!loading && !fetchError && totalPieces === 0 && (
              <p className="py-16 text-center text-sm text-[#666]">No products available yet.</p>
            )}

            {!loading && !fetchError && totalPieces > 0 && categoryProducts.length === 0 && (
              <p className="py-16 text-center text-sm text-[#666]">
                No products in this category yet.
              </p>
            )}

            {!loading && categoryProducts.length > 0 && filteredProducts.length === 0 && (
              <div className="py-16 text-center">
                <p className="text-sm text-[#666]">No products match your filters.</p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 text-[13px] font-medium text-[#130006] underline-offset-2 hover:underline"
                >
                  Clear filters
                </button>
              </div>
            )}

            {categoryProducts.length > 0 && filteredProducts.length > 0 && (
              <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-5 lg:gap-y-10 xl:grid-cols-4">
                {filteredProducts.map((product, i) => (
                  <ProductCard key={product.id} product={product} priority={i < 6} variant="catalog" />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
