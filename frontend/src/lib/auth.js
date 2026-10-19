import { googleSignInUrl } from './authApi'
import { peekPostSignInIntent } from './postSignIn'

/** Where to land after Google sign-in; the API validates it as a same-site relative path. */
function postSignInPath() {
  const intent = peekPostSignInIntent()
  return intent?.returnTo || `${window.location.pathname}${window.location.search}` || '/'
}

/** Starts Google OAuth: the API redirects to Google and back to /auth/callback?next=... */
export async function signInWithGoogle() {
  window.location.assign(googleSignInUrl(postSignInPath()))
}

/** Turns API auth errors into clearer messages for the UI. */
export function enrichAuthError(error) {
  const msg = error?.message ?? ''
  if (/not available|not configured/i.test(msg)) {
    return new Error('Google sign-in is not available right now. Please try again later or sign in with email.')
  }
  return error instanceof Error ? error : new Error(msg || 'Sign-in failed')
}
