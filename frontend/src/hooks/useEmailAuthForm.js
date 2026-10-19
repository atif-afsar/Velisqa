import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { enrichAuthError, signInWithGoogle } from '../lib/auth'
import { loginWithEmail, registerWithEmail } from '../lib/authApi'
import { analytics } from '../lib/analytics'

export function useEmailAuthForm({ onSignedIn } = {}) {
  const { refreshSession } = useAuth()
  const [isSignup, setIsSignup] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [formNotice, setFormNotice] = useState('')

  async function handleEmailAuth(event) {
    event.preventDefault()
    setBusy(true)
    setFormError('')
    setFormNotice('')

    const normalizedEmail = email.trim().toLowerCase()
    const normalizedPassword = password.trim()

    try {
      if (isSignup) {
        await registerWithEmail({ email: normalizedEmail, password: normalizedPassword, fullName: fullName.trim() })
        analytics.signUp('email')
        setFormNotice('Account created. You can sign in now.')
        setIsSignup(false)
      } else {
        await loginWithEmail({ email: normalizedEmail, password: normalizedPassword })
        await refreshSession()
        analytics.login('email')
        onSignedIn?.()
      }
    } catch (error) {
      setFormError(error?.message || 'Sign-in failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function handleGoogleLogin() {
    setBusy(true)
    setFormError('')
    setFormNotice('')

    try {
      await signInWithGoogle()
    } catch (err) {
      const friendly = enrichAuthError(err)
      setFormError(friendly.message)
      setBusy(false)
    }
  }

  function toggleMode() {
    setIsSignup((current) => !current)
    setFormError('')
    setFormNotice('')
  }

  return {
    isSignup,
    fullName,
    setFullName,
    email,
    setEmail,
    password,
    setPassword,
    busy,
    formError,
    formNotice,
    handleEmailAuth,
    handleGoogleLogin,
    toggleMode,
  }
}
