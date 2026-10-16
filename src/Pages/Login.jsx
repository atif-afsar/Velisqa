import { useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import EmailAuthFields from '../Components/Auth/EmailAuthFields'
import { useEmailAuthForm } from '../hooks/useEmailAuthForm'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const nextPath = searchParams.get('next') || '/'
  const { user, loading: authLoading } = useAuth()
  const auth = useEmailAuthForm()

  useEffect(() => {
    if (!authLoading && user) {
      navigate(nextPath.startsWith('/') ? nextPath : '/', { replace: true })
    }
  }, [user, authLoading, navigate, nextPath])

  if (authLoading) {
    return (
      <main className="min-h-screen bg-mist px-4 py-20 text-center text-sm text-muted">
        Loading…
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-mist text-ink">
      <div className="page-offset-nav">
        <div className="container-stitch px-4 py-10 sm:py-14">
          <Link
            to="/"
            className="mb-8 inline-flex text-[10px] font-bold uppercase tracking-[0.2em] text-muted transition hover:text-ink"
          >
            ← Back to home
          </Link>

          <div className="mx-auto max-w-md border border-line bg-white/70 p-6 sm:p-8">
            <p className="type-label text-muted">Velisqa</p>
            <h1 className="mt-2 font-serif text-2xl font-semibold tracking-wide sm:text-3xl">
              {auth.isSignup ? 'Create your account' : 'Sign in'}
            </h1>
            <p className="mt-2 text-sm text-body">
              {auth.isSignup
                ? 'Join with Google or email for orders and updates.'
                : 'Sign in with Google or your email.'}
            </p>

            <div className="mt-8">
              <EmailAuthFields
                idPrefix="login"
                isSignup={auth.isSignup}
                fullName={auth.fullName}
                setFullName={auth.setFullName}
                email={auth.email}
                setEmail={auth.setEmail}
                password={auth.password}
                setPassword={auth.setPassword}
                busy={auth.busy}
                formError={auth.formError}
                formNotice={auth.formNotice}
                onSubmit={auth.handleEmailAuth}
                onGoogleLogin={auth.handleGoogleLogin}
                onToggleMode={auth.toggleMode}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
