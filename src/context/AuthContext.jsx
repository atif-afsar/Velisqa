import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import SignInRequiredModal from '../Components/Auth/SignInRequiredModal'
import { savePostSignInIntent } from '../lib/postSignIn'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [signInOpen, setSignInOpen] = useState(false)
  const pendingActionRef = useRef(null)

  async function loadProfile(sessionUser) {
    const userId = typeof sessionUser === 'string' ? sessionUser : sessionUser.id
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()

    if (!error && data) {
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
          void loadProfile(session.user)
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
        void loadProfile(session.user)
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

  useEffect(() => {
    if (!user || !pendingActionRef.current) return

    const action = pendingActionRef.current
    pendingActionRef.current = null
    setSignInOpen(false)
    queueMicrotask(() => action())
  }, [user])

  const closeSignInModal = useCallback(() => {
    pendingActionRef.current = null
    setSignInOpen(false)
  }, [])

  const requireSignIn = useCallback(
    (action, intent = {}) => {
      const returnTo = intent.returnTo || `${window.location.pathname}${window.location.search}`

      savePostSignInIntent({
        returnTo,
        openCheckout: Boolean(intent.openCheckout),
      })

      if (loading) return false
      if (user) {
        action()
        return true
      }
      pendingActionRef.current = action
      setSignInOpen(true)
      return false
    },
    [user, loading],
  )

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    pendingActionRef.current = null
    setSignInOpen(false)
  }, [])

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      logout,
      requireSignIn,
      signInOpen,
      closeSignInModal,
    }),
    [user, profile, loading, logout, requireSignIn, signInOpen, closeSignInModal],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
      <SignInRequiredModal open={signInOpen} onClose={closeSignInModal} />
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- colocated useAuth
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
