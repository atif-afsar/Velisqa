import { useState } from 'react'
import { Link } from 'react-router-dom'
import { hasConsentDecision, acceptAllConsent, acceptNecessaryOnly } from '../../lib/consent'

/**
 * Cookie consent bar.
 * - Rendered straight away in its final position (no delayed fade over page headings).
 * - Sits above the tab bar AND any sticky add-to-bag / pay bar (`--sticky-cta-height`), so it never
 *   covers a call-to-action. Desktop: bottom-left, clear of third-party chat bubbles on the right.
 * - 13px+ text, 44px tap targets, Accept is the filled primary action.
 */
export default function ConsentBanner() {
  // Read on mount only (client-side); prerendered HTML never contains the banner.
  const [visible, setVisible] = useState(() => typeof window !== 'undefined' && !hasConsentDecision())

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
    <div
      className="consent-banner fixed left-3 right-3 z-[60] sm:right-auto sm:max-w-[26rem] lg:left-6"
      role="region"
      aria-label="Cookie consent"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-white/10 bg-ink px-4 py-3 text-white shadow-2xl">
        <p className="min-w-0 flex-1 basis-56 text-[0.8125rem] leading-snug text-white/90">
          We use cookies for a better experience and offers.{' '}
          <Link to="/privacy" className="underline underline-offset-2 hover:text-white">
            Privacy
          </Link>
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={handleDecline}
            className="min-h-11 px-3 text-[0.8125rem] font-medium text-white/80 underline-offset-4 hover:text-white hover:underline"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={handleAccept}
            className="min-h-11 rounded-md bg-white px-5 text-[0.8125rem] font-semibold text-ink transition-colors hover:bg-white/90"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
