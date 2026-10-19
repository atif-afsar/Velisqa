import { isProductSoldOut } from './cartStock'

const TOKEN_ALIASES = {
  accessories: 'accessory',
  anklets: 'anklet',
  bangles: 'bangle',
  bracelets: 'bracelet',
  earrings: 'earring',
  gifts: 'gift',
  jewellery: 'jewellery',
  jewelry: 'jewellery',
  necklaces: 'necklace',
  rings: 'ring',
  sets: 'set',
  styles: 'style',
}

const INTENT_WORDS = new Set(['gift', 'jewellery', 'under', 'below', 'less', 'than', 'rs', 'inr'])

function normalizeToken(token) {
  return TOKEN_ALIASES[token] ?? token
}

export function normalizeSearchText(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/₹/g, ' rs ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(normalizeToken)
    .join(' ')
}

function normalizedList(value) {
  const source = Array.isArray(value) ? value : value ? [value] : []
  return normalizeSearchText(source.join(' '))
}

function searchableFields(product) {
  return [
    { value: normalizeSearchText(product.name), weight: 14 },
    { value: normalizeSearchText(product.category), weight: 10 },
    { value: normalizeSearchText(product.metal), weight: 8 },
    { value: normalizeSearchText(product.colour), weight: 7 },
    { value: normalizedList(product.styles), weight: 6 },
    { value: normalizeSearchText(product.badge), weight: 4 },
    { value: normalizedList(product.search_keywords), weight: 5 },
  ]
}

function parsePriceCeiling(query) {
  const compact = String(query || '').replace(/,/g, '')
  const match = compact.match(/(?:under|below|less\s+than)\s*(?:₹|rs\.?|inr)?\s*(\d{2,7})/i)
  return match ? Number(match[1]) : null
}

function meaningfulTokens(query) {
  return normalizeSearchText(query)
    .split(' ')
    .filter((token) => token && !INTENT_WORDS.has(token) && !/^\d+$/.test(token))
}

export function scoreProductSearch(product, query) {
  const tokens = meaningfulTokens(query)
  const ceiling = parsePriceCeiling(query)
  const price = Number(product.price)

  if (ceiling != null && (!Number.isFinite(price) || price > ceiling)) return null
  if (tokens.length === 0 && ceiling == null) return null

  const fields = searchableFields(product)
  let score = ceiling != null ? 5 : 0

  for (const token of tokens) {
    let tokenScore = 0
    for (const field of fields) {
      if (!field.value) continue
      if (field.value === token) tokenScore = Math.max(tokenScore, field.weight * 3)
      else if (field.value.split(' ').includes(token)) tokenScore = Math.max(tokenScore, field.weight * 2)
      else if (field.value.includes(token)) tokenScore = Math.max(tokenScore, field.weight)
    }
    if (tokenScore === 0) return null
    score += tokenScore
  }

  const normalizedQuery = normalizeSearchText(query)
  const normalizedName = normalizeSearchText(product.name)
  if (normalizedName === normalizedQuery) score += 80
  else if (normalizedName.startsWith(normalizedQuery)) score += 35
  else if (normalizedName.includes(normalizedQuery)) score += 20

  return score
}

export function searchProducts(products, query, options = {}) {
  const limit = options.limit ?? Number.POSITIVE_INFINITY
  return (products ?? [])
    .map((product) => ({ product, score: scoreProductSearch(product, query) }))
    .filter((result) => result.score != null)
    .sort((a, b) => {
      const availability = Number(isProductSoldOut(a.product)) - Number(isProductSoldOut(b.product))
      if (availability !== 0) return availability
      if (b.score !== a.score) return b.score - a.score
      return (Number(b.product.rating) || 0) - (Number(a.product.rating) || 0)
    })
    .slice(0, limit)
    .map((result) => result.product)
}

export function getMatchingCategories(products, query, limit = 3) {
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) return []

  const categories = [...new Set((products ?? []).map((product) => product.category).filter(Boolean))]
  return categories
    .filter((category) => normalizeSearchText(category).includes(normalizedQuery))
    .slice(0, limit)
}
