import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import {
  useLocation,
  useNavigate,
} from 'react-router-dom'

import { useProducts } from '../../hooks/useProducts'
import {
  getMatchingCategories,
  searchProducts,
} from '../../lib/productSearch'

import {
  clearRecentSearches,
  POPULAR_SEARCHES,
  readRecentSearches,
  rememberSearch,
} from '../../lib/popularSearches'

import { PRODUCT_CATEGORIES } from '../../lib/productCategories'
import { getPrimaryImageUrl } from '../../lib/productImages'
import {
  formatInr,
  getPromoPriceDisplay,
} from '../../lib/promoPricing'
import { isProductSoldOut } from '../../lib/cartStock'

const MAX_SUGGESTIONS = 6

/* ============================================================
   ICONS
============================================================ */

function SearchIcon({ size = 21 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="11"
        cy="11"
        r="6.5"
        stroke="currentColor"
        strokeWidth="1.35"
      />

      <path
        d="m16 16 4 4"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 12h13"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />

      <path
        d="m13 6 6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 6l12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="8"
        stroke="currentColor"
        strokeWidth="1.3"
      />

      <path
        d="M12 7.5V12l3 2"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* ============================================================
   HIGHLIGHT SEARCH TERM
============================================================ */

function HighlightedName({
  name,
  query,
}) {
  const clean = query.trim()

  if (!clean) return name

  const index = name
    .toLowerCase()
    .indexOf(clean.toLowerCase())

  if (index < 0) return name

  return (
    <>
      {name.slice(0, index)}

      <mark
        className="
          bg-[#d4af37]/15
          text-[#3d0a21]
        "
      >
        {name.slice(
          index,
          index + clean.length,
        )}
      </mark>

      {name.slice(
        index + clean.length,
      )}
    </>
  )
}

/* ============================================================
   SEARCH DIALOG
============================================================ */

export default function SearchDialog({
  onClose,
}) {
  const navigate = useNavigate()
  const location = useLocation()

  const {
    products,
    loading,
  } = useProducts()

  const initialQuery =
    location.pathname === '/search'
      ? new URLSearchParams(
          location.search,
        ).get('q') || ''
      : ''

  const [query, setQuery] =
    useState(initialQuery)

  const [
    debouncedQuery,
    setDebouncedQuery,
  ] = useState(initialQuery)

  const [activeIndex, setActiveIndex] =
    useState(-1)

  const [recent, setRecent] =
    useState(readRecentSearches)

  const dialogRef = useRef(null)
  const inputRef = useRef(null)

  /* ==========================================================
     DEBOUNCE
  ========================================================== */

  useEffect(() => {
    const timer = window.setTimeout(
      () =>
        setDebouncedQuery(
          query.trim(),
        ),
      180,
    )

    return () =>
      window.clearTimeout(timer)
  }, [query])

  /* ==========================================================
     BODY LOCK + AUTO FOCUS
  ========================================================== */

  useEffect(() => {
    const previousOverflow =
      document.body.style.overflow

    document.body.style.overflow =
      'hidden'

    inputRef.current?.focus()

    return () => {
      document.body.style.overflow =
        previousOverflow
    }
  }, [])

  /* ==========================================================
     SEARCH RESULTS
  ========================================================== */

  const suggestions = useMemo(
    () =>
      debouncedQuery.length >= 2
        ? searchProducts(
            products,
            debouncedQuery,
            {
              limit: MAX_SUGGESTIONS,
            },
          )
        : [],
    [
      debouncedQuery,
      products,
    ],
  )

  const categoryMatches = useMemo(
    () =>
      debouncedQuery.length >= 2
        ? getMatchingCategories(
            products,
            debouncedQuery,
          )
        : [],
    [
      debouncedQuery,
      products,
    ],
  )

  const hasQuery =
    query.trim().length >= 2

  /* ==========================================================
     NAVIGATION
  ========================================================== */

  function openResults(
    value = query,
  ) {
    const clean = value.trim()

    if (clean.length < 2) return

    rememberSearch(clean)

    navigate(
      `/search?q=${encodeURIComponent(
        clean,
      )}`,
    )

    onClose()
  }

  function openProduct(product) {
    rememberSearch(
      query || product.name,
    )

    navigate(
      `/product/${product.id}`,
    )

    onClose()
  }

  /* ==========================================================
     KEYBOARD NAVIGATION
  ========================================================== */

  function handleInputKeyDown(
    event,
  ) {
    const count =
      suggestions.length + 1

    if (
      event.key === 'ArrowDown'
    ) {
      event.preventDefault()

      setActiveIndex(
        (current) =>
          (current + 1) % count,
      )
    } else if (
      event.key === 'ArrowUp'
    ) {
      event.preventDefault()

      setActiveIndex(
        (current) =>
          current <= 0
            ? count - 1
            : current - 1,
      )
    } else if (
      event.key === 'Enter'
    ) {
      event.preventDefault()

      if (
        activeIndex >= 0 &&
        activeIndex <
          suggestions.length
      ) {
        openProduct(
          suggestions[
            activeIndex
          ],
        )
      } else {
        openResults()
      }
    } else if (
      event.key === 'Escape'
    ) {
      onClose()
    }
  }

  /* ==========================================================
     FOCUS TRAP
  ========================================================== */

  function handleDialogKeyDown(
    event,
  ) {
    if (event.key === 'Escape') {
      onClose()
      return
    }

    if (event.key !== 'Tab') return

    const focusable =
      dialogRef.current?.querySelectorAll(
        'button:not([disabled]), a[href], input:not([disabled])',
      )

    if (!focusable?.length) return

    const first = focusable[0]
    const last =
      focusable[
        focusable.length - 1
      ]

    if (
      event.shiftKey &&
      document.activeElement ===
        first
    ) {
      event.preventDefault()
      last.focus()
    } else if (
      !event.shiftKey &&
      document.activeElement ===
        last
    ) {
      event.preventDefault()
      first.focus()
    }
  }

  /* ==========================================================
     CLEAR SEARCH
  ========================================================== */

  function clearQuery() {
    setQuery('')
    setActiveIndex(-1)

    requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
  }

  /* ==========================================================
     CONTENT
  ========================================================== */

  const showDiscovery =
    !hasQuery

  /* ==========================================================
     RENDER
  ========================================================== */

  return createPortal(
    <div
      className="
        fixed
        inset-0
        z-[100]
      "
      role="presentation"
      onKeyDown={
        handleDialogKeyDown
      }
    >
      {/* ====================================================
          BACKDROP
      ===================================================== */}

      <button
        type="button"
        aria-label="Close search"
        onClick={onClose}
        className="
          absolute
          inset-0
          bg-[#130006]/35
          backdrop-blur-[3px]
        "
      />

      {/* ====================================================
          SEARCH PANEL
      ===================================================== */}

      <motion.section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-dialog-title"
        initial={{
          opacity: 0,
          y: -14,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        exit={{
          opacity: 0,
          y: -10,
        }}
        transition={{
          duration: 0.25,
          ease: [
            0.16,
            1,
            0.3,
            1,
          ],
        }}
        className="
          relative
          mx-auto
          flex
          h-full
          max-h-screen
          w-full
          flex-col
          overflow-hidden
          bg-[#fffdfb]

          lg:mt-[var(--nav-bar-height)]
          lg:h-[calc(100vh-var(--nav-bar-height))]
          lg:max-h-[760px]
          lg:rounded-b-[2px]
          lg:shadow-[0_25px_80px_rgba(27,11,18,0.14)]
        "
      >
        {/* ==================================================
            HEADER
        =================================================== */}

        <div
          className="
            shrink-0
            border-b
            border-[#1b0b12]/8
          "
        >
          <div
            className="
              mx-auto
              w-full
              max-w-6xl
              px-5
              py-5
              sm:px-8
              lg:px-10
              lg:py-6
            "
          >
            {/* TOP */}

            <div
              className="
                flex
                items-start
                justify-between
                gap-6
              "
            >
              <div>
                <p
                  className="
                    text-[8px]
                    font-semibold
                    uppercase
                    tracking-[0.24em]
                    text-[#9d815d]
                  "
                >
                  Discover
                </p>

                <h2
                  id="search-dialog-title"
                  className="
                    mt-1
                    font-serif
                    text-2xl
                    leading-none
                    text-[#1b0b12]
                    sm:text-3xl
                  "
                >
                  Search Velisqa
                </h2>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close search"
                className="
                  grid
                  h-9
                  w-9
                  shrink-0
                  place-items-center
                  text-[#514347]
                  transition-opacity
                  hover:opacity-50
                "
              >
                <CloseIcon />
              </button>
            </div>

            {/* SEARCH FIELD */}

            <div
              className="
                mt-6
                flex
                h-[54px]
                items-center
                gap-3
                border-b
                border-[#1b0b12]/20
                text-[#1b0b12]
                transition-colors
                focus-within:border-[#3d0a21]
              "
            >
              <SearchIcon />

              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(
                    event.target.value,
                  )

                  setActiveIndex(-1)
                }}
                onKeyDown={
                  handleInputKeyDown
                }
                className="
                  h-full
                  min-w-0
                  flex-1
                  bg-transparent
                  text-base
                  font-normal
                  text-[#1b0b12]
                  outline-none
                  placeholder:text-[#a69b9e]
                  sm:text-lg
                "
                placeholder="
                  Search jewellery, collections, gifts...
                "
                aria-label="Search products"
                aria-controls="search-suggestions"
                aria-activedescendant={
                  activeIndex >= 0
                    ? `search-option-${activeIndex}`
                    : undefined
                }
                autoComplete="off"
              />

              {query.length > 0 && (
                <button
                  type="button"
                  onClick={
                    clearQuery
                  }
                  aria-label="Clear search"
                  className="
                    grid
                    h-7
                    w-7
                    shrink-0
                    place-items-center
                    text-[#817477]
                    transition-colors
                    hover:text-[#1b0b12]
                  "
                >
                  <CloseIcon />
                </button>
              )}

              {hasQuery && (
                <button
                  type="button"
                  onClick={() =>
                    openResults()
                  }
                  className="
                    hidden
                    shrink-0
                    text-[9px]
                    font-semibold
                    uppercase
                    tracking-[0.16em]
                    text-[#3d0a21]
                    transition-opacity
                    hover:opacity-60
                    sm:block
                  "
                >
                  Search
                </button>
              )}
            </div>

            {/* KEYBOARD HINT */}

            <div
              className="
                mt-3
                hidden
                items-center
                justify-between
                sm:flex
              "
            >
              <p
                className="
                  text-[9px]
                  text-[#a19799]
                "
              >
                Search by style, category
                or product name
              </p>

              <div
                className="
                  flex
                  items-center
                  gap-2
                  text-[8px]
                  uppercase
                  tracking-[0.12em]
                  text-[#a19799]
                "
              >
                <span
                  className="
                    border
                    border-[#1b0b12]/10
                    px-1.5
                    py-1
                  "
                >
                  ESC
                </span>

                <span>
                  Close
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================
            RESULTS AREA
        =================================================== */}

        <div
          id="search-suggestions"
          className="
            flex-1
            overflow-y-auto
          "
        >
          <div
            className="
              mx-auto
              w-full
              max-w-6xl
              px-5
              py-6
              sm:px-8
              sm:py-8
              lg:px-10
            "
          >
            {/* =================================================
                DISCOVERY
            ================================================== */}

            {showDiscovery ? (
              <div
                className="
                  grid
                  gap-10
                  lg:grid-cols-[1fr_1fr]
                "
              >
                {/* RECENT */}

                {recent.length > 0 && (
                  <section>
                    <div
                      className="
                        flex
                        items-center
                        justify-between
                      "
                    >
                      <div
                        className="
                          flex
                          items-center
                          gap-2
                        "
                      >
                        <ClockIcon />

                        <h3
                          className="
                            text-[9px]
                            font-semibold
                            uppercase
                            tracking-[0.18em]
                            text-[#514347]
                          "
                        >
                          Recent searches
                        </h3>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          clearRecentSearches()
                          setRecent([])
                        }}
                        className="
                          text-[8px]
                          font-semibold
                          uppercase
                          tracking-[0.14em]
                          text-[#9a8d91]
                          transition-colors
                          hover:text-[#3d0a21]
                        "
                      >
                        Clear
                      </button>
                    </div>

                    <div
                      className="
                        mt-4
                        flex
                        flex-wrap
                        gap-2
                      "
                    >
                      {recent.map(
                        (item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() =>
                              openResults(
                                item,
                              )
                            }
                            className="
                              border
                              border-[#1b0b12]/10
                              bg-white
                              px-3
                              py-2
                              text-[10px]
                              text-[#514347]
                              transition-colors
                              hover:border-[#3d0a21]/30
                              hover:text-[#3d0a21]
                            "
                          >
                            {item}
                          </button>
                        ),
                      )}
                    </div>
                  </section>
                )}

                {/* POPULAR */}

                <section>
                  <p
                    className="
                      text-[9px]
                      font-semibold
                      uppercase
                      tracking-[0.18em]
                      text-[#514347]
                    "
                  >
                    Trending searches
                  </p>

                  <div
                    className="
                      mt-4
                      grid
                      grid-cols-2
                      gap-x-6
                      gap-y-3
                      sm:grid-cols-3
                    "
                  >
                    {POPULAR_SEARCHES.map(
                      (item) => (
                        <button
                          key={
                            item.query
                          }
                          type="button"
                          onClick={() =>
                            openResults(
                              item.query,
                            )
                          }
                          className="
                            group
                            flex
                            items-center
                            justify-between
                            border-b
                            border-[#1b0b12]/8
                            pb-2
                            text-left
                            text-[11px]
                            text-[#3d3035]
                            transition-colors
                            hover:border-[#3d0a21]/30
                            hover:text-[#3d0a21]
                          "
                        >
                          {item.label}

                          <span
                            className="
                              opacity-30
                              transition-all
                              group-hover:translate-x-1
                              group-hover:opacity-100
                            "
                          >
                            →
                          </span>
                        </button>
                      ),
                    )}
                  </div>
                </section>

                {/* CATEGORIES */}

                <section
                  className="
                    lg:col-span-2
                    border-t
                    border-[#1b0b12]/8
                    pt-7
                  "
                >
                  <div
                    className="
                      flex
                      items-center
                      justify-between
                    "
                  >
                    <p
                      className="
                        text-[9px]
                        font-semibold
                        uppercase
                        tracking-[0.18em]
                        text-[#514347]
                      "
                    >
                      Shop by category
                    </p>

                    <span
                      className="
                        text-[8px]
                        uppercase
                        tracking-[0.14em]
                        text-[#aaa0a2]
                      "
                    >
                      Explore
                    </span>
                  </div>

                  <div
                    className="
                      mt-4
                      grid
                      grid-cols-2
                      gap-px
                      overflow-hidden
                      border
                      border-[#1b0b12]/8
                      bg-[#1b0b12]/8
                      sm:grid-cols-4
                    "
                  >
                    {PRODUCT_CATEGORIES.map(
                      (category) => (
                        <button
                          key={category}
                          type="button"
                          onClick={() =>
                            openResults(
                              category,
                            )
                          }
                          className="
                            group
                            flex
                            min-h-[72px]
                            items-center
                            justify-between
                            bg-[#fffdfb]
                            px-4
                            text-left
                            transition-colors
                            hover:bg-[#f8f4ef]
                          "
                        >
                          <span
                            className="
                              font-serif
                              text-base
                              text-[#1b0b12]
                            "
                          >
                            {category}
                          </span>

                          <span
                            className="
                              text-[#a69b9e]
                              transition-all
                              group-hover:translate-x-1
                              group-hover:text-[#3d0a21]
                            "
                          >
                            →
                          </span>
                        </button>
                      ),
                    )}
                  </div>
                </section>
              </div>
            ) : loading ? (
              /* =================================================
                 LOADING
              ================================================== */

              <div
                className="
                  flex
                  min-h-[260px]
                  items-center
                  justify-center
                "
              >
                <div className="text-center">
                  <div
                    className="
                      mx-auto
                      h-5
                      w-5
                      animate-spin
                      rounded-full
                      border
                      border-[#d4af37]/25
                      border-t-[#3d0a21]
                    "
                  />

                  <p
                    className="
                      mt-4
                      text-[9px]
                      uppercase
                      tracking-[0.16em]
                      text-[#8f8386]
                    "
                  >
                    Searching the collection
                  </p>
                </div>
              </div>
            ) : suggestions.length > 0 ? (
              /* =================================================
                 PRODUCT RESULTS
              ================================================== */

              <div>
                <div
                  className="
                    mb-5
                    flex
                    items-end
                    justify-between
                    border-b
                    border-[#1b0b12]/8
                    pb-3
                  "
                >
                  <div>
                    <p
                      className="
                        text-[9px]
                        font-semibold
                        uppercase
                        tracking-[0.18em]
                        text-[#9d815d]
                      "
                    >
                      Search results
                    </p>

                    <h3
                      className="
                        mt-1
                        font-serif
                        text-xl
                        text-[#1b0b12]
                      "
                    >
                      Pieces for “
                      {query.trim()}”
                    </h3>
                  </div>

                  <span
                    className="
                      text-[9px]
                      uppercase
                      tracking-[0.12em]
                      text-[#9a8d91]
                    "
                  >
                    {suggestions.length}{' '}
                    found
                  </span>
                </div>

                {/* PRODUCT LIST */}

                <ul
                  className="
                    grid
                    gap-x-8
                    sm:grid-cols-2
                  "
                  role="listbox"
                  aria-label="Product suggestions"
                >
                  {suggestions.map(
                    (
                      product,
                      index,
                    ) => {
                      const pricing =
                        getPromoPriceDisplay(
                          product,
                        )

                      const soldOut =
                        isProductSoldOut(
                          product,
                        )

                      const active =
                        activeIndex ===
                        index

                      return (
                        <li
                          key={
                            product.id
                          }
                          className="
                            border-b
                            border-[#1b0b12]/8
                          "
                        >
                          <button
                            id={`search-option-${index}`}
                            type="button"
                            role="option"
                            aria-selected={
                              active
                            }
                            onMouseEnter={() =>
                              setActiveIndex(
                                index,
                              )
                            }
                            onClick={() =>
                              openProduct(
                                product,
                              )
                            }
                            className={`
                              group
                              flex
                              w-full
                              items-center
                              gap-4
                              py-3
                              text-left
                              transition-colors
                              ${
                                active
                                  ? 'bg-[#faf6f1]'
                                  : ''
                              }
                            `}
                          >
                            {/* IMAGE */}

                            <div
                              className="
                                relative
                                h-[76px]
                                w-[66px]
                                shrink-0
                                overflow-hidden
                                bg-[#eee8e1]
                              "
                            >
                              <img
                                src={getPrimaryImageUrl(
                                  product,
                                )}
                                alt=""
                                className="
                                  h-full
                                  w-full
                                  object-cover
                                  transition-transform
                                  duration-500
                                  group-hover:scale-105
                                "
                              />

                              {soldOut && (
                                <span
                                  className="
                                    absolute
                                    bottom-1
                                    left-1
                                    bg-[#1b0b12]/85
                                    px-1.5
                                    py-1
                                    text-[7px]
                                    font-semibold
                                    uppercase
                                    tracking-[0.08em]
                                    text-white
                                  "
                                >
                                  Sold out
                                </span>
                              )}
                            </div>

                            {/* INFO */}

                            <span
                              className="
                                min-w-0
                                flex-1
                              "
                            >
                              <span
                                className="
                                  block
                                  truncate
                                  font-serif
                                  text-[16px]
                                  leading-tight
                                  text-[#1b0b12]
                                "
                              >
                                <HighlightedName
                                  name={
                                    product.name
                                  }
                                  query={
                                    debouncedQuery
                                  }
                                />
                              </span>

                              <span
                                className="
                                  mt-1.5
                                  block
                                  text-[8px]
                                  font-semibold
                                  uppercase
                                  tracking-[0.12em]
                                  text-[#95898c]
                                "
                              >
                                {
                                  product.category
                                }

                                {' · '}

                                {soldOut
                                  ? 'Out of stock'
                                  : 'In stock'}
                              </span>
                            </span>

                            {/* PRICE */}

                            <span
                              className="
                                shrink-0
                                text-right
                              "
                            >
                              <span
                                className="
                                  block
                                  text-[12px]
                                  font-semibold
                                  text-[#3d0a21]
                                "
                              >
                                {formatInr(
                                  pricing.sale,
                                )}
                              </span>

                              {pricing.hasPromo && (
                                <span
                                  className="
                                    mt-0.5
                                    block
                                    text-[9px]
                                    text-[#a49a9c]
                                    line-through
                                  "
                                >
                                  {formatInr(
                                    pricing.compare,
                                  )}
                                </span>
                              )}
                            </span>

                            {/* ARROW */}

                            <span
                              className="
                                hidden
                                text-[#aaa0a2]
                                transition-all
                                group-hover:translate-x-1
                                group-hover:text-[#3d0a21]
                                sm:block
                              "
                            >
                              <ArrowIcon />
                            </span>
                          </button>
                        </li>
                      )
                    },
                  )}
                </ul>

                {/* CATEGORY MATCHES */}

                {categoryMatches.length >
                  0 && (
                  <div
                    className="
                      mt-7
                      border-t
                      border-[#1b0b12]/8
                      pt-5
                    "
                  >
                    <div
                      className="
                        flex
                        flex-wrap
                        items-center
                        gap-3
                      "
                    >
                      <span
                        className="
                          text-[8px]
                          font-semibold
                          uppercase
                          tracking-[0.16em]
                          text-[#9a8d91]
                        "
                      >
                        Categories
                      </span>

                      {categoryMatches.map(
                        (category) => (
                          <button
                            key={category}
                            type="button"
                            onClick={() =>
                              openResults(
                                category,
                              )
                            }
                            className="
                              border-b
                              border-[#1b0b12]/15
                              pb-0.5
                              text-[10px]
                              text-[#514347]
                              transition-colors
                              hover:border-[#3d0a21]
                              hover:text-[#3d0a21]
                            "
                          >
                            {category}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {/* ALL RESULTS */}

                <button
                  id={`search-option-${suggestions.length}`}
                  type="button"
                  role="option"
                  aria-selected={
                    activeIndex ===
                    suggestions.length
                  }
                  onMouseEnter={() =>
                    setActiveIndex(
                      suggestions.length,
                    )
                  }
                  onClick={() =>
                    openResults()
                  }
                  className="
                    group
                    mt-7
                    flex
                    w-full
                    items-center
                    justify-center
                    gap-3
                    border
                    border-[#3d0a21]/20
                    py-3.5
                    text-[9px]
                    font-semibold
                    uppercase
                    tracking-[0.18em]
                    text-[#3d0a21]
                    transition-all
                    hover:border-[#3d0a21]
                    hover:bg-[#3d0a21]
                    hover:text-white
                  "
                >
                  View all results

                  <span
                    className="
                      transition-transform
                      group-hover:translate-x-1
                    "
                  >
                    →
                  </span>
                </button>
              </div>
            ) : (
              /* =================================================
                 NO RESULTS
              ================================================== */

              <div
                className="
                  flex
                  min-h-[320px]
                  flex-col
                  items-center
                  justify-center
                  text-center
                "
              >
                <div
                  className="
                    mb-5
                    text-[#c2b8ba]
                  "
                >
                  <SearchIcon
                    size={28}
                  />
                </div>

                <p
                  className="
                    font-serif
                    text-2xl
                    text-[#1b0b12]
                  "
                >
                  No matching pieces
                </p>

                <p
                  className="
                    mt-2
                    max-w-sm
                    text-xs
                    leading-5
                    text-[#8d8184]
                  "
                >
                  Try another product
                  name, category, colour
                  or a simpler phrase.
                </p>

                <button
                  type="button"
                  onClick={clearQuery}
                  className="
                    mt-6
                    inline-flex
                    items-center
                    gap-2
                    border-b
                    border-[#3d0a21]/40
                    pb-1.5
                    text-[9px]
                    font-semibold
                    uppercase
                    tracking-[0.16em]
                    text-[#3d0a21]
                  "
                >
                  Browse popular searches

                  <ArrowIcon />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ==================================================
            FOOTER
        =================================================== */}

        <div
          className="
            hidden
            shrink-0
            border-t
            border-[#1b0b12]/8
            bg-[#faf7f3]
            px-5
            py-3
            sm:block
            lg:px-10
          "
        >
          <div
            className="
              mx-auto
              flex
              max-w-6xl
              items-center
              justify-between
            "
          >
            <p
              className="
                text-[8px]
                uppercase
                tracking-[0.15em]
                text-[#a1989a]
              "
            >
              Velisqa · Jewellery made
              to be remembered
            </p>

            <button
              type="button"
              onClick={onClose}
              className="
                text-[8px]
                font-semibold
                uppercase
                tracking-[0.15em]
                text-[#75696d]
                transition-colors
                hover:text-[#3d0a21]
              "
            >
              Close
            </button>
          </div>
        </div>
      </motion.section>
    </div>,
    document.body,
  )
}