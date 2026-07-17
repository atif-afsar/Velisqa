import { Link } from 'react-router-dom'
import { useState } from 'react'
import SEOHead from '../Components/SEO/SEOHead'
import PrivateOrderSummary from '../Components/Checkout/PrivateOrderSummary'
import { cancelCustomerOrder, orderPrivateUrl } from '../lib/manualPayments'
import { buildNimbusPostTrackingUrl } from '../lib/orderStatuses'
import {
  buildTrackingTimeline,
  canCustomerCancelOrder,
  getPaymentStatusLabel,
  getShipmentStatusLabel,
  isCodOrder,
} from '../lib/orderTracking'
import { usePrivateOrder } from '../hooks/usePrivateOrder'
import { useLiveTracking, useTrackingEnabled } from '../hooks/useLiveTracking'

export default function OrderTracking() {
  const { accessToken, order, loading, refreshing, error, lastUpdatedAt, refresh } = usePrivateOrder()
  const [cancelBusy, setCancelBusy] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const [cancelMessage, setCancelMessage] = useState('')

  const trackingEnabled = useTrackingEnabled(order)
  const { tracking, loading: trackingLoading, error: trackingError, refresh: refreshTracking } = useLiveTracking({
    orderRef: order?.orderRef,
    accessToken,
    awbNumber: order?.awbNumber,
    enabled: trackingEnabled,
  })

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

  const timeline = buildTrackingTimeline(order)
  const isCancelled = order.orderStatus === 'cancelled'
  const isDispatched = order.shippingStatus !== 'not_shipped' || Boolean(order.awbNumber)
  const trackingUrl = isDispatched
    ? buildNimbusPostTrackingUrl({
        awbNumber: order.awbNumber,
        orderRef: order.orderRef,
        trackingUrl: order.trackingUrl,
      })
    : null
  const awaitingDispatch = !isDispatched && !isCancelled
  const showCancel = canCustomerCancelOrder(order)
  const latestScan = tracking?.latest || tracking?.scans?.[0] || null

  async function handleCancel() {
    if (!window.confirm(
      order.awbNumber
        ? 'Cancel this order? If the courier has not picked up yet, the shipment will be stopped.'
        : 'Cancel this order before it is dispatched?',
    )) return

    setCancelBusy(true)
    setCancelError('')
    setCancelMessage('')

    const { data, error: invokeError } = await cancelCustomerOrder(order.orderRef, accessToken)
    if (invokeError) {
      setCancelError(invokeError)
    } else {
      setCancelMessage(data?.message || 'Your order was cancelled.')
      await refresh({ silent: true })
    }
    setCancelBusy(false)
  }

  async function handleRefreshAll() {
    await Promise.all([
      refresh({ silent: true }),
      refreshTracking({ silent: true }),
    ])
  }

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
              {lastUpdatedAt && (
                <p className="mt-2 text-xs text-[#847377]">
                  {refreshing ? 'Updating…' : `Last updated ${new Date(lastUpdatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · auto-refresh every 25s`}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => void handleRefreshAll()}
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

          {cancelMessage && (
            <div className="mt-6 rounded-xl border border-[#2d6a4f]/25 bg-[#edf7f1] p-4 text-sm text-[#1f4334]">
              {cancelMessage}
            </div>
          )}

          {cancelError && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              {cancelError}
            </div>
          )}

          {order.paymentStatus === 'rejected' && !isCancelled && (
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
                  {getPaymentStatusLabel(order)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#847377]">Shipment</p>
                <p className="mt-1 text-sm font-semibold text-[#130006]">
                  {getShipmentStatusLabel(order)}
                </p>
              </div>
            </div>

            <ol className="mt-7 space-y-0">
              {timeline.map((step) => (
                <StatusStep key={step.id} step={step} />
              ))}
            </ol>

            {awaitingDispatch && (
              <div className="mt-6 rounded-xl border border-[#d4af37]/25 bg-[#fbf7f1] p-4 text-sm text-[#514347]">
                <p className="font-semibold text-[#130006]">Preparing your dispatch</p>
                <p className="mt-1 leading-relaxed">
                  {isCodOrder(order)
                    ? 'Your COD order is confirmed. AWB and live tracking appear here once our team ships via NimbusPost.'
                    : 'Your tracking link and AWB appear here after payment is approved and the parcel is handed to the courier.'}
                </p>
              </div>
            )}

            {(order.awbNumber || trackingUrl) && !isCancelled && (
              <div className="mt-6 rounded-xl bg-[#f1ede8] p-4 text-sm text-[#514347]">
                <p className="font-semibold text-[#130006]">Shipment details</p>
                {order.courierName && <p className="mt-2">Courier: <strong>{order.courierName}</strong></p>}
                {order.awbNumber && <p className="mt-1">AWB: <strong className="font-mono">{order.awbNumber}</strong></p>}
                {trackingUrl && (
                  <a
                    href={trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex font-semibold text-[#6f334a] hover:underline"
                  >
                    Open live map on NimbusPost →
                  </a>
                )}
              </div>
            )}

            {trackingEnabled && (
              <div className="mt-6 rounded-xl border border-[#2d6a4f]/15 bg-[#f7fbf8] p-4 text-sm text-[#514347]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-[#130006]">Live parcel updates</p>
                  {trackingLoading && <span className="text-xs text-[#847377]">Fetching scans…</span>}
                </div>

                {latestScan ? (
                  <>
                    <p className="mt-3 text-base font-semibold text-[#130006]">{latestScan.status}</p>
                    {latestScan.location && (
                      <p className="mt-1">Last seen at <strong>{latestScan.location}</strong></p>
                    )}
                    {latestScan.remark && <p className="mt-1 text-[#847377]">{latestScan.remark}</p>}
                    {latestScan.timestamp && (
                      <p className="mt-1 text-xs text-[#847377]">
                        {new Date(latestScan.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="mt-2 leading-relaxed">
                    {trackingError || tracking?.message || 'Waiting for the courier to scan your parcel. Updates refresh automatically.'}
                  </p>
                )}

                {tracking?.scans?.length > 1 && (
                  <ul className="mt-4 space-y-3 border-t border-[#2d6a4f]/10 pt-4">
                    {tracking.scans.slice(0, 6).map((scan, index) => (
                      <li key={`${scan.status}-${scan.timestamp}-${index}`} className="flex gap-3">
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#2d6a4f]" />
                        <div>
                          <p className="font-medium text-[#130006]">{scan.status}</p>
                          {scan.location && <p className="text-xs text-[#847377]">{scan.location}</p>}
                          {scan.timestamp && (
                            <p className="text-xs text-[#847377]">
                              {new Date(scan.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>

          {showCancel && (
            <section className="mt-6 rounded-2xl border border-[#130006]/10 bg-white/70 p-5 sm:p-6">
              <p className="font-semibold text-[#130006]">Need to cancel?</p>
              <p className="mt-2 text-sm leading-relaxed text-[#514347]">
                You can cancel before delivery if the parcel has not left for your address yet.
                {order.awbNumber ? ' If pickup already happened, contact us on WhatsApp.' : ''}
              </p>
              <button
                type="button"
                disabled={cancelBusy}
                onClick={() => void handleCancel()}
                className="mt-4 rounded-full border border-red-300 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.08em] text-red-800 disabled:opacity-50"
              >
                {cancelBusy ? 'Cancelling…' : 'Cancel order'}
              </button>
            </section>
          )}

          <div className="mt-6">
            <PrivateOrderSummary order={order} />
          </div>
        </div>
      </main>
    </>
  )
}

function StatusStep({ step }) {
  const complete = step.complete && !step.muted
  const active = step.active && !step.muted

  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
            complete
              ? 'bg-[#2d6a4f] text-white'
              : active
                ? 'border-2 border-[#2d6a4f] bg-white text-[#2d6a4f]'
                : 'border border-[#847377]/30 bg-white text-[#847377]'
          }`}
        >
          {complete ? '✓' : active ? '•' : ''}
        </span>
        {!step.last && (
          <span className={`h-10 w-px ${complete ? 'bg-[#2d6a4f]' : 'bg-[#847377]/20'}`} />
        )}
      </div>
      <div className="pb-4">
        <p className={`text-sm ${complete || active ? 'font-semibold text-[#130006]' : 'text-[#847377]'}`}>
          {step.label}
        </p>
        {step.detail && (
          <p className="mt-0.5 text-xs leading-relaxed text-[#847377]">{step.detail}</p>
        )}
      </div>
    </li>
  )
}
