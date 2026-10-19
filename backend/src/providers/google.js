import crypto from 'node:crypto'
import { env } from '../config/env.js'
import { ProviderError } from '../lib/errors.js'

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo'

export function isGoogleConfigured() {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REDIRECT_URI)
}

export function createPkcePair() {
  const verifier = crypto.randomBytes(32).toString('base64url')
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

export function buildGoogleAuthUrl({ state, codeChallenge }) {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  })
  return `${AUTH_URL}?${params.toString()}`
}

/** Exchanges the authorization code server-side and returns the verified OpenID profile. */
export async function exchangeGoogleCode({ code, codeVerifier }) {
  const tokenResponse = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
    }),
  })
  const tokens = await tokenResponse.json().catch(() => null)
  if (!tokenResponse.ok || !tokens?.access_token) {
    throw new ProviderError('Google sign-in could not be completed. Please try again.', 502)
  }

  const profileResponse = await fetch(USERINFO_URL, { headers: { Authorization: `Bearer ${tokens.access_token}` } })
  const profile = await profileResponse.json().catch(() => null)
  if (!profileResponse.ok || !profile?.sub) {
    throw new ProviderError('Google did not return your account details. Please try again.', 502)
  }
  return {
    sub: String(profile.sub),
    email: profile.email,
    emailVerified: profile.email_verified === true || profile.email_verified === 'true',
    name: profile.name || null,
  }
}
