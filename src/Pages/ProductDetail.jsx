import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import ProductAccordion from '../Components/Product/ProductAccordion'
import ProductPurchasePanel from '../Components/Product/ProductPurchasePanel'
import ProductDetailPrice from '../Components/Product/ProductDetailPrice'
import ProductDetailTrust from '../Components/Product/ProductDetailTrust'
import ProductTrustBadges from '../Components/Product/ProductTrustBadges'
import ProductStickyBar from '../Components/Product/ProductStickyBar'
import SEOHead from '../Components/SEO/SEOHead'
import { SITE_URL } from '../Components/SEO/siteConfig'
import { buildProductDetailSchema } from '../Components/SEO/schemaBuilders'
import { PRODUCT_POLICY_SECTIONS } from '../lib/productPolicies'
import { useCatalog } from '../context/CatalogContext'
import { normalizeProductCategory, getCategoryParamSlug } from '../lib/productCategories'
import { getPrimaryImageUrl, getProductImageUrls } from '../lib/productImages'
import ProductImageGallery from '../Components/Product/ProductImageGallery'
import ProductPromoBadge from '../Components/Product/ProductPromoBadge'
import ProductRating from '../Components/Product/ProductRating'
import ProductBadgeLabel from '../Components/Product/ProductBadgeLabel'
import ProductSoldOutBadge from '../Components/Product/ProductSoldOutBadge'
import ProductReviews from '../Components/Product/ProductReviews'
import { isProductSoldOut } from '../lib/cartStock'
import { findCachedProduct } from '../lib/productCatalogCache'
import { enrichProductWithApprovedReviewAggregates } from '../lib/productReviews'
import { analytics } from '../lib/analytics'

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
  const [quantity, setQuantity] = useState(1)
  const [comboProducts, setComboProducts] = useState([])
  const [loadingCombo, setLoadingCombo] = useState(false)

  useEffect(() => {
    if (!product?.is_combo || !product?.combo_product_ids?.length) {
      setComboProducts([])
      return
    }

    let cancelled = false
    setLoadingCombo(true)

    async function loadComboProducts() {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, mrp, image_url, gallery_urls, out_of_stock, stock, category')
        .in('id', product.combo_product_ids)

      if (cancelled) return
      setLoadingCombo(false)

      if (!error && data) {
        // Sort them to match the order in combo_product_ids
        const sorted = [...data].sort((a, b) => {
          const idxA = product.combo_product_ids.indexOf(a.id)
          const idxB = product.combo_product_ids.indexOf(b.id)
          return idxA - idxB
        })
        setComboProducts(sorted)
      }
    }

    loadComboProducts()

    return () => {
      cancelled = true
    }
  }, [product])

  useEffect(() => {
    setQuantity(1)
  }, [product?.id])

  useEffect(() => {
    if (!product?.id) return
    analytics.viewItem(product)
  }, [product?.id, product?.name, product?.price])

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
        const enriched = await enrichProductWithApprovedReviewAggregates(data)
        if (!cancelled) {
          setProduct(enriched)
          setNotFound(false)
          setLoading(false)
        }
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
        schema={[
          buildProductDetailSchema({
            product,
            image: primaryImage || undefined,
            description: description.slice(0, 500),
            url: productUrl,
          }),
        ]}
      />
      <main className="page-offset-nav bg-white text-[#130006] pb-24 lg:pb-12 no-overflow-x">
        <div className="container-stitch mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6 max-w-safe">
          <nav
            className="mb-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 font-medium sm:text-sm"
            aria-label="Breadcrumb"
          >
            <Link to="/" className="hover:text-[#8B6914] transition-colors">
              Home
            </Link>
            <span aria-hidden>/</span>
            <Link to={collectionsLink} className="hover:text-[#8B6914] transition-colors">
              Shop
            </Link>
            {category && (
              <>
                <span aria-hidden>/</span>
                <span className="text-slate-800 font-semibold">{category}</span>
              </>
            )}
          </nav>

          <div className="grid gap-8 lg:grid-cols-[400px_1fr] lg:gap-12 xl:gap-16 items-start">
            <div className="lg:sticky lg:top-[calc(var(--nav-height)+1rem)] lg:self-start w-full max-w-safe">
              <div className="relative">
                <ProductPromoBadge product={product} className="left-3 top-3 z-20 sm:left-4 sm:top-4" />
                {soldOut && <ProductSoldOutBadge className="left-auto right-3 sm:right-4" />}
                <ProductImageGallery
                  key={product.id}
                  images={productImages}
                  alt={product.name}
                />
              </div>
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {category && (
                  <Link
                    to={collectionsLink}
                    className="text-xs font-bold uppercase tracking-wider text-[#8B6914] hover:text-[#6B5210] hover:underline"
                  >
                    {category}
                  </Link>
                )}
                <ProductBadgeLabel product={product} placement="inline" />
              </div>

              <h1 className="mt-2 font-sans text-2xl font-bold leading-snug text-slate-900 sm:text-3xl lg:text-4xl">
                {product.name}
              </h1>

              <ProductRating product={product} size="detail" className="mt-2 justify-start" linkToReviews />

              <div className="mt-4">
                <ProductDetailPrice product={product} productUrl={productUrl} />
              </div>

              <ProductDetailTrust soldOut={soldOut} />

              <ProductPurchasePanel
                product={product}
                productUrl={productUrl}
                soldOut={soldOut}
                quantity={quantity}
                onQuantityChange={setQuantity}
              />

              {/* Combo products display */}
              {product.is_combo && comboProducts.length > 0 && (
                <div className="mt-6 rounded-xl border border-slate-200 bg-[#FAF9F6] p-4 shadow-xs animate-fade-in">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">
                    Included in this Combo
                  </h3>
                  <div className="space-y-3">
                    {comboProducts.map((p) => {
                      const pImages = getProductImageUrls(p)
                      const pThumb = pImages[0] || ''
                      const pLink = `/product/${p.id}`

                      return (
                        <div
                          key={p.id}
                          className="flex items-center gap-3.5 rounded-lg bg-white border border-slate-200/80 p-2.5 shadow-xs transition hover:border-[#C9A96E]"
                        >
                          <Link to={pLink} className="shrink-0">
                            <img
                              src={pThumb}
                              alt={p.name}
                              className="h-14 w-14 rounded-md object-cover bg-gray-50 border border-black/5"
                            />
                          </Link>
                          <div className="min-w-0 flex-1">
                            {p.category && (
                              <span className="text-[9px] font-bold uppercase tracking-wider text-[#6f334a]">
                                {normalizeProductCategory(p.category)}
                              </span>
                            )}
                            <Link
                              to={pLink}
                              className="block text-sm font-semibold text-[#130006] hover:text-[#6f334a] transition line-clamp-1 leading-snug mt-0.5"
                            >
                              {p.name}
                            </Link>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-sm font-bold text-[#130006]">
                                ₹{Number(p.price).toLocaleString('en-IN')}
                              </span>
                              {p.mrp && Number(p.mrp) > Number(p.price) && (
                                <span className="text-xs text-[#847377] line-through">
                                  ₹{Number(p.mrp).toLocaleString('en-IN')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <ProductAccordion
                compact
                description={description}
                policySections={PRODUCT_POLICY_SECTIONS}
                footerLink={
                  <>
                    <Link
                      to="/shipping-delivery"
                      className="text-xs font-medium text-[#6f334a] underline-offset-2 hover:underline"
                    >
                      Shipping &amp; delivery policy
                    </Link>
                    <span className="text-xs text-[#847377]"> · </span>
                    <Link
                      to="/refund-cancellation"
                      className="text-xs font-medium text-[#6f334a] underline-offset-2 hover:underline"
                    >
                      Refund &amp; cancellation policy
                    </Link>
                  </>
                }
              />

              <ProductTrustBadges />

              <Link
                to={collectionsLink}
                className="tap-target mt-8 inline-flex text-sm font-medium text-[#6f334a] underline-offset-2 hover:underline"
              >
                ← Continue shopping
              </Link>
            </div>
          </div>
          <ProductReviews product={product} />
        </div>

        <ProductStickyBar product={product} soldOut={soldOut} quantity={quantity} />
      </main>
    </>
  )
}
