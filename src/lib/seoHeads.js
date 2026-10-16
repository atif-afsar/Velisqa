/**
 * Page <head> data for product and category pages.
 * Shared by the React pages (via SEOHead) and the build-time prerender
 * (scripts/prerender.mjs) so crawlers and browsers always see the same tags.
 */
import { SITE_URL } from '../Components/SEO/siteConfig'
import { buildBreadcrumbSchema, buildItemListSchema, buildProductDetailSchema } from '../Components/SEO/schemaBuilders'
import { categoryPath, findShopCategoryByName } from '../data/shopCategories'
import { normalizeProductCategory } from './productCategories'
import { displayProductName } from './productDisplay'
import { getPrimaryImageUrl, getProductImageUrls } from './productImages'
import { productPath } from './productUrl'
import { formatInr } from './promoPricing'

export function productDescription(product) {
  const name = displayProductName(product.name)
  const category = normalizeProductCategory(product.category)
  return (
    product.description?.trim() ||
    `${name} by Velisqa — ${category ? category.toLowerCase() : 'jewellery'} with a polished finish, designed for everyday wear.`
  )
}

export function productHead(product) {
  const name = displayProductName(product.name)
  const shopCategory = findShopCategoryByName(normalizeProductCategory(product.category))
  const canonicalPath = productPath(product)
  const description = productDescription(product)
  const flat = description.replace(/\s+/g, ' ')
  const crumbs = [
    { name: 'Home', path: '/' },
    { name: shopCategory?.label ?? 'Shop', path: shopCategory ? categoryPath(shopCategory) : '/collections' },
    { name, path: canonicalPath },
  ]
  return {
    name,
    crumbs,
    shopCategory,
    description,
    title: `${name} — ${shopCategory?.label ?? 'Jewellery'} | Velisqa`,
    metaDescription: `${flat.slice(0, 140)}${flat.length > 140 ? '…' : ''} ${formatInr(product.price)}.`,
    canonicalPath,
    image: getPrimaryImageUrl(product) || undefined,
    type: 'product',
    schema: [
      buildProductDetailSchema({
        product,
        name,
        images: getProductImageUrls(product),
        description: description.slice(0, 500),
        url: `${SITE_URL}${canonicalPath}`,
      }),
      buildBreadcrumbSchema(crumbs),
    ],
  }
}

const SORT_VIEWS = {
  newest: { title: 'New arrivals', intro: 'The latest pieces from the Velisqa studio.' },
  'best-selling': { title: 'Bestsellers', intro: 'The pieces our customers return to again and again.' },
}

const ALL_INTRO =
  'Necklaces, earrings, rings, bracelets and bangles — modern pieces in gold and silver tones, designed in India.'

/** `category` is a SHOP_CATEGORIES entry or null for "shop all". */
export function collectionHead(category, products, sort) {
  const sortView = !category ? SORT_VIEWS[sort] : null
  const title = category?.label ?? sortView?.title ?? 'Shop all jewellery'
  const canonicalPath = category ? categoryPath(category) : '/collections'
  const crumbs = [
    { name: 'Home', path: '/' },
    { name: 'Shop', path: '/collections' },
    ...(category ? [{ name: category.label, path: canonicalPath }] : []),
  ]
  return {
    heading: title,
    intro: category?.intro ?? sortView?.intro ?? ALL_INTRO,
    crumbs,
    title: category ? `${category.seoTitle} | Velisqa` : 'Shop All Jewellery — Necklaces, Earrings, Rings & More | Velisqa',
    metaDescription:
      category?.seoDescription ??
      'Shop Velisqa jewellery for women: necklaces, earrings, rings, bracelets and bangles in gold and silver tones. Free shipping on prepaid orders across India.',
    canonicalPath,
    image: category ? category.image(1200) : undefined,
    schema: [buildBreadcrumbSchema(crumbs), buildItemListSchema(products, { name: title })],
  }
}
