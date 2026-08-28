import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SEOHead from '../Components/SEO/SEOHead'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { formatInr, getCartLineSubtotal, getProductStock } from '../lib/cartStock'
import { isFreeGiftItem, CART_OFFERS } from '../lib/cartOffers'
import { supabase } from '../lib/supabaseClient'
import { invokeEdgeFunction } from '../lib/invokeEdgeFunction'
import { buildOrderEmailPayload, submitOrderEmail } from '../lib/orderEmail'
import { analytics } from '../lib/analytics'
import OfferProgressCard from '../Components/Offers/OfferProgressCard'

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
  const { items, cartTotal, stockIssues, clearCart, syncing, eligibleSubtotal, freeGiftInCart } = useCart()
  const { user, profile } = useAuth()

  const selectedGift = items.find(isFreeGiftItem)

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
  const [giftWrap] = useState(() => {
    return localStorage.getItem('velisqa:gift_wrap') === 'true'
  })

  const subtotal = eligibleSubtotal
  const giftWrapFee = giftWrap ? 50 : 0
  const deliveryCharge = paymentMethod === 'cod' ? 50 : 0
  const gstAmount = paymentMethod === 'cod' ? Math.round((subtotal - couponDiscountVal) * 0.02) : 0
  const finalTotal = Math.max(0, subtotal - couponDiscountVal + giftWrapFee + deliveryCharge + gstAmount)

  const onlineTotal = Math.max(0, subtotal - couponDiscountVal + giftWrapFee)
  const codGst = Math.round((subtotal - couponDiscountVal) * 0.02)
  const codTotal = Math.max(0, subtotal - couponDiscountVal + giftWrapFee + 50 + codGst)

  // ── Analytics: begin_checkout (fires once per session) ──
  useEffect(() => {
    if (items.length > 0) {
      analytics.beginCheckout({ items, total: finalTotal })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Analytics: payment method selection ──
  useEffect(() => {
    if (items.length > 0) {
      analytics.addPaymentInfo({ items, total: finalTotal }, paymentMethod)
    }
  }, [paymentMethod]) // eslint-disable-line react-hooks/exhaustive-deps

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
          couponCode: appliedCoupon || null,
          giftWrap: giftWrap
        },
        p_items: items.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          imageUrl: line.imageUrl || null,
          ...(isFreeGiftItem(line) ? { isFreeGift: true, price: 0 } : {}),
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
        // Send order notification email in the background to velisqa.in@gmail.com via FormSubmit
        const emailPayload = buildOrderEmailPayload({
          productName: items.map((item) => item.name).join(', '),
          productUrl: '',
          cartItems: items,
          stockWarnings: [],
          paymentMethod: 'cod',
          customer: {
            name: name.trim(),
            phone: phone.trim(),
            email: email.trim() || null,
            address: address.trim(),
            city: city.trim() || null,
            pincode: pincode.trim(),
            notes: notes.trim() || null,
            giftWrap: giftWrap,
          },
          enquiryType: 'order',
          orderRef: orderRef,
        })
        void submitOrderEmail({
          ...emailPayload,
          customer: {
            name: name.trim(),
            phone: phone.trim(),
            email: email.trim() || null,
          },
        }).catch((err) => console.error('Failed to send order confirmation email:', err))

        // 2. COD flow: immediately proceed to success page
        clearCart()
        localStorage.removeItem('velisqa:applied_coupon')
        localStorage.removeItem('velisqa:gift_wrap')

        // ── Analytics: track purchase ──
        analytics.purchase({
          transaction_id: orderRef,
          value: finalTotal,
          shipping: deliveryCharge,
          tax: gstAmount,
          coupon: appliedCoupon || undefined,
          items: items.map((line) => ({
            id: line.productId,
            name: line.name,
            price: line.price,
            quantity: line.quantity,
          })),
          customer_email: email.trim() || undefined,
          customer_phone: phone.trim() || undefined,
        })

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
              localStorage.removeItem('velisqa:gift_wrap')

              // ── Analytics: track purchase ──
              analytics.purchase({
                transaction_id: orderRef,
                value: finalTotal,
                shipping: deliveryCharge,
                tax: gstAmount,
                coupon: appliedCoupon || undefined,
                items: items.map((line) => ({
                  id: line.productId,
                  name: line.name,
                  price: line.price,
                  quantity: line.quantity,
                })),
                customer_email: email.trim() || undefined,
                customer_phone: phone.trim() || undefined,
              })

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
      <main className="page-offset-nav min-h-screen bg-[#F8F6F3] text-[#1A1A1A] pb-24 lg:pb-8 w-full overflow-x-hidden">
        
        {/* Mobile Header Bar */}
        <div className="flex items-center justify-between border-b border-[#3B0D23]/5 bg-white px-4 py-3 lg:hidden">
          <Link to="/cart" className="text-xs font-bold text-[#847377] uppercase tracking-[0.1em]">&larr; Back</Link>
          <span className="font-serif text-base font-bold text-[#3B0D23]">VELISQA</span>
          <span className="w-10"></span> {/* Spacer */}
        </div>

        <div className="container-stitch mx-auto max-w-[1280px] py-6 w-full overflow-hidden min-w-0">
          
          {/* Desktop Heading */}
          <div className="hidden lg:flex items-center justify-between mb-8 border-b border-[#3B0D23]/5 pb-4">
            <h1 className="font-serif text-2xl font-semibold text-[#3B0D23]">Secure Checkout</h1>
            <Link to="/cart" className="text-xs font-bold uppercase tracking-[0.1em] text-[#847377] hover:text-[#3B0D23]">&larr; Back to Bag</Link>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1fr_420px] w-full min-w-0">
            
            {/* LEFT COLUMN: Delivery Details & Payment Choice */}
            <form onSubmit={handleCheckoutSubmit} className="space-y-6 w-full min-w-0">
              
              {/* CONTACT DETAILS */}
              <div className="rounded-2xl border border-[#D4AF37]/15 bg-white p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-5 w-full min-w-0 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <div className="flex items-center gap-2.5 pb-3.5 border-b border-[#3B0D23]/5 mb-2">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[#3B0D23]/5 text-[#3B0D23]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" />
                    </svg>
                  </div>
                  <h3 className="font-serif text-base font-bold text-[#3B0D23] tracking-wide">Contact Information</h3>
                </div>
                
                <div className="grid gap-5 grid-cols-1 sm:grid-cols-2">
                  {/* Mobile Number */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-[0.06em] text-[#514347]">
                      Mobile Number <span className="text-[#3B0D23]/60">*</span>
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#514347]/50 group-focus-within:text-[#3B0D23] transition-colors duration-200">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <input
                        type="tel"
                        required
                        placeholder="e.g. 9876543210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full rounded-xl border border-[#3B0D23]/10 pl-10 pr-3.5 py-3 text-base sm:text-sm text-[#1A1A1A] bg-white/50 backdrop-blur-[2px] outline-none transition-all duration-200 focus:border-[#3B0D23] focus:bg-white focus:ring-2 focus:ring-[#3B0D23]/10 font-medium placeholder-[#514347]/30"
                      />
                    </div>
                  </div>

                  {/* Email Address */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-[0.06em] text-[#514347]">
                      Email Address <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#514347]/50 group-focus-within:text-[#3B0D23] transition-colors duration-200">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <input
                        type="email"
                        placeholder="e.g. customer@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-xl border border-[#3B0D23]/10 pl-10 pr-3.5 py-3 text-base sm:text-sm text-[#1A1A1A] bg-white/50 backdrop-blur-[2px] outline-none transition-all duration-200 focus:border-[#3B0D23] focus:bg-white focus:ring-2 focus:ring-[#3B0D23]/10 font-medium placeholder-[#514347]/30"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SHIPPING ADDRESS */}
              <div className="rounded-2xl border border-[#D4AF37]/15 bg-white p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-5 w-full min-w-0 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <div className="flex items-center gap-2.5 pb-3.5 border-b border-[#3B0D23]/5 mb-2">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[#3B0D23]/5 text-[#3B0D23]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="font-serif text-base font-bold text-[#3B0D23] tracking-wide">Delivery Address</h3>
                </div>

                <div className="grid gap-5 grid-cols-1 sm:grid-cols-2">
                  {/* Full Name */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="block text-[11px] font-bold uppercase tracking-[0.06em] text-[#514347]">
                      Full Name <span className="text-[#3B0D23]/60">*</span>
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#514347]/50 group-focus-within:text-[#3B0D23] transition-colors duration-200">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="Enter your full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-xl border border-[#3B0D23]/10 pl-10 pr-3.5 py-3 text-base sm:text-sm text-[#1A1A1A] bg-white/50 backdrop-blur-[2px] outline-none transition-all duration-200 focus:border-[#3B0D23] focus:bg-white focus:ring-2 focus:ring-[#3B0D23]/10 font-medium placeholder-[#514347]/30"
                      />
                    </div>
                  </div>

                  {/* Pincode, City, State Nested Grid */}
                  <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Pincode */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold uppercase tracking-[0.06em] text-[#514347]">
                        Pincode <span className="text-[#3B0D23]/60">*</span>
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#514347]/50 group-focus-within:text-[#3B0D23] transition-colors duration-200">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <input
                          type="text"
                          required
                          inputMode="numeric"
                          placeholder="6-digit PIN"
                          value={pincode}
                          onChange={handlePincodeChange}
                          className={`w-full rounded-xl border pl-10 pr-10 py-3 text-base sm:text-sm text-[#1A1A1A] bg-white/50 backdrop-blur-[2px] outline-none transition-all duration-200 focus:bg-white focus:ring-2 focus:ring-[#3B0D23]/10 font-medium placeholder-[#514347]/30 ${
                            pincodeStatus === 'available'
                              ? 'border-emerald-300 focus:border-emerald-600 focus:ring-emerald-600/10'
                              : pincodeStatus === 'invalid'
                              ? 'border-red-300 focus:border-red-600 focus:ring-red-600/10'
                              : 'border-[#3B0D23]/10 focus:border-[#3B0D23]'
                          }`}
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          {resolvingPincode && (
                            <svg className="animate-spin h-4 w-4 text-[#847377]" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          )}
                          {!resolvingPincode && pincodeStatus === 'available' && (
                            <svg className="h-4 w-4 text-emerald-600 font-bold" fill="none" stroke="currentColor" strokeWidth="3.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          {!resolvingPincode && pincodeStatus === 'invalid' && (
                            <svg className="h-4 w-4 text-red-600 font-bold" fill="none" stroke="currentColor" strokeWidth="3.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                        </div>
                      </div>
                      {(pincodeMessage || resolvingPincode) && (
                        <div className="text-[11px] font-semibold mt-1">
                          {resolvingPincode && <span className="text-[#847377] animate-pulse">Resolving location…</span>}
                          {!resolvingPincode && pincodeStatus === 'available' && <span className="text-emerald-700">✓ {pincodeMessage}</span>}
                          {!resolvingPincode && pincodeStatus === 'invalid' && <span className="text-red-700">✗ {pincodeMessage}</span>}
                        </div>
                      )}
                    </div>

                    {/* City */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold uppercase tracking-[0.06em] text-gray-400">
                        City
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#514347]/40">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <input
                          type="text"
                          placeholder="District / City"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full rounded-xl border border-[#3B0D23]/10 pl-10 pr-3.5 py-3 text-base sm:text-sm text-[#1A1A1A] bg-[#3B0D23]/[0.02] outline-none font-medium placeholder-[#514347]/30 focus:border-[#3B0D23] focus:bg-white focus:ring-2 focus:ring-[#3B0D23]/10 transition-all duration-200"
                        />
                      </div>
                    </div>

                    {/* State */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold uppercase tracking-[0.06em] text-gray-400">
                        State
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#514347]/40">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                          </svg>
                        </div>
                        <input
                          type="text"
                          placeholder="State"
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          className="w-full rounded-xl border border-[#3B0D23]/10 pl-10 pr-3.5 py-3 text-base sm:text-sm text-[#1A1A1A] bg-[#3B0D23]/[0.02] outline-none font-medium placeholder-[#514347]/30 focus:border-[#3B0D23] focus:bg-white focus:ring-2 focus:ring-[#3B0D23]/10 transition-all duration-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Street Address */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="block text-[11px] font-bold uppercase tracking-[0.06em] text-[#514347]">
                      Street Address <span className="text-[#3B0D23]/60">*</span>
                    </label>
                    <div className="relative group">
                      <div className="absolute top-3.5 left-3.5 flex items-start pointer-events-none text-[#514347]/50 group-focus-within:text-[#3B0D23] transition-colors duration-200">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                      </div>
                      <textarea
                        required
                        rows={2.5}
                        placeholder="House number, building name, street name/area"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full rounded-xl border border-[#3B0D23]/10 pl-10 pr-3.5 py-3 text-base sm:text-sm text-[#1A1A1A] bg-white/50 backdrop-blur-[2px] outline-none transition-all duration-200 focus:border-[#3B0D23] focus:bg-white focus:ring-2 focus:ring-[#3B0D23]/10 font-medium placeholder-[#514347]/30 resize-none"
                      />
                    </div>
                  </div>

                  {/* Delivery Notes */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="block text-[11px] font-bold uppercase tracking-[0.06em] text-[#514347]">
                      Delivery Notes <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#514347]/50 group-focus-within:text-[#3B0D23] transition-colors duration-200">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. Deliver to security guard, ring bell twice, etc."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full rounded-xl border border-[#3B0D23]/10 pl-10 pr-3.5 py-3 text-base sm:text-sm text-[#1A1A1A] bg-white/50 backdrop-blur-[2px] outline-none transition-all duration-200 focus:border-[#3B0D23] focus:bg-white focus:ring-2 focus:ring-[#3B0D23]/10 font-medium placeholder-[#514347]/30"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* PAYMENT OPTION METHOD */}
              <div className="rounded-2xl border border-[#D4AF37]/15 bg-white p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-5 w-full min-w-0 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <div className="flex items-center gap-2.5 pb-3.5 border-b border-[#3B0D23]/5 mb-2">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[#3B0D23]/5 text-[#3B0D23]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <h3 className="font-serif text-base font-bold text-[#3B0D23] tracking-wide">Payment Method</h3>
                </div>

                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  {/* Razorpay Online Option */}
                  <div
                    onClick={() => setPaymentMethod('online')}
                    className={`relative cursor-pointer flex gap-3.5 p-5 rounded-2xl border-2 transition-all duration-300 select-none ${
                      paymentMethod === 'online'
                        ? 'border-[#3B0D23] bg-[#3B0D23]/[0.03] shadow-[0_8px_24px_rgba(59,13,35,0.06)]'
                        : 'border-[#3B0D23]/10 hover:border-[#3B0D23]/25 bg-white hover:bg-slate-50/50'
                    }`}
                  >
                    {/* Recommended Gold Badge */}
                    <div className="absolute -top-3 right-4 bg-[#D4AF37] text-white text-[10px] font-extrabold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-md z-10">
                      ★ Recommended: Free Delivery
                    </div>

                    {/* Radio Indicator */}
                    <div className="flex items-start pt-0.5">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors duration-200 ${
                        paymentMethod === 'online' ? 'border-[#3B0D23] bg-white' : 'border-[#3B0D23]/20'
                      }`}>
                        {paymentMethod === 'online' && (
                          <div className="w-2.5 h-2.5 rounded-full bg-[#3B0D23]" />
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex flex-col min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold uppercase tracking-[0.06em] text-[#3B0D23]">Online Payment</span>
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wide whitespace-nowrap">
                            Save ₹50
                          </span>
                        </div>
                        <span className="text-sm font-extrabold text-[#3B0D23] whitespace-nowrap">
                          {formatInr(onlineTotal)}
                        </span>
                      </div>
                      <span className="text-xs text-[#514347]/80 mt-1 font-medium leading-relaxed">UPI, Cards, Net Banking & Wallets</span>
                      <span className="text-[11px] text-emerald-700 mt-2 font-semibold flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Zero delivery & shipping charges</span>
                      </span>
                    </div>
                  </div>

                  {/* Cash on Delivery Option */}
                  <div
                    onClick={() => setPaymentMethod('cod')}
                    className={`relative cursor-pointer flex gap-3.5 p-5 rounded-2xl border-2 transition-all duration-300 select-none ${
                      paymentMethod === 'cod'
                        ? 'border-amber-700 bg-amber-50/20 shadow-[0_8px_24px_rgba(180,83,9,0.04)]'
                        : 'border-[#3B0D23]/10 hover:border-[#3B0D23]/25 bg-white hover:bg-slate-50/50'
                    }`}
                  >
                    {/* Radio Indicator */}
                    <div className="flex items-start pt-0.5">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors duration-200 ${
                        paymentMethod === 'cod' ? 'border-amber-700 bg-white' : 'border-[#3B0D23]/20'
                      }`}>
                        {paymentMethod === 'cod' && (
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-700" />
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex flex-col min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-bold uppercase tracking-[0.06em] text-[#514347]">Cash On Delivery</span>
                        <span className="text-sm font-extrabold text-amber-900 whitespace-nowrap">
                          {formatInr(codTotal)}
                        </span>
                      </div>
                      <span className="text-xs text-[#847377] mt-1 font-medium leading-relaxed">Pay in cash at your doorstep</span>
                      <span className="text-[11px] text-amber-800 font-semibold mt-2.5 flex items-start gap-1.5 leading-tight">
                        <svg className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>Delivery charges + 2% GST will be added</span>
                      </span>
                    </div>
                  </div>
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
                className="hidden lg:flex w-full h-10 items-center justify-center rounded-sm bg-[#3B0D23] text-xs font-bold uppercase tracking-[0.1em] text-white hover:bg-[#2A0718] disabled:cursor-not-allowed disabled:opacity-50 shadow-md"
              >
                {paymentMethod === 'online' ? `Pay ${formatInr(finalTotal)} Securely` : 'Place COD Order'}
              </button>

            </form>

            {/* RIGHT COLUMN: Order Summary */}
            <div className="space-y-4 self-start w-full min-w-0">
              <OfferProgressCard compact />
              <div className="rounded-2xl border border-[#D4AF37]/10 bg-white p-5 sm:p-6 shadow-sm space-y-4 w-full min-w-0">
                <h3 className="font-serif text-base font-semibold text-[#3B0D23] border-b border-[#D4AF37]/10 pb-2">
                  Order Summary ({items.filter(l => !isFreeGiftItem(l)).length} {items.filter(l => !isFreeGiftItem(l)).length === 1 ? 'item' : 'items'})
                </h3>

              {/* Items List */}
              <ul className="divide-y divide-[#D4AF37]/10 max-h-[300px] overflow-y-auto pr-1">
                {items.filter(l => !isFreeGiftItem(l)).map((line) => (
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
                {/* Free Gift in order summary */}
                {freeGiftInCart && selectedGift && (
                  <li className="flex gap-3 py-3 border-t border-[#D4AF37]/20">
                    <div className="h-16 w-12 shrink-0 overflow-hidden rounded-md bg-[#FFF5DC] grid place-items-center border border-black/5">
                      {selectedGift.imageUrl ? (
                        <img src={selectedGift.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xl" role="img" aria-label="Gift">🎁</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-serif text-xs font-semibold text-[#3B0D23] line-clamp-1">{selectedGift.name}</p>
                      <p className="text-[10px] text-[#8B6914] font-semibold mt-0.5">Worth {formatInr(selectedGift.giftValue || selectedGift.price)} · FREE</p>
                    </div>
                    <p className="shrink-0 text-xs font-bold tabular-nums text-[#8B6914]">
                      ₹0
                    </p>
                  </li>
                )}
              </ul>

              {/* Pricing breakdown */}
              <div className="space-y-2.5 border-t border-[#D4AF37]/10 pt-3 text-xs text-[#514347]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-medium tabular-nums">{formatInr(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery</span>
                  {paymentMethod === 'online' ? (
                    <span className="font-semibold text-emerald-600">FREE</span>
                  ) : (
                    <span className="font-semibold text-amber-700">{formatInr(50)}</span>
                  )}
                </div>
                {paymentMethod === 'cod' && (
                  <div className="flex justify-between">
                    <span>COD GST (2%)</span>
                    <span className="font-semibold text-amber-700">{formatInr(gstAmount)}</span>
                  </div>
                )}
                {couponDiscountVal > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount ({appliedCoupon})</span>
                    <span className="tabular-nums">- {formatInr(couponDiscountVal)}</span>
                  </div>
                )}
                {selectedGift && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Free Gift ({selectedGift.name})</span>
                    <span className="tabular-nums">FREE</span>
                  </div>
                )}
                {giftWrap && (
                  <div className="flex justify-between">
                    <span>Gift Wrap Fee</span>
                    <span className="tabular-nums">{formatInr(50)}</span>
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

              {paymentMethod === 'cod' && (
                <div className="mt-2.5 p-3 bg-amber-50 border border-amber-200/50 rounded-xl text-[10px] text-amber-900 leading-relaxed">
                  <p className="font-bold mb-0.5 flex items-center gap-1">⚠️ Cash on Delivery Info</p>
                  <p>A ₹50 flat delivery fee and 2% GST have been included in the total above. This is the final amount payable to the courier.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

        {/* MOBILE STICKY BOTTOM CTA */}
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#D4AF37]/10 bg-white p-4 lg:hidden shadow-[0_-4px_16px_rgba(19,0,6,0.05)] pb-safe-bottom">
          <div className="mx-auto flex max-w-md items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#847377]">Total Amount</p>
              <div className="flex flex-col">
                <p className="font-serif text-lg font-bold text-[#3B0D23] tabular-nums">{formatInr(finalTotal)}</p>
                {paymentMethod === 'cod' && (
                  <span className="text-[8px] font-bold text-amber-800 whitespace-nowrap leading-none mt-0.5">
                    Includes ₹50 Delivery Fee & 2% GST
                  </span>
                )}
              </div>
            </div>
            
            <button
              type="button"
              disabled={isSubmitting || pincodeStatus === 'invalid'}
              onClick={() => void handleCheckoutSubmit()}
              className="flex-1 flex h-10 items-center justify-center rounded-sm bg-[#3B0D23] text-xs font-bold uppercase tracking-[0.15em] text-white hover:bg-[#2A0718] disabled:cursor-not-allowed disabled:opacity-50"
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
