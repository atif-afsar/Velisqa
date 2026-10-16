import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import SEOHead from '../Components/SEO/SEOHead'
import { SITE_URL } from '../Components/SEO/siteConfig'
import { productHead } from '../lib/seoHeads'
import { PRODUCT_POLICY_SECTIONS, SIZE_GUIDES } from '../lib/productPolicies'
import { useCatalog } from '../context/CatalogContext'
import { useCart } from '../context/CartContext'
import { useProducts } from '../hooks/useProducts'
import { normalizeProductCategory } from '../lib/productCategories'
import { getPrimaryImageUrl, getProductImageUrls } from '../lib/productImages'
import { getProductStock, isProductSoldOut } from '../lib/cartStock'
import { findCachedProduct, readProductCatalogCache } from '../lib/productCatalogCache'
import { enrichProductWithApprovedReviewAggregates } from '../lib/productReviews'
import { getPromoPriceDisplay, formatInr } from '../lib/promoPricing'
import { displayProductName, getProductBadge, getProductRating, getProductReviewCount } from '../lib/productDisplay'
import { isProductUuid, matchProductBySlug, productPath, productSlug } from '../lib/productUrl'
import { findShopCategoryByName, categoryPath } from '../data/shopCategories'
import { CART_OFFERS } from '../lib/cartOffers'
import { analytics } from '../lib/analytics'
import ProductGallery from '../Components/Product/ProductGallery'
import ProductReviews from '../Components/Product/ProductReviews'
import ProductCard from '../Components/Product/ProductCard'
import ProductWishlistButton from '../Components/Product/ProductWishlistButton'
import DeliveryEstimate from '../Components/Product/DeliveryEstimate'
import QuantityStepper from '../Components/Cart/QuantityStepper'
import BuyNowButton from '../Components/WhatsApp/BuyNowButton'
import { PlusIcon, ReturnIcon, ShieldIcon, StarIcon, TruckIcon } from '../Components/UI/Icons'

/** Resolves /product/:id where :id is a slug ("gold-heart-necklace-064e71") or a legacy UUID. */
function useProductFromParam(param) {
  const { catalogVersion } = useCatalog()
  const [state, setState] = useState(() => {
    const cached = isProductUuid(param)
      ? findCachedProduct(param)
      : matchProductBySlug(readProductCatalogCache()?.data, param)
    return { product: cached ?? null, loading: !cached, notFound: false }
  })

  useEffect(() => {
    let cancelled = false

    async function resolveId() {
      if (isProductUuid(param)) return param
      const cached = matchProductBySlug(readProductCatalogCache()?.data, param)
      if (cached) return cached.id
      const { data } = await supabase.from('products').select('id, name')
      return matchProductBySlug(data ?? [], param)?.id ?? null
    }

    async function load(attempt = 0) {
      const id = await resolveId()
      if (cancelled) return
      if (!id) {
        setState({ product: null, loading: false, notFound: true })
        return
      }
      const { data, error } = await supabase.from('products').select('*').eq('id', id).maybeSingle()
      if (cancelled) return
      if (data) {
        const enriched = await enrichProductWithApprovedReviewAggregates(data)
        if (!cancelled) setState({ product: enriched, loading: false, notFound: false })
        return
      }
      if (error && attempt < 2) {
        await new Promise((r) => window.setTimeout(r, 400 * (attempt + 1)))
        if (!cancelled) load(attempt + 1)
        return
      }
      setState((prev) => (prev.product && error ? { ...prev, loading: false } : { product: null, loading: false, notFound: true }))
    }

    load()
    return () => {
      cancelled = true
    }
  }, [param, catalogVersion])

  return state
}

function Skeleton() {
  return (
    <main className="page-offset-nav">
      <div className="container-lux grid gap-10 py-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
        <div className="aspect-[4/5] animate-pulse bg-mist" />
        <div className="space-y-4 pt-4">
          <div className="h-3 w-24 bg-mist" />
          <div className="h-10 w-3/4 bg-mist" />
          <div className="h-5 w-28 bg-mist" />
          <div className="mt-8 h-12 w-full bg-mist" />
        </div>
      </div>
    </main>
  )
}

function Accordion({ title, children, defaultOpen = false }) {
  return (
    <details className="group border-t border-line" open={defaultOpen}>
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-ink [&::-webkit-details-marker]:hidden">
        {title}
        <PlusIcon size={16} className="transition-transform duration-300 group-open:rotate-45" />
      </summary>
      <div className="pb-6 text-sm leading-relaxed text-body">{children}</div>
    </details>
  )
}

export default function ProductDetail() {
  const { id: param } = useParams()
  const { product, loading, notFound } = useProductFromParam(param)
  const { products } = useProducts()
  const { addToCart } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)
  const [comboProducts, setComboProducts] = useState([])
  const [showSticky, setShowSticky] = useState(false)
  const buyBoxRef = useRef(null)

  useEffect(() => {
    queueMicrotask(() => setQuantity(1))
  }, [product?.id])

  useEffect(() => {
    if (product?.id) analytics.viewItem(product)
  }, [product])

  // Sticky mobile add-to-bag appears once the main button scrolls away.
  useEffect(() => {
    const el = buyBoxRef.current
    if (!el) return undefined
    const io = new IntersectionObserver(([entry]) => setShowSticky(!entry.isIntersecting && entry.boundingClientRect.top < 0))
    io.observe(el)
    return () => io.disconnect()
  }, [product?.id])

  useEffect(() => {
    const ids = product?.is_combo ? product.combo_product_ids : null
    if (!ids?.length) {
      queueMicrotask(() => setComboProducts([]))
      return undefined
    }
    let cancelled = false
    supabase
      .from('products')
      .select('id, name, price, mrp, image_url, gallery_urls, out_of_stock, stock, category')
      .in('id', ids)
      .then(({ data }) => {
        if (!cancelled && data) setComboProducts([...data].sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)))
      })
    return () => {
      cancelled = true
    }
  }, [product])

  const name = product ? displayProductName(product.name) : ''

  // Same design in other finishes/colours = products sharing the display name.
  const variants = useMemo(() => {
    if (!product) return []
    return products.filter(
      (p) => p.id !== product.id && displayProductName(p.name).toLowerCase() === name.toLowerCase() && normalizeProductCategory(p.category) === normalizeProductCategory(product.category),
    )
  }, [products, product, name])

  // Complete the look: pieces from other categories, in-stock first, same colour/metal preferred.
  const completeTheLook = useMemo(() => {
    if (!product) return []
    const category = normalizeProductCategory(product.category)
    const variantIds = new Set(variants.map((v) => v.id))
    const pool = products.filter((p) => p.id !== product.id && !variantIds.has(p.id) && !isProductSoldOut(p))
    const score = (p) =>
      (normalizeProductCategory(p.category) !== category ? 4 : 0) +
      (product.metal && p.metal === product.metal ? 2 : 0) +
      (product.colour && p.colour === product.colour ? 1 : 0)
    const picked = []
    const seenCategories = new Set()
    for (const p of [...pool].sort((a, b) => score(b) - score(a))) {
      const c = normalizeProductCategory(p.category)
      if (seenCategories.has(c) && picked.length < 3) continue
      seenCategories.add(c)
      picked.push(p)
      if (picked.length === 4) break
    }
    return picked
  }, [products, product, variants])

  if (loading) return <Skeleton />

  if (notFound || !product) {
    return (
      <main className="page-offset-nav container-lux py-24 text-center">
        <SEOHead title="Piece not found | Velisqa" description="This Velisqa piece is no longer available." noindex />
        <p className="eyebrow text-muted">404</p>
        <h1 className="type-display mt-4 text-ink">This piece has moved on</h1>
        <p className="mx-auto mt-4 max-w-md text-body">It may have sold out or been retired. Explore the latest collection instead.</p>
        <Link to="/collections" className="btn btn-primary mt-8">
          Shop the collection
        </Link>
      </main>
    )
  }

  // Legacy UUID URL or renamed product → canonical slug URL.
  if (param !== productSlug(product)) return <Navigate to={productPath(product)} replace />

  const category = normalizeProductCategory(product.category)
  const shopCategory = findShopCategoryByName(category)
  const soldOut = isProductSoldOut(product)
  const stock = getProductStock(product)
  const images = getProductImageUrls(product)
  const url = `${SITE_URL}${productPath(product)}`
  const { sale, compare, hasPromo, discountPercent } = getPromoPriceDisplay(product)
  const rating = getProductRating(product)
  const reviewCount = getProductReviewCount(product)
  const badge = getProductBadge(product)
  const head = productHead(product)
  const { description, crumbs } = head
  const sizeGuide = SIZE_GUIDES[category]

  function handleAdd() {
    if (adding || soldOut) return
    setAdding(true)
    addToCart(product, quantity)
    window.setTimeout(() => setAdding(false), 600)
  }

  const details = [
    product.metal && ['Finish', product.metal],
    product.colour && ['Colour', product.colour],
    Array.isArray(product.styles) && product.styles.length && ['Style', product.styles.join(', ')],
  ].filter(Boolean)

  return (
    <>
      <SEOHead
        title={head.title}
        description={head.metaDescription}
        canonicalPath={head.canonicalPath}
        image={head.image}
        type={head.type}
        schema={head.schema}
      />
      <main className="page-offset-nav bg-paper text-ink">
        <div className="container-lux pt-4 lg:pt-6">
          <nav aria-label="Breadcrumb" className="hidden text-xs text-muted sm:block">
            <ol className="flex flex-wrap items-center gap-2">
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

          <div className="grid gap-8 pb-16 pt-0 sm:pt-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-14 xl:gap-20">
            <ProductGallery
              key={product.id}
              images={images}
              alt={name}
              badges={
                soldOut ? (
                  <span className="badge">Sold out</span>
                ) : badge === 'new' ? (
                  <span className="badge badge-accent">New</span>
                ) : badge === 'bestseller' ? (
                  <span className="badge">Bestseller</span>
                ) : null
              }
            />

            <div className="lg:sticky lg:top-[calc(var(--nav-height)+1.5rem)] lg:self-start">
              {shopCategory && (
                <Link to={categoryPath(shopCategory)} className="eyebrow text-muted hover:text-accent-ink">
                  {shopCategory.label}
                </Link>
              )}
              <h1 className="type-display mt-3 text-[clamp(2rem,3.2vw,3rem)] text-ink">{name}</h1>

              <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="type-price text-xl text-ink">{formatInr(sale)}</p>
                {hasPromo && (
                  <>
                    <s className="text-muted">
                      <span className="sr-only">MRP </span>
                      {formatInr(compare)}
                    </s>
                    <span className="text-sm text-accent-ink">Save {discountPercent}%</span>
                  </>
                )}
              </div>

              {reviewCount > 0 && rating > 0 && (
                <a href="#product-reviews" className="mt-3 inline-flex min-h-9 items-center gap-1.5 text-sm text-body hover:text-ink">
                  <StarIcon size={14} className="text-ink" />
                  {rating.toFixed(1)} · {reviewCount} review{reviewCount === 1 ? '' : 's'}
                </a>
              )}

              {variants.length > 0 && (
                <div className="mt-7">
                  <p className="eyebrow text-ink">Also available in</p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    <li>
                      <span className="block h-[72px] w-[58px] border border-ink bg-mist" aria-current="true" title="Selected">
                        <img src={getPrimaryImageUrl(product)} alt={`${name} — selected`} className="h-full w-full object-cover" width="58" height="72" />
                      </span>
                    </li>
                    {variants.map((v) => (
                      <li key={v.id}>
                        <Link to={productPath(v)} className="block h-[72px] w-[58px] border border-line bg-mist hover:border-ink" title={v.colour || v.metal || v.name}>
                          <img
                            src={getPrimaryImageUrl(v)}
                            alt={`${displayProductName(v.name)}${v.colour ? ` in ${v.colour}` : ''} — ${formatInr(v.price)}`}
                            loading="lazy"
                            width="58"
                            height="72"
                            className="h-full w-full object-cover"
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div ref={buyBoxRef} className="mt-8">
                {soldOut ? (
                  <div className="space-y-3">
                    <p className="text-sm text-body">This piece is currently sold out. Ask us about restocks:</p>
                    <BuyNowButton product={product} productUrl={url} soldOut className="btn btn-primary w-full" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-4">
                      <QuantityStepper value={quantity} max={stock} onChange={(q) => setQuantity(Math.max(1, q))} />
                      {stock > 0 && stock <= 3 && <p className="text-sm text-accent-ink">Only {stock} left</p>}
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button type="button" onClick={handleAdd} disabled={adding} className="btn btn-primary min-h-[52px] flex-1">
                        {adding ? 'Added to bag' : 'Add to bag'}
                      </button>
                      <ProductWishlistButton product={product} size="lg" className="h-[52px] w-[52px] border border-line-strong" />
                    </div>
                    <BuyNowButton product={product} productUrl={url} variant="outline" className="btn btn-secondary mt-2 min-h-[52px] w-full">
                      Buy it now
                    </BuyNowButton>
                  </>
                )}
              </div>

              <ul className="mt-6 space-y-2.5 text-sm text-body">
                <li className="flex items-center gap-3">
                  <TruckIcon size={18} className="shrink-0 text-ink" /> Free shipping on prepaid orders
                </li>
                <li className="flex items-center gap-3">
                  <ReturnIcon size={18} className="shrink-0 text-ink" /> 5-day returns from My Orders
                </li>
                <li className="flex items-center gap-3">
                  <ShieldIcon size={18} className="shrink-0 text-ink" /> Secure payment via Razorpay, or cash on delivery
                </li>
              </ul>
              {!soldOut && Number(product.price) < CART_OFFERS.freeGift.threshold && CART_OFFERS.freeGift.enabled && (
                <p className="mt-4 bg-accent-tint px-4 py-3 text-sm text-accent-ink">
                  Spend {formatInr(CART_OFFERS.freeGift.threshold)} and choose a complimentary gift at checkout.
                </p>
              )}

              <div className="mt-8">
                <DeliveryEstimate />
              </div>

              <div className="mt-6 border-b border-line">
                <Accordion title="Description" defaultOpen>
                  <p className="whitespace-pre-line">{description}</p>
                  {details.length > 0 && (
                    <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
                      {details.map(([k, v]) => (
                        <div key={k} className="contents">
                          <dt className="text-muted">{k}</dt>
                          <dd className="text-ink">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </Accordion>
                {comboProducts.length > 0 && (
                  <Accordion title={`In this set (${comboProducts.length})`} defaultOpen>
                    <ul className="space-y-3">
                      {comboProducts.map((p) => (
                        <li key={p.id}>
                          <Link to={productPath(p)} className="flex items-center gap-4 hover:text-ink">
                            <img src={getPrimaryImageUrl(p)} alt="" className="h-16 w-14 bg-mist object-cover" width="56" height="64" loading="lazy" />
                            <span className="flex-1">{displayProductName(p.name)}</span>
                            <span className="type-price text-ink">{formatInr(p.price)}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </Accordion>
                )}
                {PRODUCT_POLICY_SECTIONS.map((section) => (
                  <Accordion key={section.id} title={section.title}>
                    <ul className="list-disc space-y-2 pl-5">
                      {section.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </Accordion>
                ))}
                {sizeGuide && (
                  <Accordion title="Size guide">
                    <ul className="list-disc space-y-2 pl-5">
                      {sizeGuide.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </Accordion>
                )}
              </div>
            </div>
          </div>
        </div>

        {completeTheLook.length > 0 && (
          <section aria-labelledby="ctl-heading" className="border-t border-line py-16 lg:py-24">
            <div className="container-lux">
              <p className="eyebrow text-muted">Style it with</p>
              <h2 id="ctl-heading" className="type-section mt-3 text-ink">
                Complete the look
              </h2>
              <ul className="mt-10 grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6">
                {completeTheLook.map((p) => (
                  <li key={p.id}>
                    <ProductCard product={p} />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <div className="container-lux pb-20">
          <ProductReviews product={product} />
        </div>

        {/* Mobile sticky add-to-bag */}
        {!soldOut && (
          <div
            className={`fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 transition-transform duration-300 lg:hidden ${
              showSticky ? 'translate-y-0' : 'translate-y-full'
            }`}
            aria-hidden={!showSticky}
          >
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">{name}</p>
                <p className="type-price text-sm text-body">{formatInr(sale)}</p>
              </div>
              <button type="button" onClick={handleAdd} disabled={adding} tabIndex={showSticky ? 0 : -1} className="btn btn-primary shrink-0">
                {adding ? 'Added' : 'Add to bag'}
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
