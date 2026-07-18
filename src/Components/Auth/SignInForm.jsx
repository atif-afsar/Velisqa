import EmailAuthFields from './EmailAuthFields'
import { useEmailAuthForm } from '../../hooks/useEmailAuthForm'

export default function SignInForm({ onSuccess, idPrefix = 'signin' }) {
  const auth = useEmailAuthForm({ onSignedIn: onSuccess })

  return (
    <EmailAuthFields
      idPrefix={idPrefix}
      compact
      isSignup={auth.isSignup}
      fullName={auth.fullName}
      setFullName={auth.setFullName}
      email={auth.email}
      setEmail={auth.setEmail}
      password={auth.password}
      setPassword={auth.setPassword}
      busy={auth.busy}
      formError={auth.formError}
      formNotice={auth.formNotice}
      onSubmit={auth.handleEmailAuth}
      onGoogleLogin={auth.handleGoogleLogin}
      onToggleMode={auth.toggleMode}
      signupSubmitLabel="Create account"
      submitLabel="Sign in"
      toggleSignInLabel="Sign in"
      toggleSignupLabel="Create account"
    />
  )
}
