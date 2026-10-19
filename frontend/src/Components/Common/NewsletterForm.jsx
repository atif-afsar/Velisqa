import { useId, useState } from 'react'
import { subscribeNewsletter } from '../../lib/newsletter'
import { ArrowRightIcon } from '../UI/Icons'

/** Email capture with inline status. `tone="dark"` for use on ink backgrounds. */
export default function NewsletterForm({ source = 'website', tone = 'light', className = '' }) {
  const id = useId()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | done | error
  const [message, setMessage] = useState('')
  const dark = tone === 'dark'

  async function handleSubmit(event) {
    event.preventDefault()
    if (status === 'sending') return
    setStatus('sending')
    const result = await subscribeNewsletter(email, source)
    if (result.ok) {
      setStatus('done')
      setMessage('Thank you — you are on the list.')
      setEmail('')
    } else {
      setStatus('error')
      setMessage(result.error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={className} noValidate>
      <label htmlFor={id} className="sr-only">
        Email address
      </label>
      <div className={`flex items-center border-b ${dark ? 'border-white/40 focus-within:border-white' : 'border-ink/40 focus-within:border-ink'}`}>
        <input
          id={id}
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email address"
          className={`min-h-12 min-w-0 flex-1 bg-transparent text-base outline-none ${
            dark ? 'text-white placeholder:text-white/50' : 'text-ink placeholder:text-muted'
          }`}
        />
        <button
          type="submit"
          disabled={status === 'sending'}
          className={`grid h-12 w-12 place-items-center transition-opacity hover:opacity-60 disabled:opacity-40 ${dark ? 'text-white' : 'text-ink'}`}
          aria-label="Subscribe"
        >
          <ArrowRightIcon size={20} />
        </button>
      </div>
      <p
        role="status"
        className={`mt-2 min-h-5 text-xs ${status === 'error' ? (dark ? 'text-red-300' : 'text-danger') : dark ? 'text-white/70' : 'text-muted'}`}
      >
        {message}
      </p>
    </form>
  )
}
