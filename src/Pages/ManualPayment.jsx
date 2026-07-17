import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SEOHead from '../Components/SEO/SEOHead'
import PrivateOrderSummary from '../Components/Checkout/PrivateOrderSummary'
import { formatInr } from '../lib/cartStock'
import {
  buildUpiPaymentUrl,
  getManualPaymentConfig,
  orderPrivateUrl,
  submitManualPaymentProof,
} from '../lib/manualPayments'
import { trackPaymentProofSubmitted } from '../lib/metaPixel'
import { usePrivateOrder } from '../hooks/usePrivateOrder'

export default function ManualPayment() {
  const navigate = useNavigate()
  const { accessToken, order, loading, error } = usePrivateOrder()
  const [file, setFile] = useState(null)
  const [utr, setUtr] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
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

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setSubmitError('')
    try {
      await submitManualPaymentProof({ order, accessToken, file, utr })
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

  return (
    <>
      <SEOHead
        title={`Pay for ${order.orderRef} | Velisqa`}
        description="Pay for your Velisqa order using UPI and submit payment proof securely."
        canonicalPath={`/pay/${order.orderRef}`}
        noindex
      />
      <main className="page-offset-nav min-h-screen bg-[#f9f5f0] px-4 py-10 text-[#130006] sm:px-6 sm:py-14">
        <div className="container-stitch mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <p className="type-label text-[#847377]">Secure manual UPI payment</p>
            <h1 className="mt-3 font-serif text-3xl font-semibold sm:text-4xl">Complete your payment</h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#514347]">
              Pay the exact amount, add <strong>{order.orderRef}</strong> in your UPI remarks, then upload
              the payment screenshot for review.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-6">
              <section className="rounded-2xl border border-[#d4af37]/20 bg-white/70 p-5 text-center shadow-[0_14px_44px_rgba(19,0,6,0.06)] sm:p-7">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#847377]">Amount to pay</p>
                <p className="mt-2 font-serif text-4xl font-semibold text-[#3d0a21]">
                  {formatInr(order.grandTotal)}
                </p>

                <div className="mx-auto mt-5 flex min-h-56 max-w-56 items-center justify-center overflow-hidden rounded-xl border border-[#130006]/10 bg-white p-2">
                  <img
                    src={config.qrImageUrl}
                    alt="VELISQA UPI payment QR code"
                    className="h-full w-full object-contain"
                    onError={(event) => {
                      event.currentTarget.hidden = true
                      event.currentTarget.nextElementSibling.hidden = false
                    }}
                  />
                  <p hidden className="p-5 text-sm leading-relaxed text-[#6f334a]">
                    QR image is not configured. Use the UPI button below or contact support.
                  </p>
                </div>

                {config.upiId ? (
                  <>
                    <p className="mt-4 text-xs text-[#847377]">
                      UPI ID: <strong className="select-all text-[#130006]">{config.upiId}</strong>
                    </p>
                    <a
                      href={upiUrl}
                      className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-[#3d0a21] px-6 text-xs font-bold uppercase tracking-[0.12em] text-[#f7ead0] lg:hidden"
                    >
                      Open UPI app
                    </a>
                  </>
                ) : (
                  <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Online payment is not configured yet. Please contact support before paying.
                  </p>
                )}
              </section>

              <PrivateOrderSummary order={order} />
            </div>

            <form
              onSubmit={handleSubmit}
              className="h-fit rounded-2xl border border-[#d4af37]/20 bg-[#fbf7f1] p-5 shadow-[0_14px_44px_rgba(19,0,6,0.08)] sm:p-6"
            >
              <h2 className="font-serif text-xl font-semibold">Submit payment proof</h2>
              {order.paymentStatus === 'rejected' && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  <strong>Previous proof rejected:</strong>{' '}
                  {order.rejectionReason || 'Please upload a clearer payment proof.'}
                </div>
              )}

              <label className="mt-5 block">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#514347]">
                  UTR / transaction ID <span className="normal-case tracking-normal text-[#847377]">(optional)</span>
                </span>
                <input
                  value={utr}
                  onChange={(event) => setUtr(event.target.value)}
                  maxLength={40}
                  className="mt-1.5 w-full rounded-lg border border-[#130006]/15 bg-white px-3 py-2.5 text-base outline-none focus:border-[#6f334a]"
                  placeholder="Enter transaction reference"
                />
              </label>

              <label className="mt-4 block">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#514347]">
                  Payment screenshot
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  required
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                  className="mt-1.5 block w-full rounded-lg border border-dashed border-[#3d0a21]/25 bg-white p-3 text-xs text-[#514347] file:mr-3 file:rounded-full file:border-0 file:bg-[#3d0a21] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
                />
                <span className="mt-1.5 block text-[10px] text-[#847377]">JPG, PNG, or WebP · maximum 5 MB</span>
              </label>

              {submitError && (
                <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                  {submitError}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || !file || !config.upiId}
                className="mt-5 flex min-h-12 w-full items-center justify-center rounded-full bg-[#2a0718] px-5 text-xs font-bold uppercase tracking-[0.12em] text-[#f7ead0] transition hover:bg-[#3d0a21] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? 'Uploading proof…' : 'Submit payment proof'}
              </button>
              <p className="mt-3 text-center text-[10px] leading-relaxed text-[#847377]">
                Your order ships only after our team verifies the payment.
              </p>
            </form>
          </div>
        </div>
      </main>
    </>
  )
}
