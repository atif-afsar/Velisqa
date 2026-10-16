import { Link } from 'react-router-dom'
import { useState } from 'react'
import SEOHead from '../Components/SEO/SEOHead'
import PrivateOrderSummary from '../Components/Checkout/PrivateOrderSummary'
import { cancelCustomerOrder, orderPrivateUrl } from '../lib/manualPayments'
import { buildNimbusPostTrackingUrl } from '../lib/orderStatuses'
import { useAuth } from '../context/AuthContext'
import {
  buildTrackingTimeline,
  canCustomerCancelOrder,
  getPaymentStatusLabel,
  getShipmentStatusLabel,
  isCodOrder,
} from '../lib/orderTracking'
import { usePrivateOrder } from '../hooks/usePrivateOrder'
import { useLiveTracking, useTrackingEnabled } from '../hooks/useLiveTracking'
import RefreshCountdown from '../Components/OrderTracking/RefreshCountdown'
import OrderReturnPanel from '../Components/Orders/OrderReturnPanel'
import OrderReviewLinks from '../Components/Orders/OrderReviewLinks'

export default function OrderTracking() {
  const { user } = useAuth()
  const { accessToken, order, loading, refreshing, error, lastUpdatedAt, refresh } = usePrivateOrder()
  const [cancelBusy, setCancelBusy] = useState(false)
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)
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
    return <main className="page-offset-nav min-h-[60vh] bg-mist p-8 text-center">Loading status…</main>
  }

  if (error || !order) {
    return (
      <main className="page-offset-nav min-h-[60vh] bg-mist px-4 py-16 text-center">
        <h1 className="font-serif text-2xl text-ink">Order not found</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-body">{error}</p>
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

  async function confirmCancel() {
    setCancelBusy(true)
    setCancelError('')
    setCancelMessage('')

    const { data, error: invokeError } = await cancelCustomerOrder(order.orderRef, accessToken)
    if (invokeError) {
      setCancelError(invokeError)
    } else {
      setCancelMessage(data?.message || 'Your order was cancelled.')
      setCancelConfirmOpen(false)
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
      <main className="page-offset-nav min-h-screen bg-mist px-4 py-12 text-ink sm:px-6 sm:py-16">
        <div className="container-stitch mx-auto max-w-2xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="type-label text-muted">Private order tracking</p>
              <h1 className="mt-2 font-serif text-3xl font-semibold">Track your order</h1>
              {lastUpdatedAt && (
                <p className="mt-2 text-xs text-muted">
                  {refreshing ? 'Updating…' : (
                    <>
                      Last updated {new Date(lastUpdatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      {trackingEnabled ? (
                        <>
                          {' · '}
                          <RefreshCountdown active={trackingEnabled} />
                        </>
                      ) : (
                        ' · auto-refresh every 25s'
                      )}
                    </>
                  )}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => void handleRefreshAll()}
              className="rounded-full border border-ink/20 px-4 py-2 text-xs font-semibold text-ink"
            >
              Refresh status
            </button>
            {user && (
              <Link
                to="/account/orders"
                className="rounded-full border border-ink/20 px-4 py-2 text-xs font-semibold text-ink"
              >
                My orders
              </Link>
            )}
          </div>

          {isCancelled && (
            <div className="mt-6 rounded-xl border border-ink/15 bg-mist p-4 text-sm text-body">
              <p className="font-semibold text-ink">This order was cancelled</p>
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
                className="mt-3 inline-flex font-semibold text-ink hover:underline"
              >
                Upload new proof →
              </Link>
            </div>
          )}

          <section className="mt-6 rounded-2xl border border-line bg-white/70 p-5 shadow-[0_14px_44px_rgba(17, 17, 17,0.06)] sm:p-7">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">Payment</p>
                <p className="mt-1 text-sm font-semibold text-ink">
                  {getPaymentStatusLabel(order)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">Shipment</p>
                <p className="mt-1 text-sm font-semibold text-ink">
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
              <div className="mt-6 rounded-xl border border-line bg-mist p-4 text-sm text-body">
                <p className="font-semibold text-ink">Preparing your dispatch</p>
                <p className="mt-1 leading-relaxed">
                  {isCodOrder(order)
                    ? 'Your COD order is confirmed. AWB and live tracking appear here once our team ships via NimbusPost.'
                    : 'Your tracking link and AWB appear here after payment is approved and the parcel is handed to the courier.'}
                </p>
              </div>
            )}

            {(order.awbNumber || trackingUrl) && !isCancelled && (
              <div className="mt-6 rounded-xl bg-mist p-4 text-sm text-body">
                <p className="font-semibold text-ink">Shipment details</p>
                {order.courierName && <p className="mt-2">Courier: <strong>{order.courierName}</strong></p>}
                {order.awbNumber && <p className="mt-1">AWB: <strong className="font-mono">{order.awbNumber}</strong></p>}
                {trackingUrl && (
                  <a
                    href={trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex font-semibold text-ink hover:underline"
                  >
                    Open live map on NimbusPost →
                  </a>
                )}
              </div>
            )}

            {trackingEnabled && (
              <div className="mt-6 rounded-xl border border-[#2d6a4f]/15 bg-[#f7fbf8] p-4 text-sm text-body">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-ink">Live parcel updates</p>
                  {trackingLoading && <span className="text-xs text-muted">Fetching scans…</span>}
                </div>

                {latestScan ? (
                  <>
                    <p className="mt-3 text-base font-semibold text-ink">{latestScan.status}</p>
                    {latestScan.location && (
                      <p className="mt-1">Last seen at <strong>{latestScan.location}</strong></p>
                    )}
                    {latestScan.remark && <p className="mt-1 text-muted">{latestScan.remark}</p>}
                    {latestScan.timestamp && (
                      <p className="mt-1 text-xs text-muted">
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
                          <p className="font-medium text-ink">{scan.status}</p>
                          {scan.location && <p className="text-xs text-muted">{scan.location}</p>}
                          {scan.timestamp && (
                            <p className="text-xs text-muted">
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
            <section className="mt-6 rounded-2xl border border-ink/10 bg-white/70 p-5 sm:p-6">
              <p className="font-semibold text-ink">Need to cancel?</p>
              <p className="mt-2 text-sm leading-relaxed text-body">
                You can cancel before delivery if the parcel has not left for your address yet.
                {order.awbNumber ? ' If pickup already happened, contact us on WhatsApp.' : ''}
              </p>
              {cancelConfirmOpen ? (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-950">
                  <p className="font-semibold">
                    {order.awbNumber
                      ? 'Cancel this order?'
                      : 'Cancel before dispatch?'}
                  </p>
                  <p className="mt-2 leading-relaxed">
                    {order.awbNumber
                      ? 'If the courier has not picked up yet, the shipment will be stopped.'
                      : 'Your order will be cancelled before it is handed to the courier.'}
                  </p>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      disabled={cancelBusy}
                      onClick={() => setCancelConfirmOpen(false)}
                      className="min-h-10 rounded-full border border-ink/20 px-5 text-xs font-bold uppercase tracking-[0.08em] text-ink disabled:opacity-50"
                    >
                      Keep order
                    </button>
                    <button
                      type="button"
                      disabled={cancelBusy}
                      onClick={() => void confirmCancel()}
                      className="min-h-10 rounded-full border border-red-400 bg-red-800 px-5 text-xs font-bold uppercase tracking-[0.08em] text-white disabled:opacity-50"
                    >
                      {cancelBusy ? 'Cancelling…' : 'Yes, cancel order'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={cancelBusy}
                  onClick={() => setCancelConfirmOpen(true)}
                  className="mt-4 rounded-full border border-red-300 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.08em] text-red-800 disabled:opacity-50"
                >
                  Cancel order
                </button>
              )}
            </section>
          )}

          {!isCancelled && (order.shippingStatus === 'delivered' || order.orderStatus === 'delivered') && (
            <OrderReviewLinks order={order} items={order.items} className="mt-6" />
          )}

          {user && order.id && !isCancelled && (
            <OrderReturnPanel orderId={order.id} orderRef={order.orderRef} order={order} />
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
  const statusLabel = complete ? 'Completed' : active ? 'In progress' : 'Upcoming'

  return (
    <li className="flex gap-4">
      <div className="flex flex-col items-center">
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
            complete
              ? 'bg-ink text-white'
              : active
                ? 'border-2 border-ink bg-white text-ink ring-4 ring-accent-ink/15 animate-pulse'
                : 'border border-muted/30 bg-white text-muted'
          }`}
          aria-label={`${step.label}: ${statusLabel}`}
        >
          {complete ? '✓' : active ? '•' : ''}
        </span>
        {!step.last && (
          <span className={`h-10 w-px ${complete ? 'bg-ink' : 'bg-muted/20'}`} />
        )}
      </div>
      <div className="pb-4">
        <p className={`text-sm ${complete || active ? 'font-semibold text-ink' : 'text-muted'}`}>
          {step.label}
          {active ? <span className="ml-2 text-[9px] font-bold uppercase tracking-[0.08em] text-accent-ink">Now</span> : null}
        </p>
        {step.detail && (
          <p className="mt-0.5 text-xs leading-relaxed text-muted">{step.detail}</p>
        )}
      </div>
    </li>
  )
}
