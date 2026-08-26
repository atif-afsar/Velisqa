import { useState, useEffect } from 'react'
import { hasConsentDecision, acceptAllConsent, acceptNecessaryOnly } from '../../lib/consent'

/**
 * Super minimal, semi-transparent, non-intrusive cookie consent bar.
 * Designed to look sleek & luxurious without irritating users.
 */
export default function ConsentBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!hasConsentDecision()) {
      const t = setTimeout(() => setVisible(true), 1500)
      return () => clearTimeout(t)
    }
  }, [])

  if (!visible) return null

  const handleAccept = () => {
    acceptAllConsent()
    setVisible(false)
  }

  const handleNecessary = () => {
    acceptNecessaryOnly()
    setVisible(false)
  }

  return (
    <div
      className="fixed bottom-3 left-3 right-3 z-[9999] sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md pointer-events-auto"
      role="dialog"
      aria-label="Cookie consent"
    >
      <div
        className="flex items-center justify-between gap-3 rounded border border-[#D4AF37]/30 bg-[#130006]/85 px-4 py-2.5 shadow-2xl backdrop-blur-md text-white sm:px-5 sm:py-3 transition-all duration-300"
        style={{ animation: 'fadeInUp 0.3s ease-out' }}
      >
        <p className="text-[11px] leading-tight text-white/85 sm:text-xs">
          We use cookies to improve your experience & ads.
        </p>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={handleNecessary}
            className="rounded-sm border border-white/20 px-2.5 py-1 text-[10px] font-medium text-white/70 hover:text-white hover:border-white/40 transition-colors sm:text-xs"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="rounded-sm bg-[#D4AF37] px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#130006] hover:bg-[#e5c34a] shadow-sm transition-all sm:text-xs"
          >
            Accept
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { transform: translateY(12px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  )
}
