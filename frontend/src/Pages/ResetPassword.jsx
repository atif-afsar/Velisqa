import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { EMAIL_AUTH_INPUT_CLASS } from '../Components/Auth/EmailAuthFields'
import { requestPasswordReset, resetPasswordWithToken } from '../lib/authApi'

const buttonClass =
  'bg-ink px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-ink disabled:opacity-60'

/** /reset-password — request a link (no token) or choose a new password (?token=...). */
export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      if (token) {
        const result = await resetPasswordWithToken({ token, password: password.trim() })
        setNotice(result?.message || 'Password updated. You can sign in now.')
        setDone(true)
      } else {
        const result = await requestPasswordReset(email.trim().toLowerCase())
        setNotice(result?.message || 'If an account exists for that email, a reset link is on its way.')
      }
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-mist text-ink">
      <div className="page-offset-nav">
        <div className="container-stitch px-4 py-10 sm:py-14">
          <Link to="/login" className="mb-8 inline-flex text-[10px] font-bold uppercase tracking-[0.2em] text-muted transition hover:text-ink">
            ← Back to sign in
          </Link>

          <div className="mx-auto max-w-md border border-line bg-white/70 p-6 sm:p-8">
            <p className="type-label text-muted">Velisqa</p>
            <h1 className="mt-2 font-serif text-2xl font-semibold tracking-wide sm:text-3xl">
              {token ? 'Choose a new password' : 'Reset your password'}
            </h1>
            <p className="mt-2 text-sm text-body">
              {token ? 'Enter a new password for your account.' : 'We will email you a link to set a new password.'}
            </p>

            {error ? <p className="mt-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
            {notice ? <p className="mt-6 border border-[#2d6a4f]/25 bg-[#edf7f1] px-4 py-3 text-sm text-[#1f4334]">{notice}</p> : null}

            {done ? (
              <Link to="/login" className={`${buttonClass} mt-8 inline-flex`}>
                Sign in
              </Link>
            ) : (
              <form onSubmit={handleSubmit} className="mt-8 grid gap-4">
                {token ? (
                  <input
                    className={EMAIL_AUTH_INPUT_CLASS}
                    placeholder="New password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                    required
                  />
                ) : (
                  <input
                    className={EMAIL_AUTH_INPUT_CLASS}
                    placeholder="Email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    required
                  />
                )}
                <button type="submit" disabled={busy} className={buttonClass}>
                  {busy ? 'Please wait…' : token ? 'Update password' : 'Send reset link'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
