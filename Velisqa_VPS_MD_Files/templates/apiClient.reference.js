/** Reference for src/lib/apiClient.js: adapt to actual backend CSRF design.
 *  This is a reusable transport only, NOT a substitute for domain services.
 *  Do not ship until backend and CSRF endpoint are implemented and tested.
 */
const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

let csrfTokenPromise

async function loadCsrfToken() {
  if (!csrfTokenPromise) {
    csrfTokenPromise = fetch(`${BASE_URL}/auth/csrf`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    }).then(async (res) => {
      if (!res.ok) throw new ApiError('Could not initialize request security.', res.status)
      const body = await res.json()
      return body.data?.csrfToken
    }).catch((error) => {
      csrfTokenPromise = undefined
      throw error
    })
  }
  return csrfTokenPromise
}

export async function apiRequest(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase()
  const mutating = !['GET', 'HEAD', 'OPTIONS'].includes(method)
  const headers = new Headers(options.headers || {})
  headers.set('Accept', 'application/json')
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  if (mutating && !options.skipCsrf) headers.set('X-CSRF-Token', await loadCsrfToken())

  const response = await fetch(`${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`, {
    ...options,
    method,
    headers,
    credentials: 'include',
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.success) {
    const err = payload?.error || {}
    throw new ApiError(err.message || `Request failed (${response.status})`, response.status, err.code, err.details)
  }
  return payload.data
}

export function resetCsrfCache() {
  csrfTokenPromise = undefined
}
