/**
 * Build-time prerender of <head> tags + JSON-LD for every public route.
 *
 * The storefront is a client-rendered SPA. Crawlers that don't run JavaScript —
 * and every link-preview bot (WhatsApp, Facebook, X) — only see index.html, so
 * this step writes one HTML file per route with the right title, description,
 * canonical, Open Graph / Twitter tags, structured data and a <noscript> summary.
 * The same SEO modules the React pages use are loaded through Vite, so the tags
 * always match what the browser renders.
 *
 * Outputs (in dist/):
 *   <route>.html            static pages, categories, landing pages, products
 *   product/<uuid>.html     legacy product URLs → instant redirect to the slug URL
 *   app.html                generic shell for client-only routes (cart, account…)
 *   sitemap.xml             all indexable URLs, with product images
 *
 * Product data comes from Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).
 * If the catalogue can't be fetched the build still succeeds without product pages.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import { createServer, loadEnv } from 'vite'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')
const env = { ...loadEnv('production', ROOT, 'VITE_'), ...process.env }

const vite = await createServer({ root: ROOT, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const load = (p) => vite.ssrLoadModule(p)

try {
  const { SITE_URL, DEFAULT_OG_IMAGE, STATIC_ROUTES } = await load('/src/Components/SEO/siteConfig.js')
  const { pageSeo, landingPages } = await load('/src/Components/SEO/seoData.js')
  const schemas = await load('/src/Components/SEO/schemaBuilders.js')
  const { productHead, collectionHead } = await load('/src/lib/seoHeads.js')
  const { SHOP_CATEGORIES } = await load('/src/data/shopCategories.js')
  const { productPath } = await load('/src/lib/productUrl.js')
  const { normalizeProductCategory } = await load('/src/lib/productCategories.js')
  const { displayProductName } = await load('/src/lib/productDisplay.js')
  const { formatInr } = await load('/src/lib/promoPricing.js')
  const { legalPages } = await load('/src/Components/Legal/legalContent.js')
  const { buildImageSrcSet, buildImageUrl } = await load('/src/lib/imageCdn.js')
  const { getPrimaryImageUrl, getProductImageUrls } = await load('/src/lib/productImages.js')
  const { default: Hero } = await load('/src/Components/Home/Hero.jsx')
  const media = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/media.json'), 'utf8'))

  const template = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8')
  const today = new Date().toISOString().slice(0, 10)

  // ── Catalogue ────────────────────────────────────────────────────────────
  let products = []
  try {
    products = await fetchProducts(env)
    console.log(`prerender: ${products.length} products`)
  } catch (error) {
    console.warn(`prerender: catalogue unavailable (${error.message}) — product pages skipped`)
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  const esc = (s) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  const jsonLd = (id, data) =>
    `<script type="application/ld+json" id="${id}">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`

  function renderHead({ title, description, canonicalPath, image, type = 'website', schema = [], noindex = false, extraHead = '' }) {
    const url = canonicalPath != null ? `${SITE_URL}${canonicalPath}` : null
    const img = image || DEFAULT_OG_IMAGE
    const robots = noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
    return [
      `<title>${esc(title)}</title>`,
      `<meta name="description" content="${esc(description)}" />`,
      `<meta name="robots" content="${robots}" />`,
      url && `<link rel="canonical" href="${esc(url)}" />`,
      `<meta property="og:site_name" content="VELISQA" />`,
      `<meta property="og:locale" content="en_IN" />`,
      `<meta property="og:type" content="${type}" />`,
      `<meta property="og:title" content="${esc(title)}" />`,
      `<meta property="og:description" content="${esc(description)}" />`,
      url && `<meta property="og:url" content="${esc(url)}" />`,
      `<meta property="og:image" content="${esc(img)}" />`,
      `<meta property="og:image:alt" content="${esc(title)}" />`,
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:title" content="${esc(title)}" />`,
      `<meta name="twitter:description" content="${esc(description)}" />`,
      `<meta name="twitter:image" content="${esc(img)}" />`,
      jsonLd('velisqa-organization-schema', schemas.buildOrganizationSchema()),
      jsonLd('velisqa-website-schema', schemas.buildWebsiteSchema()),
      schema.length ? jsonLd('velisqa-page-schema', schema.length === 1 ? schema[0] : schema) : '',
      extraHead,
    ]
      .filter(Boolean)
      .map((l) => `    ${l}`)
      .join('\n')
  }

  /** Replace the template's generic SEO tags with route-specific ones. */
  function page(head, noscript = '', rootHtml = '') {
    let html = template
      .replace(/\s*<title>[\s\S]*?<\/title>/, '')
      .replace(/\s*<meta\s+(name|property)="(description|keywords|robots|og:[^"]+|twitter:[^"]+)"[\s\S]*?\/>/g, '')
      .replace(/\s*<link rel="canonical"[^>]*\/>/, '')
    html = html.replace('</head>', `${renderHead(head)}\n  </head>`)
    if (noscript) html = html.replace('<div id="root"></div>', `<noscript>${noscript}</noscript>\n    <div id="root"></div>`)
    // Static first paint; React replaces it with identical markup when it mounts.
    if (rootHtml) html = html.replace('<div id="root"></div>', `<div id="root">${rootHtml}</div>`)
    return html
  }

  function write(routePath, html) {
    const file = routePath === '/' ? 'index.html' : `${routePath.replace(/^\//, '')}.html`
    const target = path.join(DIST, file)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, html)
  }

  const sitemap = []
  const addUrl = (loc, { priority = '0.7', changefreq = 'weekly', images = [] } = {}) =>
    sitemap.push({ loc: `${SITE_URL}${loc}`, priority, changefreq, images })
  const crumbs = (...items) => schemas.buildBreadcrumbSchema([{ name: 'Home', path: '/' }, ...items])

  /** <link rel=preload> for a page's LCP image, built with the same helpers the components use. */
  function preloadImage(src, widths, sizes, opts = {}) {
    if (!src) return ''
    const set = buildImageSrcSet(src, widths, opts)
    return set
      ? `<link rel="preload" as="image" imagesrcset="${esc(set)}" imagesizes="${sizes}" fetchpriority="high" />`
      : `<link rel="preload" as="image" href="${esc(buildImageUrl(src, { width: 1080, ...opts }))}" fetchpriority="high" />`
  }
  // Must match ProductCard / ProductImage defaults and ProductGallery.
  const CARD_SIZES = '(min-width: 1280px) 22vw, (min-width: 1024px) 28vw, (min-width: 768px) 30vw, 46vw'
  const cardPreload = (p) => (p ? preloadImage(getPrimaryImageUrl(p), [360, 480, 600, 800], CARD_SIZES, { quality: 72 }) : '')
  const galleryPreload = (p) => {
    const imgs = getProductImageUrls(p)
    if (!imgs.length) return ''
    return preloadImage(imgs[0], [480, 720, 960, 1280, 1600], imgs.length > 1 ? '(min-width: 1024px) 28vw, 100vw' : '(min-width: 1024px) 55vw, 100vw')
  }

  // ── Client-only shell (cart, checkout, account, admin…) ──────────────────
  fs.writeFileSync(
    path.join(DIST, 'app.html'),
    page({
      title: 'Velisqa Jewellery',
      description: pageSeo.home.description,
      canonicalPath: null,
      noindex: true,
    }),
  )

  // ── Home (with hero preload) ─────────────────────────────────────────────
  // Homepage LCP image — must match Components/Home/Hero.jsx.
  const heroPreload = (() => {
    const slot = 'campaign-hero-b'
    const entry = media[slot]
    if (!entry) return ''
    const set = entry.widths.map((w) => `/media/${slot}-${w}.avif ${w}w`).join(', ')
    return `<link rel="preload" as="image" type="image/avif" imagesrcset="${set}" imagesizes="(min-width: 1024px) 50vw, 100vw" fetchpriority="high" />`
  })()
  const homeLinks = SHOP_CATEGORIES.map((c) => `<li><a href="/collections/${c.slug}">${esc(c.label)}</a></li>`).join('')
  write(
    '/',
    page(
      { ...pageSeo.home, canonicalPath: '/', extraHead: heroPreload },
      `<p>${esc(pageSeo.home.description)}</p><ul>${homeLinks}</ul>`,
      // The real Hero component, rendered at build time, so the LCP image paints before JS loads.
      renderToString(
        createElement(StaticRouter, { location: '/' }, createElement('main', { className: 'page-offset-nav bg-paper text-ink' }, createElement(Hero))),
      ),
    ),
  )
  addUrl('/', { priority: '1.0', changefreq: 'daily' })

  // ── Static content pages ────────────────────────────────────────────────
  const STATIC_KEYS = {
    '/about': 'about',
    '/contact': 'contact',
    '/order': 'order',
    '/faq': 'faq',
    '/shipping-delivery': 'shippingDelivery',
    '/refund-cancellation': 'refundCancellation',
    '/privacy': 'privacy',
    '/terms': 'terms',
    '/authenticity': 'authenticity',
    '/founders': 'founders',
    '/models': 'models',
  }
  for (const route of STATIC_ROUTES) {
    const key = STATIC_KEYS[route.path]
    if (!key || !pageSeo[key]) continue
    const seo = pageSeo[key]
    const schema = [crumbs({ name: seo.title.split('|')[0].trim(), path: route.path })]
    if (key === 'faq' && legalPages?.faq?.faqItems) schema.push(schemas.buildFaqSchema(legalPages.faq.faqItems))
    write(route.path, page({ ...seo, canonicalPath: route.path, schema }))
    addUrl(route.path, { priority: route.priority, changefreq: route.changefreq })
  }

  // ── SEO landing pages ───────────────────────────────────────────────────
  for (const lp of landingPages) {
    const p = `/${lp.slug}`
    const schema = [crumbs({ name: lp.title, path: p })]
    if (lp.faqs?.length) schema.push(schemas.buildFaqSchema(lp.faqs))
    write(p, page({ title: lp.metaTitle, description: lp.description, canonicalPath: p, schema }, `<h1>${esc(lp.title)}</h1><p>${esc(lp.hero)}</p>`))
    addUrl(p, { priority: '0.8', changefreq: 'monthly' })
  }

  // ── Collections + categories ────────────────────────────────────────────
  const listing = (list) =>
    `<ul>${list
      .slice(0, 60)
      .map((p) => `<li><a href="${productPath(p)}">${esc(displayProductName(p.name))}</a> — ${esc(formatInr(p.price))}</li>`)
      .join('')}</ul>`
  {
    const head = { ...collectionHead(null, products), extraHead: cardPreload(products[0]) }
    write('/collections', page(head, `<h1>${esc(head.heading)}</h1><p>${esc(head.intro)}</p>${listing(products)}`))
    addUrl('/collections', { priority: '0.95', changefreq: 'daily' })
  }
  for (const category of SHOP_CATEGORIES) {
    const scoped = products.filter((p) => normalizeProductCategory(p.category) === category.category)
    const head = { ...collectionHead(category, scoped), extraHead: cardPreload(scoped[0]) }
    write(head.canonicalPath, page(head, `<h1>${esc(head.heading)}</h1><p>${esc(head.intro)}</p>${listing(scoped)}`))
    addUrl(head.canonicalPath, { priority: '0.9', changefreq: 'daily' })
  }

  // ── Products (+ legacy UUID redirects) ──────────────────────────────────
  for (const product of products) {
    const head = productHead(product)
    write(
      head.canonicalPath,
      page(
        { ...head, description: head.metaDescription, extraHead: galleryPreload(product) },
        `<h1>${esc(head.name)}</h1><p>${esc(formatInr(product.price))}</p><p>${esc(head.description)}</p>` +
          (head.shopCategory ? `<p><a href="/collections/${head.shopCategory.slug}">More ${esc(head.shopCategory.label.toLowerCase())}</a></p>` : ''),
      ),
    )
    const target = `${SITE_URL}${head.canonicalPath}`
    write(
      `/product/${product.id}`,
      `<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><title>${esc(head.title)}</title>` +
        `<link rel="canonical" href="${esc(target)}"><meta name="robots" content="noindex, follow">` +
        `<meta http-equiv="refresh" content="0; url=${esc(head.canonicalPath)}"></head>` +
        `<body><a href="${esc(head.canonicalPath)}">${esc(head.name)}</a></body></html>`,
    )
    const images = (Array.isArray(product.gallery_urls) && product.gallery_urls.length ? product.gallery_urls : [product.image_url]).filter(Boolean).slice(0, 5)
    addUrl(head.canonicalPath, { priority: '0.8', changefreq: 'weekly', images: images.map((u) => ({ loc: u, title: head.name })) })
  }

  // ── Sitemap ─────────────────────────────────────────────────────────────
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
    sitemap
      .map(
        (u) =>
          `  <url>\n    <loc>${esc(u.loc)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n` +
          u.images.map((im) => `    <image:image><image:loc>${esc(im.loc)}</image:loc><image:title>${esc(im.title)}</image:title></image:image>\n`).join('') +
          `  </url>`,
      )
      .join('\n') +
    `\n</urlset>\n`
  fs.writeFileSync(path.join(DIST, 'sitemap.xml'), xml)
  console.log(`prerender: wrote ${sitemap.length} sitemap URLs`)
} finally {
  await vite.close()
}

async function fetchProducts(env) {
  const url = env.VITE_SUPABASE_URL
  const key = env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase env vars missing')
  const headers = { apikey: key, Authorization: `Bearer ${key}` }
  const select = 'id,name,price,mrp,stock,out_of_stock,category,description,image_url,gallery_urls,metal,colour,created_at'
  const res = await fetch(`${url}/rest/v1/products?select=${select}&order=created_at.desc`, { headers })
  if (!res.ok) throw new Error(`products HTTP ${res.status}`)
  const products = await res.json()

  // Ratings from approved reviews only (same rule as the storefront).
  const agg = new Map()
  try {
    const r = await fetch(`${url}/rest/v1/product_reviews?select=product_id,rating&status=eq.approved`, { headers })
    if (r.ok) {
      for (const row of await r.json()) {
        const a = agg.get(row.product_id) ?? { sum: 0, n: 0 }
        a.sum += Number(row.rating)
        a.n += 1
        agg.set(row.product_id, a)
      }
    }
  } catch {
    /* reviews optional */
  }
  return products.map((p) => {
    const a = agg.get(p.id)
    return { ...p, rating: a ? Math.round((a.sum / a.n) * 10) / 10 : null, review_count: a?.n ?? 0 }
  })
}
