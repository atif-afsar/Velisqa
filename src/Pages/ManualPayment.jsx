import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SEOHead from '../Components/SEO/SEOHead'
import PrivateOrderSummary from '../Components/Checkout/PrivateOrderSummary'
import { useCart } from '../context/CartContext'
import { formatInr } from '../lib/cartStock'
import {
  buildUpiPaymentUrl,
  getManualPaymentConfig,
  orderPrivateUrl,
  submitManualPaymentProof,
} from '../lib/manualPayments'
import { trackPaymentProofSubmitted } from '../lib/metaPixel'
import { usePrivateOrder } from '../hooks/usePrivateOrder'

function MobilePaySteps({ fileSelected }) {
  const steps = [
    { id: 1, label: 'Pay' },
    { id: 2, label: 'Screenshot' },
    { id: 3, label: 'Upload' },
  ]
  const active = fileSelected ? 3 : 1

  return (
    <div className="flex gap-2 sm:hidden">
      {steps.map((step) => {
        const done = step.id < active || (step.id === 3 && fileSelected)
        const current = step.id === active
        return (
          <div
            key={step.id}
            className={`flex flex-1 flex-col items-center rounded-xl px-2 py-2.5 text-center ${
              done
                ? 'bg-[#2d6a4f]/10 text-[#2d6a4f]'
                : current
                  ? 'bg-[#3d0a21] text-[#f7ead0]'
                  : 'bg-white/80 text-[#847377]'
            }`}
          >
            <span className="text-[10px] font-bold">{done ? '✓' : step.id}</span>
            <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.08em]">{step.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function PaymentProofForm({
  order,
  file,
  previewUrl,
  utr,
  setFile,
  setUtr,
  submitting,
  submitError,
  config,
  onSubmit,
  className = '',
}) {
  const inputId = 'payment-screenshot-input'

  return (
    <form
      id="payment-proof-form"
      onSubmit={onSubmit}
      className={`rounded-2xl border border-[#d4af37]/20 bg-[#fbf7f1] p-4 shadow-[0_14px_44px_rgba(19,0,6,0.08)] sm:p-6 ${className}`}
    >
      <h2 className="font-serif text-lg font-semibold sm:text-xl">Upload payment proof</h2>
      <p className="mt-1.5 text-xs leading-relaxed text-[#514347]">
        Pay first, then upload your UPI success screenshot here to finish checkout.
      </p>

      {order.paymentStatus === 'rejected' && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
          <strong>Previous proof rejected:</strong>{' '}
          {order.rejectionReason || 'Please upload a clearer payment proof.'}
        </div>
      )}

      <div className="mt-4">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#514347]">
          Payment screenshot <span className="text-[#6f334a]">*</span>
        </span>

        {previewUrl ? (
          <div className="mt-2 rounded-xl border-2 border-[#2d6a4f]/35 bg-white p-3">
            <img
              src={previewUrl}
              alt="Payment screenshot preview"
              className="mx-auto max-h-52 w-full rounded-lg object-contain"
            />
            <p className="mt-2 truncate text-center text-xs text-[#514347]">{file?.name}</p>
            <button
              type="button"
              onClick={() => setFile(null)}
              className="mt-2 flex min-h-10 w-full items-center justify-center rounded-full border border-[#3d0a21]/20 text-xs font-semibold text-[#6f334a]"
            >
              Choose a different image
            </button>
          </div>
        ) : (
          <label
            htmlFor={inputId}
            className="mt-2 flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#3d0a21]/25 bg-white px-4 py-6 active:border-[#3d0a21]/50 active:bg-[#fdf9f4]"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#3d0a21]/8 text-2xl">📷</span>
            <span className="mt-3 text-sm font-semibold text-[#130006]">Tap to upload screenshot</span>
            <span className="mt-1 text-xs text-[#847377]">JPG, PNG, or WebP · max 5 MB</span>
            <input
              id={inputId}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
          </label>
        )}
      </div>

      <label className="mt-4 block">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#514347]">
          UTR / transaction ID <span className="normal-case tracking-normal text-[#847377]">(optional)</span>
        </span>
        <input
          value={utr}
          onChange={(event) => setUtr(event.target.value)}
          maxLength={40}
          inputMode="numeric"
          className="mt-1.5 w-full rounded-xl border border-[#130006]/15 bg-white px-3 py-3 text-base outline-none focus:border-[#6f334a]"
          placeholder="e.g. 123456789012"
        />
      </label>

      {submitError && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-800">
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || !file || !config.upiId}
        className="mt-5 flex min-h-[52px] w-full items-center justify-center rounded-full bg-[#2a0718] px-5 text-sm font-bold uppercase tracking-[0.1em] text-[#f7ead0] transition hover:bg-[#3d0a21] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? 'Submitting…' : 'Submit & place order'}
      </button>
      <p className="mt-3 text-center text-[10px] leading-relaxed text-[#847377]">
        Your bag clears after you submit. We ship once payment is verified.
      </p>
    </form>
  )
}

export default function ManualPayment() {
  const navigate = useNavigate()
  const { clearCart } = useCart()
  const { accessToken, order, loading, error } = usePrivateOrder()
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [utr, setUtr] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [copiedUpi, setCopiedUpi] = useState(false)
  const config = useMemo(() => getManualPaymentConfig(), [])
  const upiUrl = order
    ? buildUpiPaymentUrl({
        ...config,
        amount: order.grandTotal,
        orderRef: order.orderRef,
      })
    : ''

  useEffect(() => {
    if (!order || (order.paymentStatus !== 'payment_submitted' && order.paymentStatus !== 'paid')) return
    navigate(orderPrivateUrl('/order-confirmation', order.orderRef, accessToken), {
      replace: true,
    })
  }, [accessToken, navigate, order])

  useEffect(() => {
    if (!file) {
      setPreviewUrl('')
      return undefined
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setSubmitError('')
    try {
      await submitManualPaymentProof({ order, accessToken, file, utr })
      clearCart()
      trackPaymentProofSubmitted({ orderRef: order.orderRef, value: order.grandTotal })
      navigate(orderPrivateUrl('/order-confirmation', order.orderRef, accessToken), {
        replace: true,
      })
    } catch (err) {
      setSubmitError(err?.message || 'Could not submit your payment proof.')
    } finally {
      setSubmitting(false)
    }
  }

  async function copyUpiId() {
    if (!config.upiId) return
    try {
      await navigator.clipboard.writeText(config.upiId)
      setCopiedUpi(true)
      window.setTimeout(() => setCopiedUpi(false), 2000)
    } catch {
      /* ignore */
    }
  }

  if (loading) {
    return <main className="page-offset-nav min-h-[60vh] bg-[#f9f5f0] p-8 text-center">Loading order…</main>
  }

  if (error || !order) {
    return (
      <main className="page-offset-nav min-h-[60vh] bg-[#f9f5f0] px-4 py-16 text-center">
        <h1 className="font-serif text-2xl text-[#130006]">Payment link unavailable</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-[#514347]">{error}</p>
        <Link to="/contact" className="mt-6 inline-flex text-sm font-semibold text-[#6f334a] hover:underline">
          Contact support
        </Link>
      </main>
    )
  }

  if (order.paymentStatus === 'payment_submitted' || order.paymentStatus === 'paid') return null

  const formProps = {
    order,
    file,
    previewUrl,
    utr,
    setFile,
    setUtr,
    submitting,
    submitError,
    config,
    onSubmit: handleSubmit,
  }

  return (
    <>
      <SEOHead
        title={`Pay for ${order.orderRef} | Velisqa`}
        description="Pay for your Velisqa order using UPI and submit payment proof securely."
        canonicalPath={`/pay/${order.orderRef}`}
        noindex
      />
      <main className="page-offset-nav min-h-screen bg-[#f9f5f0] pb-28 text-[#130006] sm:px-6 sm:py-14 sm:pb-14">
        {/* Mobile sticky amount bar */}
        <div className="sticky top-[calc(var(--announcement-height)+var(--nav-height,0px))] z-30 border-b border-[#d4af37]/20 bg-[#fdf9f4]/95 px-4 py-3 backdrop-blur-md sm:static sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
          <div className="container-stitch mx-auto flex max-w-4xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#847377]">Pay exactly</p>
              <p className="font-serif text-2xl font-semibold text-[#3d0a21] sm:text-4xl">{formatInr(order.grandTotal)}</p>
            </div>
            <div className="shrink-0 rounded-xl bg-[#f1ede8] px-3 py-2 text-right">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#847377]">Order</p>
              <p className="max-w-[9rem] truncate font-mono text-[10px] font-semibold text-[#130006] sm:max-w-none sm:text-[11px]">
                {order.orderRef}
              </p>
            </div>
          </div>
        </div>

        <div className="container-stitch mx-auto max-w-4xl px-4 pt-4 sm:pt-0">
          <div className="mb-5 text-center sm:mb-8">
            <p className="type-label hidden text-[#847377] sm:block">Step 2 of 2 · UPI payment</p>
            <h1 className="mt-0 font-serif text-2xl font-semibold sm:mt-3 sm:text-4xl">Scan & pay with UPI</h1>
            <p className="mx-auto mt-2 hidden max-w-2xl text-sm leading-relaxed text-[#514347] sm:block">
              Pay the exact amount, then upload your payment screenshot to complete checkout.
            </p>
          </div>

          <div className="mb-4 sm:mb-8">
            <MobilePaySteps fileSelected={Boolean(file)} />
          </div>

          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6">
            {/* QR / pay section — first on mobile */}
            <section className="order-1 rounded-2xl border border-[#d4af37]/20 bg-white/90 p-4 shadow-[0_14px_44px_rgba(19,0,6,0.06)] sm:p-7 lg:col-start-1 lg:row-start-1">
              <p className="text-center text-[10px] font-bold uppercase tracking-[0.16em] text-[#847377] sm:hidden">
                Step 1 · Scan to pay
              </p>

              <div className="mx-auto mt-3 max-w-[280px] sm:mt-6 sm:max-w-xs">
                <div className="rounded-2xl border-2 border-[#3d0a21]/10 bg-white p-3 shadow-inner sm:p-4">
                  <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-[#847377]">
                    PhonePe · GPay · Paytm
                  </p>
                  <div className="mx-auto flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-[#fdf9f4] p-2">
                    <img
                      src={config.qrImageUrl}
                      alt="Velisqa UPI QR code"
                      className="h-full w-full object-contain"
                      onError={(event) => {
                        event.currentTarget.hidden = true
                        event.currentTarget.nextElementSibling.hidden = false
                      }}
                    />
                    <p hidden className="p-4 text-center text-sm text-[#6f334a]">
                      QR missing — use UPI ID below.
                    </p>
                  </div>
                </div>
              </div>

              {config.upiId ? (
                <div className="mt-4 space-y-3">
                  <a
                    href={upiUrl}
                    className="flex min-h-[52px] w-full items-center justify-center rounded-full bg-[#3d0a21] px-6 text-sm font-bold uppercase tracking-[0.08em] text-[#f7ead0] transition active:scale-[0.98] sm:hidden"
                  >
                    Open UPI app
                  </a>

                  <div className="rounded-xl bg-[#f1ede8] p-3 sm:text-center">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#847377]">
                      Or copy UPI ID
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <p className="min-w-0 flex-1 truncate font-mono text-sm font-semibold text-[#130006]">
                        {config.upiId}
                      </p>
                      <button
                        type="button"
                        onClick={() => void copyUpiId()}
                        className="shrink-0 rounded-full border border-[#3d0a21]/20 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[#3d0a21]"
                      >
                        {copiedUpi ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    {config.payeeName && (
                      <p className="mt-1.5 text-xs text-[#847377]">Name: {config.payeeName}</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-center text-xs text-amber-900">
                  UPI is not configured. Contact support before paying.
                </p>
              )}
            </section>

            {/* Submit form — second on mobile, right column on desktop */}
            <PaymentProofForm
              {...formProps}
              className="order-2 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-28 lg:self-start"
            />

            {/* Order details — last on mobile */}
            <div className="order-3 lg:col-start-1 lg:row-start-2">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#847377] sm:hidden">
                Your order
              </p>
              <PrivateOrderSummary order={order} />
            </div>
          </div>
        </div>

        {/* Mobile sticky submit when screenshot selected */}
        {file && !submitting && (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#d4af37]/20 bg-[#fdf9f4]/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:hidden">
            <button
              type="submit"
              form="payment-proof-form"
              disabled={!config.upiId}
              className="flex min-h-[52px] w-full items-center justify-center rounded-full bg-[#2a0718] text-sm font-bold uppercase tracking-[0.1em] text-[#f7ead0] disabled:opacity-50"
            >
              Submit & place order
            </button>
          </div>
        )}
      </main>
    </>
  )
}
