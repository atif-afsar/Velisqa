import { isProductSoldOut } from './cartStock'
import { getProductRating, getProductReviewCount } from './productDisplay'

export const PRODUCT_SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'rating-desc', label: 'Highest rated' },
  { value: 'best-selling', label: 'Best selling' },
]

export const EMPTY_PRODUCT_FILTERS = {
  minPrice: '',
  maxPrice: '',
  categories: [],
  metals: [],
  colours: [],
  styles: [],
  inStockOnly: false,
  minRating: '',
  sort: 'featured',
}

function normalized(value) {
  return String(value ?? '').trim().toLowerCase()
}

function matchesOne(value, selected) {
  if (!selected?.length) return true
  return selected.some((item) => normalized(item) === normalized(value))
}

export function filterAndSortProducts(products, filters = EMPTY_PRODUCT_FILTERS) {
  const minPrice = filters.minPrice === '' ? null : Number(filters.minPrice)
  const maxPrice = filters.maxPrice === '' ? null : Number(filters.maxPrice)
  const minRating = filters.minRating === '' ? null : Number(filters.minRating)

  const filtered = (products ?? []).filter((product) => {
    const price = Number(product.price)
    if (minPrice != null && Number.isFinite(minPrice) && price < minPrice) return false
    if (maxPrice != null && Number.isFinite(maxPrice) && price > maxPrice) return false
    if (!matchesOne(product.category, filters.categories)) return false
    if (!matchesOne(product.metal, filters.metals)) return false
    if (!matchesOne(product.colour, filters.colours)) return false

    if (filters.styles?.length) {
      const productStyles = Array.isArray(product.styles) ? product.styles.map(normalized) : []
      if (!filters.styles.some((style) => productStyles.includes(normalized(style)))) return false
    }

    if (filters.inStockOnly && isProductSoldOut(product)) return false
    if (minRating != null && Number.isFinite(minRating) && getProductRating(product) < minRating) return false
    return true
  })

  return filtered
    .map((product, index) => ({ product, index }))
    .sort((a, b) => {
      switch (filters.sort) {
        case 'newest':
          return new Date(b.product.created_at || 0) - new Date(a.product.created_at || 0)
        case 'price-asc':
          return (Number(a.product.price) || 0) - (Number(b.product.price) || 0)
        case 'price-desc':
          return (Number(b.product.price) || 0) - (Number(a.product.price) || 0)
        case 'rating-desc':
          return getProductRating(b.product) - getProductRating(a.product)
        case 'best-selling':
          return getProductReviewCount(b.product) - getProductReviewCount(a.product)
        default:
          return a.index - b.index
      }
    })
    .map(({ product }) => product)
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b))
}

export function getProductFacetOptions(products) {
  return {
    categories: uniqueSorted((products ?? []).map((product) => product.category)),
    metals: uniqueSorted((products ?? []).map((product) => product.metal)),
    colours: uniqueSorted((products ?? []).map((product) => product.colour)),
    styles: uniqueSorted((products ?? []).flatMap((product) => (
      Array.isArray(product.styles) ? product.styles : []
    ))),
  }
}

export function countActiveProductFilters(filters) {
  return [
    filters.minPrice !== '',
    filters.maxPrice !== '',
    ...(filters.categories ?? []).map(() => true),
    ...(filters.metals ?? []).map(() => true),
    ...(filters.colours ?? []).map(() => true),
    ...(filters.styles ?? []).map(() => true),
    filters.inStockOnly,
    filters.minRating !== '',
  ].filter(Boolean).length
}

export function getFacetParamSlug(value) {
  return normalized(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function readFacetValues(searchParams, key, options) {
  const requested = (searchParams.get(key) || '').split(',').filter(Boolean)
  return requested
    .map((slug) => options.find((option) => getFacetParamSlug(option) === slug))
    .filter(Boolean)
}

export function readProductFilters(searchParams, facets = {
  categories: [],
  metals: [],
  colours: [],
  styles: [],
}) {
  const requestedSort = searchParams.get('sort') || 'featured'
  return {
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    categories: readFacetValues(searchParams, 'categories', facets.categories),
    metals: readFacetValues(searchParams, 'metal', facets.metals),
    colours: readFacetValues(searchParams, 'colour', facets.colours),
    styles: readFacetValues(searchParams, 'style', facets.styles),
    inStockOnly: searchParams.get('availability') === 'in-stock',
    minRating: searchParams.get('rating') || '',
    sort: PRODUCT_SORT_OPTIONS.some((option) => option.value === requestedSort)
      ? requestedSort
      : 'featured',
  }
}

function writeFacetValues(searchParams, key, values) {
  if (values?.length) {
    searchParams.set(key, values.map(getFacetParamSlug).join(','))
  } else {
    searchParams.delete(key)
  }
}

export function writeProductFilters(searchParams, filters) {
  const next = new URLSearchParams(searchParams)
  if (filters.minPrice !== '') next.set('minPrice', filters.minPrice)
  else next.delete('minPrice')
  if (filters.maxPrice !== '') next.set('maxPrice', filters.maxPrice)
  else next.delete('maxPrice')

  writeFacetValues(next, 'categories', filters.categories)
  writeFacetValues(next, 'metal', filters.metals)
  writeFacetValues(next, 'colour', filters.colours)
  writeFacetValues(next, 'style', filters.styles)

  if (filters.inStockOnly) next.set('availability', 'in-stock')
  else next.delete('availability')
  if (filters.minRating !== '') next.set('rating', filters.minRating)
  else next.delete('rating')
  if (filters.sort && filters.sort !== 'featured') next.set('sort', filters.sort)
  else next.delete('sort')
  return next
}
