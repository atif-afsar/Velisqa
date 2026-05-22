import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import BuyNowButton from '../Components/WhatsApp/BuyNowButton'
import ProductAccordion from '../Components/Product/ProductAccordion'
import SEOHead from '../Components/SEO/SEOHead'
import { SITE_URL } from '../Components/SEO/siteConfig'
import { PRODUCT_POLICY_SECTIONS } from '../lib/productPolicies'
import { useCatalog } from '../context/CatalogContext'
import { normalizeProductCategory, getCategoryParamSlug } from '../lib/productCategories'
import { getPrimaryImageUrl, getProductImageUrls } from '../lib/productImages'
import ProductImageGallery from '../Components/Product/ProductImageGallery'
import ProductPromoBadge from '../Components/Product/ProductPromoBadge'
import ProductPriceDisplay from '../Components/Product/ProductPriceDisplay'

function ProductDetailSkeleton() {
  return (
    <main className="page-offset-nav bg-[#fdf9f4]">
      <div className="container-stitch mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8 h-4 w-48 animate-pulse rounded bg-[#e8e2db]" />
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12 lg:items-start">
          <div className="aspect-[4/5] animate-pulse rounded-2xl bg-[#ebe6df]" />
          <div className="space-y-4">
            <div className="h-3 w-20 animate-pulse rounded bg-[#e8e2db]" />
            <div className="h-10 w-4/5 animate-pulse rounded bg-[#e8e2db]" />
            <div className="h-8 w-32 animate-pulse rounded bg-[#e8e2db]" />
          </div>
        </div>
      </div>
    </main>
  )
}

export default function ProductDetail() {
  const { id } = useParams()
  const { catalogVersion } = useCatalog()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setNotFound(false)

    supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error || !data) {
          setNotFound(true)
          setProduct(null)
        } else {
          setProduct(data)
        }
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id, catalogVersion])

  const productUrl = `${SITE_URL}/product/${id}`
  const category = product ? normalizeProductCategory(product.category) : null
  const collectionsLink = category
    ? `/collections?category=${getCategoryParamSlug(category)}#signature`
    : '/collections#signature'
  const soldOut = product ? Number(product.stock) <= 0 : false
  const productImages = product ? getProductImageUrls(product) : []
  const primaryImage = product ? getPrimaryImageUrl(product) : null

  if (loading) {
    return <ProductDetailSkeleton />
  }

  if (notFound || !product) {
    return (
      <main className="page-offset-nav bg-[#fdf9f4] px-4 py-20 text-center">
        <h1 className="font-serif text-2xl text-[#130006]">Product not found</h1>
        <Link
          to="/collections"
          className="mt-6 inline-flex rounded-full border border-[#847377]/35 px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#514347] hover:border-[#3d0a21]/40"
        >
          Back to collections
        </Link>
      </main>
    )
  }

  const description =
    product.description?.trim() ||
    `Handpicked ${category ? category.toLowerCase() : 'artificial'} jewellery from Velisqa. Order on WhatsApp for availability and delivery in Aligarh or pan-India.`

  return (
    <>
      <SEOHead
        title={`${product.name} | Velisqa`}
        description={description.slice(0, 155)}
        canonicalPath={`/product/${product.id}`}
        image={primaryImage || undefined}
      />
      <main className="page-offset-nav bg-[#fdf9f4] text-[#130006]">
        <div className="container-stitch mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10 lg:py-12">
          {/* Breadcrumb */}
          <nav
            className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#847377] sm:mb-8 sm:text-[11px]"
            aria-label="Breadcrumb"
          >
            <Link to="/" className="transition hover:text-[#6f334a]">
              Home
            </Link>
            <span className="text-[#d4af37]/80" aria-hidden>
              /
            </span>
            <Link to={collectionsLink} className="transition hover:text-[#6f334a]">
              Collections
            </Link>
            {category && (
              <>
                <span className="text-[#d4af37]/80" aria-hidden>
                  /
                </span>
                <span className="text-[#514347]">{category}</span>
              </>
            )}
          </nav>

          {/* Hero */}
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12 xl:gap-16 lg:items-start">
            {/* Image */}
            <div className="relative lg:sticky lg:top-[calc(var(--nav-height)+1.25rem)]">
              <div className="pointer-events-none absolute inset-3 rounded-2xl border border-[#d4af37]/25 sm:inset-4" aria-hidden />
              <div className="relative shadow-[0_28px_72px_-24px_rgba(19,0,6,0.28)] ring-1 ring-[#130006]/5">
                <ProductPromoBadge className="left-4 top-4 z-20 sm:left-5 sm:top-5" />
                <ProductImageGallery
                  key={product.id}
                  images={productImages}
                  alt={product.name}
                />
              </div>
            </div>

            {/* Product info */}
            <div className="flex flex-col lg:pt-1">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {category && (
                  <span className="inline-flex rounded-full border border-[#3d0a21]/15 bg-[#3d0a21] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#e9c349]">
                    {category}
                  </span>
                )}
                <span className="inline-flex rounded-full border border-[#d4af37]/35 bg-[#fbf7f1] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#6f334a]">
                  Signature collection
                </span>
              </div>

              <h1 className="mt-4 font-serif text-[1.75rem] leading-[1.15] text-[#130006] sm:mt-5 sm:text-4xl lg:text-[2.75rem]">
                {product.name}
              </h1>

              <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-b border-[#d4af37]/25 pb-6 sm:mt-6">
                <ProductPriceDisplay price={product.price} size="detail" />
                {soldOut ? (
                  <span className="rounded-full border border-[#c9a75a]/40 bg-[#c9a75a]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a6b1f]">
                    Sold out
                  </span>
                ) : (
                  <span className="rounded-full border border-[#3d0a21]/10 bg-white/80 px-3 py-1 text-xs font-medium text-[#514347]">
                    {Number(product.stock) === 1 ? 'Last piece in stock' : `${product.stock} in stock`}
                  </span>
                )}
              </div>

              {/* Quick highlights */}
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                <li className="flex gap-3 rounded-xl border border-[#d4af37]/18 bg-[#fbf7f1] p-3.5 sm:p-4">
                  <span className="text-lg leading-none text-[#d4af37]" aria-hidden>
                    ◆
                  </span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#847377]">Aligarh</p>
                    <p className="mt-0.5 text-sm leading-snug text-[#514347]">Same-day delivery before 4 PM</p>
                  </div>
                </li>
                <li className="flex gap-3 rounded-xl border border-[#d4af37]/18 bg-[#fbf7f1] p-3.5 sm:p-4">
                  <span className="text-lg leading-none text-[#d4af37]" aria-hidden>
                    ◆
                  </span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#847377]">At your door</p>
                    <p className="mt-0.5 text-sm leading-snug text-[#514347]">Inspect with delivery partner</p>
                  </div>
                </li>
              </ul>

              {/* CTA */}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-stretch">
                <div className="flex-1 sm:min-w-[200px]">
                  <BuyNowButton
                    productName={product.name}
                    productUrl={productUrl}
                    soldOut={soldOut}
                    className="w-full px-8 py-4"
                  >
                    {soldOut ? 'Enquire to purchase' : 'Buy Now'}
                  </BuyNowButton>
                </div>
                <Link
                  to={collectionsLink}
                  className="tap-target inline-flex flex-1 items-center justify-center rounded-full border border-[#847377]/35 bg-white/60 px-6 py-3.5 text-center text-xs font-semibold uppercase tracking-[0.14em] text-[#514347] transition hover:border-[#3d0a21]/40 hover:bg-white sm:flex-none sm:px-8"
                >
                  Back to collection
                </Link>
              </div>
            </div>
          </div>

          {/* Accordions — full width below hero */}
          <section className="mt-12 sm:mt-14 lg:mt-16" aria-labelledby="product-details-heading">
            <div className="mb-6 flex flex-col items-center text-center sm:mb-8">
              <p id="product-details-heading" className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#847377]">
                The fine print
              </p>
              <h2 className="mt-2 font-serif text-2xl italic text-[#130006] sm:text-3xl">
                Delivery, returns &amp; care
              </h2>
              <div className="mt-3 h-px w-16 bg-[#e9c349]" />
            </div>

            <ProductAccordion
              description={description}
              policySections={PRODUCT_POLICY_SECTIONS}
              footerLink={
                <p className="text-xs leading-relaxed text-[#847377]">
                  Full terms on{' '}
                  <Link
                    to="/shipping-returns"
                    className="font-medium text-[#6f334a] underline-offset-2 hover:underline"
                  >
                    Shipping &amp; Returns
                  </Link>
                  .
                </p>
              }
            />
          </section>
        </div>
      </main>
    </>
  )
}
