import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import { useProducts } from '../../hooks/useProducts'
import { getMatchingCategories, searchProducts } from '../../lib/productSearch'
import {
  clearRecentSearches,
  POPULAR_SEARCHES,
  readRecentSearches,
  rememberSearch,
} from '../../lib/popularSearches'
import { PRODUCT_CATEGORIES } from '../../lib/productCategories'
import { getPrimaryImageUrl } from '../../lib/productImages'
import { formatInr, getPromoPriceDisplay } from '../../lib/promoPricing'
import { isProductSoldOut } from '../../lib/cartStock'

const MAX_SUGGESTIONS = 6

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function HighlightedName({ name, query }) {
  const clean = query.trim()
  if (!clean) return name
  const index = name.toLowerCase().indexOf(clean.toLowerCase())
  if (index < 0) return name
  return (
    <>
      {name.slice(0, index)}
      <mark className="bg-[#e9c349]/35 text-inherit">{name.slice(index, index + clean.length)}</mark>
      {name.slice(index + clean.length)}
    </>
  )
}

export default function SearchDialog({ onClose }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { products, loading } = useProducts()
  const initialQuery = location.pathname === '/search'
    ? new URLSearchParams(location.search).get('q') || ''
    : ''
  const [query, setQuery] = useState(initialQuery)
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [recent, setRecent] = useState(readRecentSearches)
  const dialogRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 180)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    inputRef.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  const suggestions = useMemo(
    () => debouncedQuery.length >= 2
      ? searchProducts(products, debouncedQuery, { limit: MAX_SUGGESTIONS })
      : [],
    [debouncedQuery, products],
  )
  const categoryMatches = useMemo(
    () => debouncedQuery.length >= 2 ? getMatchingCategories(products, debouncedQuery) : [],
    [debouncedQuery, products],
  )

  function openResults(value = query) {
    const clean = value.trim()
    if (clean.length < 2) return
    rememberSearch(clean)
    navigate(`/search?q=${encodeURIComponent(clean)}`)
    onClose()
  }

  function openProduct(product) {
    rememberSearch(query || product.name)
    navigate(`/product/${product.id}`)
    onClose()
  }

  function handleInputKeyDown(event) {
    const count = suggestions.length + 1
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => (current + 1) % count)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => (current <= 0 ? count - 1 : current - 1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        openProduct(suggestions[activeIndex])
      } else {
        openResults()
      }
    } else if (event.key === 'Escape') {
      onClose()
    }
  }

  function handleDialogKeyDown(event) {
    if (event.key === 'Escape') {
      onClose()
      return
    }
    if (event.key !== 'Tab') return

    const focusable = dialogRef.current?.querySelectorAll(
      'button:not([disabled]), a[href], input:not([disabled])',
    )
    if (!focusable?.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const content = query.trim().length < 2

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="presentation" onKeyDown={handleDialogKeyDown}>
      <button
        type="button"
        className="absolute inset-0 bg-[#130006]/55 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close search"
      />
      <motion.section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-dialog-title"
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mx-auto flex max-h-[min(90vh,760px)] w-full max-w-3xl flex-col overflow-hidden bg-[#fdf9f4] shadow-2xl sm:mt-6 sm:rounded-2xl"
      >
        <div className="border-b border-[#847377]/15 px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#847377]">Find your piece</p>
              <h2 id="search-dialog-title" className="font-serif text-xl text-[#130006]">Search Velisqa</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 place-items-center rounded-full border border-[#847377]/20 text-xl text-[#514347]"
              aria-label="Close search"
            >
              ×
            </button>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-full border border-[#3d0a21]/20 bg-white px-4 focus-within:border-[#3d0a21]/45 focus-within:ring-2 focus-within:ring-[#d4af37]/20">
            <SearchIcon />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setActiveIndex(-1)
              }}
              onKeyDown={handleInputKeyDown}
              className="min-h-12 w-full bg-transparent text-base text-[#130006] outline-none placeholder:text-[#847377]"
              placeholder="Search rings, gold jewellery, gifts under ₹1,500…"
              aria-label="Search products"
              aria-controls="search-suggestions"
              aria-activedescendant={activeIndex >= 0 ? `search-option-${activeIndex}` : undefined}
              autoComplete="off"
            />
          </div>
        </div>

        <div id="search-suggestions" className="overflow-y-auto px-4 py-5 sm:px-6">
          {content ? (
            <div className="grid gap-6 sm:grid-cols-2">
              {recent.length > 0 && (
                <section>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[#514347]">Recent searches</h3>
                    <button
                      type="button"
                      onClick={() => {
                        clearRecentSearches()
                        setRecent([])
                      }}
                      className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#847377] hover:text-[#3d0a21]"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {recent.map((item) => (
                      <button key={item} type="button" onClick={() => openResults(item)} className="rounded-full border border-[#847377]/20 bg-white px-3 py-2 text-xs text-[#514347] hover:border-[#3d0a21]/30">
                        {item}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[#514347]">Popular searches</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {POPULAR_SEARCHES.map((item) => (
                    <button key={item.query} type="button" onClick={() => openResults(item.query)} className="rounded-full bg-[#3d0a21] px-3 py-2 text-xs text-[#f7ead0] hover:bg-[#2a0718]">
                      {item.label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="sm:col-span-2">
                <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[#514347]">Shop by category</h3>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {PRODUCT_CATEGORIES.map((category) => (
                    <button key={category} type="button" onClick={() => openResults(category)} className="rounded-xl border border-[#d4af37]/20 bg-white px-3 py-3 text-left font-serif text-sm text-[#130006] hover:border-[#d4af37]/50">
                      {category}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          ) : loading ? (
            <p className="py-8 text-center text-sm text-[#847377]">Searching the collection…</p>
          ) : suggestions.length > 0 ? (
            <>
              <ul className="space-y-2" role="listbox" aria-label="Product suggestions">
                {suggestions.map((product, index) => {
                  const pricing = getPromoPriceDisplay(product)
                  const soldOut = isProductSoldOut(product)
                  return (
                    <li key={product.id}>
                      <button
                        id={`search-option-${index}`}
                        type="button"
                        role="option"
                        aria-selected={activeIndex === index}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => openProduct(product)}
                        className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition ${activeIndex === index ? 'bg-[#f1e7dc]' : 'hover:bg-[#f7f0e8]'}`}
                      >
                        <img src={getPrimaryImageUrl(product)} alt="" className="h-16 w-14 shrink-0 rounded-lg bg-[#eee6de] object-cover" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-serif text-base text-[#130006]">
                            <HighlightedName name={product.name} query={debouncedQuery} />
                          </span>
                          <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.1em] text-[#847377]">
                            {product.category}{soldOut ? ' · Out of stock' : ' · In stock'}
                          </span>
                        </span>
                        <span className="shrink-0 text-right text-sm font-semibold text-[#3d0a21]">
                          {formatInr(pricing.sale)}
                          {pricing.hasPromo && <span className="block text-[10px] font-normal text-[#847377] line-through">{formatInr(pricing.compare)}</span>}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>

              {categoryMatches.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#847377]/10 pt-4">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#847377]">Categories</span>
                  {categoryMatches.map((category) => (
                    <button key={category} type="button" onClick={() => openResults(category)} className="rounded-full border border-[#847377]/20 px-3 py-1.5 text-xs text-[#514347]">
                      {category}
                    </button>
                  ))}
                </div>
              )}

              <button
                id={`search-option-${suggestions.length}`}
                type="button"
                onMouseEnter={() => setActiveIndex(suggestions.length)}
                onClick={() => openResults()}
                className={`mt-4 w-full rounded-full px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] ${activeIndex === suggestions.length ? 'bg-[#2a0718]' : 'bg-[#3d0a21]'} text-[#f7ead0]`}
              >
                View all results for “{query.trim()}”
              </button>
            </>
          ) : (
            <div className="py-10 text-center">
              <p className="font-serif text-xl text-[#130006]">No matching pieces found</p>
              <p className="mt-2 text-sm text-[#847377]">Try a category, colour, or simpler phrase.</p>
              <button type="button" onClick={() => setQuery('')} className="mt-4 rounded-full border border-[#3d0a21]/25 px-5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#3d0a21]">
                Browse popular searches
              </button>
            </div>
          )}
        </div>
      </motion.section>
    </div>,
    document.body,
  )
}
