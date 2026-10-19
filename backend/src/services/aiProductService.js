import { readFileSync } from 'node:fs'
import Anthropic from '@anthropic-ai/sdk'
import { env } from '../config/env.js'
import { HttpError, unavailable } from '../lib/errors.js'
import { logger } from '../lib/logger.js'
import { decodeDataUrl, localMediaPath } from './mediaService.js'

/** Same option lists the admin product form offers. */
export const CATEGORIES = ['Necklace', 'Bracelet', 'Rings', 'Earrings', 'Anklet', 'Bangles', 'Sets', 'Hair Accessories']
export const METALS = ['Gold plated', 'Rose gold plated', 'Silver plated', '925 silver', 'Stainless steel', 'Brass', 'Alloy']
export const COLOURS = ['Gold', 'Rose gold', 'Silver', 'Oxidised', 'Multicolour']
export const STYLES = ['Everyday', 'Office', 'Party', 'Wedding', 'Minimal', 'Statement', 'Traditional', 'Contemporary']

const DRAFT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'description', 'category', 'metal', 'colour', 'styles', 'search_keywords', 'suggested_price'],
  properties: {
    name: { type: 'string', description: 'Product title, 4-10 words, no brand name, no price.' },
    description: { type: 'string', description: '2-3 sentences: design, finish, how and when to wear it.' },
    category: { type: 'string', enum: CATEGORIES },
    metal: { type: 'string', enum: METALS },
    colour: { type: 'string', enum: COLOURS },
    styles: { type: 'array', items: { type: 'string', enum: STYLES } },
    search_keywords: { type: 'array', items: { type: 'string' }, description: '5-10 lowercase shopper search terms.' },
    suggested_price: { type: 'integer', description: 'Indicative retail price in INR for fashion jewellery (typically 299-1999).' },
  },
}

const SYSTEM = `You write product listings for Velisqa, an Indian demi-fine and fashion jewellery brand with a refined, international tone (think understated luxury, not hype).
From the product photo, describe only what is visible. Do not invent stone names, carat, purity or certifications. Keep names elegant and specific (e.g. "Sculpted Gold Dome Hoop Earrings"). Write descriptions in British English, 2-3 sentences.
The price is only a suggestion for the admin to review.`

let client = null
const getClient = () => (client ||= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }))

export const isAiConfigured = () => Boolean(env.ANTHROPIC_API_KEY)

function imageSource({ imageUrl, dataUrl }) {
  if (dataUrl) {
    const { buffer, mime } = decodeDataUrl(dataUrl)
    return { type: 'base64', media_type: mime, data: buffer.toString('base64') }
  }
  const local = localMediaPath(imageUrl)
  if (local) {
    const buffer = readFileSync(local)
    const ext = local.split('.').pop()
    const mime = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' }[ext]
    if (!mime) throw new HttpError(400, 'This image format cannot be analysed. Use JPG, PNG, WebP or GIF.')
    return { type: 'base64', media_type: mime, data: buffer.toString('base64') }
  }
  if (!/^https:\/\//.test(String(imageUrl || ''))) throw new HttpError(400, 'Provide an uploaded image.')
  return { type: 'url', url: imageUrl }
}

/** Drafts listing fields from one product photo. The admin reviews every field before publishing. */
export async function draftProductFromImage(input) {
  if (!isAiConfigured()) throw unavailable('AI drafting is not set up. Add ANTHROPIC_API_KEY to the API server .env.')
  const source = imageSource(input)
  const hint = String(input.hint || '').slice(0, 300)

  let response
  try {
    response = await getClient().beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 4000,
      // Short extraction task: low effort keeps it quick; the server-side fallback re-runs the
      // request on another model if a safety classifier declines it.
      output_config: { effort: 'low', format: { type: 'json_schema', schema: DRAFT_SCHEMA } },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source },
            { type: 'text', text: hint ? `Draft the listing. Admin note: ${hint}` : 'Draft the listing for this piece.' },
          ],
        },
      ],
    })
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) throw new HttpError(429, 'AI is busy right now. Try again in a minute.')
    if (error instanceof Anthropic.AuthenticationError) throw unavailable('The Anthropic API key was rejected. Check ANTHROPIC_API_KEY.')
    if (error instanceof Anthropic.BadRequestError) throw new HttpError(400, 'The AI could not read this image. Try a clearer JPG or PNG.')
    if (error instanceof Anthropic.APIError) {
      logger.error('Claude API error', { status: error.status })
      throw new HttpError(502, 'AI drafting failed. Please try again.')
    }
    throw error
  }

  if (response.stop_reason === 'refusal') throw new HttpError(422, 'The AI declined to describe this image. Fill the details manually.')
  if (response.stop_reason === 'max_tokens') throw new HttpError(502, 'AI response was cut off. Please try again.')
  const text = response.content.filter((block) => block.type === 'text').map((block) => block.text).join('')
  try {
    const draft = JSON.parse(text)
    return {
      ...draft,
      styles: [...new Set((draft.styles || []).filter((style) => STYLES.includes(style)))],
      search_keywords: [...new Set((draft.search_keywords || []).map((word) => String(word).toLowerCase().trim()).filter(Boolean))].slice(0, 12),
    }
  } catch {
    throw new HttpError(502, 'AI returned an unexpected answer. Please try again.')
  }
}
