import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const navigate = useNavigate()

  const [isSignup, setIsSignup] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleEmailAuth(e) {
    e.preventDefault()
    setBusy(true)

    const normalizedEmail = email.trim().toLowerCase()
    const normalizedPassword = password.trim()

    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password: normalizedPassword,
          options: {
            data: {
              full_name: fullName.trim(),
            },
          },
        })

        if (error) {
          alert(error.message)
          return
        }

        alert('Account created. You can sign in now.')
        setIsSignup(false)
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: normalizedPassword,
        })

        if (error) {
          alert(error.message)
          return
        }

        navigate('/')
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleGoogleLogin() {
    setBusy(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      })

      if (error) {
        alert(error.message)
      }
    } finally {
      setBusy(false)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-[#847377]/25 bg-white/80 px-4 py-3 text-[#130006] shadow-sm outline-none transition placeholder:text-[#847377]/60 focus:border-[#3d0a21]/40 focus:ring-2 focus:ring-[#d4af37]/25'

  return (
    <main className="min-h-screen bg-[#f9f5f0] text-[#130006]">
      <div className="page-offset-nav">
        <div className="container-stitch px-4 py-10 sm:py-14">
          <Link
            to="/"
            className="mb-8 inline-flex text-[10px] font-bold uppercase tracking-[0.2em] text-[#847377] transition hover:text-[#3d0a21]"
          >
            ← Back to home
          </Link>

          <div className="mx-auto max-w-md rounded-2xl border border-[#d4af37]/20 bg-white/70 p-6 shadow-[0_20px_50px_rgba(19,0,6,0.06)] backdrop-blur-sm sm:p-8">
            <p className="type-label text-[#d4af37]">Velisqa</p>
            <h1 className="mt-2 font-serif text-2xl font-semibold tracking-wide sm:text-3xl">
              {isSignup ? 'Create your account' : 'Sign in'}
            </h1>
            <p className="mt-2 text-sm text-[#514347]">
              {isSignup ? 'Join the atelier list for orders and updates.' : 'Welcome back.'}
            </p>

            <form onSubmit={handleEmailAuth} className="mt-8 grid gap-4">
              {isSignup && (
                <input
                  className={inputClass}
                  placeholder="Full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  required
                />
              )}

              <input
                className={inputClass}
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />

              <input
                className={inputClass}
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                required
                minLength={6}
              />

              <button
                type="submit"
                disabled={busy}
                className="rounded-xl bg-[#3d0a21] px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-[#fdf9f4] transition hover:bg-[#2a0718] disabled:opacity-60"
              >
                {busy ? 'Please wait…' : isSignup ? 'Sign up' : 'Sign in'}
              </button>
            </form>

            <button
              type="button"
              disabled={busy}
              onClick={handleGoogleLogin}
              className="mt-4 w-full rounded-xl border border-[#847377]/25 bg-white/90 py-3 text-sm font-medium text-[#130006] transition hover:border-[#3d0a21]/25 disabled:opacity-60"
            >
              Continue with Google
            </button>

            <p className="mt-6 text-center text-sm text-[#514347]">
              {isSignup ? 'Already have an account?' : 'New here?'}{' '}
              <button
                type="button"
                className="font-semibold text-[#3d0a21] underline-offset-4 hover:underline"
                onClick={() => setIsSignup(!isSignup)}
              >
                {isSignup ? 'Sign in' : 'Create an account'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
