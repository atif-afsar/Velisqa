import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SEOHead from '../Components/SEO/SEOHead'
import Field from '../Components/UI/Field'
import CouponField from '../Components/Cart/CouponField'
import { ChevronDownIcon, LockIcon } from '../Components/UI/Icons'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useCoupon } from '../hooks/useCoupon'
import { formatInr, getCartLineSubtotal } from '../lib/cartStock'
import { isFreeGiftItem } from '../lib/cartOffers'
import { computeCheckoutTotals, COD_FEE, GIFT_WRAP_FEE } from '../lib/checkoutPricing'
import { readGiftWrap, saveGiftWrap, clearAppliedCoupon } from '../lib/coupons'
import { displayProductName } from '../lib/productDisplay'
import { validateIndianPhone } from '../lib/indianPhone'
import { supabase } from '../lib/supabaseClient'
import { invokeEdgeFunction } from '../lib/invokeEdgeFunction'
import { loadRazorpay, preloadRazorpay } from '../lib/loadRazorpay'
import { buildOrderEmailPayload, submitOrderEmail } from '../lib/orderEmail'
import { analytics } from '../lib/analytics'

const PINCODE_KEY = 'velisqa:delivery_pincode'

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

function Section({ step, title, children }) {
  return (
    <section className="border-t border-line pt-8 first:border-t-0 first:pt-0">
      <h2 className="flex items-center gap-3 font-serif text-2xl text-ink">
        <span className="grid h-7 w-7 place-items-center rounded-full border border-ink font-sans text-xs">{step}</span>
        {title}
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  )
}

function PaymentOption({ value, current, onChange, title, hint }) {
  const selected = current === value
  return (
    <label className={`flex cursor-pointer items-start gap-4 border p-4 transition-colors ${selected ? 'border-ink' : 'border-line hover:border-line-strong'}`}>
      <input type="radio" name="payment" value={value} checked={selected} onChange={() => onChange(value)} className="mt-1 h-[18px] w-[18px] accent-ink" />
      <span>
        <span className="block text-sm font-medium text-ink">{title}</span>
        <span className="mt-1 block text-xs leading-relaxed text-muted">{hint}</span>
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

  const lines = items.filter((l) => !isFreeGiftItem(l))
  const gift = items.find(isFreeGiftItem)
  const totals = computeCheckoutTotals({ subtotal: eligibleSubtotal, couponDiscount: coupon.discount, giftWrap, paymentMethod })
  const estimate = useMemo(deliveryWindow, [])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

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
      const { data, error } = await supabase.rpc('create_manual_payment_order', {
        p_customer: {
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
        },
        p_items: items.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          imageUrl: line.imageUrl || null,
          ...(isFreeGiftItem(line) ? { isFreeGift: true } : {}),
        })),
      })
      if (error) throw error
      const order = Array.isArray(data) ? data[0] : data
      if (!order?.order_ref || !order?.access_token) throw new Error('We could not create your order. Please try again.')
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
      const { data: rzp, error: rzpError } = await invokeEdgeFunction('create-razorpay-order', { orderId: orderRef, accessToken })
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
            const { error: verifyError } = await invokeEdgeFunction('verify-razorpay-payment', {
              orderId: orderRef,
              orderRef,
              accessToken,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })
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

  const payLabel = submitting || (paymentMethod === 'cod' ? `Place order · ${formatInr(totals.total)}` : `Pay ${formatInr(totals.total)}`)
  const blocked = Boolean(submitting) || syncing || stockIssues.length > 0

  const summary = (
    <div>
      <ul className="divide-y divide-line">
        {lines.map((line) => (
          <li key={line.productId} className="flex gap-4 py-4">
            <span className="relative h-20 w-16 shrink-0 bg-paper">
              {line.imageUrl && <img src={line.imageUrl} alt="" className="h-full w-full object-cover" width="64" height="80" />}
              <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[0.6875rem] text-white">{line.quantity}</span>
            </span>
            <span className="min-w-0 flex-1 text-sm text-ink">{displayProductName(line.name)}</span>
            <span className="type-price text-sm">{formatInr(getCartLineSubtotal(line))}</span>
          </li>
        ))}
        {gift && (
          <li className="flex justify-between py-4 text-sm">
            <span>
              <span className="eyebrow mr-2 text-accent-ink">Gift</span>
              {displayProductName(gift.name)}
            </span>
            <span className="text-accent-ink">Free</span>
          </li>
        )}
      </ul>

      <div className="border-t border-line pt-5">
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
          Gift wrap ({formatInr(GIFT_WRAP_FEE)})
        </label>
      </div>

      <dl className="mt-4 space-y-2.5 border-t border-line pt-5 text-sm">
        <div className="flex justify-between">
          <dt className="text-body">Subtotal</dt>
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
          <dd>{paymentMethod === 'cod' ? `${formatInr(totals.codFee)} (COD)` : 'Free'}</dd>
        </div>
        {totals.codGst > 0 && (
          <div className="flex justify-between">
            <dt className="text-body">GST on COD (2%)</dt>
            <dd className="type-price">{formatInr(totals.codGst)}</dd>
          </div>
        )}
        <div className="flex justify-between border-t border-line pt-4 text-base">
          <dt className="text-ink">Total</dt>
          <dd className="type-price text-ink">{formatInr(totals.total)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-muted">Estimated delivery {estimate}</p>
    </div>
  )

  return (
    <>
      <SEOHead title="Secure Checkout | Velisqa" description="Complete your Velisqa order securely." canonicalPath="/checkout" noindex />
      <main className="page-offset-nav bg-paper text-ink">
        <div className="container-lux pb-28 pt-8 lg:pb-20 lg:pt-12">
          <div className="flex items-center justify-between">
            <h1 className="type-display text-[clamp(2rem,3vw,2.75rem)]">Checkout</h1>
            <Link to="/cart" className="btn btn-link">
              Back to bag
            </Link>
          </div>

          {/* Mobile summary toggle */}
          <div className="mt-6 border-y border-line lg:hidden">
            <button
              type="button"
              onClick={() => setSummaryOpen((v) => !v)}
              aria-expanded={summaryOpen}
              className="flex min-h-14 w-full items-center justify-between text-sm"
            >
              <span className="flex items-center gap-2">
                {summaryOpen ? 'Hide' : 'Show'} order summary
                <ChevronDownIcon size={14} className={summaryOpen ? 'rotate-180' : ''} />
              </span>
              <span className="type-price">{formatInr(totals.total)}</span>
            </button>
            {summaryOpen && <div className="pb-6">{summary}</div>}
          </div>

          <div className="mt-8 grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-16">
            <form id="checkout-form" onSubmit={handleSubmit} noValidate className="space-y-10">
              {!user && (
                <p className="bg-mist px-4 py-3 text-sm text-body">
                  Checking out as a guest.{' '}
                  <button
                    type="button"
                    onClick={() => requireSignIn(() => {}, { returnTo: '/checkout', openCheckout: true })}
                    className="text-ink underline underline-offset-4 hover:text-accent-ink"
                  >
                    Sign in
                  </button>{' '}
                  to track orders and request returns from your account.
                </p>
              )}

              <Section step="1" title="Contact">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Mobile number" type="tel" inputMode="tel" autoComplete="tel-national" required value={form.phone} onChange={set('phone')} error={errors.phone} hint="For delivery updates" />
                  <Field label="Email (optional)" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} hint="For your order confirmation" />
                </div>
              </Section>

              <Section step="2" title="Delivery">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Full name" autoComplete="name" required value={form.name} onChange={set('name')} error={errors.name} className="sm:col-span-2" />
                  <Field
                    label="Pincode"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    maxLength={6}
                    required
                    value={form.pincode}
                    onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                    error={errors.pincode}
                    hint={pincodeStatus === 'checking' ? 'Checking…' : pincodeStatus === 'ok' && form.city ? `Delivering to ${form.city}, ${form.state}` : undefined}
                  />
                  <Field label="City" autoComplete="address-level2" value={form.city} onChange={set('city')} />
                  <Field
                    as="textarea"
                    rows={3}
                    label="Address"
                    autoComplete="street-address"
                    required
                    value={form.address}
                    onChange={set('address')}
                    error={errors.address}
                    hint="House / flat number, street, area, landmark"
                    className="sm:col-span-2"
                  />
                  <Field label="State" autoComplete="address-level1" value={form.state} onChange={set('state')} />
                  <Field label="Delivery notes (optional)" value={form.notes} onChange={set('notes')} />
                </div>
              </Section>

              <Section step="3" title="Payment">
                <div className="space-y-3" role="radiogroup" aria-label="Payment method">
                  <PaymentOption value="online" current={paymentMethod} onChange={setPaymentMethod} title="Pay online — UPI, cards, net banking" hint="Secured by Razorpay. Free shipping." />
                  <PaymentOption
                    value="cod"
                    current={paymentMethod}
                    onChange={setPaymentMethod}
                    title="Cash on delivery"
                    hint={`${formatInr(COD_FEE)} COD fee + 2% GST, payable on delivery.`}
                  />
                </div>
              </Section>

              {(checkoutError || stockIssues.length > 0) && (
                <p className="border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger" role="alert">
                  {checkoutError || 'Some items in your bag are no longer available in that quantity. Please review your bag.'}
                </p>
              )}

              <div className="hidden lg:block">
                <button type="submit" disabled={blocked} className="btn btn-primary min-h-14 w-full">
                  <LockIcon size={16} />
                  {payLabel}
                </button>
                <p className="mt-3 text-center text-xs text-muted">
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
            </form>

            <aside aria-label="Order summary" className="hidden bg-mist p-8 lg:sticky lg:top-[calc(var(--nav-height)+1.5rem)] lg:block">
              <h2 className="eyebrow text-ink">Order summary</h2>
              <div className="mt-2">{summary}</div>
            </aside>
          </div>
        </div>

        {/* Mobile sticky pay bar */}
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 lg:hidden">
          <button type="submit" form="checkout-form" disabled={blocked} className="btn btn-primary min-h-[52px] w-full">
            <LockIcon size={16} />
            {payLabel}
          </button>
        </div>
      </main>
    </>
  )
}
