import { CONTACT_EMAIL } from '../Components/SEO/siteConfig'

const TIMEOUT_MS = 12_000
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * Newsletter sign-up. Sent to the store inbox via FormSubmit (same channel as
 * order notifications), so no extra backend is required.
 */
export async function subscribeNewsletter(email, source = 'website') {
  const clean = String(email || '').trim()
  if (!EMAIL_RE.test(clean)) return { ok: false, error: 'Please enter a valid email address.' }

  const body = new FormData()
  body.append('email', clean)
  body.append('source', source)
  body.append('_subject', 'Velisqa newsletter sign-up')
  body.append('_template', 'table')
  body.append('_captcha', 'false')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(CONTACT_EMAIL)}`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body,
      signal: controller.signal,
    })
    const data = await response.json().catch(() => null)
    const success = response.ok && (data?.success === true || data?.success === 'true')
    return success ? { ok: true } : { ok: false, error: 'We could not sign you up just now. Please try again.' }
  } catch {
    return { ok: false, error: 'Network error — please check your connection and try again.' }
  } finally {
    clearTimeout(timer)
  }
}
