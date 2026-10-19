import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginWithEmail } from '../lib/authApi'
import { useAuth } from '../context/AuthContext'

export default function AdminLogin() {
  const navigate = useNavigate()
  const { user, profile, loading, refreshSession } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (loading) return
    if (user && profile?.role === 'admin') {
      navigate('/admin/home', { replace: true })
    }
  }, [user, profile, loading, navigate])

  async function handleAdminLogin(e) {
    e.preventDefault()
    setBusy(true)
    setFormError('')

    const normalizedEmail = email.trim().toLowerCase()
    const normalizedPassword = password.trim()

    try {
      // adminOnly: the API refuses non-admin accounts before issuing any session.
      await loginWithEmail({ email: normalizedEmail, password: normalizedPassword, adminOnly: true })
      await refreshSession()
      navigate('/admin/home')
    } catch (error) {
      if (error?.status === 401) {
        setFormError(
          'Wrong admin email or password. Sign in with your Velisqa admin account (role "admin") — not your NimbusPost shipping login.',
        )
      } else {
        setFormError(error?.message || 'Sign-in failed. Please try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="admin-theme grid min-h-screen bg-[var(--a-canvas)] text-ink lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-[var(--a-canvas)] lg:flex lg:flex-col lg:justify-between lg:p-14">
        <span className="admin-wordmark text-3xl">VELISQA</span>
        <div>
          <span className="mb-6 block h-px w-14 bg-[var(--a-accent)]" />
          <p className="max-w-sm font-serif text-4xl font-normal leading-tight">The seller console.</p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-[var(--a-text-2)]">Orders, collections, banners and customers — managed with care.</p>
        </div>
        <p className="admin-eyebrow">Staff access only</p>
      </section>

      <section className="flex flex-col justify-center px-6 py-14 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/" className="admin-eyebrow transition hover:text-ink">← Back to the boutique</Link>
          <p className="mt-10 admin-wordmark text-2xl lg:hidden">VELISQA</p>
          <h1 className="mt-6 font-serif text-3xl font-normal sm:text-4xl">Admin sign in</h1>
          <p className="mt-2 text-sm text-[var(--a-text-2)]">Use an account with the administrator role.</p>

          {formError ? (
            <p className="mt-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{formError}</p>
          ) : null}

          <form onSubmit={handleAdminLogin} className="mt-8 grid gap-4">
            <label>
              <span className="admin-label">Email</span>
              <input className="admin-input" placeholder="Admin email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
            </label>
            <label>
              <span className="admin-label">Password</span>
              <input className="admin-input" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
            </label>
            <button type="submit" disabled={busy} className="admin-btn mt-2 min-h-11">
              {busy ? 'Signing in…' : 'Enter dashboard'}
            </button>
            <Link to="/reset-password" className="justify-self-start text-xs text-[var(--a-muted)] underline-offset-4 hover:text-ink hover:underline">Forgot password?</Link>
          </form>
        </div>
      </section>
    </main>
  )
}
