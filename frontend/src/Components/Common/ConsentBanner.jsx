import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { hasConsentDecision, acceptAllConsent, acceptNecessaryOnly } from '../../lib/consent'

/**
 * Cookie consent.
 * - Phones/tablets: a strip under the header whose height is reserved before first paint
 *   (inline script in index.html adds html.consent-open), so it never covers content or CTAs
 *   and causes no layout shift. Desktop: a small card bottom-left.
 * - Rendered straight away in its final position, no fade. 13px text, 44px buttons, Accept filled.
 */
export default function ConsentBanner() {
  const [visible, setVisible] = useState(() => typeof window !== 'undefined' && !hasConsentDecision())

  useEffect(() => {
    document.documentElement.classList.toggle('consent-open', visible)
  }, [visible])

  if (!visible) return null

  const handleAccept = () => {
    acceptAllConsent()
    setVisible(false)
  }

  const handleDecline = () => {
    acceptNecessaryOnly()
    setVisible(false)
  }

  return (
    <div className="consent-banner fixed z-[45] lg:z-[60]" role="region" aria-label="Cookie consent">
      <div className="flex h-full items-center gap-3 border-b border-white/10 bg-ink px-4 text-white lg:h-auto lg:flex-wrap lg:rounded-lg lg:border lg:px-5 lg:py-4 lg:shadow-2xl">
        <p className="min-w-0 flex-1 text-[0.8125rem] leading-snug text-white/90">
          We use cookies for a better experience and offers.{' '}
          <Link to="/privacy" className="underline underline-offset-2 hover:text-white">
            Privacy
          </Link>
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={handleDecline} className="min-h-11 px-2.5 text-[0.8125rem] font-medium text-white/80 hover:text-white hover:underline">
            Decline
          </button>
          <button type="button" onClick={handleAccept} className="min-h-11 rounded-md bg-white px-4 text-[0.8125rem] font-semibold text-ink hover:bg-white/90">
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
