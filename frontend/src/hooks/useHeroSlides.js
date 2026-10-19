import { useEffect, useState } from 'react'
import { api } from '../lib/apiClient'

const CACHE_KEY = 'velisqa:hero-slides:v2'

function readCache() {
  if (typeof window === 'undefined') return null
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
    return parsed && Array.isArray(parsed.slides) ? parsed : null
  } catch {
    return null
  }
}

/**
 * Homepage banners managed in /admin/hero.
 * - `ready`: true once we know which banners to show (cache or API), so the page
 *   never flashes the built-in banners before the admin's own ones.
 * - `slides`: [] means "no custom banners" → the built-in banners are used.
 * - `intervalSeconds`: how long each banner stays before the next.
 */
export function useHeroSlides() {
  const [state, setState] = useState(() => {
    const cached = readCache()
    return cached ? { ...cached, ready: true } : { slides: [], intervalSeconds: 5, ready: false }
  })

  useEffect(() => {
    let cancelled = false
    api
      .get('/settings/hero', { retries: 1 })
      .then((data) => {
        if (cancelled) return
        const next = {
          slides: Array.isArray(data?.slides) ? data.slides.filter((slide) => slide?.desktopUrl) : [],
          intervalSeconds: Number(data?.intervalSeconds) || 5,
        }
        setState({ ...next, ready: true })
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(next))
        } catch {
          /* storage full or private mode */
        }
      })
      // If the API is unreachable, fall back to the built-in banners rather than an empty hero.
      .catch(() => !cancelled && setState((current) => ({ ...current, ready: true })))
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
