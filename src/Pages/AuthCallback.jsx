import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { consumePostSignInIntent } from '../lib/postSignIn'
import { supabase } from '../lib/supabaseClient'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const oauthError = params.get('error_description')
    const nextFromQuery = params.get('next')

    if (oauthError) {
      setError(decodeURIComponent(oauthError.replace(/\+/g, ' ')))
      return undefined
    }

    let finished = false

    function goAfterAuth() {
      if (finished) return
      finished = true

      const intent = consumePostSignInIntent()
      const destination = nextFromQuery || intent?.returnTo || '/'
      navigate(destination, { replace: true })
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) goAfterAuth()
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) goAfterAuth()
    })

    const timeout = window.setTimeout(() => {
      if (!finished) {
        setError('Sign-in could not be completed. Please try again.')
      }
    }, 12000)

    return () => {
      subscription.unsubscribe()
      window.clearTimeout(timeout)
    }
  }, [navigate])

  return (
    <main className="page-offset-nav flex min-h-[50vh] items-center justify-center bg-[#f9f5f0] px-4">
      <div className="max-w-sm text-center">
        {error ? (
          <>
            <p className="font-serif text-xl text-[#130006]">Sign-in failed</p>
            <p className="mt-3 text-sm text-[#514347]">{error}</p>
            <Link
              to="/login"
              className="mt-6 inline-flex rounded-full bg-[#3d0a21] px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#fdf9f4]"
            >
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <p className="font-serif text-xl text-[#130006]">Signing you in…</p>
            <p className="mt-2 text-sm text-[#847377]">Completing Google sign-in.</p>
          </>
        )}
      </div>
    </main>
  )
}
