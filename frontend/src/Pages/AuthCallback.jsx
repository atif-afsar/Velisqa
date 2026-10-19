import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { consumePostSignInIntent } from '../lib/postSignIn'

/** Only same-site relative paths; anything else falls back to the home page. */
function safeNext(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null
  return value
}

export default function AuthCallback() {
  const navigate = useNavigate()
  const { refreshSession } = useAuth()
  const [error, setError] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const oauthError = params.get('error_description')
    const nextFromQuery = safeNext(params.get('next'))

    if (oauthError) {
      setError(oauthError)
      return undefined
    }

    let cancelled = false
    // The API set the HttpOnly session cookie before redirecting here.
    refreshSession().then((session) => {
      if (cancelled) return
      if (!session?.user) {
        setError('Sign-in could not be completed. Please try again.')
        return
      }
      const intent = consumePostSignInIntent()
      navigate(nextFromQuery || safeNext(intent?.returnTo) || '/', { replace: true })
    })

    return () => {
      cancelled = true
    }
  }, [navigate, refreshSession])

  return (
    <main className="page-offset-nav flex min-h-[50vh] items-center justify-center bg-mist px-4">
      <div className="max-w-sm text-center">
        {error ? (
          <>
            <p className="font-serif text-xl text-ink">Sign-in failed</p>
            <p className="mt-3 text-sm text-body">{error}</p>
            <Link
              to="/login"
              className="mt-6 inline-flex bg-ink px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white"
            >
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <p className="font-serif text-xl text-ink">Signing you in…</p>
            <p className="mt-2 text-sm text-muted">Completing Google sign-in.</p>
          </>
        )}
      </div>
    </main>
  )
}
