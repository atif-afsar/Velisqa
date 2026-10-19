import { Router } from 'express'
import { z } from 'zod'
import { requireUser } from '../middleware/auth.js'
import { checkoutLimiter } from '../middleware/rateLimit.js'
import { ok } from '../middleware/requestContext.js'
import { parse } from '../middleware/validate.js'
import { customerCancelOrder } from '../services/cancellationService.js'
import { serializeOrderRow, serializePrivateOrder } from '../services/orderSerializers.js'
import { createOrder, findAccessibleOrder, getMyOrder, listMyOrders, loadOrderItems } from '../services/orderService.js'
import { priceCart, quoteResponse } from '../services/pricingService.js'
import { liveTracking } from '../services/shippingService.js'

const text = (max) => z.string().trim().max(max)
const optionalText = (max) => z.union([z.string().trim().max(max), z.null()]).optional()

const customerSchema = z.object({
  name: text(120).min(1, 'Name, phone, address, and a valid 6-digit PIN are required.'),
  phone: text(20).min(1, 'Name, phone, address, and a valid 6-digit PIN are required.'),
  email: z.union([z.string().trim().max(254).email('Enter a valid email address.'), z.literal(''), z.null()]).optional(),
  address: text(500).min(1, 'Name, phone, address, and a valid 6-digit PIN are required.'),
  city: optionalText(80),
  state: optionalText(80),
  pincode: z.string().trim().regex(/^\d{6}$/, 'Name, phone, address, and a valid 6-digit PIN are required.'),
  notes: optionalText(500),
  locationLabel: optionalText(200),
  locationMapsUrl: optionalText(500),
  paymentMethod: z.enum(['cod', 'online']).optional().default('online'),
  couponCode: optionalText(40),
  giftWrap: z.boolean().optional().default(false),
})

// Client prices/images/totals are ignored on purpose: only id, quantity and the gift flag are read.
const itemSchema = z
  .object({
    productId: z.string().trim().max(64),
    quantity: z.coerce.number().int().min(1).max(50).optional().default(1),
    isFreeGift: z.boolean().optional(),
  })
  .passthrough()

const orderSchema = z.object({
  customer: customerSchema,
  items: z.array(itemSchema).min(1, 'Your bag is empty.').max(50),
  idempotencyKey: z.string().trim().min(8).max(100).optional(),
})

const quoteSchema = z.object({
  items: z.array(itemSchema).min(1, 'Your bag is empty.').max(50),
  couponCode: optionalText(40),
  giftWrap: z.boolean().optional().default(false),
  paymentMethod: z.enum(['cod', 'online']).optional().default('online'),
})

/** Private order proof: header preferred; `?token=` kept for old shared links. */
const accessToken = (req) => String(req.get('x-order-access-token') || req.query.token || req.body?.accessToken || '').trim() || null

export const ordersRouter = Router()

ordersRouter.post('/checkout/quote', async (req, res) => {
  const body = parse(quoteSchema, req.body)
  ok(res, quoteResponse(await priceCart(body)))
})

ordersRouter.post('/orders', checkoutLimiter, async (req, res) => {
  const body = parse(orderSchema, req.body)
  const idempotencyKey = body.idempotencyKey || req.get('idempotency-key') || undefined
  const result = await createOrder({ customer: body.customer, items: body.items, idempotencyKey, userId: req.auth?.user?._id })
  ok(res, result, result.replayed ? 200 : 201)
})

ordersRouter.get('/orders/mine', requireUser, async (req, res) => {
  const rows = await listMyOrders(req.auth.user._id)
  ok(res, { orders: rows.map(({ order, items }) => serializeOrderRow(order, items, { includeToken: true })) })
})

ordersRouter.get('/orders/mine/:orderRef', requireUser, async (req, res) => {
  const { order, items } = await getMyOrder(req.auth.user._id, req.params.orderRef)
  ok(res, { order: serializeOrderRow(order, items, { includeToken: true }) })
})

ordersRouter.get('/orders/private/:orderRef', async (req, res) => {
  res.set('Cache-Control', 'no-store')
  const order = await findAccessibleOrder(req.params.orderRef, { token: accessToken(req), userId: req.auth?.user?._id })
  ok(res, { order: serializePrivateOrder(order, await loadOrderItems(order._id)) })
})

ordersRouter.get('/orders/private/:orderRef/tracking', async (req, res) => {
  res.set('Cache-Control', 'no-store')
  const order = await findAccessibleOrder(req.params.orderRef, { token: accessToken(req), userId: req.auth?.user?._id })
  ok(res, { tracking: await liveTracking(order) })
})

ordersRouter.post('/orders/private/:orderRef/cancel', async (req, res) => {
  ok(res, await customerCancelOrder({ orderRef: req.params.orderRef, accessToken: accessToken(req), userId: req.auth?.user?._id }))
})
