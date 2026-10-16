import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import SEOHead from '../Components/SEO/SEOHead'
import ProductListing from '../Components/Collections/ProductListing'
import { useProducts } from '../hooks/useProducts'
import { searchProducts } from '../lib/productSearch'
import { POPULAR_SEARCHES, rememberSearch } from '../lib/popularSearches'
import { analytics } from '../lib/analytics'

export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = (searchParams.get('q') || '').trim()
  const { products, loading, error } = useProducts()

  useEffect(() => {
    if (query && query.length >= 2) analytics.search(query)
  }, [query])

  const matches = useMemo(() => (query.length >= 2 ? searchProducts(products, query) : []), [products, query])

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
  const showResults = query.length >= 2 && (matches.length > 0 || loading)

  return (
    <>
      <SEOHead title={title} description={description} canonicalPath="/search" noindex />

      <main className="page-offset-nav min-h-[70vh] bg-paper text-ink">
        <header className="container-lux pb-8 pt-8 text-center sm:pt-12">
          <p className="eyebrow text-muted">Search</p>
          <h1 className="type-display mt-4">{query ? `“${query}”` : 'Search jewellery'}</h1>
          <SearchForm key={query} initialValue={query} onSubmit={submitSearch} />
        </header>

        {showResults ? (
          <ProductListing products={matches} loading={loading} error={error} />
        ) : (
          <section className="container-lux pb-24">
            {query.length >= 2 && (
              <div className="mx-auto max-w-xl pb-8 text-center">
                <p className="font-serif text-2xl">No pieces matched “{query}”</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Try a broader category, a metal such as gold or silver, or one of these popular searches.
                </p>
              </div>
            )}
            <SearchAlternatives onChoose={chooseSearch} compact={query.length >= 2} />
          </section>
        )}
      </main>
    </>
  )
}

function SearchAlternatives({ onChoose, compact = false }) {
  return (
    <div className={compact ? '' : 'mx-auto max-w-3xl py-8 text-center'}>
      {!compact && <h2 className="font-serif text-2xl text-ink">Popular searches</h2>}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {POPULAR_SEARCHES.map((item) => (
          <button
            key={item.query}
            type="button"
            onClick={() => onChoose(item.query)}
            className="inline-flex min-h-10 items-center border border-line px-4 text-xs text-body transition hover:border-ink hover:text-ink"
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
        className="field min-w-0 flex-1"
      />
      <button type="submit" className="btn btn-primary shrink-0">
        Search
      </button>
    </form>
  )
}
