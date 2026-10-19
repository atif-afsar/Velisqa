import { Router } from 'express'
import { z } from 'zod'
import { requireAdmin } from '../middleware/auth.js'
import { ok } from '../middleware/requestContext.js'
import { parse } from '../middleware/validate.js'
import { adminInbox, analyticsOrders, deleteOrder, listAdminOrders, listAudit, salesSummary } from '../services/adminService.js'
import { audit } from '../services/auditService.js'
import { adminCancelOrder } from '../services/cancellationService.js'
import { createProduct, deleteProduct, listAdminProducts, updateProduct } from '../services/catalogService.js'
import { createCoupon, deleteCoupon, listCoupons, updateCoupon } from '../services/couponService.js'
import { eventBus, EVENTS } from '../services/eventBus.js'
import { adminApprovePayment, adminRejectPayment } from '../services/paymentService.js'
import { listAdminReturns, manageReturn } from '../services/returnService.js'
import { listAdminReviews, moderateReview } from '../services/reviewService.js'
import { createShipmentForOrder, resetShipment } from '../services/shippingService.js'
import { draftProductFromImage, isAiConfigured } from '../services/aiProductService.js'
import { saveHeroSlides } from '../services/settingsService.js'

export const adminRouter = Router()
adminRouter.use(requireAdmin)

const actor = (req) => ({ actorId: req.auth.user._id, req })

// ── Inbox + live new-order events ─────────────────────────────────────

adminRouter.get('/inbox', async (_req, res) => ok(res, await adminInbox()))

adminRouter.get('/dashboard/summary', async (req, res) => {
  const { start, end } = parse(
    z.object({ start: z.coerce.date(), end: z.coerce.date() }).refine((v) => v.start <= v.end, 'Start date must be before the end date.').refine((v) => v.end - v.start <= 400 * 86_400_000, 'Choose a range of 400 days or less.'),
    req.query,
  )
  ok(res, await salesSummary({ start, end }))
})

/** Server-Sent Events replacing the Supabase Realtime INSERT subscription. */
adminRouter.get('/events', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' })
  res.flushHeaders()
  res.write('retry: 10000\n\n')
  const onOrder = (order) => res.write(`event: order\ndata: ${JSON.stringify(order)}\n\n`)
  eventBus.on(EVENTS.orderCreated, onOrder)
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 25_000)
  req.on('close', () => {
    clearInterval(heartbeat)
    eventBus.off(EVENTS.orderCreated, onOrder)
  })
})

// ── Products ──────────────────────────────────────────────────────────

const urlList = z.array(z.string().trim().max(1000)).max(20)
const productSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required.').max(200),
  price: z.coerce.number().positive('Selling price must be greater than ₹0.').max(10_000_000),
  mrp: z.union([z.coerce.number().positive(), z.null()]).optional(),
  description: z.union([z.string().max(5000), z.null()]).optional(),
  category: z.union([z.string().trim().max(60), z.null()]).optional(),
  metal: z.union([z.string().trim().max(60), z.null()]).optional(),
  colour: z.union([z.string().trim().max(60), z.null()]).optional(),
  styles: z.array(z.string().trim().max(40)).max(20).optional(),
  search_keywords: z.array(z.string().trim().max(60)).max(50).optional(),
  stock: z.coerce.number().int().min(0).max(1_000_000).optional(),
  out_of_stock: z.boolean().optional(),
  badge: z.union([z.enum(['bestseller', 'new']), z.null()]).optional(),
  image_url: z.union([z.string().trim().max(1000), z.null()]).optional(),
  hover_image_url: z.union([z.string().trim().max(1000), z.null()]).optional(),
  gallery_urls: urlList.optional(),
  cloudinary_public_id: z.union([z.string().max(300), z.null()]).optional(),
  hover_cloudinary_public_id: z.union([z.string().max(300), z.null()]).optional(),
  gallery_cloudinary_ids: z.array(z.union([z.string().max(300), z.null()])).max(20).optional(),
  mock_review_count: z.coerce.number().int().min(0).max(1_000_000).optional(),
  mock_rating: z.union([z.coerce.number().min(1).max(5), z.null()]).optional(),
  is_combo: z.boolean().optional(),
  combo_product_ids: z.array(z.string().max(64)).max(20).optional(),
})
const mrpRule = (value) => value.mrp == null || value.price == null || value.mrp >= value.price

adminRouter.get('/products', async (_req, res) => ok(res, { products: await listAdminProducts() }))

adminRouter.post('/products', async (req, res) => {
  const body = parse(productSchema.refine(mrpRule, 'MRP must be equal to or greater than the selling price.'), req.body)
  const product = await createProduct(body, req.auth.user._id)
  await audit({ ...actor(req), action: 'product.create', targetType: 'product', targetId: product.id, summary: { name: product.name } })
  ok(res, { product }, 201)
})

adminRouter.patch('/products/:id', async (req, res) => {
  const body = parse(productSchema.partial().refine(mrpRule, 'MRP must be equal to or greater than the selling price.'), req.body)
  const product = await updateProduct(req.params.id, body)
  await audit({ ...actor(req), action: 'product.update', targetType: 'product', targetId: product.id, summary: { fields: Object.keys(body) } })
  ok(res, { product })
})

adminRouter.delete('/products/:id', async (req, res) => {
  const product = await deleteProduct(req.params.id)
  await audit({ ...actor(req), action: 'product.delete', targetType: 'product', targetId: product.id, summary: { name: product.name } })
  ok(res, { deleted: true, id: product.id })
})

/** Bulk create (CSV import / AI drafts). Each row is validated on its own; valid rows are saved. */
adminRouter.post('/products/bulk', async (req, res) => {
  const { products } = parse(z.object({ products: z.array(z.unknown()).min(1).max(200) }), req.body)
  const schema = productSchema.refine(mrpRule, 'MRP must be equal to or greater than the selling price.')
  const results = []
  for (const [index, raw] of products.entries()) {
    const parsed = schema.safeParse(raw)
    if (!parsed.success) {
      results.push({ row: index + 1, ok: false, error: parsed.error.issues.map((issue) => `${issue.path.join('.') || 'row'}: ${issue.message}`).join('; ') })
      continue
    }
    const product = await createProduct(parsed.data, req.auth.user._id)
    results.push({ row: index + 1, ok: true, id: product.id, name: product.name })
  }
  const created = results.filter((result) => result.ok).length
  await audit({ ...actor(req), action: 'product.bulk_create', targetType: 'product', summary: { created, failed: results.length - created } })
  ok(res, { created, failed: results.length - created, results }, 201)
})

adminRouter.get('/ai/status', (_req, res) => ok(res, { configured: isAiConfigured() }))

adminRouter.post('/ai/product-draft', async (req, res) => {
  const body = parse(
    z.object({ imageUrl: z.string().max(1000).optional(), dataUrl: z.string().max(12_000_000).optional(), hint: z.string().max(300).optional() }).refine((v) => v.imageUrl || v.dataUrl, 'Provide an image.'),
    req.body,
  )
  ok(res, { draft: await draftProductFromImage(body) })
})

// ── Site settings: homepage hero ──────────────────────────────────────

const heroSlideSchema = z.object({
  desktopUrl: z.string().trim().min(1, 'Each slide needs an image.').max(1000),
  mobileUrl: z.union([z.string().trim().max(1000), z.literal(''), z.null()]).optional(),
  focus: z.string().trim().regex(/^\d{1,3}% \d{1,3}%$/, 'Focus must look like "50% 50%".').optional().default('50% 50%'),
  to: z.string().trim().regex(/^\/[^\s]*$/, 'Link must be a site path like /collections/earrings.').max(300).optional().default('/collections'),
  label: z.string().trim().max(80).optional().default('Shop now'),
  alt: z.string().trim().max(200).optional().default('Velisqa jewellery'),
})

adminRouter.put('/settings/hero', async (req, res) => {
  const { slides, intervalSeconds } = parse(
    z.object({
      slides: z.array(heroSlideSchema).max(8),
      // How long each banner stays before the next one slides in.
      intervalSeconds: z.coerce.number().int().min(2, 'Choose at least 2 seconds.').max(60, 'Choose 60 seconds or less.').optional().default(5),
    }),
    req.body,
  )
  const saved = await saveHeroSlides(slides, intervalSeconds, req.auth.user._id)
  await audit({ ...actor(req), action: 'settings.hero', targetType: 'site_settings', targetId: 'hero', summary: { slides: slides.length, intervalSeconds } })
  ok(res, saved)
})

// ── Orders ────────────────────────────────────────────────────────────

const pageSchema = z.object({
  offset: z.coerce.number().int().min(0).max(1_000_000).optional().default(0),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
})

adminRouter.get('/orders', async (req, res) => ok(res, await listAdminOrders(parse(pageSchema, req.query))))
adminRouter.post('/orders/:id/ship', async (req, res) => ok(res, await createShipmentForOrder(req.params.id, actor(req))))
adminRouter.post('/orders/:id/cancel', async (req, res) => ok(res, await adminCancelOrder(req.params.id, actor(req))))
adminRouter.post('/orders/:id/reset-shipment', async (req, res) => {
  await resetShipment(req.params.id, actor(req))
  await audit({ ...actor(req), action: 'order.reset_shipment', targetType: 'order', targetId: req.params.id })
  ok(res, { reset: true })
})
adminRouter.delete('/orders/:id', async (req, res) => ok(res, await deleteOrder(req.params.id, actor(req))))

// ── Payments ──────────────────────────────────────────────────────────

adminRouter.get('/payments', async (req, res) => ok(res, await listAdminOrders({ ...parse(pageSchema, req.query), paymentMethod: 'online' })))

adminRouter.post('/payments/:id/approve', async (req, res) => {
  const body = parse(z.object({ razorpayPaymentId: z.string().trim().max(64).optional(), note: z.string().trim().max(500).optional() }), req.body)
  ok(res, await adminApprovePayment(req.params.id, { ...actor(req), ...body }))
})

adminRouter.post('/payments/:id/reject', async (req, res) => {
  const { reason } = parse(z.object({ reason: z.string().trim().min(1, 'orderId and rejection reason are required.').max(500) }), req.body)
  ok(res, await adminRejectPayment(req.params.id, { ...actor(req), reason }))
})

// ── Coupons ───────────────────────────────────────────────────────────

const couponSchema = z
  .object({
    code: z.string().trim().min(1, 'Coupon code is required.').max(40).regex(/^[A-Za-z0-9_-]+$/, 'Use letters, numbers, - or _ only.'),
    discount_type: z.enum(['percentage', 'fixed']),
    discount_value: z.coerce.number().positive('Discount value must be greater than zero.'),
    min_subtotal: z.coerce.number().min(0).optional().default(0),
    active: z.boolean().optional().default(true),
  })
  .refine((value) => value.discount_type !== 'percentage' || value.discount_value <= 100, 'Percentage discount cannot exceed 100%.')

adminRouter.get('/coupons', async (_req, res) => ok(res, { coupons: await listCoupons() }))
adminRouter.post('/coupons', async (req, res) => {
  const coupon = await createCoupon(parse(couponSchema, req.body))
  await audit({ ...actor(req), action: 'coupon.create', targetType: 'coupon', targetId: coupon.code })
  ok(res, { coupon }, 201)
})
adminRouter.patch('/coupons/:code', async (req, res) => {
  const body = parse(
    z.object({
      active: z.boolean().optional(),
      discount_type: z.enum(['percentage', 'fixed']).optional(),
      discount_value: z.coerce.number().positive().optional(),
      min_subtotal: z.coerce.number().min(0).optional(),
    }),
    req.body,
  )
  const coupon = await updateCoupon(req.params.code, body)
  await audit({ ...actor(req), action: 'coupon.update', targetType: 'coupon', targetId: coupon.code, summary: body })
  ok(res, { coupon })
})
adminRouter.delete('/coupons/:code', async (req, res) => {
  await deleteCoupon(req.params.code)
  await audit({ ...actor(req), action: 'coupon.delete', targetType: 'coupon', targetId: String(req.params.code).toUpperCase() })
  ok(res, { deleted: true })
})

// ── Reviews ───────────────────────────────────────────────────────────

adminRouter.get('/reviews', async (req, res) => {
  const { status } = parse(z.object({ status: z.enum(['pending', 'approved', 'rejected', 'reported', 'all']).optional().default('pending') }), req.query)
  ok(res, { reviews: await listAdminReviews(status) })
})
adminRouter.patch('/reviews/:id', async (req, res) => {
  const { status } = parse(z.object({ status: z.enum(['pending', 'approved', 'rejected', 'reported']) }), req.body)
  await moderateReview(req.params.id, status, actor(req))
  ok(res, { updated: true })
})

// ── Returns ───────────────────────────────────────────────────────────

adminRouter.get('/returns', async (req, res) => {
  const { status } = parse(z.object({ status: z.enum(['pending', 'active', 'completed', 'all']).optional().default('pending') }), req.query)
  ok(res, { returns: await listAdminReturns(status) })
})
adminRouter.post('/returns/:id/actions', async (req, res) => {
  const body = parse(
    z.object({
      action: z.enum(['approve', 'reject', 'set_reverse_awb', 'mark_received', 'qc_pass', 'qc_fail', 'mark_refunded']),
      adminNotes: z.string().trim().max(2000).optional(),
      rejectionReason: z.string().trim().max(500).optional(),
      reverseAwb: z.string().trim().max(40).optional(),
      reverseTrackingUrl: z.string().trim().max(500).optional(),
    }),
    req.body,
  )
  ok(res, await manageReturn(req.params.id, body, actor(req)))
})

// ── Analytics + audit ─────────────────────────────────────────────────

adminRouter.get('/analytics/orders', async (req, res) => {
  const { start, end } = parse(z.object({ start: z.coerce.date(), end: z.coerce.date() }), req.query)
  ok(res, { orders: await analyticsOrders({ start, end }) })
})

adminRouter.get('/audit', async (req, res) => {
  const { limit } = parse(z.object({ limit: z.coerce.number().int().min(1).max(500).optional().default(100) }), req.query)
  ok(res, { entries: await listAudit({ limit }) })
})
