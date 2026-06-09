import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import ProductAccordion from '../Components/Product/ProductAccordion'
import ProductPurchasePanel from '../Components/Product/ProductPurchasePanel'
import ProductDetailPrice from '../Components/Product/ProductDetailPrice'
import ProductDetailTrust from '../Components/Product/ProductDetailTrust'
import ProductStickyBar from '../Components/Product/ProductStickyBar'
import SEOHead from '../Components/SEO/SEOHead'
import { SITE_URL } from '../Components/SEO/siteConfig'
import { PRODUCT_POLICY_SECTIONS } from '../lib/productPolicies'
import { useCatalog } from '../context/CatalogContext'
import { normalizeProductCategory, getCategoryParamSlug } from '../lib/productCategories'
import { getPrimaryImageUrl, getProductImageUrls } from '../lib/productImages'
import ProductImageGallery from '../Components/Product/ProductImageGallery'
import ProductPromoBadge from '../Components/Product/ProductPromoBadge'
import ProductRating from '../Components/Product/ProductRating'
import ProductBadgeLabel from '../Components/Product/ProductBadgeLabel'
import ProductSoldOutBadge from '../Components/Product/ProductSoldOutBadge'
import { isProductSoldOut } from '../lib/cartStock'
import { findCachedProduct } from '../lib/productCatalogCache'

function ProductDetailSkeleton() {
  return (
    <main className="page-offset-nav bg-white">
      <div className="container-stitch mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 h-3 w-40 animate-pulse rounded bg-[#ebe6df]" />
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
          <div className="aspect-[4/5] animate-pulse rounded-lg bg-[#ebe6df]" />
          <div className="space-y-4">
            <div className="h-8 w-3/4 animate-pulse rounded bg-[#ebe6df]" />
            <div className="h-6 w-32 animate-pulse rounded bg-[#ebe6df]" />
            <div className="h-12 w-full animate-pulse rounded-full bg-[#ebe6df]" />
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
    const cached = findCachedProduct(id)

    if (cached) {
      setProduct(cached)
      setLoading(false)
      setNotFound(false)
    } else {
      setLoading(true)
      setNotFound(false)
    }

    async function loadProduct(attempt = 0) {
      const { data, error } = await supabase.from('products').select('*').eq('id', id).maybeSingle()

      if (cancelled) return

      if (!error && data) {
        setProduct(data)
        setNotFound(false)
        setLoading(false)
        return
      }

      if (attempt < 2) {
        await new Promise((resolve) => window.setTimeout(resolve, 400 * (attempt + 1)))
        if (!cancelled) loadProduct(attempt + 1)
        return
      }

      if (cached) {
        setProduct(cached)
        setNotFound(false)
      } else {
        setNotFound(true)
        setProduct(null)
      }
      setLoading(false)
    }

    loadProduct()

    return () => {
      cancelled = true
    }
  }, [id, catalogVersion])

  const productUrl = `${SITE_URL}/product/${id}`
  const category = product ? normalizeProductCategory(product.category) : null
  const collectionsLink = category
    ? `/collections?category=${getCategoryParamSlug(category)}#signature`
    : '/collections#signature'
  const soldOut = product ? isProductSoldOut(product) : false
  const productImages = product ? getProductImageUrls(product) : []
  const primaryImage = product ? getPrimaryImageUrl(product) : null

  if (loading) {
    return <ProductDetailSkeleton />
  }

  if (notFound || !product) {
    return (
      <main className="page-offset-nav bg-white px-4 py-20 text-center">
        <h1 className="font-serif text-2xl text-[#130006]">Product not found</h1>
        <Link
          to="/collections"
          className="mt-6 inline-flex rounded-full bg-[#3d0a21] px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#f7ead0]"
        >
          Back to shop
        </Link>
      </main>
    )
  }

  const description =
    product.description?.trim() ||
    `Handpicked ${category ? category.toLowerCase() : 'artificial'} jewellery from Velisqa. Premium finish, made for everyday wear.`

  return (
    <>
      <SEOHead
        title={`${product.name} | Velisqa`}
        description={description.slice(0, 155)}
        canonicalPath={`/product/${product.id}`}
        image={primaryImage || undefined}
      />
      <main className="page-offset-nav bg-white text-[#130006] pb-24 lg:pb-12">
        <div className="container-stitch mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
          <nav
            className="mb-5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-[#847377]"
            aria-label="Breadcrumb"
          >
            <Link to="/" className="hover:text-[#130006]">
              Home
            </Link>
            <span aria-hidden>/</span>
            <Link to={collectionsLink} className="hover:text-[#130006]">
              Shop
            </Link>
            {category && (
              <>
                <span aria-hidden>/</span>
                <span>{category}</span>
              </>
            )}
          </nav>

          <div className="grid gap-8 lg:grid-cols-2 lg:gap-10 xl:gap-14">
            <div className="lg:sticky lg:top-[calc(var(--nav-height)+1rem)] lg:self-start">
              <div className="relative overflow-hidden rounded-lg bg-[#f7f4ef]">
                <ProductPromoBadge className="left-3 top-3 z-20 sm:left-4 sm:top-4" />
                {soldOut && <ProductSoldOutBadge className="left-auto right-3 sm:right-4" />}
                <ProductImageGallery
                  key={product.id}
                  images={productImages}
                  alt={product.name}
                />
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex flex-wrap items-center gap-2">
                {category && (
                  <Link
                    to={collectionsLink}
                    className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6f334a] hover:underline"
                  >
                    {category}
                  </Link>
                )}
                <ProductBadgeLabel product={product} placement="inline" />
              </div>

              <h1 className="mt-2 font-serif text-2xl leading-snug text-[#130006] sm:text-3xl">
                {product.name}
              </h1>

              <ProductRating product={product} size="detail" className="mt-2 justify-start" />

              <div className="mt-4">
                <ProductDetailPrice price={product.price} />
              </div>

              <ProductDetailTrust soldOut={soldOut} />

              <ProductPurchasePanel product={product} productUrl={productUrl} soldOut={soldOut} />

              <ProductAccordion
                compact
                description={description}
                policySections={PRODUCT_POLICY_SECTIONS}
                footerLink={
                  <Link
                    to="/shipping-returns"
                    className="text-xs font-medium text-[#6f334a] underline-offset-2 hover:underline"
                  >
                    Full shipping &amp; returns policy
                  </Link>
                }
              />

              <Link
                to={collectionsLink}
                className="tap-target mt-8 inline-flex text-sm font-medium text-[#6f334a] underline-offset-2 hover:underline"
              >
                ← Continue shopping
              </Link>
            </div>
          </div>
        </div>

        <ProductStickyBar product={product} soldOut={soldOut} />
      </main>
    </>
  )
}
