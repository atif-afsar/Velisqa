/** Tabs on The Signature Collection (main shop grid) */
export const SIGNATURE_CATEGORIES = ['Necklace', 'Bracelet', 'Rings', 'Earrings']

/** Canonical shop categories shown on Collections */
export const PRODUCT_CATEGORIES = [
  'Necklace',
  'Bracelet',
  'Rings',
  'Earrings',
  'Anklet',
  'Bangles',
  'Sets',
  'Hair Accessories',
]

const CATEGORY_ALIASES = {
  necklace: 'Necklace',
  necklaces: 'Necklace',
  bracelet: 'Bracelet',
  bracelets: 'Bracelet',
  ring: 'Rings',
  rings: 'Rings',
  earring: 'Earrings',
  earrings: 'Earrings',
  anklet: 'Anklet',
  anklets: 'Anklet',
  bangle: 'Bangles',
  bangles: 'Bangles',
  set: 'Sets',
  sets: 'Sets',
  'hair accessories': 'Hair Accessories',
  hair: 'Hair Accessories',
}

export function normalizeProductCategory(category) {
  if (!category) return null
  const trimmed = category.trim()
  const fromAlias = CATEGORY_ALIASES[trimmed.toLowerCase()]
  if (fromAlias) return fromAlias
  const match = PRODUCT_CATEGORIES.find((c) => c.toLowerCase() === trimmed.toLowerCase())
  return match ?? trimmed
}

export function getCategoryFromParam(param) {
  if (!param) return null
  return normalizeProductCategory(param.replace(/-/g, ' '))
}

export function getCategoryParamSlug(category) {
  return category.toLowerCase().replace(/\s+/g, '-')
}

export function groupProductsByCategory(products, categories = PRODUCT_CATEGORIES) {
  const grouped = Object.fromEntries(categories.map((title) => [title, []]))

  for (const product of products) {
    const category = normalizeProductCategory(product.category)
    if (!category) continue
    if (!grouped[category]) {
      grouped[category] = []
    }
    grouped[category].push(product)
  }

  return grouped
}
