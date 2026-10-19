import { api, apiUrl } from './apiClient'

export const fetchSession = () => api.get('/auth/me', { retries: 1 })

export const registerWithEmail = ({ email, password, fullName }) => api.post('/auth/register', { email, password, fullName })

export const loginWithEmail = ({ email, password, adminOnly = false }) => api.post('/auth/login', { email, password, adminOnly })

export const logoutSession = () => api.post('/auth/logout')

export const requestPasswordReset = (email) => api.post('/auth/forgot-password', { email })

export const resetPasswordWithToken = ({ token, password }) => api.post('/auth/reset-password', { token, password })

/** Full-page redirect target that starts Google OAuth on the API (state + PKCE are server-side). */
export const googleSignInUrl = (next) => apiUrl(`/auth/google?${new URLSearchParams({ next: next || '/' })}`)
