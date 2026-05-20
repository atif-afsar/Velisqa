import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(userId) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()

    if (!error) {
      setProfile(data)
    } else {
      setProfile(null)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function initAuth() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (cancelled) return

        if (session?.user) {
          setUser(session.user)
          void loadProfile(session.user.id)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    initAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
        void loadProfile(session.user.id)
      } else {
        setUser(null)
        setProfile(null)
      }
      setLoading(false)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  async function logout() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Provider + hook are intentionally in one module for a small app.
 * @see https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/react-refresh-only-export-components.md
 */
// eslint-disable-next-line react-refresh/only-export-components -- colocated useAuth
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
