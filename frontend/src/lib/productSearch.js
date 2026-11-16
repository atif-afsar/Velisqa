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
  // Synonyms shoppers type (P1-11).
  chain: 'necklace',
  chains: 'necklace',
  neckpiece: 'necklace',
  choker: 'necklace',
  chokers: 'necklace',
  kada: 'bangle',
  kadas: 'bangle',
  kangan: 'bangle',
  studs: 'stud',
  hoops: 'hoop',
  jhumki: 'jhumka',
  jhumkas: 'jhumka',
  jhumkis: 'jhumka',
  tops: 'stud',
  bali: 'hoop',
  balis: 'hoop',
  pendants: 'pendant',
  anguthi: 'ring',
  silver: 'silver',
  golden: 'gold',
}

/** Multi-word phrases rewritten before tokenising ("ear rings" → earring, "rose gold" stays one colour). */
const PHRASES = [
  [/\bear\s*rings?\b/g, 'earring'],
  [/\bfinger\s*rings?\b/g, 'ring'],
  [/\bhand\s*chains?\b/g, 'bracelet'],
]

/** Edit distance ≤ 1 (one typo) for tokens of 5+ letters: "neclace" → necklace, "braclet" → bracelet. */
function withinOneEdit(a, b) {
  if (a === b) return true
  const la = a.length
  const lb = b.length
  if (Math.abs(la - lb) > 1) return false
  let i = 0
  let j = 0
  let edits = 0
  while (i < la && j < lb) {
    if (a[i] === b[j]) {
      i += 1
      j += 1
      continue
    }
    edits += 1
    if (edits > 1) return false
    if (la > lb) i += 1
    else if (lb > la) j += 1
    else {
      // substitution or adjacent swap
      if (a[i + 1] === b[j] && a[i] === b[j + 1]) {
        i += 2
        j += 2
        continue
      }
      i += 1
      j += 1
    }
  }
  return edits + (la - i) + (lb - j) <= 1
}

const INTENT_WORDS = new Set(['gift', 'jewellery', 'under', 'below', 'less', 'than', 'rs', 'inr'])

function normalizeToken(token) {
  return TOKEN_ALIASES[token] ?? token
}

export function normalizeSearchText(value) {
  let text = String(value ?? '').toLowerCase()
  for (const [re, to] of PHRASES) text = text.replace(re, to)
  return text
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
      else if (token.length >= 5 && field.value.split(' ').some((word) => word.length >= 4 && withinOneEdit(word, token))) {
        tokenScore = Math.max(tokenScore, Math.ceil(field.weight / 2))
      }
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
