/**
 * UTM campaign attribution persistence.
 *
 * Captures UTM parameters and platform click IDs (gclid, fbclid) from the
 * landing URL and stores them in sessionStorage so they survive SPA navigation
 * without being lost.
 *
 * Does NOT strip UTM params from the URL — GA4 uses them for auto-attribution.
 */

const STORAGE_KEY = 'velisqa:attribution'

const TRACKED_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'gclid',
  'fbclid',
]

/**
 * Call once on app init. Reads UTM/click-ID params from the current URL
 * and persists them in sessionStorage. Only writes on the first visit
 * (does not overwrite during internal navigation).
 */
export function captureAttribution() {
  if (typeof window === 'undefined') return

  const params = new URLSearchParams(window.location.search)
  const attribution = {}
  let hasAny = false

  for (const key of TRACKED_PARAMS) {
    const value = params.get(key)
    if (value) {
      attribution[key] = value
      hasAny = true
    }
  }

  // Only store if the landing URL had campaign params
  if (hasAny) {
    attribution.landing_page = window.location.pathname
    attribution.captured_at = new Date().toISOString()
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution))
    } catch {
      /* quota exceeded — ignore */
    }
  }
}

/** Retrieve stored attribution data (or null if none). */
export function getAttribution() {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
