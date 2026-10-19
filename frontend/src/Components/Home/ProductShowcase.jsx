import { useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useProducts } from '../../hooks/useProducts'
import { EMPTY_PRODUCT_FILTERS, filterAndSortProducts } from '../../lib/productFilters'
import { isProductSoldOut } from '../../lib/cartStock'
import { normalizeProductCategory } from '../../lib/productCategories'
import { SHOP_CATEGORIES, categoryPath } from '../../data/shopCategories'
import ProductCard from '../Product/ProductCard'
import { ArrowRightIcon } from '../UI/Icons'

const ALL = { slug: 'all', label: 'All' }
const GRID_SIZES = '(min-width: 768px) 22vw, 46vw'
const ROW_SIZES = '(min-width: 1024px) 22vw, (min-width: 640px) 34vw, 44vw'

function SkeletonCard() {
  return (
    <div aria-hidden="true">
      <div className="aspect-[4/5] animate-pulse bg-mist" />
      <div className="mt-3 h-3 w-3/4 bg-mist" />
      <div className="mt-2 h-3 w-1/3 bg-mist" />
      <div className="mt-3 h-10 bg-mist" />
    </div>
  )
}

/**
 * Homepage product section.
 * - `tabs`: category chips (All / Necklaces / …) filtering a 2-column grid on phones.
 * - `layout="row"`: a swipeable row on phones, 4-up grid on desktop.
 */
export default function ProductShowcase({ eyebrow, title, sort = 'best-selling', tabs = false, layout = 'grid', count = 8 }) {
  const { products, loading } = useProducts()
  const [active, setActive] = useState(ALL.slug)
  const baseId = useId()
  const categories = useMemo(() => {
    if (!tabs) return []
    const present = new Set(products.map((p) => normalizeProductCategory(p.category)))
    return [ALL, ...SHOP_CATEGORIES.filter((c) => present.has(c.category))]
  }, [products, tabs])
  const category = categories.find((c) => c.slug === active && c !== ALL)

  const items = useMemo(() => {
    const scoped = category ? products.filter((p) => normalizeProductCategory(p.category) === category.category) : products
    const sorted = filterAndSortProducts(scoped, { ...EMPTY_PRODUCT_FILTERS, sort })
    return [...sorted.filter((p) => !isProductSoldOut(p)), ...sorted.filter(isProductSoldOut)].slice(0, count)
  }, [products, category, sort, count])

  const viewAll = category ? `${categoryPath(category)}?sort=${sort}` : `/collections?sort=${sort}`

  function onKeyDown(event) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    const i = categories.findIndex((t) => t.slug === active)
    const next = categories[(i + (event.key === 'ArrowRight' ? 1 : categories.length - 1)) % categories.length]
    setActive(next.slug)
    document.getElementById(`${baseId}-tab-${next.slug}`)?.focus()
  }

  const row = layout === 'row'
  const empty = !loading && items.length === 0
  if (empty && !tabs) return null

  return (
    <section aria-labelledby={`${baseId}-heading`} className="py-10 sm:py-14 lg:py-20">
      <div className="container-lux">
        <div className="flex items-end justify-between gap-4">
          <div>
            {eyebrow && <p className="eyebrow text-muted">{eyebrow}</p>}
            <h2 id={`${baseId}-heading`} className="mt-2 font-serif text-[1.75rem] leading-tight text-ink sm:text-[2.25rem] lg:text-[2.75rem]">
              {title}
            </h2>
          </div>
          <Link to={viewAll} className="hidden shrink-0 items-center gap-2 text-[0.75rem] font-medium uppercase tracking-[0.16em] text-ink hover:text-accent-ink sm:inline-flex">
            View all <ArrowRightIcon size={14} />
          </Link>
        </div>

        {categories.length > 2 && (
          <div
            role="tablist"
            aria-label={`${title} by category`}
            className="scrollbar-none -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0 lg:mt-8"
            onKeyDown={onKeyDown}
          >
            {categories.map((c) => {
              const selected = c.slug === active
              return (
                <button
                  key={c.slug}
                  id={`${baseId}-tab-${c.slug}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`${baseId}-panel`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActive(c.slug)}
                  className={`min-h-9 shrink-0 rounded-full border px-4 text-[0.75rem] font-medium uppercase tracking-[0.12em] transition-colors ${
                    selected ? 'border-ink bg-ink text-white' : 'border-line-strong text-ink hover:border-ink'
                  }`}
                >
                  {c.label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div
        id={`${baseId}-panel`}
        role={categories.length > 2 ? 'tabpanel' : undefined}
        aria-labelledby={categories.length > 2 ? `${baseId}-tab-${active}` : undefined}
        className={
          row
            ? 'scrollbar-none mt-6 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 sm:gap-5 md:scroll-px-8 md:px-8 lg:container-lux lg:mt-10 lg:grid lg:grid-cols-4 lg:gap-x-6 lg:overflow-visible lg:px-0'
            : 'container-lux mt-6 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-4 lg:mt-10 lg:gap-x-6 lg:gap-y-12'
        }
      >
        {loading && items.length === 0
          ? Array.from({ length: 4 }, (_, i) => (
              <div key={i} className={row ? 'w-[44%] shrink-0 sm:w-[34%] lg:w-auto' : ''}>
                <SkeletonCard />
              </div>
            ))
          : items.map((product) => (
              <div key={product.id} className={row ? 'w-[44%] shrink-0 snap-start sm:w-[34%] lg:w-auto' : ''}>
                <ProductCard product={product} sizes={row ? ROW_SIZES : GRID_SIZES} />
              </div>
            ))}
        {empty && <p className="col-span-full py-10 text-center text-sm text-muted">New pieces are on their way.</p>}
      </div>

      <div className="container-lux mt-8 flex justify-center sm:hidden">
        <Link to={viewAll} className="btn btn-secondary w-full">
          View all
        </Link>
      </div>
    </section>
  )
}
