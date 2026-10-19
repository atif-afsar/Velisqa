/**
 * Build-time static rendering (SSG) of every public route.
 *
 * The storefront is a React SPA, but most AI crawlers (GPTBot, ClaudeBot, PerplexityBot…)
 * and every link-preview bot read only the raw HTML. So this step renders the *real app*
 * — header, page content, product grids, footer — for each route, together with the
 * route's <head> (title, description, canonical, Open Graph, JSON-LD) and the catalogue
 * data it used. In the browser that data seeds the first render (src/lib/prerenderData.js),
 * so React shows identical content immediately instead of a loading state.
 *
 * Outputs (in dist/):
 *   <route>.html            home, static pages, landing pages, categories, products
 *   product/<uuid>.html     legacy product URLs → instant redirect to the slug URL
 *   app.html                empty shell for client-only routes (cart, account…)
 *   404.html                served by Vercel with a real 404 status for unknown URLs
 *   sitemap.xml             all indexable URLs, with product images
 *   llms.txt, llms-full.txt plain-language site guide + catalogue for AI assistants
 *   feeds/google-merchant.xml  product feed for Google Merchant Center (free listings)
 *
 * Product data comes from the Velisqa API (VITE_API_BASE_URL, public GET /products).
 * If the catalogue can't be fetched the build still succeeds without product pages.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { prerenderToNodeStream } from 'react-dom/static'
import { StaticRouter } from 'react-router'
import { createServer, loadEnv } from 'vite'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')
const env = { ...loadEnv('production', ROOT, 'VITE_'), ...process.env }

const vite = await createServer({ root: ROOT, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const load = (p) => vite.ssrLoadModule(p)

try {
  const { SITE_URL, DEFAULT_OG_IMAGE, STATIC_ROUTES, CONTACT_EMAIL, WHATSAPP_PHONE, INSTAGRAM_URL } = await load('/src/Components/SEO/siteConfig.js')
  const { pageSeo, landingPages } = await load('/src/Components/SEO/seoData.js')
  const schemas = await load('/src/Components/SEO/schemaBuilders.js')
  const { productHead, collectionHead, productDescription } = await load('/src/lib/seoHeads.js')
  const { SHOP_CATEGORIES } = await load('/src/data/shopCategories.js')
  const { productPath } = await load('/src/lib/productUrl.js')
  const { normalizeProductCategory } = await load('/src/lib/productCategories.js')
  const { displayProductName } = await load('/src/lib/productDisplay.js')
  const { formatInr } = await load('/src/lib/promoPricing.js')
  const { legalPages } = await load('/src/Components/Legal/legalContent.js')
  const { buildImageSrcSet, buildImageUrl } = await load('/src/lib/imageCdn.js')
  const { getPrimaryImageUrl, getProductImageUrls } = await load('/src/lib/productImages.js')
  const { HERO_SLIDES, HERO_BANNER_MEDIA } = await load('/src/data/heroSlides.js')
  const { toCardProduct } = await load('/src/lib/prerenderData.js')
  const { COD_FEE } = await load('/src/lib/checkoutPricing.js')
  const { RETURN_WINDOW_DAYS } = await load('/src/lib/orderReturns.js')
  const { default: App } = await load('/src/App.jsx')
  const { AuthProvider } = await load('/src/context/AuthContext.jsx')
  const { CatalogProvider } = await load('/src/context/CatalogContext.jsx')
  const { WishlistProvider } = await load('/src/context/WishlistContext.jsx')
  const { CartProvider } = await load('/src/context/CartContext.jsx')
  const media = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/media.json'), 'utf8'))
  const manifest = readManifest()

  const template = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8')
  if (!template.includes('<div id="root"></div>')) throw new Error('dist/index.html is not the Vite shell — run `vite build` before prerendering')
  const today = new Date().toISOString().slice(0, 10)

  // ── Catalogue ────────────────────────────────────────────────────────────
  let products = []
  try {
    products = await fetchProducts(env)
    console.log(`prerender: ${products.length} products`)
  } catch (error) {
    console.warn(`prerender: catalogue unavailable (${error.message}) — product pages skipped`)
  }
  const cards = products.map(toCardProduct)

  // ── Helpers ──────────────────────────────────────────────────────────────
  const esc = (s) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  const safeJson = (data) => JSON.stringify(data).replace(/</g, '\\u003c')
  const jsonLd = (id, data) => `<script type="application/ld+json" id="${id}">${safeJson(data)}</script>`

  function renderHead({ title, description, canonicalPath, image, type = 'website', schema = [], noindex = false, extraHead = '' }) {
    const url = canonicalPath != null ? `${SITE_URL}${canonicalPath}` : null
    const img = image || DEFAULT_OG_IMAGE
    const robots = noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
    return [
      `<title>${esc(title)}</title>`,
      `<meta name="description" content="${esc(description)}" />`,
      `<meta name="robots" content="${robots}" />`,
      url && `<link rel="canonical" href="${esc(url)}" />`,
      url && `<link rel="alternate" hreflang="en-IN" href="${esc(url)}" />`,
      url && `<link rel="alternate" hreflang="x-default" href="${esc(url)}" />`,
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

  /** Vite manifest → <link rel=modulepreload> for a page chunk and its imports (loads in parallel with the entry). */
  function chunkPreloads(srcFile) {
    if (!manifest || !srcFile) return ''
    const seen = new Set()
    const files = []
    const visit = (key) => {
      const chunk = manifest[key]
      if (!chunk || seen.has(key) || chunk.isEntry) return
      seen.add(key)
      files.push(chunk.file)
      for (const dep of chunk.imports ?? []) visit(dep)
    }
    visit(srcFile)
    return files.map((f) => `<link rel="modulepreload" crossorigin href="/${f}" />`).join('\n    ')
  }

  /** The real app for `url`, rendered to HTML with `data` as its catalogue. */
  async function renderApp(url, data) {
    globalThis.__VELISQA_DATA__ = data ?? {}
    globalThis.__VELISQA_HEAD__ = { current: null }
    try {
      const tree = createElement(
        StaticRouter,
        { location: url },
        createElement(
          AuthProvider,
          null,
          createElement(CatalogProvider, null, createElement(WishlistProvider, null, createElement(CartProvider, null, createElement(App)))),
        ),
      )
      const { prelude } = await prerenderToNodeStream(tree)
      let html = ''
      for await (const chunk of prelude) html += chunk
      return { html, head: globalThis.__VELISQA_HEAD__.current }
    } finally {
      delete globalThis.__VELISQA_DATA__
      delete globalThis.__VELISQA_HEAD__
    }
  }

  /**
   * Full HTML document: prerendered app + the data it rendered with + its head.
   * The head comes from the page's own SEOHead (captured during the render), so crawlers get
   * exactly what the browser shows; `head` here is the fallback and adds route-only extras.
   */
  async function page(url, head, { data, chunk, render = true, overrides = {} } = {}) {
    let html = template
      .replace(/\s*<title>[\s\S]*?<\/title>/, '')
      .replace(/\s*<meta\s+(name|property)="(description|keywords|robots|og:[^"]+|twitter:[^"]+)"[\s\S]*?\/>/g, '')
      .replace(/\s*<link rel="canonical"[^>]*\/>/, '')
    let finalHead = head
    if (render) {
      const rendered = await renderApp(url, data)
      if (!rendered.head) console.warn(`prerender: ${url} rendered no SEOHead — using fallback head`)
      finalHead = { ...head, ...(rendered.head ?? {}), ...overrides }
      const dataScript = data ? `<script id="velisqa-data" type="application/json">${safeJson(data)}</script>\n    ` : ''
      html = html.replace('<div id="root"></div>', `${dataScript}<div id="root">${rendered.html}</div>`)
    }
    const extraHead = [head.extraHead, chunkPreloads(chunk)].filter(Boolean).join('\n    ')
    return html.replace('</head>', `${renderHead({ ...finalHead, extraHead })}\n  </head>`)
  }

  function write(routePath, html) {
    const file = routePath === '/' ? 'index.html' : `${routePath.replace(/^\//, '')}.html`
    const target = path.join(DIST, file)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, html)
  }

  const sitemap = []
  // lastmod only where it is meaningful: listings change with every build, products carry their own date.
  const addUrl = (loc, { priority = '0.7', changefreq = 'weekly', images = [], lastmod } = {}) =>
    sitemap.push({ loc: `${SITE_URL}${loc}`, priority, changefreq, images, lastmod })
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
    await page(null, { title: 'Velisqa Jewellery', description: pageSeo.home.description, canonicalPath: null, noindex: true }, { render: false }),
  )

  // ── 404 (Vercel serves it with status 404 for any URL without a file or rewrite) ──
  fs.writeFileSync(
    path.join(DIST, '404.html'),
    await page('/__not-found__/', { title: 'Page not found | Velisqa', description: pageSeo.home.description, canonicalPath: null, noindex: true }, { chunk: 'src/Pages/NotFound.jsx', overrides: { canonicalPath: null } }),
  )

  // ── Home ─────────────────────────────────────────────────────────────────
  // LCP image. Banners set in /admin/hero replace the built-ins, so only preload a built-in
  // banner when the admin has none (otherwise the old image would download and flash first).
  const adminHero = await fetchAdminHero()
  const heroPreload = (() => {
    if (adminHero === null) return ''
    if (adminHero.length) {
      const first = adminHero[0]
      return `<link rel="preload" as="image" href="${first.mobileUrl || first.desktopUrl}" fetchpriority="high" />`
    }
    const { mobile, banner } = HERO_SLIDES[0]
    const link = (slot, mediaQuery) => {
      const entry = media[slot]
      if (!entry) return ''
      const set = entry.widths.map((w) => `/media/${slot}-${w}.avif ${w}w`).join(', ')
      return `<link rel="preload" as="image" type="image/avif" media="${mediaQuery}" imagesrcset="${set}" imagesizes="100vw" fetchpriority="high" />`
    }
    return link(mobile, 'not all and ' + HERO_BANNER_MEDIA) + link(banner, HERO_BANNER_MEDIA)
  })()
  write(
    '/',
    await page(
      '/',
      { ...pageSeo.home, canonicalPath: '/', extraHead: heroPreload },
      { data: { products: cards } },
    ),
  )
  addUrl('/', { priority: '1.0', changefreq: 'daily', lastmod: today })

  // ── Static content pages ────────────────────────────────────────────────
  const STATIC_PAGES = {
    '/about': ['about', 'src/Pages/About.jsx'],
    '/contact': ['contact', 'src/Pages/Contact.jsx'],
    '/order': ['order', 'src/Pages/Order.jsx'],
    '/faq': ['faq', 'src/Pages/FAQ.jsx'],
    '/shipping-delivery': ['shippingDelivery', 'src/Pages/ShippingDelivery.jsx'],
    '/refund-cancellation': ['refundCancellation', 'src/Pages/RefundCancellation.jsx'],
    '/privacy': ['privacy', 'src/Pages/Privacy.jsx'],
    '/terms': ['terms', 'src/Pages/Terms.jsx'],
    '/authenticity': ['authenticity', 'src/Pages/Authenticity.jsx'],
    '/founders': ['founders', 'src/Pages/Founders.jsx'],
    '/models': ['models', 'src/Pages/Models.jsx'],
  }
  for (const route of STATIC_ROUTES) {
    const [key, chunk] = STATIC_PAGES[route.path] ?? []
    if (!key || !pageSeo[key]) continue
    const seo = pageSeo[key]
    const schema = [crumbs({ name: seo.title.split('|')[0].trim(), path: route.path })]
    if (key === 'faq' && legalPages?.faq?.faqItems) schema.push(schemas.buildFaqSchema(legalPages.faq.faqItems))
    write(route.path, await page(route.path, { ...seo, canonicalPath: route.path, schema }, { chunk }))
    addUrl(route.path, { priority: route.priority, changefreq: route.changefreq })
  }

  // ── SEO landing pages ───────────────────────────────────────────────────
  for (const lp of landingPages) {
    const p = `/${lp.slug}`
    const schema = [crumbs({ name: lp.title, path: p })]
    if (lp.faqs?.length) schema.push(schemas.buildFaqSchema(lp.faqs))
    write(p, await page(p, { title: lp.metaTitle, description: lp.description, canonicalPath: p, schema }, { chunk: 'src/Pages/SEOLanding.jsx' }))
    addUrl(p, { priority: '0.8', changefreq: 'monthly' })
  }

  // ── Collections + categories ────────────────────────────────────────────
  {
    const head = collectionHead(null, products)
    write(
      '/collections',
      await page('/collections', { ...head, description: head.metaDescription, extraHead: cardPreload(products[0]) }, { data: { products: cards }, chunk: 'src/Pages/Collections.jsx' }),
    )
    addUrl('/collections', { priority: '0.95', changefreq: 'daily', lastmod: today })
  }
  for (const category of SHOP_CATEGORIES) {
    const scoped = products.filter((p) => normalizeProductCategory(p.category) === category.category)
    const head = collectionHead(category, scoped)
    write(
      head.canonicalPath,
      await page(
        head.canonicalPath,
        { ...head, description: head.metaDescription, extraHead: cardPreload(scoped[0]) },
        { data: { products: cards }, chunk: 'src/Pages/Collections.jsx' },
      ),
    )
    addUrl(head.canonicalPath, { priority: '0.9', changefreq: 'daily', lastmod: today })
  }

  // ── Products (+ legacy UUID redirects) ──────────────────────────────────
  for (const product of products) {
    const head = productHead(product)
    write(
      head.canonicalPath,
      await page(
        head.canonicalPath,
        { ...head, description: head.metaDescription, extraHead: galleryPreload(product) },
        { data: { products: cards, product: toPublicProduct(product) }, chunk: 'src/Pages/ProductDetail.jsx' },
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
    const images = getProductImageUrls(product).slice(0, 5)
    const lastmod = String(product.updated_at || product.created_at || '').slice(0, 10) || undefined
    addUrl(head.canonicalPath, { priority: '0.8', changefreq: 'weekly', lastmod, images: images.map((u) => ({ loc: u, title: head.name })) })
  }

  // ── Sitemap ─────────────────────────────────────────────────────────────
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
    sitemap
      .map(
        (u) =>
          `  <url>\n    <loc>${esc(u.loc)}</loc>\n` +
          (u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : '') +
          `    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n` +
          u.images.map((im) => `    <image:image><image:loc>${esc(im.loc)}</image:loc><image:title>${esc(im.title)}</image:title></image:image>\n`).join('') +
          `  </url>`,
      )
      .join('\n') +
    `\n</urlset>\n`
  fs.writeFileSync(path.join(DIST, 'sitemap.xml'), xml)

  // ── llms.txt / llms-full.txt (plain-language guide for AI assistants) ───
  const policyFacts = [
    `Free shipping on all prepaid orders across India. Cash on delivery is available for a ₹${COD_FEE} fee plus 2% GST.`,
    `Returns: request a return from My Orders within ${RETURN_WINDOW_DAYS} days of delivery; approved returns are picked up and refunded to the original payment method.`,
    'Payments: UPI (Google Pay, PhonePe, Paytm), debit and credit cards, net banking and wallets via Razorpay, or cash on delivery.',
    'Every order ships with tracking. Gift wrap is available at checkout.',
    'Velisqa makes fashion (artificial) jewellery — gold-tone and silver-tone pieces — not solid gold or real diamonds.',
  ]
  const categoryLines = SHOP_CATEGORIES.map((c) => {
    const n = products.filter((p) => normalizeProductCategory(p.category) === c.category).length
    return `- [${c.label}](${SITE_URL}/collections/${c.slug}): ${c.intro} (${n} pieces)`
  })
  const llms = [
    '# Velisqa Jewellery',
    '',
    `> ${pageSeo.home.description}`,
    '',
    'Velisqa is an Indian online jewellery brand founded in Aligarh, Uttar Pradesh, by Sameer Shameem and Atif Afsar. It sells modern fashion jewellery for women — necklaces, earrings, rings, bracelets and bangles — at velisqa.com, delivered across India.',
    '',
    '## Key facts',
    ...policyFacts.map((f) => `- ${f}`),
    `- Contact: ${CONTACT_EMAIL} · WhatsApp ${WHATSAPP_PHONE} · Instagram ${INSTAGRAM_URL}`,
    '',
    '## Shop',
    `- [All jewellery](${SITE_URL}/collections)`,
    ...categoryLines,
    `- [New arrivals](${SITE_URL}/collections?sort=newest)`,
    `- [Bestsellers](${SITE_URL}/collections?sort=best-selling)`,
    '',
    '## Help',
    `- [FAQ](${SITE_URL}/faq)`,
    `- [Shipping & delivery](${SITE_URL}/shipping-delivery)`,
    `- [Refunds & cancellation](${SITE_URL}/refund-cancellation)`,
    `- [Contact](${SITE_URL}/contact)`,
    '',
    '## About',
    `- [Our story](${SITE_URL}/about)`,
    `- [Founders](${SITE_URL}/founders)`,
    '',
    '## Optional',
    `- [Full product catalogue](${SITE_URL}/llms-full.txt)`,
    '',
  ].join('\n')
  fs.writeFileSync(path.join(DIST, 'llms.txt'), llms)

  const catalogueLines = products.map((p) => {
    const name = displayProductName(p.name)
    const price = Number(p.mrp) > Number(p.price) ? `${formatInr(p.price)} (MRP ${formatInr(p.mrp)})` : formatInr(p.price)
    const soldOut = p.out_of_stock === true || Number(p.stock) <= 0
    const desc = productDescription(p).replace(/\s+/g, ' ').slice(0, 280)
    return `### [${name}](${SITE_URL}${productPath(p)})\n- Category: ${normalizeProductCategory(p.category) || 'Jewellery'}\n- Price: ${price}${soldOut ? ' — currently sold out' : ''}\n${p.metal ? `- Finish: ${p.metal}\n` : ''}${p.colour ? `- Colour: ${p.colour}\n` : ''}- ${desc}\n`
  })
  fs.writeFileSync(
    path.join(DIST, 'llms-full.txt'),
    `${llms}\n## Catalogue (${products.length} pieces, prices in INR, updated ${today})\n\n${catalogueLines.join('\n')}`,
  )

  // ── Google Merchant Center feed ─────────────────────────────────────────
  const GOOGLE_CATEGORY = { Necklace: 196, Earrings: 194, Rings: 200, Bracelet: 191, Bangles: 191 }
  const feedItems = products
    .map((p) => {
      const images = getProductImageUrls(p)
      if (!images.length) return ''
      const name = displayProductName(p.name)
      const category = normalizeProductCategory(p.category)
      const soldOut = p.out_of_stock === true || Number(p.stock) <= 0
      const onSale = Number(p.mrp) > Number(p.price)
      const amount = (v) => `${Number(v).toFixed(2)} INR`
      return [
        '    <item>',
        `      <g:id>${esc(p.id)}</g:id>`,
        `      <g:title>${esc(`${name} — Velisqa ${category || 'Jewellery'}`.slice(0, 150))}</g:title>`,
        `      <g:description>${esc(productDescription(p).replace(/\s+/g, ' ').slice(0, 4900))}</g:description>`,
        `      <g:link>${esc(`${SITE_URL}${productPath(p)}`)}</g:link>`,
        `      <g:image_link>${esc(images[0])}</g:image_link>`,
        ...images.slice(1, 10).map((u) => `      <g:additional_image_link>${esc(u)}</g:additional_image_link>`),
        `      <g:availability>${soldOut ? 'out_of_stock' : 'in_stock'}</g:availability>`,
        `      <g:price>${amount(onSale ? p.mrp : p.price)}</g:price>`,
        onSale ? `      <g:sale_price>${amount(p.price)}</g:sale_price>` : '',
        '      <g:brand>Velisqa</g:brand>',
        '      <g:condition>new</g:condition>',
        '      <g:identifier_exists>no</g:identifier_exists>',
        '      <g:gender>female</g:gender>',
        '      <g:age_group>adult</g:age_group>',
        p.colour ? `      <g:color>${esc(p.colour)}</g:color>` : '',
        p.metal ? `      <g:material>${esc(p.metal)}</g:material>` : '',
        `      <g:google_product_category>${GOOGLE_CATEGORY[category] ?? 188}</g:google_product_category>`,
        category ? `      <g:product_type>Jewellery &gt; ${esc(category)}</g:product_type>` : '',
        '      <g:shipping><g:country>IN</g:country><g:price>0.00 INR</g:price></g:shipping>',
        '    </item>',
      ]
        .filter(Boolean)
        .join('\n')
    })
    .filter(Boolean)
  fs.mkdirSync(path.join(DIST, 'feeds'), { recursive: true })
  fs.writeFileSync(
    path.join(DIST, 'feeds', 'google-merchant.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n  <channel>\n    <title>Velisqa Jewellery</title>\n    <link>${SITE_URL}</link>\n    <description>Velisqa product feed</description>\n${feedItems.join('\n')}\n  </channel>\n</rss>\n`,
  )

  // The Vite manifest was only needed here; don't publish it.
  fs.rmSync(path.join(DIST, '.vite'), { recursive: true, force: true })
  console.log(`prerender: wrote ${sitemap.length} sitemap URLs, llms.txt, merchant feed (${feedItems.length} items)`)
} finally {
  await vite.close()
}

function readManifest() {
  try {
    return JSON.parse(fs.readFileSync(path.join(DIST, '.vite', 'manifest.json'), 'utf8'))
  } catch {
    return null
  }
}

/** Admin-managed hero banners: [] = none set, null = API unreachable (preload nothing). */
async function fetchAdminHero() {
  const base = String(env.VITE_API_BASE_URL || '').replace(/\/$/, '')
  if (!base) return null
  try {
    const res = await fetch(`${base}/settings/hero`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return null
    const body = await res.json()
    return (body?.data?.slides || []).filter((slide) => slide?.desktopUrl)
  } catch {
    return null
  }
}

/** Product row safe to embed in public HTML (no internal/admin columns). */
function toPublicProduct(product) {
  const { created_by: _createdBy, mock_rating: _mockRating, mock_review_count: _mockReviewCount, ...rest } = product
  return rest
}

async function fetchProducts(env) {
  const base = String(env.VITE_API_BASE_URL || '').replace(/\/$/, '')
  if (!base) throw new Error('VITE_API_BASE_URL missing')
  const res = await fetch(`${base}/products`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(20_000) })
  if (!res.ok) throw new Error(`products HTTP ${res.status}`)
  const body = await res.json()
  // rating/review_count already come from approved reviews only (same rule as the storefront).
  return body?.data?.products ?? []
}
