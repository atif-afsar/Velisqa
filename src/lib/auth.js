import { supabase } from './supabaseClient'

/** Where Supabase redirects after Google OAuth (must be listed in Supabase → URL Configuration). */
export function getAuthCallbackUrl() {
  return `${window.location.origin}/auth/callback`
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getAuthCallbackUrl(),
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error) {
    throw enrichAuthError(error)
  }
}

/** Turns Supabase auth API errors into clearer messages for the UI. */
export function enrichAuthError(error) {
  const msg = error?.message ?? ''
  const code = error?.code ?? error?.error_code ?? ''

  if (
    msg.includes('provider is not enabled') ||
    code === 'validation_failed' ||
    msg.includes('Unsupported provider')
  ) {
    return new Error(
      'Google sign-in is not available right now. Please try again later or sign in with email.',
    )
  }

  return error instanceof Error ? error : new Error(msg || 'Sign-in failed')
}
