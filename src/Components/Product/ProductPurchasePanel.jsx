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
          className="w-full px-6 py-3.5"
        />
        <button
          type="button"
          onClick={() => toggleWishlist(product)}
          aria-pressed={wishlisted}
          className={`tap-target flex w-full min-h-[46px] items-center justify-center gap-1.5 rounded-full border text-[11px] font-bold uppercase tracking-[0.08em] transition ${
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
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#847377]">
          Qty
        </span>
        <QuantityStepper value={resolvedQuantity} max={stock} onChange={setQuantity} />
        {stock <= 3 && (
          <span className="text-xs font-medium text-[#6f334a]">Only {stock} left in stock</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <BuyNowButton
          product={product}
          productUrl={productUrl}
          variant="outline"
          className="min-h-[46px] w-full"
        >
          Buy now
        </BuyNowButton>
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding}
          className="tap-target flex min-h-[46px] w-full items-center justify-center rounded-lg bg-[#3B0D23] text-xs font-bold uppercase tracking-[0.1em] text-white transition hover:bg-[#2A0718] disabled:opacity-60 shrink-0 font-sans"
        >
          {adding ? 'Adding…' : 'Add to bag'}
        </button>
      </div>

      {itemCount > 0 && (
        <Link
          to="/cart"
          className="tap-target flex w-full items-center justify-center gap-2 rounded-full border border-[#3d0a21]/20 py-2.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[#3d0a21] transition hover:bg-[#3d0a21]/5"
        >
          View bag
          <span className="rounded-full bg-[#3d0a21] px-2 py-0.5 text-[10px] text-[#e9c349]">
            {itemCount}
          </span>
        </Link>
      )}

      {/* PINCODE CHECKER */}
      <div className="rounded-xl border border-[#D4AF37]/15 bg-white p-4 mt-4 space-y-3 shadow-sm">
        <h4 className="font-serif text-xs font-semibold text-[#3B0D23] uppercase tracking-[0.1em]">Check Delivery</h4>
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            placeholder="Enter 6-digit Pincode"
            value={pincodeInput}
            onChange={(e) => setPincodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="flex-1 rounded-lg border border-[#3B0D23]/10 px-3.5 py-2 text-xs text-[#1A1A1A] outline-none focus:border-[#3B0D23]/30"
          />
          <button
            type="button"
            onClick={checkPincode}
            disabled={pincodeInput.length !== 6 || checkingPincode}
            className="rounded-lg bg-[#3B0D23] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-white hover:bg-[#2A0718] disabled:opacity-50 transition shrink-0"
          >
            {checkingPincode ? 'Checking…' : 'Check'}
          </button>
        </div>

        {pincodeStatus === 'available' && (
          <div className="text-xs text-emerald-800 font-medium space-y-0.5 mt-2">
            <p>✓ Delivery available to {pincodeCity}, {pincodeState}</p>
            <p className="text-[10px] text-[#514347]">Estimated delivery: {expectedDate}</p>
          </div>
        )}

        {pincodeStatus === 'invalid' && (
          <p className="text-xs text-red-700 font-medium mt-2">
            Sorry, we currently don't deliver to this pincode.
          </p>
        )}
      </div>
    </div>
  )
}
