import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import QuantityStepper from '../Components/Cart/QuantityStepper'
import ProductCard from '../Components/Product/ProductCard'
import SEOHead from '../Components/SEO/SEOHead'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useProducts } from '../hooks/useProducts'
import { formatInr, getCartLineSubtotal, getProductStock, isProductSoldOut } from '../lib/cartStock'
import { supabase } from '../lib/supabaseClient'

const VALID_COUPONS = ['SAVE10', 'VELISQA5', 'FREE50']

function getCouponDiscount(code, subtotal) {
  const cleanCode = String(code || '').toUpperCase().trim()
  if (cleanCode === 'SAVE10') return Math.round(subtotal * 0.10)
  if (cleanCode === 'VELISQA5') return Math.round(subtotal * 0.05)
  if (cleanCode === 'FREE50') return Math.min(50, subtotal)
  return 0
}

export default function Cart() {
  const navigate = useNavigate()
  const {
    items,
    cartTotal,
    stockIssues,
    syncing,
    setQuantity,
    removeFromCart,
    clearCart,
    syncStockFromServer,
  } = useCart()

  const { user } = useAuth()
  const { products } = useProducts()
  const [localIssues, setLocalIssues] = useState([])
  const [couponOpen, setCouponOpen] = useState(false)

  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(() => {
    return localStorage.getItem('velisqa:applied_coupon') || ''
  })
  const [couponError, setCouponError] = useState('')
  const [giftWrap, setGiftWrap] = useState(() => {
    return localStorage.getItem('velisqa:gift_wrap') === 'true'
  })

  const suggestedProducts = products
    .filter((product) => !isProductSoldOut(product))
    .slice(0, 4)

  useEffect(() => {
    let cancelled = false
    syncStockFromServer().then((result) => {
      if (!cancelled) setLocalIssues(result?.issues ?? [])
    })
    return () => {
      cancelled = true
    }
  }, [])

  const issues = localIssues.length ? localIssues : stockIssues
  const canCheckout = items.length > 0 && issues.length === 0 && !syncing

  // Calculated pricing
  const subtotal = cartTotal
  
  // Total MRP (1.4x of sale price)
  const totalMrp = useMemo(() => {
    return items.reduce((sum, item) => {
      const itemMrp = item.mrp || Math.round(item.price * 1.4)
      return sum + (itemMrp * item.quantity)
    }, 0)
  }, [items])

  const discountOnMrp = totalMrp - subtotal

  const [couponDiscountVal, setCouponDiscountVal] = useState(0)

  const giftWrapFee = giftWrap ? 50 : 0
  const finalTotal = Math.max(0, subtotal - couponDiscountVal + giftWrapFee)
  const totalSavings = discountOnMrp + couponDiscountVal

  const handleGiftWrapChange = (e) => {
    const checked = e.target.checked
    setGiftWrap(checked)
    if (checked) {
      localStorage.setItem('velisqa:gift_wrap', 'true')
    } else {
      localStorage.removeItem('velisqa:gift_wrap')
    }
  }

  // Revalidate and update discount dynamically when subtotal changes
  useEffect(() => {
    if (!appliedCoupon) {
      setCouponDiscountVal(0)
      return
    }

    async function revalidate() {
      try {
        const { data: coupon } = await supabase
          .from('coupons')
          .select('*')
          .eq('code', appliedCoupon)
          .eq('active', true)
          .maybeSingle()

        if (coupon && subtotal >= Number(coupon.min_subtotal)) {
          let computedDiscount = 0
          if (coupon.discount_type === 'percentage') {
            computedDiscount = Math.round(subtotal * (Number(coupon.discount_value) / 100.0))
          } else if (coupon.discount_type === 'fixed') {
            computedDiscount = Math.min(Number(coupon.discount_value), subtotal)
          }
          setCouponDiscountVal(computedDiscount)
          localStorage.setItem('velisqa:applied_coupon_discount', String(computedDiscount))
        } else {
          setAppliedCoupon('')
          setCouponDiscountVal(0)
          localStorage.removeItem('velisqa:applied_coupon')
          localStorage.removeItem('velisqa:applied_coupon_discount')
        }
      } catch {
        const savedDisc = Number(localStorage.getItem('velisqa:applied_coupon_discount') || 0)
        setCouponDiscountVal(savedDisc)
      }
    }

    revalidate()
  }, [appliedCoupon, subtotal])

  async function handleApplyCouponCode(code) {
    setCouponError('')
    const cleanCode = String(code || '').toUpperCase().trim()
    if (!cleanCode) return

    try {
      const { data: coupon, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', cleanCode)
        .eq('active', true)
        .maybeSingle()

      if (error || !coupon) {
        setCouponError("This coupon isn't valid or has expired.")
        return
      }

      if (subtotal < Number(coupon.min_subtotal)) {
        setCouponError(`This coupon requires a minimum subtotal of ${formatInr(coupon.min_subtotal)}`)
        return
      }

      let computedDiscount = 0
      if (coupon.discount_type === 'percentage') {
        computedDiscount = Math.round(subtotal * (Number(coupon.discount_value) / 100.0))
      } else if (coupon.discount_type === 'fixed') {
        computedDiscount = Math.min(Number(coupon.discount_value), subtotal)
      }

      setAppliedCoupon(cleanCode)
      setCouponDiscountVal(computedDiscount)
      localStorage.setItem('velisqa:applied_coupon', cleanCode)
      localStorage.setItem('velisqa:applied_coupon_discount', String(computedDiscount))
      setCouponInput('')
      setCouponOpen(false)
    } catch {
      setCouponError("Unable to validate coupon. Please try again.")
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon('')
    localStorage.removeItem('velisqa:applied_coupon')
    setCouponError('')
  }

  function handleCheckoutClick() {
    if (!canCheckout) return
    navigate('/checkout')
  }

  return (
    <>
      <SEOHead
        title="Shopping Bag | Velisqa"
        description="Review your premium shopping bag and check out securely."
        canonicalPath="/cart"
      />
      <main className="page-offset-nav min-h-[75vh] bg-[#F8F6F3] text-[#1A1A1A] pb-16 font-sans">
        <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8">
          
          <h1 className="sr-only">Shopping Bag</h1>

          {items.length === 0 ? (
            <div className="mt-12 text-center py-16 bg-white rounded-2xl border border-[#D4AF37]/10 shadow-sm max-w-lg mx-auto">
              <span className="text-4xl">🛍️</span>
              <p className="text-sm font-medium mt-4 text-[#514347]">Your bag is currently empty.</p>
              <Link
                to="/collections"
                className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-[#3B0D23] px-6 text-xs font-bold uppercase tracking-[0.1em] text-white transition hover:bg-[#2A0718]"
              >
                Browse Collections
              </Link>
            </div>
          ) : (
            <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_420px] items-start">
              
              {/* LEFT COLUMN: GIVA-style Product Items */}
              <div className="space-y-4">
                
                {items.map((line) => {
                  const stock = getProductStock({ stock: line.stock })
                  const lineIssue = issues.find((i) => i.line.productId === line.productId)
                  const comparePrice = line.mrp || Math.round(line.price * 1.4)

                  return (
                    <div key={line.productId} className="rounded-xl border border-[#D4AF37]/10 bg-white p-4 shadow-sm space-y-4 relative">
                      
                      {/* Close / Remove button top right */}
                      <button
                        type="button"
                        onClick={() => removeFromCart(line.productId)}
                        className="absolute right-4 top-4 text-gray-400 hover:text-red-600 transition text-lg"
                        aria-label="Remove item"
                      >
                        ✕
                      </button>

                      <div className="flex gap-4">
                        {/* Product Image */}
                        <Link
                          to={`/product/${line.productId}`}
                          className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-[#F8F6F3] border border-black/5"
                        >
                          {line.imageUrl ? (
                            <img
                              src={line.imageUrl}
                              alt={line.name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[10px] text-[#847377]">
                              No Image
                            </div>
                          )}
                        </Link>

                        {/* Product details */}
                        <div className="min-w-0 flex-1 space-y-1">
                          <Link
                            to={`/product/${line.productId}`}
                            className="font-serif text-sm font-bold text-[#1A1A1A] hover:text-[#3B0D23] transition-colors line-clamp-1 pr-6"
                          >
                            {line.name}
                          </Link>
                          
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-bold text-[#3B0D23]">{formatInr(line.price)}</span>
                            <span className="text-xs text-gray-400 line-through">{formatInr(comparePrice)}</span>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-medium">
                            <span>🚚</span>
                            <span>Free Delivery</span>
                          </div>

                          <div className="flex items-center gap-2 pt-1 text-[11px] text-[#8a8a8a]">
                            <span>Style:</span>
                            <span className="font-semibold text-[#1A1A1A] bg-gray-100 px-2 py-0.5 rounded">Single</span>
                          </div>

                          {lineIssue && (
                            <div className="mt-2 rounded border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] text-amber-950">
                              {lineIssue.message}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Badges footer */}
                      <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100 pt-3 text-[10px] text-center font-medium text-[#8a8a8a]">
                        <div>5-Day Returns</div>
                        <div>6-Month Warranty</div>
                        <div>Lifetime Plating Service</div>
                      </div>

                    </div>
                  )
                })}

                {/* Add a Gift wrap option */}
                <div className="rounded-xl border border-[#D4AF37]/10 bg-white p-4 shadow-sm flex items-center">
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-[#1A1A1A]">
                    <input
                      type="checkbox"
                      checked={giftWrap}
                      onChange={handleGiftWrapChange}
                      className="h-4 w-4 rounded border-gray-300 text-[#3B0D23] focus:ring-[#3B0D23]"
                    />
                    <span>Add a <span className="text-[#B76E79]">gift wrap</span> &amp; a message with this item (+ ₹50)</span>
                  </label>
                </div>


                {/* Suggestions Block */}
                {suggestedProducts.length > 0 && (
                  <div className="pt-6">
                    <h3 className="font-serif text-lg font-semibold text-[#3B0D23] mb-4">
                      You Might Also Like
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {suggestedProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* RIGHT COLUMN: GIVA-style Price Summary & Coupons */}
              <div className="space-y-4">
                
                {/* Apply Coupon Card */}
                <button
                  type="button"
                  onClick={() => setCouponOpen(true)}
                  className="w-full rounded-xl border border-[#D4AF37]/10 bg-white p-4 shadow-sm flex items-center justify-between hover:bg-[#F8F6F3]/50 transition text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🏷️</span>
                    <div>
                      <p className="text-xs font-bold text-[#1A1A1A]">Apply Coupon</p>
                      {appliedCoupon && <p className="text-[10px] text-emerald-800 font-semibold mt-0.5">✓ Coupon "{appliedCoupon}" applied</p>}
                    </div>
                  </div>
                  <span className="text-gray-400 text-lg">›</span>
                </button>

                {/* Redeem Gift Card Card */}
                <button
                  type="button"
                  className="w-full rounded-xl border border-[#D4AF37]/10 bg-white p-4 shadow-sm flex items-center justify-between hover:bg-[#F8F6F3]/50 transition text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🎁</span>
                    <div>
                      <p className="text-xs font-bold text-[#1A1A1A]">Redeem Gift Card</p>
                    </div>
                  </div>
                  <span className="text-gray-400 text-lg">›</span>
                </button>

                {/* Rewards Info Line */}
                <div className="rounded-xl border border-[#D4AF37]/10 bg-[#F8F6F3]/50 p-3 shadow-none flex items-center justify-between text-xs font-semibold text-[#514347]">
                  <span>You will earn 5% Velisqa Crown Rewards</span>
                  <span className="text-[#3B0D23]">{formatInr(Math.round(finalTotal * 0.05))}</span>
                </div>

                {/* PRICE DETAILS CARD */}
                <div className="rounded-xl border border-[#D4AF37]/10 bg-white p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#8a8a8a] border-b border-gray-100 pb-2">
                    PRICE DETAILS ({items.reduce((sum, item) => sum + item.quantity, 0)} ITEMS)
                  </h3>

                  <div className="space-y-3 text-xs text-[#514347]">
                    <div className="flex justify-between">
                      <span>Total MRP</span>
                      <span className="font-semibold tabular-nums">{formatInr(totalMrp)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-800 font-medium">
                      <span>Discount on MRP</span>
                      <span className="tabular-nums">- {formatInr(discountOnMrp)}</span>
                    </div>
                    {couponDiscountVal > 0 && (
                      <div className="flex justify-between text-emerald-800 font-medium">
                        <span>Coupon Discount ({appliedCoupon})</span>
                        <span className="tabular-nums">- {formatInr(couponDiscountVal)}</span>
                      </div>
                    )}
                    {giftWrap && (
                      <div className="flex justify-between">
                        <span>Gift Wrap Fee</span>
                        <span className="tabular-nums">{formatInr(50)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Shipping Charges</span>
                      <span className="flex items-center gap-1.5">
                        <span className="line-through text-gray-400">₹99.00</span>
                        <span className="font-semibold text-emerald-800">₹0</span>
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-4 flex justify-between font-serif text-base font-bold text-[#1A1A1A]">
                    <div>
                      <p className="text-sm font-bold text-[#1A1A1A]">Estimated Amount:</p>
                      <p className="text-[9px] text-[#8a8a8a] uppercase tracking-wider mt-0.5 font-sans font-normal">(incl. of all taxes)</p>
                    </div>
                    <span className="tabular-nums text-lg text-[#3B0D23] font-sans">{formatInr(finalTotal)}</span>
                  </div>

                  {/* Green savings panel */}
                  <div className="rounded-lg bg-emerald-50 text-emerald-800 font-semibold text-xs py-2 px-3 text-center border border-emerald-100">
                    {formatInr(totalSavings)} savings on your current order
                  </div>

                  <button
                    type="button"
                    onClick={handleCheckoutClick}
                    disabled={!canCheckout}
                    className="w-full flex h-12 items-center justify-center gap-2 rounded-lg bg-[#3B0D23] text-xs font-bold uppercase tracking-[0.1em] text-white shadow-sm transition hover:bg-[#2A0718] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span>🔒</span>
                    <span>Checkout securely</span>
                  </button>

                  <div className="flex justify-between border-t border-gray-100 pt-4 mt-2">
                    <button
                      type="button"
                      onClick={clearCart}
                      className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#847377] hover:text-[#3B0D23] transition"
                    >
                      Clear Bag
                    </button>
                    {appliedCoupon && (
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="text-[10px] font-bold uppercase tracking-[0.1em] text-red-700 hover:underline"
                      >
                        Remove Coupon ({appliedCoupon})
                      </button>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      </main>

      {/* GIVA-STYLE APPLY COUPON MODAL */}
      {couponOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 font-sans">
          <div className="relative w-full max-w-md rounded-xl bg-white p-5 shadow-xl border border-black/5">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-[#1A1A1A]">Apply Coupon</h3>
              <button
                type="button"
                onClick={() => {
                  setCouponOpen(false)
                  setCouponError('')
                }}
                className="text-gray-400 hover:text-black text-lg"
              >
                ✕
              </button>
            </div>

            {/* Input fields */}
            <div className="mt-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter coupon code here"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  className="flex-1 rounded border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#3d0a21]/30 text-[#1A1A1A]"
                />
                <button
                  type="button"
                  onClick={() => handleApplyCouponCode(couponInput)}
                  className="rounded border border-gray-300 px-4 py-2 text-xs font-bold text-[#514347] hover:bg-gray-50 transition shrink-0"
                >
                  Apply
                </button>
              </div>
              {couponError && <p className="mt-2 text-xs text-red-600 font-medium">{couponError}</p>}
            </div>

            {/* Best Available Offers */}
            <div className="mt-6 space-y-3">
              <h4 className="text-xs font-bold text-[#8a8a8a] uppercase tracking-wider">Best Available Offers</h4>
              
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                
                {/* SAVE10 Offer */}
                <div className="rounded-lg border border-[#D4AF37]/20 bg-[#F8F6F3]/50 p-4 flex flex-col justify-between gap-3 text-left">
                  <div>
                    <p className="text-xs font-bold text-[#1A1A1A]">Only for Today - Flat 10% Off</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Applicable on select Silver &amp; Demi-fine Jewellery orders above ₹1999.</p>
                  </div>
                  <div className="flex items-center justify-between border-t border-dashed border-[#D4AF37]/20 pt-2.5">
                    <span className="font-mono text-xs font-extrabold text-emerald-800 bg-emerald-50 px-2 py-1 rounded">SAVE10</span>
                    <button
                      type="button"
                      onClick={() => handleApplyCouponCode('SAVE10')}
                      className="rounded bg-[#B76E79]/20 text-[#3B0D23] font-bold text-[10px] px-3.5 py-1.5 hover:bg-[#B76E79]/30 transition uppercase tracking-wider"
                    >
                      Apply
                    </button>
                  </div>
                </div>

                {/* FREE50 Offer */}
                <div className="rounded-lg border border-[#D4AF37]/20 bg-[#F8F6F3]/50 p-4 flex flex-col justify-between gap-3 text-left">
                  <div>
                    <p className="text-xs font-bold text-[#1A1A1A]">FLAT ₹50 Off on your order</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Applicable on first jewellery order above ₹999.</p>
                  </div>
                  <div className="flex items-center justify-between border-t border-dashed border-[#D4AF37]/20 pt-2.5">
                    <span className="font-mono text-xs font-extrabold text-emerald-800 bg-emerald-50 px-2 py-1 rounded">FREE50</span>
                    <button
                      type="button"
                      onClick={() => handleApplyCouponCode('FREE50')}
                      className="rounded bg-[#B76E79]/20 text-[#3B0D23] font-bold text-[10px] px-3.5 py-1.5 hover:bg-[#B76E79]/30 transition uppercase tracking-wider"
                    >
                      Apply
                    </button>
                  </div>
                </div>

                {/* VELISQA5 Offer */}
                <div className="rounded-lg border border-[#D4AF37]/20 bg-[#F8F6F3]/50 p-4 flex flex-col justify-between gap-3 text-left">
                  <div>
                    <p className="text-xs font-bold text-[#1A1A1A]">FLAT 5% Off on jewellery</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Applicable on orders above ₹1499.</p>
                  </div>
                  <div className="flex items-center justify-between border-t border-dashed border-[#D4AF37]/20 pt-2.5">
                    <span className="font-mono text-xs font-extrabold text-emerald-800 bg-emerald-50 px-2 py-1 rounded">VELISQA5</span>
                    <button
                      type="button"
                      onClick={() => handleApplyCouponCode('VELISQA5')}
                      className="rounded bg-[#B76E79]/20 text-[#3B0D23] font-bold text-[10px] px-3.5 py-1.5 hover:bg-[#B76E79]/30 transition uppercase tracking-wider"
                    >
                      Apply
                    </button>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}
    </>
  )
}
