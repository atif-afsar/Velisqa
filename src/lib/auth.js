import { supabase } from './supabaseClient'
import { getSupabaseProvidersUrl, getSupabaseProjectRef } from './supabaseProject'

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
    const ref = getSupabaseProjectRef()
    const link = getSupabaseProvidersUrl()
    return new Error(
      `Google is OFF in Supabase project "${ref}". Open Supabase → Providers → Google, Enable ON, add Client ID & Secret, click Save.${link ? ` ${link}` : ''}`,
    )
  }

  return error instanceof Error ? error : new Error(msg || 'Sign-in failed')
}
