/**
 * Builds the wide (3:1) desktop/tablet hero banners from the portrait model photos.
 *
 *   media/hero-model-<name>.jpg  →  media/hero-banner-<name>.jpg  (2400×800)
 *
 * The model is cropped to head-and-shoulders, placed right of centre (Palmonas-style
 * composition) and feathered into a blurred, stretched copy of its own studio backdrop,
 * so the join is invisible. Run after replacing a model photo:
 *   node scripts/compose-hero-banners.mjs && npm run media
 */
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

sharp.cache(false)

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..')
const MEDIA = path.join(ROOT, 'media')
const W = 2400
const H = 800

/** Vertical crop (fractions of the source height) and horizontal centre of the model in the banner. */
const BANNERS = [
  { name: 'amara', top: 0.05, bottom: 0.72, centerX: 0.64 },
  { name: 'elena', top: 0.06, bottom: 0.7, centerX: 0.62 },
  { name: 'mei', top: 0.01, bottom: 0.64, centerX: 0.62 },
]

for (const b of BANNERS) {
  const src = path.join(MEDIA, `hero-model-${b.name}.jpg`)
  if (!fs.existsSync(src)) continue
  const meta = await sharp(src).metadata()

  // Model crop, scaled to the banner height.
  const cropTop = Math.round(meta.height * b.top)
  const cropHeight = Math.round(meta.height * (b.bottom - b.top))
  const modelWidth = Math.round(meta.width * (H / cropHeight))
  const model = await sharp(src).extract({ left: 0, top: cropTop, width: meta.width, height: cropHeight }).resize({ height: H }).toBuffer()

  // Feather the left/right edges of the photo into the backdrop.
  const feather = Math.round(modelWidth * 0.26)
  const mask = Buffer.from(
    `<svg width="${modelWidth}" height="${H}"><defs><linearGradient id="g" x1="0" x2="1">` +
      `<stop offset="0" stop-color="#fff" stop-opacity="0"/>` +
      `<stop offset="${feather / modelWidth}" stop-color="#fff" stop-opacity="1"/>` +
      `<stop offset="${1 - feather / modelWidth}" stop-color="#fff" stop-opacity="1"/>` +
      `<stop offset="1" stop-color="#fff" stop-opacity="0"/>` +
      `</linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`,
  )
  const feathered = await sharp(model).ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer()

  const cx = Math.round(W * b.centerX)
  const x0 = Math.max(0, cx - Math.round(modelWidth / 2))
  // Backdrop: each side continues the photo's own studio backdrop as a smooth vertical
  // gradient, sampled only from plain-backdrop rows (top and middle) so arms or clothing
  // touching the photo edge don't smear into bands.
  const strip = Math.round(modelWidth * 0.04)
  async function mean(left, top, height) {
    const buf = await sharp(model).extract({ left, top, width: strip, height }).png().toBuffer()
    const { channels } = await sharp(buf).stats()
    return channels.slice(0, 3).map((c) => Math.round(c.mean))
  }
  const rgb = (c) => `rgb(${c.join(',')})`
  async function extension(left, width) {
    if (width <= 0) return null
    const top = await mean(left, 0, Math.round(H * 0.18))
    const mid = await mean(left, Math.round(H * 0.55), Math.round(H * 0.12))
    const bottom = mid.map((v) => Math.round(v * 0.82))
    return Buffer.from(
      `<svg width="${width}" height="${H}"><defs><linearGradient id="v" x1="0" y1="0" x2="0" y2="1">` +
        `<stop offset="0" stop-color="${rgb(top)}"/><stop offset="0.6" stop-color="${rgb(mid)}"/><stop offset="1" stop-color="${rgb(bottom)}"/>` +
        `</linearGradient></defs><rect width="100%" height="100%" fill="url(#v)"/></svg>`,
    )
  }
  const rightWidth = W - (x0 + modelWidth)
  const layers = [
    { input: await extension(0, x0 + feather), left: 0, top: 0 },
    rightWidth > -feather && { input: await extension(modelWidth - strip, rightWidth + feather), left: x0 + modelWidth - feather, top: 0 },
  ].filter((l) => l && l.input)
  const background = await sharp({ create: { width: W, height: H, channels: 3, background: '#000' } }).composite(layers).png().toBuffer()

  const out = path.join(MEDIA, `hero-banner-${b.name}.jpg`)
  const jpg = await sharp(background)
    .composite([{ input: feathered, left: x0, top: 0 }])
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer()
  fs.writeFileSync(out, jpg)
  console.log(`hero banner: ${path.basename(out)} (${W}×${H})`)
}
