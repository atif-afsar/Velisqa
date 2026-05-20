import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function AdminLogin() {
  const navigate = useNavigate()
  const { user, profile, loading } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (loading) return
    if (user && profile?.role === 'admin') {
      navigate('/admin/panel', { replace: true })
    }
  }, [user, profile, loading, navigate])

  async function handleAdminLogin(e) {
    e.preventDefault()
    setBusy(true)

    const normalizedEmail = email.trim().toLowerCase()
    const normalizedPassword = password.trim()

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      })

      if (error) {
        alert(error.message)
        return
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (profileError || profileData?.role !== 'admin') {
        await supabase.auth.signOut()
        alert('Access denied. This entrance is reserved for administrators.')
        return
      }

      navigate('/admin/panel')
    } finally {
      setBusy(false)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-[#847377]/25 bg-white/80 px-4 py-3 text-[#130006] shadow-sm outline-none transition placeholder:text-[#847377]/60 focus:border-[#3d0a21]/40 focus:ring-2 focus:ring-[#d4af37]/25'

  return (
    <main className="min-h-screen bg-[#130006] text-[#f7ead0]">
      <div className="page-offset-nav">
        <div className="container-stitch px-4 py-10 sm:py-14">
          <Link
            to="/"
            className="mb-8 inline-flex text-[10px] font-bold uppercase tracking-[0.2em] text-[#d4af37]/80 transition hover:text-[#d4af37]"
          >
            ← Back to home
          </Link>

          <div className="mx-auto max-w-md rounded-2xl border border-[#d4af37]/25 bg-[#3d0a21]/90 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur-sm sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#847377]">Staff only</p>
            <h1 className="mt-2 font-serif text-2xl font-semibold tracking-wide text-[#fdf9f4] sm:text-3xl">
              Admin sign in
            </h1>
            <p className="mt-2 text-sm text-white/60">Use credentials for a profile with role &quot;admin&quot;.</p>

            <form onSubmit={handleAdminLogin} className="mt-8 grid gap-4">
              <input
                className={inputClass}
                placeholder="Admin email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />

              <input
                className={inputClass}
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />

              <button
                type="submit"
                disabled={busy}
                className="rounded-xl bg-[#d4af37] px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-[#130006] transition hover:bg-[#e9c349] disabled:opacity-60"
              >
                {busy ? 'Signing in…' : 'Enter dashboard'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  )
}
