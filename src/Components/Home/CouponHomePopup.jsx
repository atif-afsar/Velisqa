import { useEffect, useState } from 'react'

export default function CouponHomePopup() {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Check if user has already dismissed this coupon popup
    const dismissed = localStorage.getItem('velisqa:rakhi_dismissed') === 'true'
    if (dismissed) return

    // Show popup after 2 seconds delay for a premium entry
    const timer = setTimeout(() => {
      setIsOpen(true)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  const handleCopyCode = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText('RAKHI10').then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }).catch(() => {
          fallbackCopyText('RAKHI10')
        })
      } else {
        fallbackCopyText('RAKHI10')
      }
    } catch (err) {
      fallbackCopyText('RAKHI10')
    }
  }

  const fallbackCopyText = (text) => {
    const textArea = document.createElement("textarea")
    textArea.value = text
    textArea.style.top = "0"
    textArea.style.left = "0"
    textArea.style.position = "fixed"
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    try {
      document.execCommand('copy')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err)
    }
    document.body.removeChild(textArea)
  }

  const handleDismiss = () => {
    setIsOpen(false)
    localStorage.setItem('velisqa:rakhi_dismissed', 'true')
  }

  if (!isOpen) return null

  return (
    <div className="fixed bottom-6 right-6 z-[100] max-w-[320px] w-[calc(100vw-48px)] bg-white/95 backdrop-blur-md border border-[#D4AF37]/30 rounded-2xl p-4 shadow-[0_12px_36px_rgba(59,13,35,0.08)] transition-all duration-500 ease-out transform translate-y-0 opacity-100 flex gap-3.5 items-start">
      {/* Sparkle Icon */}
      <div className="w-8 h-8 rounded-full bg-[#3B0D23]/5 flex items-center justify-center shrink-0 text-[#D4AF37] mt-0.5 animate-pulse">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
        </svg>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#D4AF37]">Rakhi Festival Offer</p>
        <h4 className="font-serif text-sm font-bold text-[#3B0D23] mt-0.5 leading-snug">Get 10% Off</h4>
        <p className="text-[11px] text-[#514347] mt-1 leading-relaxed">Enjoy extra savings on all orders above ₹799.</p>
        
        {/* Coupon Code Copier */}
        <div className="flex items-center gap-1.5 mt-3">
          <button
            onClick={handleCopyCode}
            className="flex items-center justify-between gap-2.5 bg-[#3B0D23]/5 hover:bg-[#3B0D23]/10 border border-[#3B0D23]/10 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-[#3B0D23] transition-colors select-all duration-200 cursor-pointer shrink-0"
            title="Click to copy code"
          >
            <span>RAKHI10</span>
            <svg className="w-3.5 h-3.5 text-[#3B0D23]/50" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
            </svg>
          </button>
          
          {copied && (
            <span className="text-[10px] font-bold text-emerald-600 animate-fade-in">
              ✓ Copied
            </span>
          )}
        </div>
      </div>

      {/* Dismiss Button */}
      <button
        onClick={handleDismiss}
        className="w-5 h-5 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition shrink-0 cursor-pointer text-sm"
        aria-label="Dismiss coupon popup"
      >
        ×
      </button>
    </div>
  )
}
