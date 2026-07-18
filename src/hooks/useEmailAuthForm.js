import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { enrichAuthError, signInWithGoogle } from '../lib/auth'

export function useEmailAuthForm({ onSignedIn } = {}) {
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
          setFormError(error.message)
          return
        }

        setFormNotice('Account created. You can sign in now.')
        setIsSignup(false)
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: normalizedPassword,
        })

        if (error) {
          setFormError(error.message)
          return
        }

        onSignedIn?.()
      }
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
