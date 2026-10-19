import { Router } from 'express'
import { z } from 'zod'
import { ok } from '../middleware/requestContext.js'
import { parse } from '../middleware/validate.js'
import { getProduct, listProducts, lookupProducts } from '../services/catalogService.js'
import { getActiveCoupon } from '../services/couponService.js'
import { getHeroSlides } from '../services/settingsService.js'

const listSchema = z.object({
  search: z.string().trim().max(80).optional(),
  category: z.string().trim().max(40).optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'name']).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).max(100_000).optional(),
  fields: z.enum(['id,name']).optional(),
})

const lookupSchema = z.object({
  ids: z
    .string()
    .max(10_000)
    .transform((value) => value.split(',').map((id) => id.trim()).filter(Boolean))
    .pipe(z.array(z.string().max(64)).max(200)),
})

export const catalogRouter = Router()

// Short public caching: the storefront also keeps its own 24h localStorage copy.
const publicCache = (res) => res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=120')

catalogRouter.get('/products', async (req, res) => {
  const query = parse(listSchema, req.query)
  publicCache(res)
  ok(res, await listProducts(query))
})

catalogRouter.get('/products/lookup', async (req, res) => {
  const { ids } = parse(lookupSchema, req.query)
  ok(res, { products: await lookupProducts(ids) })
})

catalogRouter.get('/products/:id', async (req, res) => {
  // The product page shows live stock ("Only 1 left" / sold out) and price, so always revalidate (ETag keeps it cheap).
  res.set('Cache-Control', 'no-cache')
  ok(res, { product: await getProduct(req.params.id) })
})

catalogRouter.get('/settings/hero', async (_req, res) => {
  // Revalidate every time (ETag keeps it cheap) so a just-published banner shows immediately.
  res.set('Cache-Control', 'no-cache')
  ok(res, await getHeroSlides())
})

catalogRouter.get('/coupons/:code', async (req, res) => {
  ok(res, { coupon: await getActiveCoupon(String(req.params.code).slice(0, 40)) })
})
