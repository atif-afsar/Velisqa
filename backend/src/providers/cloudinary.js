import crypto from 'node:crypto'
import { env } from '../config/env.js'
import { unavailable } from '../lib/errors.js'

export const isCloudinaryConfigured = () => Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET)

/** Cloudinary signature: SHA-1 of the sorted `key=value&...` params followed by the API secret. */
export function signParams(params) {
  const payload = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== '')
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&')
  return crypto.createHash('sha1').update(`${payload}${env.CLOUDINARY_API_SECRET}`).digest('hex')
}

/**
 * Short-lived signed upload parameters. The browser uploads straight to
 * Cloudinary, but only into the folder the server chose, so the old public
 * unsigned preset is no longer needed.
 */
export function createUploadSignature({ folder }) {
  if (!isCloudinaryConfigured()) throw unavailable('Image uploads are temporarily unavailable.')
  const timestamp = Math.floor(Date.now() / 1000)
  const params = { folder, timestamp }
  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    timestamp,
    folder,
    signature: signParams(params),
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
  }
}

/** Server-side upload from a remote URL (used by the Supabase Storage → Cloudinary migration script). */
export async function uploadRemoteImage({ url, folder, publicId }) {
  if (!isCloudinaryConfigured()) throw unavailable('Cloudinary is not configured.')
  const timestamp = Math.floor(Date.now() / 1000)
  const params = { folder, timestamp, ...(publicId ? { public_id: publicId, overwrite: 'false' } : {}) }
  const form = new FormData()
  form.append('file', url)
  form.append('api_key', env.CLOUDINARY_API_KEY)
  for (const [key, value] of Object.entries(params)) form.append(key, String(value))
  form.append('signature', signParams(params))
  const response = await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: form })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.secure_url) throw new Error(data?.error?.message || `Cloudinary upload failed (${response.status})`)
  return { url: data.secure_url, publicId: data.public_id, bytes: data.bytes }
}
