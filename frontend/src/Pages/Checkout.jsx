import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SEOHead from '../Components/SEO/SEOHead'
import Field from '../Components/UI/Field'
import CouponField from '../Components/Cart/CouponField'
import { ChevronDownIcon, GiftIcon, LockIcon, ReturnIcon, TagIcon, TruckIcon } from '../Components/UI/Icons'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useCoupon } from '../hooks/useCoupon'
import { formatInr, getCartLineSubtotal } from '../lib/cartStock'
import { isFreeGiftItem } from '../lib/cartOffers'
import { computeCheckoutTotals, COD_FEE, GIFT_WRAP_FEE } from '../lib/checkoutPricing'
import { readGiftWrap, saveGiftWrap, clearAppliedCoupon } from '../lib/coupons'
import { displayProductName } from '../lib/productDisplay'
import { validateIndianPhone } from '../lib/indianPhone'
import { createOrder, createRazorpayPaymentOrder, verifyRazorpayPayment } from '../lib/manualPayments'
import { loadRazorpay, preloadRazorpay } from '../lib/loadRazorpay'
import { buildOrderEmailPayload, submitOrderEmail } from '../lib/orderEmail'
import { analytics } from '../lib/analytics'

const PINCODE_KEY = 'velisqa:delivery_pincode'

/** Input filters applied while typing. */
const SANITIZE = {
  phone: (v) => v.replace(/\D/g, '').slice(0, 10),
  name: (v) => v.replace(/[^\p{L}\s.'-]/gu, '').replace(/\s{2,}/g, ' ').slice(0, 80),
  email: (v) => v.replace(/\s/g, '').slice(0, 120),
  city: (v) => v.replace(/[^\p{L}\s.'-]/gu, '').slice(0, 60),
  state: (v) => v.replace(/[^\p{L}\s.'&-]/gu, '').slice(0, 60),
  notes: (v) => v.slice(0, 200),
}

function deliveryWindow() {
  const fmt = { day: 'numeric', month: 'short' }
  const start = new Date()
  start.setDate(start.getDate() + 3)
  const end = new Date()
  end.setDate(end.getDate() + 5)
  return `${start.toLocaleDateString('en-IN', fmt)} – ${end.toLocaleDateString('en-IN', fmt)}`
}

function readSavedPincode() {
  try {
    return localStorage.getItem(PINCODE_KEY) || ''
  } catch {
    return ''
  }
}

function isAuthRequiredError(err) {
  const msg = String(err?.message || err || '').toLowerCase()
  return msg.includes('sign in') || msg.includes('permission denied') || msg.includes('not authenticated')
}

function Card({ step, title, aside, children, className = '' }) {
  return (
    <section className={`rounded-xl border border-line bg-paper p-4 sm:p-6 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-[0.9375rem] font-semibold text-ink">
          {step && <span className="grid h-6 w-6 place-items-center rounded-full bg-ink text-[0.6875rem] font-semibold text-white">{step}</span>}
          {title}
        </h2>
        {aside}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function PaymentOption({ value, current, onChange, title, hint, badge, amount, methods }) {
  const selected = current === value
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
        selected ? 'border-ink bg-mist' : 'border-line hover:border-line-strong'
      }`}
    >
      <input type="radio" name="payment" value={value} checked={selected} onChange={() => onChange(value)} className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-ink" />
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span className="text-sm font-semibold text-ink">{title}</span>
          <span className="type-price shrink-0 text-sm font-semibold text-ink">{amount}</span>
        </span>
        {methods && (
          <span className="mt-2 flex flex-wrap gap-1.5">
            {methods.map((m) => (
              <span key={m} className="rounded border border-line bg-paper px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.06em] text-body">
                {m}
              </span>
            ))}
          </span>
        )}
        <span className="mt-2 block text-xs leading-relaxed text-muted">{hint}</span>
        {badge && <span className="mt-2 inline-block rounded bg-accent-tint px-2 py-0.5 text-[0.6875rem] font-semibold text-accent-ink">{badge}</span>}
      </span>
    </label>
  )
}

export default function Checkout() {
  const navigate = useNavigate()
  const { items, clearCart, syncing, stockIssues, eligibleSubtotal } = useCart()
  const { user, profile, requireSignIn } = useAuth()
  const coupon = useCoupon(eligibleSubtotal)
  const [giftWrap, setGiftWrap] = useState(readGiftWrap)
  const [paymentMethod, setPaymentMethod] = useState('online')
  const [form, setForm] = useState({ phone: '', email: '', name: '', pincode: readSavedPincode(), address: '', city: '', state: '', notes: '' })
  const [errors, setErrors] = useState({})
  const [pincodeStatus, setPincodeStatus] = useState(null) // null | checking | ok | invalid
  const [submitting, setSubmitting] = useState('')
  const [checkoutError, setCheckoutError] = useState('')
  const [summaryOpen, setSummaryOpen] = useState(false)
  const begun = useRef(false)
  // Same submitted payload → same key, so a retried click/network failure cannot create a second order.
  const idempotency = useRef({ fingerprint: '', key: '' })

  const lines = items.filter((l) => !isFreeGiftItem(l))
  const gift = items.find(isFreeGiftItem)
  const totals = computeCheckoutTotals({ subtotal: eligibleSubtotal, couponDiscount: coupon.discount, giftWrap, paymentMethod })
  const estimate = useMemo(() => deliveryWindow(), [])

  // Each field only accepts the characters it can contain.
  const set = (key) => (e) => {
    const clean = SANITIZE[key] ? SANITIZE[key](e.target.value) : e.target.value
    setForm((f) => ({ ...f, [key]: clean }))
    clearError(key)
  }

  // An edited field's old error no longer applies.
  function clearError(key) {
    if (!errors[key]) return
    setErrors((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  // Redirect away from an empty checkout (but not mid-payment).
  useEffect(() => {
    if (items.length === 0 && !submitting) navigate('/cart', { replace: true })
  }, [items.length, navigate, submitting])

  useEffect(() => {
    if (begun.current || items.length === 0) return
    begun.current = true
    analytics.beginCheckout({ items, total: totals.total })
  }, [items, totals.total])

  useEffect(() => {
    if (items.length > 0) analytics.addPaymentInfo({ items, total: totals.total }, paymentMethod)
    if (paymentMethod === 'online') preloadRazorpay()
    // Track only when the shopper changes payment method.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMethod])

  // Prefill from the signed-in profile.
  useEffect(() => {
    if (!profile && !user) return
    queueMicrotask(() =>
      setForm((f) => ({
        ...f,
        name: f.name || profile?.full_name || profile?.name || '',
        phone: f.phone || profile?.phone || '',
        email: f.email || user?.email || profile?.email || '',
        address: f.address || profile?.address || '',
        pincode: f.pincode || profile?.pincode || '',
        city: f.city || profile?.city || '',
        state: f.state || profile?.state || '',
      })),
    )
  }, [profile, user])

  // Resolve city/state from the pincode.
  useEffect(() => {
    const pin = form.pincode
    if (!/^\d{6}$/.test(pin)) {
      queueMicrotask(() => setPincodeStatus(null))
      return undefined
    }
    let cancelled = false
    queueMicrotask(() => setPincodeStatus('checking'))
    fetch(`https://api.postalpincode.in/pincode/${pin}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        const office = data?.[0]?.Status === 'Success' ? data[0].PostOffice?.[0] : null
        if (office) {
          setForm((f) => ({ ...f, city: office.District, state: office.State }))
          setPincodeStatus('ok')
          try {
            localStorage.setItem(PINCODE_KEY, pin)
          } catch {
            /* ignore */
          }
        } else setPincodeStatus('invalid')
      })
      .catch(() => !cancelled && setPincodeStatus('ok'))
    return () => {
      cancelled = true
    }
  }, [form.pincode])

  function validate() {
    const next = {}
    if (!form.name.trim()) next.name = 'Please enter your full name.'
    const phoneCheck = validateIndianPhone(form.phone)
    if (!phoneCheck.ok) next.phone = phoneCheck.message || 'Enter a valid 10-digit mobile number.'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) next.email = 'Enter a valid email address.'
    if (!/^\d{6}$/.test(form.pincode)) next.pincode = 'Enter a valid 6-digit pincode.'
    else if (pincodeStatus === 'invalid') next.pincode = 'We don’t deliver to this pincode yet.'
    if (form.address.trim().length < 8) next.address = 'Please enter your full delivery address.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function emailTeam(orderRef, method) {
    const customer = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      address: form.address.trim(),
      city: form.city.trim() || null,
      pincode: form.pincode.trim(),
      notes: form.notes.trim() || null,
      giftWrap,
    }
    const payload = buildOrderEmailPayload({
      productName: items.map((i) => i.name).join(', '),
      productUrl: '',
      cartItems: items,
      stockWarnings: [],
      paymentMethod: method,
      customer,
      enquiryType: 'order',
      orderRef,
    })
    void submitOrderEmail({ ...payload, customer: { name: customer.name, phone: customer.phone, email: customer.email } }).catch(() => {})
  }

  function trackPurchase(orderRef, total) {
    try {
      analytics.purchase({
        transaction_id: orderRef,
        value: total,
        shipping: totals.codFee,
        tax: totals.codGst,
        coupon: coupon.code || undefined,
        items: items.map((l) => ({ id: l.productId, name: l.name, price: l.price, quantity: l.quantity })),
        customer_email: form.email.trim() || undefined,
        customer_phone: form.phone.trim() || undefined,
      })
    } catch {
      /* analytics must never block checkout */
    }
  }

  function finishLocalCart() {
    clearCart()
    clearAppliedCoupon()
    saveGiftWrap(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (submitting || items.length === 0) return
    setCheckoutError('')
    if (!validate()) {
      queueMicrotask(() => document.querySelector('#checkout-form [aria-invalid="true"]')?.focus())
      return
    }

    setSubmitting('Placing your order…')
    try {
      const customerPayload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        address: form.address.trim(),
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        pincode: form.pincode.trim(),
        notes: form.notes.trim() || null,
        paymentMethod,
        couponCode: coupon.code || null,
        giftWrap,
      }
      const itemPayload = items.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        ...(isFreeGiftItem(line) ? { isFreeGift: true } : {}),
      }))
      const fingerprint = JSON.stringify([customerPayload, itemPayload])
      if (idempotency.current.fingerprint !== fingerprint) {
        idempotency.current = { fingerprint, key: crypto.randomUUID() }
      }
      const order = await createOrder({ customer: customerPayload, items: itemPayload, idempotencyKey: idempotency.current.key })
      const { order_ref: orderRef, access_token: accessToken } = order
      // The server total is authoritative.
      const serverTotal = Number(order.grand_total) || totals.total

      if (paymentMethod === 'cod') {
        emailTeam(orderRef, 'cod')
        trackPurchase(orderRef, serverTotal)
        finishLocalCart()
        navigate(`/order-confirmation/${orderRef}?token=${accessToken}`)
        return
      }

      setSubmitting('Opening secure payment…')
      const { data: rzp, error: rzpError } = await createRazorpayPaymentOrder(orderRef, accessToken)
      if (rzpError) throw new Error(rzpError)
      const Razorpay = await loadRazorpay()

      const checkout = new Razorpay({
        key: rzp.razorpayKeyId,
        amount: rzp.amount,
        currency: 'INR',
        name: 'VELISQA',
        description: `Order ${orderRef}`,
        order_id: rzp.razorpayOrderId,
        prefill: { name: form.name.trim(), contact: form.phone.trim(), email: form.email.trim() || undefined },
        theme: { color: '#111111' },
        modal: {
          ondismiss: () => {
            setSubmitting('')
            setCheckoutError('Payment was not completed. Your order is saved — you can try again.')
          },
        },
        handler: async (response) => {
          setSubmitting('Confirming your payment…')
          finishLocalCart()
          try {
            const { error: verifyError } = await verifyRazorpayPayment({ orderRef, response })
            // Payment status is set server-side only; the Razorpay webhook confirms the order if this call failed.
            if (verifyError) console.warn('verify-razorpay-payment:', verifyError)
            emailTeam(orderRef, 'online')
            trackPurchase(orderRef, serverTotal)
          } finally {
            navigate(`/order-confirmation/${orderRef}?token=${accessToken}`, { replace: true })
          }
        },
      })
      checkout.open()
    } catch (err) {
      setSubmitting('')
      if (!user && isAuthRequiredError(err)) {
        setCheckoutError('Please sign in to complete your order.')
        requireSignIn(() => {}, { returnTo: '/checkout', openCheckout: true })
        return
      }
      setCheckoutError(err?.message || 'Checkout failed. Please try again.')
    }
  }

  if (items.length === 0 && !submitting) return null

  const blocked = Boolean(submitting) || syncing || stockIssues.length > 0
  // What paying online saves versus cash on delivery (COD fee + GST).
  const onlineTotals = computeCheckoutTotals({ subtotal: eligibleSubtotal, couponDiscount: coupon.discount, giftWrap, paymentMethod: 'online' })
  const codTotals = computeCheckoutTotals({ subtotal: eligibleSubtotal, couponDiscount: coupon.discount, giftWrap, paymentMethod: 'cod' })
  const prepaidSaving = codTotals.codFee + codTotals.codGst
  const mrpSaving = lines.reduce((sum, l) => sum + (Number(l.mrp) > Number(l.price) ? (Number(l.mrp) - Number(l.price)) * l.quantity : 0), 0)
  const totalSaving = mrpSaving + totals.discount + (paymentMethod === 'online' ? prepaidSaving : 0)
  const itemCount = lines.reduce((n, l) => n + l.quantity, 0)
  const ctaLabel = submitting || (paymentMethod === 'cod' ? 'Place order' : 'Pay now')

  const lineItems = (
    <ul className="divide-y divide-line">
      {lines.map((line) => (
        <li key={line.productId} className="flex gap-3 py-3">
          <span className="relative h-[72px] w-[58px] shrink-0 overflow-hidden rounded-md bg-mist">
            {line.imageUrl && <img src={line.imageUrl} alt="" className="h-full w-full object-cover" width="58" height="72" loading="lazy" />}
            <span className="absolute right-0.5 top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[0.6875rem] text-white">{line.quantity}</span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="line-clamp-2 text-sm text-ink">{displayProductName(line.name)}</span>
            {Number(line.mrp) > Number(line.price) && <s className="mt-0.5 block text-xs text-muted">{formatInr(line.mrp * line.quantity)}</s>}
          </span>
          <span className="type-price text-sm font-medium">{formatInr(getCartLineSubtotal(line))}</span>
        </li>
      ))}
      {gift && (
        <li className="flex justify-between gap-3 py-3 text-sm">
          <span>
            <span className="mr-2 rounded bg-accent-tint px-1.5 py-0.5 text-[0.6875rem] font-semibold text-accent-ink">GIFT</span>
            {displayProductName(gift.name)}
          </span>
          <span className="font-medium text-accent-ink">Free</span>
        </li>
      )}
    </ul>
  )

  const priceBreakup = (
    <dl className="space-y-2.5 text-sm">
      <div className="flex justify-between">
        <dt className="text-body">
          Subtotal ({itemCount} item{itemCount === 1 ? '' : 's'})
        </dt>
        <dd className="type-price">{formatInr(totals.subtotal)}</dd>
      </div>
      {totals.discount > 0 && (
        <div className="flex justify-between text-accent-ink">
          <dt>Coupon {coupon.code}</dt>
          <dd className="type-price">−{formatInr(totals.discount)}</dd>
        </div>
      )}
      {totals.giftWrapFee > 0 && (
        <div className="flex justify-between">
          <dt className="text-body">Gift wrap</dt>
          <dd className="type-price">{formatInr(totals.giftWrapFee)}</dd>
        </div>
      )}
      <div className="flex justify-between">
        <dt className="text-body">Shipping</dt>
        <dd className={paymentMethod === 'cod' ? '' : 'font-medium text-accent-ink'}>{paymentMethod === 'cod' ? `${formatInr(totals.codFee)} (COD)` : 'FREE'}</dd>
      </div>
      {totals.codGst > 0 && (
        <div className="flex justify-between">
          <dt className="text-body">GST on COD (2%)</dt>
          <dd className="type-price">{formatInr(totals.codGst)}</dd>
        </div>
      )}
      <div className="flex justify-between border-t border-line pt-3 text-base font-semibold">
        <dt className="text-ink">To pay</dt>
        <dd className="type-price text-ink">{formatInr(totals.total)}</dd>
      </div>
    </dl>
  )

  return (
    <>
      <SEOHead title="Secure Checkout | Velisqa" description="Complete your Velisqa order securely." canonicalPath="/checkout" noindex />
      <main className="page-offset-nav min-h-svh bg-mist text-ink">
        <div className="mx-auto max-w-[1080px] px-3 pb-36 pt-4 sm:px-6 lg:pb-20 lg:pt-10">
          {totalSaving > 0 && (
            <p className="mb-3 flex items-center justify-center gap-2 rounded-lg bg-accent-tint px-4 py-2.5 text-center text-sm font-medium text-accent-ink">
              <TagIcon size={16} />
              You’re saving {formatInr(totalSaving)} on this order
            </p>
          )}

          <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6">
            <div className="space-y-3">
              {/* Order summary (collapsed on phones) */}
              <section className="rounded-xl border border-line bg-paper lg:hidden">
                <button
                  type="button"
                  onClick={() => setSummaryOpen((v) => !v)}
                  aria-expanded={summaryOpen}
                  aria-controls="checkout-summary-mobile"
                  className="flex min-h-14 w-full items-center justify-between gap-3 px-4 text-left"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex -space-x-3">
                      {lines.slice(0, 3).map((l) => (
                        <span key={l.productId} className="block h-10 w-8 overflow-hidden rounded border-2 border-paper bg-mist">
                          {l.imageUrl && <img src={l.imageUrl} alt="" className="h-full w-full object-cover" width="32" height="40" />}
                        </span>
                      ))}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-ink">Order summary</span>
                      <span className="block text-xs text-muted">
                        {itemCount} item{itemCount === 1 ? '' : 's'} · {summaryOpen ? 'Hide' : 'View'} details
                      </span>
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="type-price text-base font-semibold">{formatInr(totals.total)}</span>
                    <ChevronDownIcon size={16} className={`transition-transform ${summaryOpen ? 'rotate-180' : ''}`} />
                  </span>
                </button>
                {summaryOpen && (
                  <div id="checkout-summary-mobile" className="border-t border-line px-4 pb-4">
                    {lineItems}
                    <div className="border-t border-line pt-4">{priceBreakup}</div>
                  </div>
                )}
              </section>

              {!user && (
                <p className="rounded-xl border border-line bg-paper px-4 py-3 text-sm text-body">
                  Checking out as a guest.{' '}
                  <button
                    type="button"
                    onClick={() => requireSignIn(() => {}, { returnTo: '/checkout', openCheckout: true })}
                    className="font-medium text-ink underline underline-offset-4 hover:text-accent-ink"
                  >
                    Sign in
                  </button>{' '}
                  to track orders and request returns.
                </p>
              )}

              <form id="checkout-form" onSubmit={handleSubmit} noValidate className="space-y-3">
                <Card step="1" title="Contact details">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Mobile number"
                      prefix="+91"
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]{10}"
                      maxLength={10}
                      autoComplete="tel-national"
                      required
                      value={form.phone}
                      onChange={set('phone')}
                      error={errors.phone}
                      hint="For delivery updates on WhatsApp / SMS"
                    />
                    <Field label="Email (optional)" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} hint="For your order confirmation" />
                  </div>
                </Card>

                <Card step="2" title="Delivery address" aside={<span className="text-xs text-muted">Delivery by {estimate}</span>}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Full name" autoComplete="name" required value={form.name} onChange={set('name')} error={errors.name} className="sm:col-span-2" />
                    <Field
                      label="Pincode"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      maxLength={6}
                      required
                      value={form.pincode}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, pincode: e.target.value.replace(/D/g, '').slice(0, 6) }))
                        clearError('pincode')
                      }}
                      error={errors.pincode}
                      hint={pincodeStatus === 'checking' ? 'Checking…' : pincodeStatus === 'ok' && form.city ? `Delivering to ${form.city}, ${form.state}` : undefined}
                    />
                    <Field label="City" autoComplete="address-level2" value={form.city} onChange={set('city')} />
                    <Field
                      as="textarea"
                      rows={2}
                      label="Address"
                      autoComplete="street-address"
                      required
                      value={form.address}
                      onChange={set('address')}
                      error={errors.address}
                      hint="House / flat number, street, area, landmark"
                      className="sm:col-span-2"
                    />
                    <Field label="State" autoComplete="address-level1" value={form.state} onChange={set('state')} className="sm:col-span-2" />
                  </div>
                  <details className="mt-4">
                    <summary className="inline-flex min-h-11 cursor-pointer list-none items-center text-sm text-body underline underline-offset-4 hover:text-ink [&::-webkit-details-marker]:hidden">
                      Add delivery notes (optional)
                    </summary>
                    <Field label="Delivery notes" value={form.notes} onChange={set('notes')} className="mt-2" hint="e.g. landmark or a preferred delivery time" />
                  </details>
                </Card>
              </form>

              <Card title="Offers & gift wrap">
                <CouponField coupon={coupon} />
                <label className="mt-4 flex min-h-11 cursor-pointer items-center gap-3 text-sm text-body">
                  <input
                    type="checkbox"
                    checked={giftWrap}
                    onChange={(e) => {
                      setGiftWrap(e.target.checked)
                      saveGiftWrap(e.target.checked)
                    }}
                    className="h-[18px] w-[18px] accent-ink"
                  />
                  <GiftIcon size={18} className="shrink-0 text-ink" />
                  Gift wrap ({formatInr(GIFT_WRAP_FEE)})
                </label>
              </Card>

              <Card step="3" title="Payment method">
                <div className="space-y-2.5" role="radiogroup" aria-label="Payment method">
                  <PaymentOption
                    value="online"
                    current={paymentMethod}
                    onChange={setPaymentMethod}
                    title="UPI, cards & net banking"
                    amount={formatInr(onlineTotals.total)}
                    methods={['GPay', 'PhonePe', 'Paytm', 'Cards', 'Net banking']}
                    badge={prepaidSaving > 0 ? `Save ${formatInr(prepaidSaving)} · Free shipping` : 'Free shipping'}
                    hint="Secured by Razorpay."
                  />
                  <PaymentOption
                    value="cod"
                    current={paymentMethod}
                    onChange={setPaymentMethod}
                    title="Cash on delivery"
                    amount={formatInr(codTotals.total)}
                    hint={`Includes ${formatInr(COD_FEE)} COD fee + 2% GST, payable on delivery.`}
                  />
                </div>
              </Card>

              {(checkoutError || stockIssues.length > 0) && (
                <p className="rounded-xl border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger" role="alert">
                  {checkoutError || 'Some items in your bag are no longer available in that quantity. Please review your bag.'}
                </p>
              )}

              <ul className="grid grid-cols-3 gap-2 py-2 text-center text-[0.6875rem] text-body">
                <li className="flex flex-col items-center gap-1.5">
                  <LockIcon size={18} className="text-accent-ink" />
                  Secure payment
                </li>
                <li className="flex flex-col items-center gap-1.5">
                  <TruckIcon size={18} className="text-accent-ink" />
                  Tracked delivery
                </li>
                <li className="flex flex-col items-center gap-1.5">
                  <ReturnIcon size={18} className="text-accent-ink" />
                  5-day returns
                </li>
              </ul>
              <p className="text-center text-xs text-muted">
                By placing your order you agree to our{' '}
                <Link to="/terms" className="underline">
                  terms
                </Link>{' '}
                and{' '}
                <Link to="/refund-cancellation" className="underline">
                  returns policy
                </Link>
                .
              </p>
            </div>

            <aside aria-label="Order summary" className="hidden rounded-xl border border-line bg-paper p-6 lg:sticky lg:top-[calc(var(--nav-height)+1.5rem)] lg:block">
              <h2 className="text-[0.9375rem] font-semibold text-ink">Order summary</h2>
              <div className="mt-2">{lineItems}</div>
              <div className="mt-2 border-t border-line pt-4">{priceBreakup}</div>
              <button type="submit" form="checkout-form" disabled={blocked} className="btn btn-primary mt-6 min-h-14 w-full rounded-lg">
                <LockIcon size={16} />
                {submitting || `${ctaLabel} · ${formatInr(totals.total)}`}
              </button>
              <p className="mt-3 text-center text-xs text-muted">Estimated delivery {estimate}</p>
            </aside>
          </div>
        </div>

        {/* Phones: total + pay, always in reach */}
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] lg:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setSummaryOpen(true)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="min-w-0 text-left"
            >
              <span className="type-price block text-lg font-semibold leading-tight text-ink">{formatInr(totals.total)}</span>
              <span className="text-xs text-accent-ink underline underline-offset-2">View details</span>
            </button>
            <button type="submit" form="checkout-form" disabled={blocked} className="btn btn-primary min-h-[52px] flex-1 rounded-lg">
              <LockIcon size={16} />
              {ctaLabel}
            </button>
          </div>
        </div>
      </main>
    </>
  )
}
