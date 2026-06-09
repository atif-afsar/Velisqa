import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { getLenis } from '../../lib/smoothScrollState'
import {
  SIGNATURE_CATEGORIES,
  getCategoryFromParam,
  getCategoryParamSlug,
  groupProductsByCategory,
} from '../../lib/productCategories'
import { HOME_SHOP_PRODUCT_LIMIT } from '../../lib/preloadImages'
import ProductCard from '../Product/ProductCard'
import Icon from './Icon'

export default function HomeShopGrid({ products, loading, error: fetchError }) {
  const { hash } = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  const grouped = useMemo(
    () => groupProductsByCategory(products, SIGNATURE_CATEGORIES),
    [products],
  )

  const categoryFromUrl = getCategoryFromParam(searchParams.get('category'))

  const defaultCategory = useMemo(() => {
    const withStock = SIGNATURE_CATEGORIES.find((cat) => (grouped[cat]?.length ?? 0) > 0)
    return withStock ?? SIGNATURE_CATEGORIES[0]
  }, [grouped])

  const [activeCategory, setActiveCategory] = useState(
    categoryFromUrl && SIGNATURE_CATEGORIES.includes(categoryFromUrl)
      ? categoryFromUrl
      : SIGNATURE_CATEGORIES[0],
  )

  useEffect(() => {
    if (
      categoryFromUrl &&
      SIGNATURE_CATEGORIES.includes(categoryFromUrl) &&
      categoryFromUrl !== activeCategory
    ) {
      setActiveCategory(categoryFromUrl)
    }
  }, [categoryFromUrl, activeCategory])

  useEffect(() => {
    if (!loading && !categoryFromUrl) {
      setActiveCategory((current) => {
        if ((grouped[current]?.length ?? 0) > 0) return current
        return defaultCategory
      })
    }
  }, [loading, categoryFromUrl, grouped, defaultCategory])

  const allInCategory = grouped[activeCategory] ?? []
  const categoryProducts = allInCategory.slice(0, HOME_SHOP_PRODUCT_LIMIT)
  const hasMore = allInCategory.length > HOME_SHOP_PRODUCT_LIMIT
  const totalPieces = SIGNATURE_CATEGORIES.reduce((sum, cat) => sum + (grouped[cat]?.length ?? 0), 0)

  function handleCategoryChange(categoryTitle) {
    setActiveCategory(categoryTitle)
    setSearchParams(
      { category: getCategoryParamSlug(categoryTitle) },
      { replace: true },
    )
  }

  useEffect(() => {
    if (!categoryFromUrl && hash !== '#home-shop') return

    requestAnimationFrame(() => {
      const target = document.getElementById('home-shop')
      if (!target) return
      const lenis = getLenis()
      if (lenis) {
        lenis.scrollTo(target, { offset: -88, duration: 1.05 })
      } else {
        target.scrollIntoView({ block: 'start', behavior: 'smooth' })
      }
    })
  }, [categoryFromUrl, hash])

  const collectionsHref = `/collections?category=${getCategoryParamSlug(activeCategory)}#signature`

  return (
    <section
      id="home-shop"
      className="scroll-mt-[calc(var(--nav-height)+1rem)] border-t border-[#d4af37]/15 bg-[#f9f5f0] py-14 md:py-20"
    >
      <div className="container-stitch">
        <div className="mx-auto mb-8 max-w-2xl text-center md:mb-10">
          <p className="mb-2 type-label text-[#847377]">Shop by category</p>
          <h2 className="type-section text-[#130006]">Top styles</h2>
          <p className="mt-3 text-sm leading-relaxed text-[#514347]">
            Tap a category, then add to bag or save to wishlist — same pieces as our full collection.
          </p>
        </div>

        <div className="mb-10 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {SIGNATURE_CATEGORIES.map((category) => {
            const isActive = category === activeCategory
            const count = grouped[category]?.length ?? 0

            return (
              <button
                key={category}
                type="button"
                onClick={() => handleCategoryChange(category)}
                className={`tap-target rounded-full border px-4 py-2 text-center transition-all sm:px-5 sm:py-2.5 ${
                  isActive
                    ? 'border-[#3d0a21] bg-[#3d0a21] text-[#e9c349]'
                    : 'border-[#d4af37]/35 bg-white/60 text-[#130006] hover:border-[#3d0a21] hover:bg-[#130006]/5'
                }`}
                aria-pressed={isActive}
              >
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] sm:text-[11px] sm:tracking-[0.16em]">
                  {category}
                </span>
                {count > 0 && (
                  <span
                    className={`ml-1.5 text-[10px] ${isActive ? 'text-[#ffe088]/90' : 'text-[#847377]'}`}
                  >
                    ({count})
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="mb-8 flex flex-col gap-2 border-b border-[#d4af37]/25 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <h3 className="font-serif text-2xl italic text-[#130006] sm:text-3xl">{activeCategory}</h3>
          <p className="text-sm text-[#514347]">
            {loading
              ? 'Loading…'
              : `${allInCategory.length} piece${allInCategory.length === 1 ? '' : 's'} available`}
          </p>
        </div>

        {fetchError && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            Could not load products: {fetchError}
          </p>
        )}

        {loading && categoryProducts.length === 0 && (
          <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div
                key={i}
                className="aspect-[4/5] animate-pulse rounded-lg bg-[#e8e2db]"
                aria-hidden
              />
            ))}
          </div>
        )}

        {!loading && !fetchError && totalPieces === 0 && categoryProducts.length === 0 && (
          <div className="py-12 text-center text-sm text-[#514347]">
            <p>New pieces arriving soon.</p>
            <Link
              to="/collections"
              className="mt-4 inline-flex text-[#6f334a] underline-offset-2 hover:underline"
            >
              Browse collections
            </Link>
          </div>
        )}

        {!loading && !fetchError && totalPieces > 0 && categoryProducts.length === 0 && (
          <p className="py-12 text-center text-sm text-[#847377]">
            No {activeCategory.toLowerCase()} listed yet. Try another category.
          </p>
        )}

        {categoryProducts.length > 0 && (
          <>
            <div className="grid grid-cols-2 items-stretch gap-x-3 gap-y-6 sm:gap-x-5 sm:gap-y-8 lg:grid-cols-4">
              {categoryProducts.map((product, i) => (
                <ProductCard key={product.id} product={product} priority={i < 4} />
              ))}
            </div>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              {hasMore && (
                <Link
                  to={collectionsHref}
                  className="tap-target inline-flex items-center justify-center gap-2 rounded-full border border-[#3d0a21]/25 bg-white px-7 py-3.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#3d0a21] transition hover:border-[#3d0a21]/45 hover:bg-[#fdf9f4]"
                >
                  View all {activeCategory.toLowerCase()}
                  <Icon className="text-base">arrow_forward</Icon>
                </Link>
              )}
              <Link
                to="/collections#signature"
                className="tap-target group inline-flex items-center justify-center gap-2 rounded-full bg-[#3d0a21] px-7 py-3.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#e9c349] shadow-[0_14px_36px_rgba(61,10,33,0.22)] transition hover:bg-[#130006] sm:px-8"
              >
                Full collection
                <Icon className="text-base transition-transform group-hover:translate-x-0.5">
                  arrow_forward
                </Icon>
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
