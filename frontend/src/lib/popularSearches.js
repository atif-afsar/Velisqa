export const POPULAR_SEARCHES = [
  { label: 'Rings', query: 'rings' },
  { label: 'Earrings', query: 'earrings' },
  { label: 'Necklace', query: 'necklace' },
  { label: 'Bracelet', query: 'bracelet' },
  { label: 'Gold jewellery', query: 'gold jewellery' },
  { label: 'Silver jewellery', query: 'silver jewellery' },
  { label: 'Gifts under ₹1,500', query: 'gifts under 1500' },
  { label: 'Everyday jewellery', query: 'everyday jewellery' },
]

const RECENT_SEARCHES_KEY = 'velisqa_recent_searches'
const MAX_RECENT_SEARCHES = 6

export function readRecentSearches() {
  if (typeof window === 'undefined') return []
  try {
    const value = JSON.parse(window.localStorage.getItem(RECENT_SEARCHES_KEY) || '[]')
    return Array.isArray(value) ? value.filter((item) => typeof item === 'string').slice(0, MAX_RECENT_SEARCHES) : []
  } catch {
    return []
  }
}

export function rememberSearch(query) {
  if (typeof window === 'undefined') return
  const clean = String(query || '').trim().replace(/\s+/g, ' ')
  if (clean.length < 2) return

  const next = [
    clean,
    ...readRecentSearches().filter((item) => item.toLowerCase() !== clean.toLowerCase()),
  ].slice(0, MAX_RECENT_SEARCHES)

  window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next))
}

export function clearRecentSearches() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(RECENT_SEARCHES_KEY)
}
