/**
 * Build-time image pipeline for editorial / campaign imagery.
 *
 *   media/<slot>.(jpg|png|webp)  →  public/media/<slot>-<width>.(avif|webp)
 *                                →  src/data/media.json (dimensions, widths, blur placeholder)
 *
 * Drop a new original into media/ (same slot name to replace one) and the next
 * `npm run build` / `npm run dev` regenerates every size. Outputs are cached by
 * source content hash, so unchanged images are skipped.
 *
 * Product photos are not handled here: they live on Cloudinary and are served
 * with f_auto,q_auto and per-width transforms (see src/lib/imageCdn.js).
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..')
const SRC_DIR = path.join(ROOT, 'media')
const OUT_DIR = path.join(ROOT, 'public', 'media')
const MANIFEST = path.join(ROOT, 'src', 'data', 'media.json')

const WIDTHS = [480, 768, 1080, 1440, 1920, 2400]
// Jewellery detail needs a little more quality than typical photography.
const AVIF = { quality: 58, effort: 4, chromaSubsampling: '4:4:4' }
const WEBP = { quality: 80, effort: 6, smartSubsample: true }

fs.mkdirSync(OUT_DIR, { recursive: true })

const previous = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {}
const manifest = {}
const sources = fs.existsSync(SRC_DIR)
  ? fs.readdirSync(SRC_DIR).filter((f) => /\.(jpe?g|png|webp|tiff?)$/i.test(f)).sort()
  : []

let built = 0
for (const file of sources) {
  const slot = file.replace(/\.[^.]+$/, '')
  const srcPath = path.join(SRC_DIR, file)
  const hash = crypto.createHash('sha1').update(fs.readFileSync(srcPath)).digest('hex').slice(0, 12)
  const raw = await sharp(srcPath).metadata()
  // Report dimensions after EXIF rotation, since outputs are auto-rotated.
  const meta = raw.autoOrient ?? (raw.orientation >= 5 ? { width: raw.height, height: raw.width } : raw)
  const widths = WIDTHS.filter((w) => w <= meta.width)
  if (!widths.length || widths[widths.length - 1] < meta.width) widths.push(Math.min(meta.width, 2400))
  const uniqueWidths = [...new Set(widths)]

  const cached = previous[slot]
  const outputsExist = uniqueWidths.every((w) =>
    ['avif', 'webp'].every((ext) => fs.existsSync(path.join(OUT_DIR, `${slot}-${w}.${ext}`))),
  )
  if (cached && cached.hash === hash && outputsExist) {
    manifest[slot] = cached
    continue
  }

  for (const w of uniqueWidths) {
    const pipeline = sharp(srcPath).rotate().resize({ width: w, withoutEnlargement: true })
    await pipeline.clone().avif(AVIF).toFile(path.join(OUT_DIR, `${slot}-${w}.avif`))
    await pipeline.clone().webp(WEBP).toFile(path.join(OUT_DIR, `${slot}-${w}.webp`))
  }

  const tiny = await sharp(srcPath).rotate().resize({ width: 24 }).webp({ quality: 40 }).toBuffer()
  manifest[slot] = {
    width: meta.width,
    height: meta.height,
    widths: uniqueWidths,
    placeholder: `data:image/webp;base64,${tiny.toString('base64')}`,
    hash,
  }
  built++
  console.log(`media: ${slot} → ${uniqueWidths.join(', ')}px (avif + webp)`)
}

// Remove outputs for deleted sources.
for (const out of fs.readdirSync(OUT_DIR)) {
  const slot = out.replace(/-\d+\.(avif|webp)$/, '')
  if (!manifest[slot]) fs.rmSync(path.join(OUT_DIR, out))
}

fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`media: ${sources.length} source image(s), ${built} rebuilt`)
