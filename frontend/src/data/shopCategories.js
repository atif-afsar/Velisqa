/**
 * Storefront categories: navigation, homepage tiles, category landing pages and SEO copy.
 * `category` must match the value stored in products.category (see lib/productCategories.js).
 */

const CLOUDINARY_PRODUCTS = 'https://res.cloudinary.com/dyshhpbhf/image/upload'

/** Packshot on white: trim surrounding whitespace so the piece fills its tile (padding is added in CSS). */
function tile(publicId) {
  return (width) => `${CLOUDINARY_PRODUCTS}/e_trim:10/c_pad,ar_4:5,w_${width},b_rgb:ffffff/f_auto,q_auto/velisqa/products/${publicId}.png`
}

/** Lifestyle photo: fill the tile edge to edge. */
function photo(publicId) {
  return (width) => `${CLOUDINARY_PRODUCTS}/c_fill,ar_4:5,g_auto,w_${width}/f_auto,q_auto/velisqa/products/${publicId}.png`
}

export const SHOP_CATEGORIES = [
  {
    slug: 'necklaces',
    category: 'Necklace',
    label: 'Necklaces',
    image: tile('moeqviqkeutx96sdkvcd'),
    imageAlt: 'Gold-tone pendant necklace with an emerald-cut green stone',
    intro:
      'Pendants, layered chains and statement collars — skin-safe pieces designed to be worn every day and remembered every time.',
    seoTitle: 'Necklaces for Women — Pendants & Layered Chains',
    seoDescription:
      'Shop Velisqa necklaces for women: minimal pendants, layered chains and statement pieces in gold and silver tones. Free shipping on prepaid orders across India.',
  },
  {
    slug: 'earrings',
    category: 'Earrings',
    label: 'Earrings',
    image: tile('f9k91rj627iob3ovk1fd'),
    imageAlt: 'Gold knot stud earrings with a pearl centre',
    intro:
      'Studs for every day, hoops for the weekend and drops for the occasion — lightweight earrings with a refined, polished finish.',
    seoTitle: 'Earrings for Women — Studs, Hoops & Drops',
    seoDescription:
      'Discover Velisqa earrings: pearl studs, gold-tone hoops and statement drops. Lightweight, skin-safe and shipped across India.',
  },
  {
    slug: 'rings',
    category: 'Rings',
    label: 'Rings',
    image: tile('r1np0rlbllb54jl0ajlk'),
    imageAlt: 'Slim gold-tone ring set with a round green stone',
    intro:
      'Solitaires, stackables and cocktail rings — crafted to catch the light and layer beautifully together.',
    seoTitle: 'Rings for Women — Solitaire, Stackable & Cocktail',
    seoDescription:
      'Shop Velisqa rings for women: solitaire, stackable and cocktail rings in gold and silver tones. Free shipping on prepaid orders.',
  },
  {
    slug: 'bracelets',
    category: 'Bracelet',
    label: 'Bracelets',
    image: tile('kypxd0uncygdxwz5kjhi'),
    imageAlt: 'Gold-tone vine bracelet set with clear crystals',
    intro:
      'Tennis bracelets, charms and fine chains — effortless wrist stacks for desk to dinner.',
    seoTitle: 'Bracelets for Women — Tennis, Charm & Chain',
    seoDescription:
      'Explore Velisqa bracelets: tennis, charm and chain bracelets for women. Designed for everyday stacking, shipped across India.',
  },
  {
    slug: 'bangles',
    category: 'Bangles',
    label: 'Bangles',
    image: photo('ddcmrnyvxhbyrt7pvrxg'),
    imageFit: 'cover',
    imageAlt: 'Gold-tone open crossover bangle worn on the wrist',
    intro: 'Sculpted bangles and kadas with a modern line — a single piece that finishes the look.',
    seoTitle: 'Bangles & Kadas for Women',
    seoDescription:
      'Shop Velisqa bangles and kadas: sculpted gold-tone designs for women, made to wear every day. Free shipping on prepaid orders.',
  },
]

export function findShopCategoryBySlug(slug) {
  if (!slug) return null
  const s = String(slug).toLowerCase()
  return (
    SHOP_CATEGORIES.find((c) => c.slug === s) ??
    // Legacy ?category= values: necklace, bracelet, rings, earrings, bangles
    SHOP_CATEGORIES.find((c) => c.category.toLowerCase() === s || c.category.toLowerCase().replace(/\s+/g, '-') === s) ??
    null
  )
}

export function findShopCategoryByName(category) {
  if (!category) return null
  return SHOP_CATEGORIES.find((c) => c.category.toLowerCase() === String(category).toLowerCase()) ?? null
}

export function categoryPath(categoryOrSlug) {
  const entry = typeof categoryOrSlug === 'string'
    ? findShopCategoryBySlug(categoryOrSlug) ?? findShopCategoryByName(categoryOrSlug)
    : categoryOrSlug
  return entry ? `/collections/${entry.slug}` : '/collections'
}
