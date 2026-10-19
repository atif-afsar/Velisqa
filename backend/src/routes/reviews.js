import { Router } from 'express'
import { z } from 'zod'
import { requireUser } from '../middleware/auth.js'
import { reportLimiter } from '../middleware/rateLimit.js'
import { ok } from '../middleware/requestContext.js'
import { parse } from '../middleware/validate.js'
import { latestApprovedReviews, listApprovedReviews, reportReview, reviewSummary, submitReview, viewerState } from '../services/reviewService.js'

const pageSchema = z.object({
  page: z.coerce.number().int().min(0).max(10_000).optional().default(0),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(6),
})

// Uploaded review photos must be our own Cloudinary assets (signed uploads into velisqa/reviews).
const imageUrl = z.string().trim().max(500).regex(/^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/.+/, 'Review photos must be uploaded through the review form.')

const submitSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().min(3, 'Title must be 3–100 characters.').max(100, 'Title must be 3–100 characters.'),
  body: z.string().trim().min(10, 'Review must be 10–2000 characters.').max(2000, 'Review must be 10–2000 characters.'),
  reviewerName: z.string().trim().min(2, 'Name must be 2–80 characters.').max(80),
  imageUrls: z.array(imageUrl).max(3).optional().default([]),
})

export const reviewsRouter = Router()

reviewsRouter.get('/products/:id/reviews', async (req, res) => {
  ok(res, await listApprovedReviews(req.params.id, parse(pageSchema, req.query)))
})

reviewsRouter.get('/products/:id/reviews/summary', async (req, res) => {
  ok(res, await reviewSummary(req.params.id))
})

reviewsRouter.get('/products/:id/reviews/viewer', async (req, res) => {
  ok(res, await viewerState(req.params.id, req.auth?.user?._id))
})

reviewsRouter.post('/products/:id/reviews', requireUser, async (req, res) => {
  const body = parse(submitSchema, req.body)
  ok(res, { reviewId: await submitReview({ ...body, productId: req.params.id, userId: req.auth.user._id }) }, 201)
})

reviewsRouter.get('/reviews/latest', async (req, res) => {
  const { limit } = parse(z.object({ limit: z.coerce.number().int().min(1).max(24).optional().default(6) }), req.query)
  ok(res, { reviews: await latestApprovedReviews(limit) })
})

reviewsRouter.post('/reviews/:id/report', requireUser, reportLimiter, async (req, res) => {
  await reportReview(req.params.id, req.auth.user._id)
  ok(res, { reported: true })
})
