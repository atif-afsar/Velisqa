import { useEffect, useMemo, useRef } from 'react'
import { Link, Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom'
import SEOHead from '../Components/SEO/SEOHead'
import { buildBreadcrumbSchema, buildItemListSchema } from '../Components/SEO/schemaBuilders'
import ProductListing from '../Components/Collections/ProductListing'
import { useProducts } from '../hooks/useProducts'
import { normalizeProductCategory } from '../lib/productCategories'
import { SHOP_CATEGORIES, categoryPath, findShopCategoryBySlug } from '../data/shopCategories'

const SORT_TITLES = {
  newest: { title: 'New arrivals', intro: 'The latest pieces from the Velisqa studio.' },
  'best-selling': { title: 'Bestsellers', intro: 'The pieces our customers return to again and again.' },
}

/** /collections and /collections/:slug — editorial header + filterable product grid. */
export default function Collections() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const { pathname } = useLocation()
  const { products, loading, error } = useProducts()
  const chipsRef = useRef(null)

  const legacyCategory = searchParams.get('category')
  const category = slug ? findShopCategoryBySlug(slug) : null

  const scoped = useMemo(() => {
    if (!category) return products
    return products.filter((p) => normalizeProductCategory(p.category) === category.category)
  }, [products, category])

  // Keep the active category chip visible in the horizontally scrolling row.
  useEffect(() => {
    const row = chipsRef.current
    const active = row?.querySelector('[aria-current="page"]')
    if (row && active) row.scrollLeft = active.offsetLeft - row.clientWidth / 2 + active.clientWidth / 2
  }, [slug])

  // Legacy /collections?category=rings → /collections/rings (keep other params).
  if (!slug && legacyCategory) {
    const target = findShopCategoryBySlug(legacyCategory)
    const rest = new URLSearchParams(searchParams)
    rest.delete('category')
    const query = rest.toString()
    return <Navigate to={`${target ? categoryPath(target) : '/collections'}${query ? `?${query}` : ''}`} replace />
  }
  // Unknown category slug → shop all.
  if (slug && !category) return <Navigate to="/collections" replace />

  const sortView = !category ? SORT_TITLES[searchParams.get('sort')] : null
  const title = category?.label ?? sortView?.title ?? 'Shop all jewellery'
  const intro =
    category?.intro ??
    sortView?.intro ??
    'Necklaces, earrings, rings, bracelets and bangles — modern pieces in gold and silver tones, designed in India.'

  const crumbs = [
    { name: 'Home', path: '/' },
    { name: 'Shop', path: '/collections' },
    ...(category ? [{ name: category.label, path: pathname }] : []),
  ]

  return (
    <>
      <SEOHead
        title={category ? `${category.seoTitle} | Velisqa` : 'Shop All Jewellery — Necklaces, Earrings, Rings & More | Velisqa'}
        description={
          category?.seoDescription ??
          'Shop Velisqa jewellery for women: necklaces, earrings, rings, bracelets and bangles in gold and silver tones. Free shipping on prepaid orders across India.'
        }
        canonicalPath={category ? categoryPath(category) : '/collections'}
        image={category ? category.image(1200) : undefined}
        schema={[buildBreadcrumbSchema(crumbs), buildItemListSchema(scoped, { name: title })]}
      />
      <main className="page-offset-nav bg-paper">
        <header className="container-lux pb-8 pt-8 text-center sm:pt-12 lg:pb-10">
          <nav aria-label="Breadcrumb" className="text-xs text-muted">
            <ol className="flex flex-wrap items-center justify-center gap-2">
              {crumbs.map((c, i) => (
                <li key={c.path} className="flex items-center gap-2">
                  {i > 0 && <span aria-hidden="true">/</span>}
                  {i === crumbs.length - 1 ? (
                    <span aria-current="page" className="text-ink">
                      {c.name}
                    </span>
                  ) : (
                    <Link to={c.path} className="hover:text-ink">
                      {c.name}
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </nav>
          <h1 className="type-display mt-5 text-ink">{title}</h1>
          <p className="mx-auto mt-4 max-w-xl text-[0.95rem] leading-relaxed text-body">{intro}</p>

          <nav aria-label="Categories" className="mt-8">
            <ul ref={chipsRef} className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0">
              {[{ slug: '', label: 'All' }, ...SHOP_CATEGORIES].map((c) => {
                const active = c.slug ? category?.slug === c.slug : !category
                return (
                  <li key={c.slug || 'all'} className="shrink-0">
                    <Link
                      to={c.slug ? categoryPath(c) : '/collections'}
                      aria-current={active ? 'page' : undefined}
                      className={`inline-flex min-h-10 items-center border px-4 text-[0.75rem] font-medium uppercase tracking-[0.14em] transition-colors ${
                        active ? 'border-ink bg-ink text-white' : 'border-line text-body hover:border-ink hover:text-ink'
                      }`}
                    >
                      {c.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
        </header>

        <ProductListing
          key={category?.slug ?? 'all'}
          products={scoped}
          loading={loading}
          error={error}
          hideCategoryFacet={Boolean(category)}
          emptyMessage={category ? `New ${category.label.toLowerCase()} are on their way.` : 'No pieces available yet.'}
        />
      </main>
    </>
  )
}
