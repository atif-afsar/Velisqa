import { Router } from 'express'
import { z } from 'zod'
import { forbidden } from '../lib/errors.js'
import { requireUser } from '../middleware/auth.js'
import { ok } from '../middleware/requestContext.js'
import { parse } from '../middleware/validate.js'
import { createUploadSignature } from '../providers/cloudinary.js'
import { saveImage } from '../services/mediaService.js'

const FOLDERS = { product: 'velisqa/products', review: 'velisqa/reviews' }

export const uploadsRouter = Router()

/** Signed Cloudinary upload parameters: product images for admins, review photos for signed-in customers. */
uploadsRouter.post('/uploads/signature', requireUser, (req, res) => {
  const { purpose } = parse(z.object({ purpose: z.enum(['product', 'review']) }), req.body)
  if (purpose === 'product' && req.auth.profile?.role !== 'admin') throw forbidden('Admin access required.')
  ok(res, createUploadSignature({ folder: FOLDERS[purpose] }))
})

/**
 * Upload to the API server's own disk (works without Cloudinary). Products and
 * site banners are admin-only; review photos need a signed-in customer.
 */
uploadsRouter.post('/uploads/image', requireUser, (req, res) => {
  const { purpose, dataUrl } = parse(z.object({ purpose: z.enum(['product', 'review', 'site']), dataUrl: z.string().max(12_000_000) }), req.body)
  if (purpose !== 'review' && req.auth.profile?.role !== 'admin') throw forbidden('Admin access required.')
  const saved = saveImage(dataUrl, { folder: purpose === 'site' ? 'site' : purpose === 'review' ? 'reviews' : 'products' })
  ok(res, { secure_url: saved.url, public_id: saved.publicId }, 201)
})
