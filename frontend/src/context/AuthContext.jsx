import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { savePostSignInIntent } from '../lib/postSignIn'
import { fetchSession, logoutSession } from '../lib/authApi'

// Loaded only when sign-in is required (keeps the auth form out of the initial bundle).
const SignInRequiredModal = lazy(() => import('../Components/Auth/SignInRequiredModal'))

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [signInOpen, setSignInOpen] = useState(false)
  const pendingActionRef = useRef(null)

  /** Re-reads the HttpOnly cookie session from the API. Returns `{ user, profile }`. */
  const refreshSession = useCallback(async () => {
    try {
      const session = await fetchSession()
      setUser(session?.user ?? null)
      setProfile(session?.profile ?? null)
      return session ?? { user: null, profile: null }
    } catch {
      // Network trouble: keep whatever we had rather than signing the visitor out.
      return { user: null, profile: null }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshSession()
  }, [refreshSession])

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
    try {
      await logoutSession()
    } catch {
      // The local state is cleared regardless; the cookie expires server-side.
    }
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
      refreshSession,
    }),
    [user, profile, loading, logout, requireSignIn, signInOpen, closeSignInModal, refreshSession],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
      {signInOpen && (
        <Suspense fallback={null}>
          <SignInRequiredModal open={signInOpen} onClose={closeSignInModal} />
        </Suspense>
      )}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
