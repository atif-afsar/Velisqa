import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getLenis } from '../../lib/smoothScrollState'
import {
  SIGNATURE_CATEGORIES,
  getCategoryFromParam,
  getCategoryParamSlug,
  groupProductsByCategory,
} from '../../lib/productCategories'
import { useProducts } from '../../hooks/useProducts'
import ProductCard from '../Product/ProductCard'

export default function SignatureCollection() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { products, loading, error: fetchError } = useProducts()

  const grouped = useMemo(
    () => groupProductsByCategory(products, SIGNATURE_CATEGORIES),
    [products],
  )

  const categoryFromUrl = getCategoryFromParam(searchParams.get('category'))
  const activeCategory =
    categoryFromUrl && SIGNATURE_CATEGORIES.includes(categoryFromUrl)
      ? categoryFromUrl
      : SIGNATURE_CATEGORIES[0]

  const categoryProducts = grouped[activeCategory] ?? []
  const totalPieces = SIGNATURE_CATEGORIES.reduce((sum, cat) => sum + (grouped[cat]?.length ?? 0), 0)

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
  }, [searchParams, categoryFromUrl])

  function handleCategoryChange(categoryTitle) {
    setSearchParams({ category: getCategoryParamSlug(categoryTitle) })
  }

  return (
    <section
      id="signature"
      className="container-stitch mb-20 scroll-mt-[calc(var(--nav-height)+1rem)] md:mb-32"
    >
      <div className="mb-10 flex flex-col items-center px-2 text-center md:mb-14">
        <h2 className="mb-2 type-section italic text-[#130006]">The Signature Collection</h2>
        <div className="h-px w-24 bg-[#e9c349]" />
        <p className="mt-4 max-w-md text-sm leading-relaxed text-[#514347]">
          Every piece below comes from your admin catalogue — add, edit, or remove products anytime.
        </p>
      </div>

      <div className="mb-12 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
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
                  : 'border-[#d4af37]/35 bg-transparent text-[#130006] hover:border-[#3d0a21] hover:bg-[#130006]/5'
              }`}
              aria-pressed={isActive}
            >
              <span className="label-stitch">{category}</span>
              {count > 0 && (
                <span className={`ml-1.5 text-[10px] ${isActive ? 'text-[#ffe088]/90' : 'text-[#847377]'}`}>
                  ({count})
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div>
        <div className="mb-7 flex flex-col gap-3 border-b border-[#d4af37]/30 pb-3 sm:flex-row sm:items-end sm:justify-between sm:gap-5">
          <h3 className="min-w-0 break-words font-serif text-2xl italic leading-tight text-[#130006] sm:text-3xl md:text-4xl">
            {activeCategory}
          </h3>
          <div className="min-w-0 w-full text-left sm:w-auto sm:max-w-[min(100%,16rem)] sm:shrink-0 sm:text-right md:max-w-none">
            <p className="text-[9px] font-bold uppercase leading-snug tracking-[0.16em] text-[#6f334a] sm:text-[10px] sm:tracking-[0.22em] md:text-[11px]">
              Limited release — this edit only
            </p>
            <p className="mt-1 font-serif text-lg font-bold tabular-nums leading-none text-[#130006] sm:text-xl md:text-2xl">
              {loading ? '…' : `${categoryProducts.length} piece${categoryProducts.length === 1 ? '' : 's'}`}
            </p>
          </div>
        </div>

        {fetchError && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            Could not load products: {fetchError}. Check Supabase connection in your .env file.
          </p>
        )}

        {loading && categoryProducts.length === 0 && (
          <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={`signature-skeleton-${i}`} className="aspect-[4/5] animate-pulse rounded-lg bg-[#e8e2db]" aria-hidden />
            ))}
          </div>
        )}

        {!loading && !fetchError && totalPieces === 0 && categoryProducts.length === 0 && (
          <div className="py-12 text-center text-sm text-[#514347]">
            <p>No products in the catalogue yet.</p>
            <p className="mt-2">
              Add products in the{' '}
              <a href="/admin/panel" className="text-[#6f334a] underline-offset-2 hover:underline">
                admin panel
              </a>
              .
            </p>
          </div>
        )}

        {!loading && !fetchError && totalPieces > 0 && categoryProducts.length === 0 && (
          <p className="py-12 text-center text-sm text-[#847377]">
            No {activeCategory.toLowerCase()} in the catalogue yet. Add one in the admin panel with category
            &ldquo;{activeCategory}&rdquo;.
          </p>
        )}

        {categoryProducts.length > 0 && (
          <div className="grid grid-cols-2 items-stretch gap-x-3 gap-y-6 sm:gap-x-7 sm:gap-y-10 lg:grid-cols-3">
            {categoryProducts.map((product, i) => (
              <ProductCard key={product.id} product={product} priority={i < 4} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
