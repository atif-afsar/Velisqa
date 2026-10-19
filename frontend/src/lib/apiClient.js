/**
 * Transport for the Velisqa API (Express on the Hostinger VPS).
 * Cookies carry the session (HttpOnly); every state-changing call echoes the
 * CSRF token from GET /auth/csrf. Domain modules wrap this — no UI code
 * should call fetch() against the API directly.
 */
const BASE_URL = String(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '')

export const API_BASE_URL = BASE_URL

export class ApiError extends Error {
  constructor(message, { status = 0, code, details, requestId } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
    this.requestId = requestId
  }
}

let csrfPromise = null

function loadCsrfToken({ force = false } = {}) {
  if (force) csrfPromise = null
  if (!csrfPromise) {
    csrfPromise = fetch(`${BASE_URL}/auth/csrf`, { credentials: 'include', headers: { Accept: 'application/json' } })
      .then(async (res) => {
        const body = await res.json().catch(() => null)
        if (!res.ok || !body?.data?.csrfToken) throw new ApiError('Could not reach Velisqa. Check your connection and try again.', { status: res.status })
        return body.data.csrfToken
      })
      .catch((error) => {
        csrfPromise = null
        throw error
      })
  }
  return csrfPromise
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function friendlyMessage(status, fallback) {
  if (status === 429) return 'Too many attempts. Please wait a moment and try again.'
  if (status >= 500) return 'Something went wrong on our side. Please try again.'
  return fallback
}

/**
 * @param {string} path  e.g. '/products'
 * @param {{ method?: string, body?: unknown, query?: Record<string, unknown>, headers?: Record<string,string>, signal?: AbortSignal, retries?: number }} [options]
 * @returns {Promise<any>} the `data` field of a `{ success: true, data }` envelope
 */
export async function apiRequest(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase()
  const mutating = !['GET', 'HEAD'].includes(method)
  // BASE_URL may be relative (/api/v1 in local dev, proxied by Vite).
  const url = new URL(`${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`, typeof window === 'undefined' ? 'http://localhost' : window.location.origin)
  for (const [key, value] of Object.entries(options.query || {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
  }

  // GETs are safe to retry on network/5xx errors; mutations retry only for an expired CSRF token.
  const retries = options.retries ?? (mutating ? 0 : 2)

  for (let attempt = 0; ; attempt += 1) {
    const headers = new Headers(options.headers || {})
    headers.set('Accept', 'application/json')
    if (options.body !== undefined) headers.set('Content-Type', 'application/json')
    if (mutating) headers.set('X-CSRF-Token', await loadCsrfToken())

    let response
    try {
      response = await fetch(url, {
        method,
        headers,
        credentials: 'include',
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: options.signal,
      })
    } catch (error) {
      if (error?.name === 'AbortError') throw error
      if (attempt < retries) {
        await sleep(400 * (attempt + 1))
        continue
      }
      throw new ApiError('Could not reach Velisqa. Check your connection and try again.', { status: 0, code: 'NETWORK' })
    }

    const payload = await response.json().catch(() => null)
    if (response.ok && payload?.success) return payload.data

    const err = payload?.error || {}
    if (mutating && response.status === 403 && err.code === 'CSRF_FAILED' && attempt === 0) {
      await loadCsrfToken({ force: true })
      continue
    }
    if (!mutating && response.status >= 500 && attempt < retries) {
      await sleep(400 * (attempt + 1))
      continue
    }
    throw new ApiError(err.message || friendlyMessage(response.status, `Request failed (${response.status}).`), {
      status: response.status,
      code: err.code,
      details: err.details,
      requestId: payload?.requestId,
    })
  }
}

export const api = {
  get: (path, options) => apiRequest(path, { ...options, method: 'GET' }),
  post: (path, body, options) => apiRequest(path, { ...options, method: 'POST', body: body ?? {} }),
  put: (path, body, options) => apiRequest(path, { ...options, method: 'PUT', body: body ?? {} }),
  patch: (path, body, options) => apiRequest(path, { ...options, method: 'PATCH', body: body ?? {} }),
  delete: (path, options) => apiRequest(path, { ...options, method: 'DELETE' }),
}

/** Absolute URL for full-page navigations (Google OAuth start). */
export const apiUrl = (path) => `${BASE_URL}${path}`

/** Session changed (login/logout elsewhere): the CSRF cookie is per browser, so only reset the cache. */
export function resetCsrfCache() {
  csrfPromise = null
}
