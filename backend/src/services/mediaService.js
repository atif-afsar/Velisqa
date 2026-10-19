import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { env } from '../config/env.js'
import { sha256 } from '../lib/crypto.js'
import { badRequest } from '../lib/errors.js'

/**
 * Self-hosted image store on the VPS disk (used when Cloudinary is not
 * configured, and for hero banners). Files are content-addressed, so the same
 * image uploaded twice is stored once, and served immutable via /api/v1/media.
 */
export const MEDIA_DIR = env.MEDIA_DIR
  ? path.resolve(env.MEDIA_DIR)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads')

const MAX_BYTES = 8 * 1024 * 1024

// Detect type from the file's magic bytes, never from the client's claim.
function sniff(buffer) {
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' }
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: 'png', mime: 'image/png' }
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return { ext: 'webp', mime: 'image/webp' }
  if (buffer.subarray(0, 3).toString('ascii') === 'GIF') return { ext: 'gif', mime: 'image/gif' }
  if (buffer.subarray(4, 12).toString('ascii').startsWith('ftypavi')) return { ext: 'avif', mime: 'image/avif' }
  return null
}

export function decodeDataUrl(dataUrl) {
  const match = /^data:[\w/+.-]+;base64,(.+)$/s.exec(String(dataUrl || ''))
  if (!match) throw badRequest('Send the image as a base64 data URL.')
  const buffer = Buffer.from(match[1], 'base64')
  if (!buffer.length || buffer.length > MAX_BYTES) throw badRequest('Images must be smaller than 8 MB.')
  const type = sniff(buffer)
  if (!type) throw badRequest('Use a JPG, PNG, WebP, GIF or AVIF image.')
  return { buffer, ...type }
}

/** Saves an image and returns its public URL + a stable id. */
export function saveImage(dataUrl, { folder = 'products' } = {}) {
  const { buffer, ext, mime } = decodeDataUrl(dataUrl)
  const safeFolder = folder.replace(/[^a-z0-9-]/gi, '') || 'misc'
  const name = `${sha256(buffer.toString('base64')).slice(0, 32)}.${ext}`
  const dir = path.join(MEDIA_DIR, safeFolder)
  mkdirSync(dir, { recursive: true })
  const file = path.join(dir, name)
  if (!existsSync(file)) writeFileSync(file, buffer)
  return { url: `${env.apiOrigin}/api/v1/media/${safeFolder}/${name}`, publicId: `local/${safeFolder}/${name}`, bytes: buffer.length, mime }
}

/** Resolves one of our own /api/v1/media URLs back to a file path (for the AI step), else null. */
export function localMediaPath(url) {
  const prefix = `${env.apiOrigin}/api/v1/media/`
  if (typeof url !== 'string' || !url.startsWith(prefix)) return null
  const rel = url.slice(prefix.length)
  if (!/^[a-z0-9-]+\/[a-f0-9]{32}\.(jpg|png|webp|gif|avif)$/.test(rel)) return null
  return path.join(MEDIA_DIR, rel)
}
