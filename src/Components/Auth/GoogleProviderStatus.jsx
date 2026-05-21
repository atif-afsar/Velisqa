import { useEffect, useState } from 'react'
import { fetchGoogleProviderEnabled, getSupabaseProvidersUrl } from '../../lib/supabaseProject'

export default function GoogleProviderStatus() {
  const [status, setStatus] = useState({ loading: true })
  const providersUrl = getSupabaseProvidersUrl()

  useEffect(() => {
    let cancelled = false
    fetchGoogleProviderEnabled().then((result) => {
      if (!cancelled) setStatus({ loading: false, ...result })
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (status.loading) return null

  if (status.enabled) {
    return (
      <p className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-[11px] text-green-900">
        Google sign-in is active for project <strong>{status.projectRef}</strong>. You can use Continue with Google.
      </p>
    )
  }

  return (
    <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-3 text-left text-[11px] leading-relaxed text-amber-950">
      <p className="font-semibold">Google is not active yet (even if the list shows &quot;Enabled&quot;)</p>
      <p className="mt-1">
        Project <code className="text-[10px]">{status.projectRef}</code> still returns &quot;provider is not
        enabled&quot;. You must open Google and save credentials.
      </p>
      <ol className="mt-2 list-decimal space-y-1 pl-4">
        <li>
          Click the <strong>Google</strong> row (arrow →), not only the green badge
        </li>
        <li>
          {providersUrl ? (
            <a href={providersUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
              Open Google provider settings
            </a>
          ) : (
            'Open Supabase → Providers → Google'
          )}
        </li>
        <li>
          <strong>Enable</strong> ON · paste <strong>Client ID</strong> + <strong>Client secret</strong> from Google
          Cloud
        </li>
        <li>
          Click <strong>Save</strong> at the bottom, wait 30 seconds, refresh this page
        </li>
      </ol>
      {status.hint && <p className="mt-2 text-[10px] opacity-90">{status.hint}</p>}
    </div>
  )
}
