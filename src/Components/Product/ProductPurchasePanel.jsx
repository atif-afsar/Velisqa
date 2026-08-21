import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { useWishlist } from '../../context/WishlistContext'
import { getProductStock } from '../../lib/cartStock'
import QuantityStepper from '../Cart/QuantityStepper'
import BuyNowButton from '../WhatsApp/BuyNowButton'

export default function ProductPurchasePanel({
  product,
  productUrl,
  soldOut,
  quantity,
  onQuantityChange,
}) {
  const { addToCart, itemCount } = useCart()
  const { isWishlisted, toggleWishlist } = useWishlist()
  const [adding, setAdding] = useState(false)
  const stock = getProductStock(product)
  const wishlisted = isWishlisted(product.id)
  const [internalQuantity, setInternalQuantity] = useState(1)
  const resolvedQuantity = quantity ?? internalQuantity
  const setQuantity = onQuantityChange ?? setInternalQuantity

  // Pincode validation state
  const [pincodeInput, setPincodeInput] = useState(() => {
    return localStorage.getItem('velisqa:delivery_pincode') || '';
  })
  const [checkingPincode, setCheckingPincode] = useState(false)
  const [pincodeStatus, setPincodeStatus] = useState(null) // 'available' | 'invalid'
  const [pincodeCity, setPincodeCity] = useState('')
  const [pincodeState, setPincodeState] = useState('')

  const expectedDate = useMemo(() => {
    const today = new Date()
    const start = new Date(today)
    start.setDate(today.getDate() + 3)
    const end = new Date(today)
    end.setDate(today.getDate() + 5)
    const options = { day: 'numeric', month: 'short' }
    return `${start.toLocaleDateString('en-IN', options)} – ${end.toLocaleDateString('en-IN', options)}`
  }, [])

  async function checkPincode(pinCodeVal) {
    const pin = pinCodeVal || pincodeInput
    if (pin.length !== 6) return
    setCheckingPincode(true)
    setPincodeStatus(null)
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`)
      const resData = await res.json()
      if (resData && resData[0] && resData[0].Status === 'Success') {
        const postOffice = resData[0].PostOffice[0]
        setPincodeCity(postOffice.District)
        setPincodeState(postOffice.State)
        setPincodeStatus('available')
      } else {
        setPincodeStatus('invalid')
      }
    } catch {
      setPincodeStatus('available')
    } finally {
      setCheckingPincode(false)
    }
  }

  // Auto-check saved pincode on mount
  useEffect(() => {
    const savedPin = localStorage.getItem('velisqa:delivery_pincode')
    if (savedPin && /^\d{6}$/.test(savedPin)) {
      void checkPincode(savedPin)
    }
  }, [])

  function handleAdd() {
    if (adding || soldOut) return
    setAdding(true)
    addToCart(product, resolvedQuantity)
    window.setTimeout(() => setAdding(false), 400)
  }

  if (soldOut) {
    return (
      <div className="mt-6 space-y-3">
        <BuyNowButton
          product={product}
          productUrl={productUrl}
          soldOut
          className="w-full px-4 py-2 rounded-sm"
        />
        <button
          type="button"
          onClick={() => toggleWishlist(product)}
          aria-pressed={wishlisted}
          className={`tap-target flex w-full h-10 items-center justify-center gap-1.5 rounded-sm border text-[11px] font-bold uppercase tracking-[0.08em] transition ${
            wishlisted
              ? 'border-[#3d0a21]/30 bg-[#3d0a21]/5 text-[#3d0a21]'
              : 'border-[#130006]/15 bg-white text-[#514347] hover:border-[#3d0a21]/25'
          }`}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill={wishlisted ? 'currentColor' : 'none'}
            aria-hidden
          >
            <path
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
          {wishlisted ? 'Saved to wishlist' : 'Save to wishlist'}
        </button>
      </div>
    )
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Qty
        </span>
        <QuantityStepper value={resolvedQuantity} max={stock} onChange={setQuantity} />
        {stock <= 3 && (
          <span className="text-xs font-bold text-amber-700">Only {stock} left in stock</span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <BuyNowButton
          product={product}
          productUrl={productUrl}
          variant="outline"
          className="h-11 w-full rounded-lg text-sm font-bold shadow-xs"
        >
          Buy now
        </BuyNowButton>
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding}
          className="tap-target flex h-11 w-full items-center justify-center rounded-lg bg-slate-900 text-sm font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#8B6914] active:scale-[0.99] disabled:opacity-60 shrink-0 font-sans"
        >
          {adding ? 'Adding…' : 'Add to bag'}
        </button>
      </div>

      {itemCount > 0 && (
        <Link
          to="/cart"
          className="tap-target flex w-full h-11 items-center justify-center gap-2 rounded-lg border border-slate-900 bg-white text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 transition hover:bg-[#F5EFE6] hover:border-[#C9A96E]"
        >
          View bag
          <span className="rounded-full bg-[#8B6914] px-2 py-0.5 text-xs text-white">
            {itemCount}
          </span>
        </Link>
      )}

      {/* PINCODE CHECKER */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 mt-4 space-y-3 shadow-xs w-full min-w-0">
        <h4 className="font-sans text-xs font-bold text-slate-900 uppercase tracking-wider">Check Delivery Availability</h4>
        <div className="flex gap-2 w-full min-w-0">
          <input
            type="text"
            inputMode="numeric"
            placeholder="Enter 6-digit Pincode"
            value={pincodeInput}
            onChange={(e) => setPincodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 outline-none focus:border-[#C9A96E] focus:ring-1 focus:ring-[#C9A96E]"
          />
          <button
            type="button"
            onClick={checkPincode}
            disabled={pincodeInput.length !== 6 || checkingPincode}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#8B6914] disabled:opacity-50 transition shrink-0 shadow-xs"
          >
            {checkingPincode ? 'Checking…' : 'Check'}
          </button>
        </div>

        {pincodeStatus === 'available' && (
          <div className="text-xs text-emerald-800 font-semibold space-y-0.5 mt-2">
            <p>✓ Delivery available to {pincodeCity}, {pincodeState}</p>
            <p className="text-xs text-slate-600 font-normal">Estimated delivery: {expectedDate}</p>
          </div>
        )}

        {pincodeStatus === 'invalid' && (
          <p className="text-xs text-red-700 font-semibold mt-2">
            Sorry, we currently don't deliver to this pincode.
          </p>
        )}
      </div>
    </div>
  )
}
