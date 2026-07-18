import GoogleSignInButton from './GoogleSignInButton'

export const EMAIL_AUTH_INPUT_CLASS =
  'w-full rounded-xl border border-[#847377]/25 bg-white/80 px-4 py-3 text-[#130006] shadow-sm outline-none transition placeholder:text-[#847377]/60 focus:border-[#3d0a21]/40 focus:ring-2 focus:ring-[#d4af37]/25'

export default function EmailAuthFields({
  idPrefix = 'auth',
  compact = false,
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
  onSubmit,
  onGoogleLogin,
  onToggleMode,
  submitLabel,
  signupSubmitLabel,
  toggleSignInLabel = 'Sign in',
  toggleSignupLabel = 'Create an account',
}) {
  const inputClass = compact
    ? 'w-full rounded-xl border border-[#847377]/25 bg-white/80 px-4 py-2.5 text-sm text-[#130006] outline-none transition placeholder:text-[#847377]/60 focus:border-[#3d0a21]/40 focus:ring-2 focus:ring-[#d4af37]/25'
    : EMAIL_AUTH_INPUT_CLASS

  const buttonClass = compact
    ? 'rounded-xl bg-[#3d0a21] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#fdf9f4] transition hover:bg-[#2a0718] disabled:opacity-60'
    : 'rounded-xl bg-[#3d0a21] px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-[#fdf9f4] transition hover:bg-[#2a0718] disabled:opacity-60'

  return (
    <>
      {formError ? (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {formError}
        </p>
      ) : null}

      {formNotice ? (
        <p className="mb-4 rounded-xl border border-[#2d6a4f]/25 bg-[#edf7f1] px-4 py-3 text-sm text-[#1f4334]">
          {formNotice}
        </p>
      ) : null}

      <GoogleSignInButton onClick={onGoogleLogin} disabled={busy} />

      <div className={`${compact ? 'my-5' : 'my-6'} flex items-center gap-3`}>
        <span className="h-px flex-1 bg-[#d4af37]/25" />
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#847377]">
          {compact ? 'or email' : 'or use email'}
        </span>
        <span className="h-px flex-1 bg-[#d4af37]/25" />
      </div>

      <form onSubmit={onSubmit} className={compact ? 'grid gap-3' : 'grid gap-4'}>
        {isSignup && (
          <input
            id={`${idPrefix}-name`}
            className={inputClass}
            placeholder="Full name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
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
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />

        <input
          id={`${idPrefix}-password`}
          className={inputClass}
          placeholder="Password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          required
          minLength={6}
        />

        <button type="submit" disabled={busy} className={buttonClass}>
          {busy
            ? 'Please wait…'
            : isSignup
              ? (signupSubmitLabel ?? 'Sign up with email')
              : (submitLabel ?? 'Sign in with email')}
        </button>
      </form>

      <p className={`${compact ? 'mt-4 text-xs' : 'mt-6 text-sm'} text-center text-[#514347]`}>
        {isSignup ? 'Already have an account?' : 'New here?'}{' '}
        <button
          type="button"
          className="font-semibold text-[#3d0a21] underline-offset-4 hover:underline"
          onClick={onToggleMode}
        >
          {isSignup ? toggleSignInLabel : toggleSignupLabel}
        </button>
      </p>
    </>
  )
}
