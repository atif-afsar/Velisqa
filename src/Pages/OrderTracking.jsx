import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import SEOHead from '../Components/SEO/SEOHead'
import PrivateOrderSummary from '../Components/Checkout/PrivateOrderSummary'
import { orderPrivateUrl } from '../lib/manualPayments'
import { PAYMENT_STATUS_LABELS, SHIPPING_STATUS_LABELS, buildNimbusPostTrackingUrl } from '../lib/orderStatuses'
import { usePrivateOrder } from '../hooks/usePrivateOrder'

const SHIPPING_STEPS = ['not_shipped', 'shipped', 'out_for_delivery', 'delivered']

export default function OrderTracking() {
  const { accessToken, order, loading, error, refresh } = usePrivateOrder()

  useEffect(() => {
    if (!order || order.shippingStatus === 'delivered' || order.shippingStatus === 'rto') return undefined
    const timer = window.setInterval(() => {
      void refresh()
    }, 45000)
    return () => window.clearInterval(timer)
  }, [order, refresh])

  if (loading) {
    return <main className="page-offset-nav min-h-[60vh] bg-[#f9f5f0] p-8 text-center">Loading status…</main>
  }

  if (error || !order) {
    return (
      <main className="page-offset-nav min-h-[60vh] bg-[#f9f5f0] px-4 py-16 text-center">
        <h1 className="font-serif text-2xl text-[#130006]">Order not found</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-[#514347]">{error}</p>
      </main>
    )
  }

  const isDispatched = order.shippingStatus !== 'not_shipped' || Boolean(order.awbNumber)
  const trackingUrl = isDispatched
    ? buildNimbusPostTrackingUrl({
        awbNumber: order.awbNumber,
        orderRef: order.orderRef,
        trackingUrl: order.trackingUrl,
      })
    : null
  const shippingIndex = Math.max(
    SHIPPING_STEPS.indexOf(order.shippingStatus),
    order.awbNumber ? SHIPPING_STEPS.indexOf('shipped') : -1,
  )
  const paymentComplete = order.paymentStatus === 'paid'
  const isCancelled = order.orderStatus === 'cancelled'
  const awaitingDispatch = !isDispatched && !isCancelled
  const hasShipmentDetails = isDispatched && Boolean(order.awbNumber || order.courierName || trackingUrl)

  return (
    <>
      <SEOHead
        title={`Track ${order.orderRef} | Velisqa`}
        description="Track your private Velisqa order status."
        canonicalPath={`/orders/${order.orderRef}`}
        noindex
      />
      <main className="page-offset-nav min-h-screen bg-[#f9f5f0] px-4 py-12 text-[#130006] sm:px-6 sm:py-16">
        <div className="container-stitch mx-auto max-w-2xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="type-label text-[#847377]">Private order tracking</p>
              <h1 className="mt-2 font-serif text-3xl font-semibold">Track your order</h1>
            </div>
            <button
              type="button"
              onClick={() => void refresh()}
              className="rounded-full border border-[#3d0a21]/20 px-4 py-2 text-xs font-semibold text-[#3d0a21]"
            >
              Refresh status
            </button>
          </div>

          {isCancelled && (
            <div className="mt-6 rounded-xl border border-[#130006]/15 bg-[#f1ede8] p-4 text-sm text-[#514347]">
              <p className="font-semibold text-[#130006]">This order was cancelled</p>
              <p className="mt-1 leading-relaxed">
                Your order is no longer being processed. If you already paid online and need help, contact Velisqa support.
              </p>
            </div>
          )}

          {order.paymentStatus === 'rejected' && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              <p className="font-semibold">Payment proof was not approved</p>
              <p className="mt-1">{order.rejectionReason || 'Please submit a clearer payment proof.'}</p>
              <Link
                to={orderPrivateUrl('/pay', order.orderRef, accessToken)}
                className="mt-3 inline-flex font-semibold text-[#6f334a] hover:underline"
              >
                Upload new proof →
              </Link>
            </div>
          )}

          <section className="mt-6 rounded-2xl border border-[#d4af37]/20 bg-white/70 p-5 shadow-[0_14px_44px_rgba(19,0,6,0.06)] sm:p-7">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#847377]">Payment</p>
                <p className="mt-1 text-sm font-semibold text-[#130006]">
                  {PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#847377]">Shipment</p>
                <p className="mt-1 text-sm font-semibold text-[#130006]">
                  {SHIPPING_STATUS_LABELS[order.shippingStatus] || order.shippingStatus}
                </p>
              </div>
            </div>

            <ol className="mt-7 space-y-0">
              <StatusStep
                label="Order received"
                complete={order.paymentStatus !== 'awaiting_payment'}
              />
              <StatusStep label="Payment confirmed" complete={paymentComplete} />
              <StatusStep label="Shipped" complete={shippingIndex >= 1} />
              <StatusStep label="Out for delivery" complete={shippingIndex >= 2} />
              <StatusStep label="Delivered" complete={shippingIndex >= 3} last />
            </ol>

            {awaitingDispatch && (
              <div className="mt-6 rounded-xl border border-[#d4af37]/25 bg-[#fbf7f1] p-4 text-sm text-[#514347]">
                <p className="font-semibold text-[#130006]">Preparing your dispatch</p>
                <p className="mt-1 leading-relaxed">
                  Your tracking link and AWB will appear here after our team creates the NimbusPost shipment.
                  For COD orders, this happens once the order is packed and handed to the courier partner.
                </p>
              </div>
            )}

            {hasShipmentDetails && !isCancelled && (
              <div className="mt-6 rounded-xl bg-[#f1ede8] p-4 text-sm text-[#514347]">
                <p className="font-semibold text-[#130006]">Your parcel is on its way</p>
                {order.courierName && <p className="mt-2">Courier: <strong>{order.courierName}</strong></p>}
                {order.awbNumber && <p className="mt-1">AWB: <strong className="font-mono">{order.awbNumber}</strong></p>}
                {trackingUrl && (
                  <a
                    href={trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex font-semibold text-[#6f334a] hover:underline"
                  >
                    Track shipment on NimbusPost →
                  </a>
                )}
              </div>
            )}
          </section>

          <div className="mt-6">
            <PrivateOrderSummary order={order} />
          </div>
        </div>
      </main>
    </>
  )
}

function StatusStep({ label, complete, last = false }) {
  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
            complete ? 'bg-[#2d6a4f] text-white' : 'border border-[#847377]/30 bg-white text-[#847377]'
          }`}
        >
          {complete ? '✓' : ''}
        </span>
        {!last && <span className={`h-8 w-px ${complete ? 'bg-[#2d6a4f]' : 'bg-[#847377]/20'}`} />}
      </div>
      <p className={`pt-0.5 text-sm ${complete ? 'font-semibold text-[#130006]' : 'text-[#847377]'}`}>{label}</p>
    </li>
  )
}
