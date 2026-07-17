import { Link } from 'react-router-dom'
import SEOHead from '../Components/SEO/SEOHead'
import PrivateOrderSummary from '../Components/Checkout/PrivateOrderSummary'
import { orderPrivateUrl } from '../lib/manualPayments'
import { PAYMENT_STATUS_LABELS } from '../lib/orderStatuses'
import { usePrivateOrder } from '../hooks/usePrivateOrder'

export default function ManualPaymentConfirmation() {
  const { accessToken, order, loading, error } = usePrivateOrder()

  if (loading) {
    return <main className="page-offset-nav min-h-[60vh] bg-[#f9f5f0] p-8 text-center">Loading order…</main>
  }

  if (error || !order) {
    return (
      <main className="page-offset-nav min-h-[60vh] bg-[#f9f5f0] px-4 py-16 text-center">
        <h1 className="font-serif text-2xl text-[#130006]">Order link unavailable</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-[#514347]">{error}</p>
      </main>
    )
  }

  const submitted = order.paymentStatus === 'payment_submitted'
  const paid = order.paymentStatus === 'paid'

  return (
    <>
      <SEOHead
        title={`Order ${order.orderRef} | Velisqa`}
        description="Your Velisqa payment proof and order status."
        canonicalPath={`/order-confirmation/${order.orderRef}`}
        noindex
      />
      <main className="page-offset-nav min-h-screen bg-[#f9f5f0] px-4 py-12 text-[#130006] sm:px-6 sm:py-16">
        <div className="container-stitch mx-auto max-w-2xl">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#2d6a4f] text-2xl text-white">
              ✓
            </div>
            <p className="mt-5 type-label text-[#847377]">
              {PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus}
            </p>
            <h1 className="mt-3 font-serif text-3xl font-semibold sm:text-4xl">
              {paid ? 'Payment confirmed' : submitted ? 'Payment proof received' : 'Order created'}
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-[#514347]">
              {paid
                ? 'Your payment has been verified. We are preparing your order and will share shipment details once dispatched.'
                : submitted
                  ? 'We have received your payment proof. Our team will review it within a few hours and update this private tracking page.'
                  : 'Complete your UPI payment and submit the screenshot to continue.'}
            </p>
          </div>

          <div className="mt-8">
            <PrivateOrderSummary order={order} />
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {!submitted && !paid && (
              <Link
                to={orderPrivateUrl('/pay', order.orderRef, accessToken)}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#3d0a21] px-6 text-xs font-bold uppercase tracking-[0.12em] text-[#f7ead0]"
              >
                Continue payment
              </Link>
            )}
            <Link
              to={orderPrivateUrl('/orders', order.orderRef, accessToken)}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#3d0a21]/25 px-6 text-xs font-bold uppercase tracking-[0.12em] text-[#3d0a21]"
            >
              Track order
            </Link>
          </div>
          <p className="mt-5 text-center text-xs text-[#847377]">
            Save this private page link. It contains access to your order status.
          </p>
        </div>
      </main>
    </>
  )
}
