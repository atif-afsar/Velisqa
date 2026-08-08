import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SEOHead from '../Components/SEO/SEOHead'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { formatInr, getCartLineSubtotal, getProductStock } from '../lib/cartStock'
import { supabase } from '../lib/supabaseClient'
import { invokeEdgeFunction } from '../lib/invokeEdgeFunction'

const VALID_COUPONS = ['SAVE10', 'VELISQA5', 'FREE50']

function getCouponDiscount(code, subtotal) {
  const cleanCode = String(code || '').toUpperCase().trim()
  if (cleanCode === 'SAVE10') return Math.round(subtotal * 0.10)
  if (cleanCode === 'VELISQA5') return Math.round(subtotal * 0.05)
  if (cleanCode === 'FREE50') return Math.min(50, subtotal)
  return 0
}

function getExpectedDeliveryDateRange() {
  const today = new Date()
  const start = new Date(today)
  start.setDate(today.getDate() + 3)
  const end = new Date(today)
  end.setDate(today.getDate() + 5)
  
  const options = { day: 'numeric', month: 'short' }
  return `${start.toLocaleDateString('en-IN', options)} – ${end.toLocaleDateString('en-IN', options)}`
}

export default function Checkout() {
  const navigate = useNavigate()
  const { items, cartTotal, stockIssues, clearCart, syncing } = useCart()
  const { user, profile } = useAuth()

  // Form Fields State
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [pincode, setPincode] = useState(() => localStorage.getItem('velisqa:delivery_pincode') || '')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [notes, setNotes] = useState('')

  // Pincode validation state
  const [resolvingPincode, setResolvingPincode] = useState(false)
  const [pincodeStatus, setPincodeStatus] = useState(null) // 'available' or 'invalid'
  const [pincodeMessage, setPincodeMessage] = useState('')

  // Checkout process state
  const [paymentMethod, setPaymentMethod] = useState('online') // 'online' or 'cod'
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittingLabel, setSubmittingLabel] = useState('')
  const [checkoutError, setCheckoutError] = useState('')

  const [appliedCoupon, setAppliedCoupon] = useState(() => {
    return localStorage.getItem('velisqa:applied_coupon') || ''
  })
  const [couponDiscountVal, setCouponDiscountVal] = useState(() => {
    return Number(localStorage.getItem('velisqa:applied_coupon_discount') || 0)
  })
  const [checkoutCouponInput, setCheckoutCouponInput] = useState('')
  const [checkoutCouponError, setCheckoutCouponError] = useState('')

  const subtotal = cartTotal
  const finalTotal = Math.max(0, subtotal - couponDiscountVal)

  // Revalidate coupon from database on mount or subtotal change
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

  async function handleApplyCheckoutCoupon(e) {
    if (e) e.preventDefault()
    setCheckoutCouponError('')
    const cleanCode = String(checkoutCouponInput || '').toUpperCase().trim()
    if (!cleanCode) return

    try {
      const { data: coupon, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', cleanCode)
        .eq('active', true)
        .maybeSingle()

      if (error || !coupon) {
        setCheckoutCouponError("This coupon isn't valid or has expired.")
        return
      }

      if (subtotal < Number(coupon.min_subtotal)) {
        setCheckoutCouponError(`This coupon requires a minimum subtotal of ${formatInr(coupon.min_subtotal)}`)
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
      setCheckoutCouponInput('')
    } catch {
      setCheckoutCouponError("Unable to validate coupon. Please try again.")
    }
  }

  function handleRemoveCheckoutCoupon() {
    setAppliedCoupon('')
    setCouponDiscountVal(0)
    localStorage.removeItem('velisqa:applied_coupon')
    localStorage.removeItem('velisqa:applied_coupon_discount')
    setCheckoutCouponError('')
  }
  const expectedDate = useMemo(() => getExpectedDeliveryDateRange(), [])

  // Auto-fill profile details when loaded
  useEffect(() => {
    if (profile) {
      setName(profile.full_name || profile.name || '')
      setPhone(profile.phone || '')
      setEmail(user?.email || profile.email || '')
      setAddress(profile.address || '')
      if (profile.pincode) {
        setPincode(profile.pincode)
        resolvePincodeDetails(profile.pincode)
      }
      setCity(profile.city || '')
      setState(profile.state || '')
    } else {
      const savedPin = localStorage.getItem('velisqa:delivery_pincode')
      if (savedPin && /^\d{6}$/.test(savedPin)) {
        resolvePincodeDetails(savedPin)
      }
    }
  }, [profile, user])

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0 && !isSubmitting) {
      navigate('/cart', { replace: true })
    }
  }, [items.length, navigate, isSubmitting])

  // Resolve Pincode helper
  async function resolvePincodeDetails(pin) {
    if (!/^\d{6}$/.test(pin)) return
    setResolvingPincode(true)
    setPincodeStatus(null)
    setPincodeMessage('')
    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${pin}`)
      const resData = await response.json()
      if (resData && resData[0] && resData[0].Status === 'Success') {
        const postOffice = resData[0].PostOffice[0]
        setCity(postOffice.District)
        setState(postOffice.State)
        setPincodeStatus('available')
        setPincodeMessage(`Delivering to ${postOffice.District}, ${postOffice.State}`)
      } else {
        setPincodeStatus('invalid')
        setPincodeMessage("Sorry, we currently don't deliver to this pincode.")
      }
    } catch {
      setPincodeStatus('available') // Fallback if API fails
    } finally {
      setResolvingPincode(false)
    }
  }

  const handlePincodeChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6)
    setPincode(val)
    if (val.length === 6) {
      resolvePincodeDetails(val)
    } else {
      setPincodeStatus(null)
      setPincodeMessage('')
    }
  }

  // Checkout execution
  async function handleCheckoutSubmit(e) {
    if (e) e.preventDefault()
    if (isSubmitting || items.length === 0) return
    setCheckoutError('')

    // Basic Validation
    if (!name.trim() || !phone.trim() || !address.trim() || !pincode.trim()) {
      setCheckoutError('Please fill in Name, Phone, Address, and Pincode.')
      return
    }
    if (pincodeStatus === 'invalid') {
      setCheckoutError('Delivery is not available for this pincode.')
      return
    }

    setIsSubmitting(true)
    setSubmittingLabel('Registering your order…')

    try {
      // 1. Create order record via database RPC
      const { data: orderData, error: orderError } = await supabase.rpc('create_manual_payment_order', {
        p_customer: {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          address: address.trim(),
          city: city.trim() || null,
          pincode: pincode.trim(),
          notes: notes.trim() || null,
          paymentMethod,
          couponCode: appliedCoupon || null
        },
        p_items: items.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          imageUrl: line.imageUrl || null,
        }))
      })

      if (orderError) throw orderError

      const resolvedOrder = Array.isArray(orderData) ? orderData[0] : orderData
      if (!resolvedOrder?.order_ref || !resolvedOrder?.access_token) {
        throw new Error('Order creation did not return order reference.')
      }

      const orderRef = resolvedOrder.order_ref
      const accessToken = resolvedOrder.access_token

      if (paymentMethod === 'cod') {
        // 2. COD flow: immediately proceed to success page
        clearCart()
        localStorage.removeItem('velisqa:applied_coupon')
        navigate(`/order-confirmation/${orderRef}?token=${accessToken}`)
      } else {
        // 3. Online payment flow: create Razorpay order and launch checkout
        setSubmittingLabel('Opening secure payment gateway…')

        const { data: razorpayData, error: rzpError } = await invokeEdgeFunction('create-razorpay-order', {
          orderId: orderRef,
          accessToken,
        })

        if (rzpError) throw new Error(rzpError)

        const options = {
          key: razorpayData.razorpayKeyId,
          amount: razorpayData.amountPaise,
          currency: 'INR',
          name: 'VELISQA',
          description: `Order Ref: ${orderRef}`,
          image: '/images/logo.png',
          order_id: razorpayData.razorpayOrderId,
          prefill: {
            name,
            contact: phone,
            email: email || undefined,
          },
          theme: {
            color: '#3B0D23',
          },
          modal: {
            ondismiss: () => {
              setIsSubmitting(false)
              setCheckoutError('Payment dismissed. Click complete payment to try again.')
            },
          },
          handler: async (response) => {
            setSubmittingLabel('Confirming your payment…')
            try {
              const { error: verifyError } = await invokeEdgeFunction('verify-razorpay-payment', {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              })

              if (verifyError) throw new Error(verifyError)

              clearCart()
              localStorage.removeItem('velisqa:applied_coupon')
              navigate(`/order-confirmation/${orderRef}?token=${accessToken}`)
            } catch (err) {
              setCheckoutError(err.message || 'Payment verification failed.')
              setIsSubmitting(false)
            }
          },
        }

        const rzp = new window.Razorpay(options)
        rzp.open()
      }

    } catch (err) {
      setCheckoutError(err.message || 'Checkout failed. Please try again.')
      setIsSubmitting(false)
    }
  }

  if (items.length === 0 && !isSubmitting) return null

  return (
    <>
      <SEOHead
        title="Secure Checkout | Velisqa"
        description="Enter your shipping and delivery details to securely place your order."
        canonicalPath="/checkout"
        noindex
      />
      <main className="page-offset-nav min-h-screen bg-[#F8F6F3] text-[#1A1A1A] pb-24 lg:pb-8">
        
        {/* Mobile Header Bar */}
        <div className="flex items-center justify-between border-b border-[#3B0D23]/5 bg-white px-4 py-3 lg:hidden">
          <Link to="/cart" className="text-xs font-bold text-[#847377] uppercase tracking-[0.1em]">&larr; Back</Link>
          <span className="font-serif text-base font-bold text-[#3B0D23]">VELISQA</span>
          <span className="w-10"></span> {/* Spacer */}
        </div>

        <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8">
          
          {/* Desktop Heading */}
          <div className="hidden lg:flex items-center justify-between mb-8 border-b border-[#3B0D23]/5 pb-4">
            <h1 className="font-serif text-2xl font-semibold text-[#3B0D23]">Secure Checkout</h1>
            <Link to="/cart" className="text-xs font-bold uppercase tracking-[0.1em] text-[#847377] hover:text-[#3B0D23]">&larr; Back to Bag</Link>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
            
            {/* LEFT COLUMN: Delivery Details & Payment Choice */}
            <form onSubmit={handleCheckoutSubmit} className="space-y-6">
              
              {/* CONTACT DETAILS */}
              <div className="rounded-2xl border border-[#D4AF37]/10 bg-white p-5 sm:p-6 shadow-sm space-y-4">
                <h3 className="font-serif text-base font-semibold text-[#3B0D23]">Contact Information</h3>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-xs font-bold uppercase tracking-[0.08em] text-[#514347]">
                    Mobile Number *
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-[#3B0D23]/10 px-3.5 py-2.5 text-xs text-[#1A1A1A] outline-none focus:border-[#3B0D23]/30 font-medium"
                    />
                  </label>
                  <label className="block text-xs font-bold uppercase tracking-[0.08em] text-[#514347]">
                    Email Address
                    <input
                      type="email"
                      placeholder="e.g. customer@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-[#3B0D23]/10 px-3.5 py-2.5 text-xs text-[#1A1A1A] outline-none focus:border-[#3B0D23]/30 font-medium"
                    />
                  </label>
                </div>
              </div>

              {/* SHIPPING ADDRESS */}
              <div className="rounded-2xl border border-[#D4AF37]/10 bg-white p-5 sm:p-6 shadow-sm space-y-4">
                <h3 className="font-serif text-base font-semibold text-[#3B0D23]">Delivery Address</h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-xs font-bold uppercase tracking-[0.08em] text-[#514347] sm:col-span-2">
                    Full Name *
                    <input
                      type="text"
                      required
                      placeholder="Enter your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-[#3B0D23]/10 px-3.5 py-2.5 text-xs text-[#1A1A1A] outline-none focus:border-[#3B0D23]/30 font-medium"
                    />
                  </label>

                  <label className="block text-xs font-bold uppercase tracking-[0.08em] text-[#514347]">
                    Pincode *
                    <input
                      type="text"
                      required
                      inputMode="numeric"
                      placeholder="6-digit PIN code"
                      value={pincode}
                      onChange={handlePincodeChange}
                      className="mt-1.5 w-full rounded-lg border border-[#3B0D23]/10 px-3.5 py-2.5 text-xs text-[#1A1A1A] outline-none focus:border-[#3B0D23]/30 font-medium"
                    />
                  </label>

                  {/* Pincode Resolution Status */}
                  <div className="flex items-end pb-1 text-xs">
                    {resolvingPincode && <span className="text-[#847377] animate-pulse">Resolving location…</span>}
                    {pincodeStatus === 'available' && <span className="text-emerald-700 font-medium">✓ {pincodeMessage}</span>}
                    {pincodeStatus === 'invalid' && <span className="text-red-700 font-medium">{pincodeMessage}</span>}
                  </div>

                  <label className="block text-xs font-bold uppercase tracking-[0.08em] text-[#514347] sm:col-span-2">
                    Street Address *
                    <textarea
                      required
                      rows={2}
                      placeholder="House number, building name, street address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-[#3B0D23]/10 px-3.5 py-2.5 text-xs text-[#1A1A1A] outline-none focus:border-[#3B0D23]/30 font-medium resize-none"
                    />
                  </label>

                  <label className="block text-xs font-bold uppercase tracking-[0.08em] text-[#514347]">
                    City
                    <input
                      type="text"
                      placeholder="District / City"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-[#3B0D23]/10 bg-slate-50 px-3.5 py-2.5 text-xs text-[#1A1A1A] outline-none font-medium"
                    />
                  </label>

                  <label className="block text-xs font-bold uppercase tracking-[0.08em] text-[#514347]">
                    State
                    <input
                      type="text"
                      placeholder="State"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-[#3B0D23]/10 bg-slate-50 px-3.5 py-2.5 text-xs text-[#1A1A1A] outline-none font-medium"
                    />
                  </label>

                  <label className="block text-xs font-bold uppercase tracking-[0.08em] text-[#514347] sm:col-span-2">
                    Delivery Notes (Optional)
                    <input
                      type="text"
                      placeholder="e.g. Ring bell, deliver to gate, etc."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-[#3B0D23]/10 px-3.5 py-2.5 text-xs text-[#1A1A1A] outline-none focus:border-[#3B0D23]/30 font-medium"
                    />
                  </label>
                </div>
              </div>

              {/* PAYMENT OPTION METHOD */}
              <div className="rounded-2xl border border-[#D4AF37]/10 bg-white p-5 sm:p-6 shadow-sm space-y-4">
                <h3 className="font-serif text-base font-semibold text-[#3B0D23]">Payment Method</h3>

                <div className="grid gap-3 sm:grid-cols-2">
                  
                  {/* Razorpay Online Option */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('online')}
                    className={`flex flex-col text-left p-4 rounded-xl border-2 transition ${
                      paymentMethod === 'online'
                        ? 'border-[#3B0D23] bg-[#3B0D23]/5'
                        : 'border-[#3B0D23]/10 hover:border-[#3B0D23]/25 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold uppercase tracking-[0.08em] text-[#3B0D23]">Online Payment</span>
                      {paymentMethod === 'online' && <span className="text-emerald-700 text-xs">✓</span>}
                    </div>
                    <span className="text-[10px] text-[#514347] mt-1.5 font-medium">UPI, Cards, Net Banking & Wallets</span>
                  </button>

                  {/* Cash on Delivery Option */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cod')}
                    className={`flex flex-col text-left p-4 rounded-xl border-2 transition ${
                      paymentMethod === 'cod'
                        ? 'border-[#3B0D23] bg-[#3B0D23]/5'
                        : 'border-[#3B0D23]/10 hover:border-[#3B0D23]/25 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold uppercase tracking-[0.08em] text-[#3B0D23]">Cash On Delivery (COD)</span>
                      {paymentMethod === 'cod' && <span className="text-emerald-700 text-xs">✓</span>}
                    </div>
                    <span className="text-[10px] text-[#514347] mt-1.5 font-medium">Pay in cash when order is delivered</span>
                  </button>

                </div>
              </div>

              {/* DESKTOP SUBMIT CTA */}
              {checkoutError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 font-medium">
                  {checkoutError}
                </div>
              )}

              {isSubmitting && (
                <div className="rounded-xl border border-emerald-200 bg-[#edf7f1] p-4 text-xs text-emerald-800 font-medium flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-emerald-700" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>{submittingLabel}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || pincodeStatus === 'invalid'}
                className="hidden lg:flex w-full h-12 items-center justify-center rounded-full bg-[#3B0D23] text-xs font-bold uppercase tracking-[0.1em] text-white hover:bg-[#2A0718] disabled:cursor-not-allowed disabled:opacity-50 shadow-md"
              >
                {paymentMethod === 'online' ? `Pay ${formatInr(finalTotal)} Securely` : 'Place COD Order'}
              </button>

            </form>

            {/* RIGHT COLUMN: Order Summary */}
            <div className="rounded-2xl border border-[#D4AF37]/10 bg-white p-5 sm:p-6 shadow-sm self-start space-y-4">
              <h3 className="font-serif text-base font-semibold text-[#3B0D23] border-b border-[#D4AF37]/10 pb-2">
                Order Summary ({items.length} {items.length === 1 ? 'item' : 'items'})
              </h3>

              {/* Items List */}
              <ul className="divide-y divide-[#D4AF37]/10 max-h-[300px] overflow-y-auto pr-1">
                {items.map((line) => (
                  <li key={line.productId} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="h-16 w-12 shrink-0 overflow-hidden rounded-md bg-[#F8F6F3]">
                      {line.imageUrl && <img src={line.imageUrl} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-serif text-xs font-semibold text-[#3B0D23] line-clamp-1">{line.name}</p>
                      <p className="text-[10px] text-[#847377] mt-0.5">Qty: {line.quantity}</p>
                    </div>
                    <p className="shrink-0 text-xs font-medium tabular-nums text-[#3B0D23]">
                      {formatInr(getCartLineSubtotal(line))}
                    </p>
                  </li>
                ))}
              </ul>

              {/* Pricing breakdown */}
              <div className="space-y-2.5 border-t border-[#D4AF37]/10 pt-3 text-xs text-[#514347]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-medium tabular-nums">{formatInr(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery</span>
                  <span className="font-semibold text-emerald-600">FREE</span>
                </div>
                {couponDiscountVal > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount ({appliedCoupon})</span>
                    <span className="tabular-nums">- {formatInr(couponDiscountVal)}</span>
                  </div>
                )}
                {pincodeStatus === 'available' && (
                  <div className="flex justify-between border-t border-dashed border-[#D4AF37]/10 pt-2 text-[10px] text-emerald-800">
                    <span>Expected Delivery</span>
                    <span className="font-semibold">{expectedDate}</span>
                  </div>
                )}
              </div>

              {/* Apply Coupon widget */}
              <div className="border-t border-[#D4AF37]/10 pt-3">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs text-emerald-800">
                    <span className="font-semibold">✓ Code "{appliedCoupon}" applied</span>
                    <button
                      type="button"
                      onClick={handleRemoveCheckoutCoupon}
                      className="font-bold text-red-700 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCheckoutCoupon} className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Apply Promo Code</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter coupon code"
                        value={checkoutCouponInput}
                        onChange={(e) => setCheckoutCouponInput(e.target.value)}
                        className="flex-1 rounded border border-gray-200 px-3 py-1.5 text-xs outline-none focus:border-[#3B0D23]/30 text-[#1A1A1A]"
                      />
                      <button
                        type="submit"
                        className="rounded bg-[#3B0D23] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-white hover:bg-[#2A0718] transition shrink-0"
                      >
                        Apply
                      </button>
                    </div>
                    {checkoutCouponError && (
                      <p className="text-[10px] font-medium text-red-600">{checkoutCouponError}</p>
                    )}
                  </form>
                )}
              </div>

              <div className="border-t border-[#D4AF37]/10 pt-3 flex justify-between font-serif text-base font-bold text-[#3B0D23]">
                <span>Grand Total</span>
                <span className="tabular-nums">{formatInr(finalTotal)}</span>
              </div>
            </div>

          </div>

        </div>

        {/* MOBILE STICKY BOTTOM CTA */}
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#D4AF37]/10 bg-white p-4 lg:hidden shadow-[0_-4px_16px_rgba(19,0,6,0.05)] pb-safe-bottom">
          <div className="mx-auto flex max-w-md items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#847377]">Total Amount</p>
              <p className="font-serif text-lg font-bold text-[#3B0D23] tabular-nums">{formatInr(finalTotal)}</p>
            </div>
            
            <button
              type="button"
              disabled={isSubmitting || pincodeStatus === 'invalid'}
              onClick={() => void handleCheckoutSubmit()}
              className="flex-1 flex h-12 items-center justify-center rounded-full bg-[#3B0D23] text-xs font-bold uppercase tracking-[0.15em] text-white hover:bg-[#2A0718] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-1.5">
                  <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Confirming...
                </span>
              ) : paymentMethod === 'online' ? (
                `Pay ${formatInr(finalTotal)} Securely`
              ) : (
                'Place COD Order'
              )}
            </button>
          </div>
        </div>

      </main>
    </>
  )
}
