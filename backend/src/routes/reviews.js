import { Router } from 'express'
import { z } from 'zod'
import { requireUser } from '../middleware/auth.js'
import { reportLimiter, reviewLinkLimiter } from '../middleware/rateLimit.js'
import { ok } from '../middleware/requestContext.js'
import { parse } from '../middleware/validate.js'
import { createUploadSignature } from '../providers/cloudinary.js'
import { assertReviewLink, getReviewRequest, submitReviewsFromRequest } from '../services/reviewRequestService.js'
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

// ── Review links from the post-delivery email (no login; signed per order) ──

const requestReviewSchema = z.object({
  t: z.string().trim().min(10).max(80),
  reviewerName: z.string().trim().max(80).optional(),
  reviews: z
    .array(
      z.object({
        productId: z.string().trim().max(64),
        rating: z.coerce.number().int().min(1).max(5),
        title: z.string().trim().min(3, 'Title must be 3–100 characters.').max(100, 'Title must be 3–100 characters.'),
        body: z.string().trim().min(10, 'Review must be 10–2000 characters.').max(2000, 'Review must be 10–2000 characters.'),
        imageUrls: z.array(imageUrl).max(3).optional().default([]),
      }),
    )
    .min(1, 'Rate at least one piece.')
    .max(20),
})

reviewsRouter.get('/review-requests/:orderRef', reviewLinkLimiter, async (req, res) => {
  const { t } = parse(z.object({ t: z.string().trim().min(10).max(80) }), req.query)
  ok(res, await getReviewRequest(req.params.orderRef, t))
})

reviewsRouter.post('/review-requests/:orderRef', reviewLinkLimiter, async (req, res) => {
  const body = parse(requestReviewSchema, req.body)
  ok(res, await submitReviewsFromRequest(req.params.orderRef, body.t, body), 201)
})

/** Signed Cloudinary upload for review photos, authorised by the review link instead of a session. */
reviewsRouter.post('/review-requests/:orderRef/upload-signature', reviewLinkLimiter, async (req, res) => {
  const { t } = parse(z.object({ t: z.string().trim().min(10).max(80) }), req.body)
  await assertReviewLink(req.params.orderRef, t)
  ok(res, createUploadSignature({ folder: 'velisqa/reviews' }))
})
