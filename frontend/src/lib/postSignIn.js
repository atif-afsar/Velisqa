const STORAGE_KEY = 'velisqa_post_signin'

export function savePostSignInIntent(intent) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(intent))
}

export function peekPostSignInIntent() {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function consumePostSignInIntent() {
  const intent = peekPostSignInIntent()
  if (intent && typeof window !== 'undefined') {
    sessionStorage.removeItem(STORAGE_KEY)
  }
  return intent
}

export function buildLoginNextPath(pathname, { openCheckout = false } = {}) {
  const url = new URL(pathname || '/cart', window.location.origin)
  if (openCheckout) url.searchParams.set('checkout', '1')
  return `${url.pathname}${url.search}`
}
