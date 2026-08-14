import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function ProductDetailTrust({ soldOut }) {
  const [giftWrapped, setGiftWrapped] = useState(false)

  return (
    <div className="space-y-6 border-y border-[#D4AF37]/15 py-5 font-sans">
      
      {/* Availability Status */}
      <div className="flex items-center gap-2 text-xs">
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
            soldOut ? 'bg-[#c9a75a]/20 text-[#8a6b1f]' : 'bg-emerald-600/15 text-emerald-800'
          }`}
          aria-hidden
        >
          {soldOut ? '—' : '✓'}
        </span>
        <span className={`font-semibold ${soldOut ? 'text-[#8a6b1f]' : 'text-emerald-800'}`}>
          {soldOut ? 'Out of stock — enquire this product on WhatsApp' : 'In stock — ready to ship'}
        </span>
      </div>

      {/* Grid of Trust Badges */}
      <div className="grid grid-cols-2 gap-4 text-xs text-[#514347]">
        <Link to="/refund-cancellation" className="flex items-center gap-2 hover:text-[#3B0D23] transition">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B76E79" strokeWidth="1.5" className="shrink-0">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3 3v5h5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="font-medium">5 Days Return</span>
        </Link>

        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B76E79" strokeWidth="1.5" className="shrink-0">
            <circle cx="12" cy="12" r="10" />
            <path d="m12 6 2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1Z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="font-medium">Lifetime Plating</span>
        </div>

        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B76E79" strokeWidth="1.5" className="shrink-0">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="font-medium">6-Month Warranty</span>
        </div>

        <Link to="/authenticity" className="flex items-center gap-2 hover:text-[#3B0D23] transition">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B76E79" strokeWidth="1.5" className="shrink-0">
            <path d="M6 3h12l4 6-10 12L2 9Z" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M11 3 8 9l4 12 4-12-3-6" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 9h20" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="font-medium">Certified Authenticity</span>
        </Link>
      </div>

      {/* Gift Wrap Option */}
      <div className="flex items-center gap-2 border-t border-[#D4AF37]/10 pt-4 text-xs font-medium text-[#1A1A1A]">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={giftWrapped}
            onChange={(e) => {
              setGiftWrapped(e.target.checked)
              if (e.target.checked) {
                localStorage.setItem('velisqa:gift_wrap', 'true')
              } else {
                localStorage.removeItem('velisqa:gift_wrap')
              }
            }}
            className="h-4 w-4 rounded border-gray-300 text-[#3B0D23] focus:ring-[#3B0D23]"
          />
          <span>Is this a <span className="text-[#B76E79] font-bold">Gift?</span> 🎁 Wrap it for just ₹50</span>
        </label>
      </div>

      {/* Offers For You Section */}
      <div className="border-t border-[#D4AF37]/10 pt-4 space-y-2">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#8a8a8a]">Offers For You (Can be applied at checkout)</h4>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-[#D4AF37]/20 bg-[#F8F6F3]/50 p-2.5 text-left space-y-0.5">
            <span className="font-mono text-[10px] font-bold text-emerald-800 uppercase bg-emerald-50 px-1.5 py-0.5 rounded">SAVE10</span>
            <p className="text-[11px] font-semibold text-[#1A1A1A]">10% off your purchase</p>
            <p className="text-[9px] text-[#8a8a8a]">Use coupon on shopping bag page</p>
          </div>
          <div className="rounded-lg border border-[#D4AF37]/20 bg-[#F8F6F3]/50 p-2.5 text-left space-y-0.5">
            <span className="font-mono text-[10px] font-bold text-emerald-800 uppercase bg-emerald-50 px-1.5 py-0.5 rounded">FREE50</span>
            <p className="text-[11px] font-semibold text-[#1A1A1A]">₹50 discount instantly</p>
            <p className="text-[9px] text-[#8a8a8a]">Applicable on all products</p>
          </div>
        </div>
      </div>

    </div>
  )
}
