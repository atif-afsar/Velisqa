import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ProductCard from '../Components/Product/ProductCard'
import SEOHead from '../Components/SEO/SEOHead'
import HomeFooter from '../Components/Home/HomeFooter'
import ProductFilters, { ProductFilterSidebar } from '../Components/Collections/ProductFilters'
import { useProducts } from '../hooks/useProducts'
import { searchProducts } from '../lib/productSearch'
import { POPULAR_SEARCHES, rememberSearch } from '../lib/popularSearches'
import {
  EMPTY_PRODUCT_FILTERS,
  filterAndSortProducts,
  getProductFacetOptions,
  readProductFilters,
  writeProductFilters,
} from '../lib/productFilters'

export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = (searchParams.get('q') || '').trim()
  const { products, loading, error } = useProducts()

  const searchMatches = useMemo(
    () => query.length >= 2 ? searchProducts(products, query) : [],
    [products, query],
  )
  const facets = useMemo(() => getProductFacetOptions(searchMatches), [searchMatches])
  const filters = useMemo(
    () => readProductFilters(searchParams, facets),
    [searchParams, facets],
  )
  const results = useMemo(
    () => filterAndSortProducts(searchMatches, filters),
    [searchMatches, filters],
  )

  function updateFilters(nextFilters) {
    setSearchParams(writeProductFilters(searchParams, nextFilters))
  }

  function clearFilters() {
    setSearchParams(writeProductFilters(searchParams, EMPTY_PRODUCT_FILTERS))
  }

  function submitSearch(value) {
    const clean = value.trim()
    if (clean.length < 2) return
    rememberSearch(clean)
    setSearchParams({ q: clean })
  }

  function chooseSearch(value) {
    rememberSearch(value)
    setSearchParams({ q: value })
  }

  const title = query ? `Search results for ${query} | Velisqa` : 'Search Jewellery | Velisqa'
  const description = query
    ? `Browse Velisqa jewellery matching ${query}. Discover rings, necklaces, earrings and more.`
    : 'Search Velisqa jewellery by product, category, metal, colour, style, or price.'

  return (
    <>
      <SEOHead
        title={title}
        description={description}
        canonicalPath="/search"
        noindex
      />

      <main className="page-offset-nav min-h-[70vh] bg-[#fdf9f4] text-[#130006]">
        <header className="border-b border-[#847377]/10 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.12),transparent_60%)]">
          <div className="container-stitch px-4 py-8 text-center sm:px-6 sm:py-12">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#847377]">Discover Velisqa</p>
            <h1 className="mt-2 font-serif text-3xl sm:text-4xl">Search jewellery</h1>
            <SearchForm key={query} initialValue={query} onSubmit={submitSearch} />
          </div>
        </header>

        <section className="container-stitch px-4 py-8 sm:px-6 sm:py-12">
          {error && products.length > 0 && (
            <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Showing saved catalogue results while the latest products reload.
            </p>
          )}

          {loading && products.length === 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-7 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="aspect-[3/5] animate-pulse rounded-lg bg-[#eee6de]" />
              ))}
            </div>
          ) : query.length < 2 ? (
            <SearchAlternatives onChoose={chooseSearch} />
          ) : searchMatches.length > 0 ? (
            <>
              <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#847377]">Search results</p>
                  <h2 className="mt-1 font-serif text-2xl">“{query}”</h2>
                </div>
                <p className="text-sm text-[#847377]">
                  {results.length} piece{results.length === 1 ? '' : 's'} found
                </p>
              </div>
              <ProductFilters
                facets={facets}
                filters={filters}
                onChange={updateFilters}
                onClear={clearFilters}
                resultCount={results.length}
              />
              {results.length > 0 ? (
                <div className="flex items-start gap-7">
                  <ProductFilterSidebar
                    facets={facets}
                    filters={filters}
                    onChange={updateFilters}
                    onClear={clearFilters}
                  />
                  <div className="grid min-w-0 flex-1 grid-cols-2 items-stretch gap-x-3 gap-y-6 sm:gap-x-7 sm:gap-y-10 lg:grid-cols-2 xl:grid-cols-3">
                    {results.map((product, index) => (
                      <ProductCard key={product.id} product={product} priority={index < 4} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-[#d4af37]/20 bg-white/55 px-5 py-12 text-center">
                  <p className="font-serif text-xl">No search results match these filters</p>
                  <p className="mt-2 text-sm text-[#847377]">Remove one filter or clear all to see more pieces.</p>
                  <button type="button" onClick={clearFilters} className="mt-5 rounded-full bg-[#3d0a21] px-5 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-[#f7ead0]">
                    Clear all filters
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="mx-auto max-w-xl py-10 text-center">
              <p className="font-serif text-2xl">No pieces matched “{query}”</p>
              <p className="mt-2 text-sm leading-relaxed text-[#847377]">
                Try a broader category, a metal such as gold or silver, or one of these popular searches.
              </p>
              <div className="mt-6">
                <SearchAlternatives onChoose={chooseSearch} compact />
              </div>
            </div>
          )}
        </section>
      </main>
      <HomeFooter />
    </>
  )
}

function SearchAlternatives({ onChoose, compact = false }) {
  return (
    <div className={compact ? '' : 'mx-auto max-w-3xl py-8 text-center'}>
      {!compact && <h2 className="font-serif text-2xl text-[#130006]">Popular searches</h2>}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {POPULAR_SEARCHES.map((item) => (
          <button
            key={item.query}
            type="button"
            onClick={() => onChoose(item.query)}
            className="rounded-full border border-[#3d0a21]/20 bg-white px-4 py-2 text-xs font-medium text-[#514347] transition hover:border-[#3d0a21]/45 hover:text-[#130006]"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function SearchForm({ initialValue, onSubmit }) {
  const [value, setValue] = useState(initialValue)
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(value)
      }}
      className="mx-auto mt-6 flex max-w-2xl gap-2"
    >
      <label className="sr-only" htmlFor="search-results-input">Search products</label>
      <input
        id="search-results-input"
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Try “gold ring” or “gifts under 1500”"
        className="min-h-12 min-w-0 flex-1 rounded-full border border-[#3d0a21]/20 bg-white px-5 text-sm outline-none focus:border-[#3d0a21]/45 focus:ring-2 focus:ring-[#d4af37]/20"
      />
      <button type="submit" className="min-h-12 shrink-0 rounded-full bg-[#3d0a21] px-5 text-xs font-bold uppercase tracking-[0.12em] text-[#f7ead0] sm:px-7">
        Search
      </button>
    </form>
  )
}
