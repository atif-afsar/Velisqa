import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { enrichAuthError, signInWithGoogle } from '../../lib/auth'
import GoogleSignInButton from './GoogleSignInButton'

const inputClass =
  'w-full rounded-xl border border-[#847377]/25 bg-white/80 px-4 py-2.5 text-sm text-[#130006] outline-none transition placeholder:text-[#847377]/60 focus:border-[#3d0a21]/40 focus:ring-2 focus:ring-[#d4af37]/25'

export default function SignInForm({ onSuccess, idPrefix = 'signin' }) {
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
          options: { data: { full_name: fullName.trim() } },
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

        onSuccess?.()
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleGoogleLogin() {
    setBusy(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      const friendly = enrichAuthError(err)
      alert(friendly.message)
      setBusy(false)
    }
  }

  return (
    <div>
      <GoogleSignInButton onClick={handleGoogleLogin} disabled={busy} />

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-[#d4af37]/25" />
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#847377]">or email</span>
        <span className="h-px flex-1 bg-[#d4af37]/25" />
      </div>

      <form onSubmit={handleEmailAuth} className="grid gap-3">
        {isSignup && (
          <input
            id={`${idPrefix}-name`}
            className={inputClass}
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            required
          />
        )}

        <input
          id={`${idPrefix}-email`}
          className={inputClass}
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />

        <input
          id={`${idPrefix}-password`}
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
          className="rounded-xl bg-[#3d0a21] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#fdf9f4] transition hover:bg-[#2a0718] disabled:opacity-60"
        >
          {busy ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-[#514347]">
        {isSignup ? 'Already have an account?' : 'New here?'}{' '}
        <button
          type="button"
          className="font-semibold text-[#3d0a21] underline-offset-4 hover:underline"
          onClick={() => setIsSignup(!isSignup)}
        >
          {isSignup ? 'Sign in' : 'Create account'}
        </button>
      </p>
    </div>
  )
}
