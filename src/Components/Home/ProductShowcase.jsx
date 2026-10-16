import { useId, useMemo, useState } from 'react'
import { useProducts } from '../../hooks/useProducts'
import { EMPTY_PRODUCT_FILTERS, filterAndSortProducts } from '../../lib/productFilters'
import { isProductSoldOut } from '../../lib/cartStock'
import ProductCard from '../Product/ProductCard'
import SectionHeading from './SectionHeading'

const TABS = [
  { id: 'bestsellers', label: 'Bestsellers', sort: 'best-selling', viewAll: '/collections?sort=best-selling' },
  { id: 'new', label: 'New arrivals', sort: 'newest', viewAll: '/collections?sort=newest' },
]
const COUNT = 8

function SkeletonCard() {
  return (
    <div aria-hidden="true">
      <div className="aspect-[4/5] animate-pulse bg-mist" />
      <div className="mt-3 h-3 w-3/4 bg-mist" />
      <div className="mt-2 h-3 w-1/3 bg-mist" />
    </div>
  )
}

/** Bestsellers / New arrivals product row with accessible tabs. */
export default function ProductShowcase() {
  const { products, loading } = useProducts()
  const [active, setActive] = useState(TABS[0].id)
  const baseId = useId()
  const tab = TABS.find((t) => t.id === active) ?? TABS[0]

  const items = useMemo(() => {
    const inStockFirst = filterAndSortProducts(products, { ...EMPTY_PRODUCT_FILTERS, sort: tab.sort })
    return [...inStockFirst.filter((p) => !isProductSoldOut(p)), ...inStockFirst.filter(isProductSoldOut)].slice(0, COUNT)
  }, [products, tab.sort])

  function onKeyDown(event) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    const i = TABS.findIndex((t) => t.id === active)
    const next = TABS[(i + (event.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length]
    setActive(next.id)
    document.getElementById(`${baseId}-tab-${next.id}`)?.focus()
  }

  return (
    <section aria-labelledby={`${baseId}-heading`} className="responsive-section border-t border-line">
      <div className="container-lux">
        <SectionHeading id={`${baseId}-heading`} eyebrow="The edit" title="Most loved pieces" linkTo={tab.viewAll} linkLabel="View all" align="left" />

        <div role="tablist" aria-label="Product selection" className="mt-8 flex gap-8 border-b border-line" onKeyDown={onKeyDown}>
          {TABS.map((t) => {
            const selected = t.id === active
            return (
              <button
                key={t.id}
                id={`${baseId}-tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`${baseId}-panel`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(t.id)}
                className={`-mb-px min-h-11 border-b pb-2 text-[0.8125rem] font-medium uppercase tracking-[0.14em] transition-colors ${
                  selected ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      <div
        id={`${baseId}-panel`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${active}`}
        className="scrollbar-none mt-8 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 sm:gap-5 md:scroll-px-8 md:px-8 lg:container-lux lg:grid lg:grid-cols-4 lg:gap-x-6 lg:gap-y-12 lg:overflow-visible lg:px-0"
      >
        {loading && items.length === 0
          ? Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="w-[62%] shrink-0 sm:w-[38%] lg:w-auto">
                <SkeletonCard />
              </div>
            ))
          : items.map((product) => (
              <div key={product.id} className="w-[62%] shrink-0 snap-start sm:w-[38%] lg:w-auto">
                <ProductCard product={product} sizes="(min-width: 1024px) 22vw, (min-width: 640px) 38vw, 62vw" />
              </div>
            ))}
      </div>
    </section>
  )
}
