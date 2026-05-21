export function getSupabaseProjectRef() {
  const url = import.meta.env.VITE_SUPABASE_URL
  if (!url) return null
  try {
    return new URL(url).hostname.split('.')[0]
  } catch {
    return null
  }
}

export function getSupabaseProvidersUrl() {
  const ref = getSupabaseProjectRef()
  return ref ? `https://supabase.com/dashboard/project/${ref}/auth/providers` : null
}

/** Probes /auth/v1/authorize — same check the app uses when you click Continue with Google. */
export async function fetchGoogleProviderEnabled() {
  const url = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return { ok: false, enabled: false, error: 'Missing Supabase env vars' }

  const redirectTo = `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'}/auth/callback`
  const probeUrl = `${url}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`

  try {
    const res = await fetch(probeUrl, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      redirect: 'manual',
    })

    const location = res.headers.get('location') ?? ''
    const enabled =
      (res.status >= 300 && res.status < 400 && location.includes('accounts.google.com')) ||
      location.includes('google.com')

    return {
      ok: true,
      enabled,
      projectRef: getSupabaseProjectRef(),
      hint: enabled
        ? null
        : 'List may show Enabled — open Google, add Client ID + Secret, click Save.',
    }
  } catch (err) {
    return { ok: false, enabled: false, error: err.message, projectRef: getSupabaseProjectRef() }
  }
}
