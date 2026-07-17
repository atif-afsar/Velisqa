import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import SEOHead from '../Components/SEO/SEOHead'
import { formatInr } from '../lib/cartStock'
import { fetchMyOrders, myOrderPayUrl, myOrderTrackUrl } from '../lib/myOrders'
import { getPaymentStatusLabel, getShipmentStatusLabel } from '../lib/orderTracking'
import { PAYMENT_STATUS_LABELS } from '../lib/orderStatuses'

function summarizeItems(items = []) {
  if (!items.length) return 'Velisqa order'
  if (items.length === 1) return `${items[0].quantity}× ${items[0].product_name}`
  return `${items.length} items`
}

export default function MyOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    fetchMyOrders()
      .then((rows) => {
        if (!cancelled) setOrders(rows)
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Could not load your orders.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <SEOHead
        title="My orders | Velisqa"
        description="View and track your Velisqa orders."
        canonicalPath="/account/orders"
        noindex
      />
      <main className="page-offset-nav min-h-screen bg-[#f9f5f0] px-4 py-12 text-[#130006] sm:px-6 sm:py-16">
        <div className="container-stitch mx-auto max-w-3xl">
          <p className="type-label text-[#847377]">Your account</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold">My orders</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#514347]">
            All orders placed while signed in appear here. Track delivery, complete UPI payment, or cancel before dispatch.
          </p>

          {loading && (
            <p className="mt-10 text-center text-sm text-[#847377]">Loading your orders…</p>
          )}

          {error && (
            <p className="mt-10 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              {error}
            </p>
          )}

          {!loading && !error && orders.length === 0 && (
            <div className="mt-10 rounded-2xl border border-[#d4af37]/20 bg-white/70 p-8 text-center shadow-[0_14px_44px_rgba(19,0,6,0.06)]">
              <p className="font-serif text-xl text-[#130006]">No orders yet</p>
              <p className="mt-2 text-sm text-[#514347]">
                Add pieces to your bag, sign in, and checkout to see them here.
              </p>
              <Link
                to="/collections#signature"
                className="mt-6 inline-flex rounded-full bg-[#3d0a21] px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#fdf9f4] transition hover:bg-[#2a0718]"
              >
                Shop collections
              </Link>
            </div>
          )}

          {!loading && !error && orders.length > 0 && (
            <ul className="mt-8 space-y-4">
              {orders.map((order) => {
                const trackUrl = myOrderTrackUrl(order.order_ref, order.order_access_token)
                const payUrl = myOrderPayUrl(order.order_ref, order.order_access_token)
                const mapped = {
                  paymentMethod: order.payment_method,
                  paymentStatus: order.payment_status,
                  shippingStatus: order.shipping_status,
                  orderStatus: order.order_status,
                  awbNumber: order.nimbuspost_awb,
                }
                const needsPayment = order.payment_status === 'awaiting_payment' || order.payment_status === 'rejected'
                const cancelled = order.order_status === 'cancelled'

                return (
                  <li
                    key={order.id}
                    className="rounded-2xl border border-[#d4af37]/20 bg-white/70 p-5 shadow-[0_14px_44px_rgba(19,0,6,0.06)] sm:p-6"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-sm font-semibold text-[#3d0a21]">{order.order_ref}</p>
                        <p className="mt-1 text-sm text-[#514347]">{summarizeItems(order.order_items)}</p>
                        <p className="mt-1 text-xs text-[#847377]">
                          {new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      </div>
                      <p className="font-serif text-xl font-semibold text-[#3d0a21]">
                        {formatInr(order.grand_total)}
                      </p>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-[#f1ede8] px-3 py-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#847377]">Payment</p>
                        <p className="mt-1 text-sm font-semibold text-[#130006]">
                          {getPaymentStatusLabel(mapped) || PAYMENT_STATUS_LABELS[order.payment_status]}
                        </p>
                      </div>
                      <div className="rounded-xl bg-[#f1ede8] px-3 py-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#847377]">Shipment</p>
                        <p className="mt-1 text-sm font-semibold text-[#130006]">
                          {getShipmentStatusLabel(mapped)}
                        </p>
                      </div>
                    </div>

                    {order.nimbuspost_awb && (
                      <p className="mt-3 text-xs text-[#514347]">
                        AWB: <span className="font-mono font-semibold">{order.nimbuspost_awb}</span>
                      </p>
                    )}

                    <div className="mt-5 flex flex-wrap gap-2">
                      {!cancelled && (
                        <Link
                          to={trackUrl}
                          className="inline-flex min-h-10 items-center rounded-full bg-[#2d6a4f] px-5 text-xs font-bold uppercase tracking-[0.08em] text-white transition hover:bg-[#245a42]"
                        >
                          Track order
                        </Link>
                      )}
                      {!cancelled && needsPayment && (
                        <Link
                          to={payUrl}
                          className="inline-flex min-h-10 items-center rounded-full border border-[#3d0a21]/20 px-5 text-xs font-bold uppercase tracking-[0.08em] text-[#3d0a21] transition hover:bg-white"
                        >
                          Complete payment
                        </Link>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </main>
    </>
  )
}
