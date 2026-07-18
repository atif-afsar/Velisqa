import { useEffect, useMemo, useState } from 'react'
import AdminShell from '../Components/Admin/AdminShell'
import AdminOrderItems from '../Components/Admin/AdminOrderItems'
import { formatInr } from '../lib/cartStock'
import { orderPrivateUrl } from '../lib/manualPayments'
import { PAYMENT_STATUS_LABELS, SHIPPING_STATUS_LABELS, ORDER_STATUS_LABELS } from '../lib/orderStatuses'
import { invokeEdgeFunction } from '../lib/invokeEdgeFunction'
import { validateIndianPhone } from '../lib/indianPhone'
import { orderNeedsShipment } from '../lib/adminInbox'
import { effectiveAwb, isValidAwb } from '../lib/nimbusAwb'
import { useConfirm } from '../hooks/useConfirm'
import { supabase } from '../lib/supabaseClient'

const PAGE_SIZE = 50

const FILTERS = [
  { id: 'needs_shipment', label: 'Ready to ship', hint: 'Paid orders waiting for NimbusPost AWB. After a successful ship, the order moves to In transit automatically.' },
  { id: 'in_transit', label: 'In transit', hint: 'Already shipped — share tracking with customer' },
  { id: 'delivered', label: 'Delivered', hint: 'Completed deliveries' },
  { id: 'all', label: 'All orders', hint: 'Full order history' },
]

async function fetchOrdersPage({ offset = 0 } = {}) {
  return supabase
    .from('orders')
    .select(`
      id,
      order_ref,
      order_access_token,
      customer_name,
      customer_phone,
      delivery_address,
      delivery_city,
      delivery_pincode,
      grand_total,
      payment_method,
      payment_status,
      shipping_status,
      order_status,
      nimbuspost_awb,
      nimbuspost_order_id,
      nimbuspost_shipment_id,
      courier_name,
      tracking_url,
      created_at,
      order_items (
        product_name,
        product_url,
        image_url,
        quantity,
        unit_price,
        line_total
      )
    `, { count: 'exact' })
    .eq('is_enquiry', false)
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)
}

function isStuckShipment(order) {
  return !effectiveAwb(order)
    && (order.shipping_status === 'shipped' || order.order_status === 'shipped')
}

function isInvalidAwbStored(order) {
  return Boolean(order.nimbuspost_awb) && !isValidAwb(order.nimbuspost_awb)
}

function isPendingAwbSync(order) {
  return !effectiveAwb(order) && Boolean(order.nimbuspost_order_id || order.nimbuspost_shipment_id)
}

function canShip(order) {
  return orderNeedsShipment(order)
}

function matchesFilter(order, filter) {
  if (filter === 'all') return true
  if (filter === 'needs_shipment') {
    return canShip(order) || isStuckShipment(order) || isPendingAwbSync(order) || isInvalidAwbStored(order)
  }
  if (filter === 'in_transit') {
    return Boolean(effectiveAwb(order)) && order.shipping_status !== 'delivered' && order.shipping_status !== 'rto'
  }
  if (filter === 'delivered') {
    return order.shipping_status === 'delivered' || order.order_status === 'delivered'
  }
  return true
}

function canCancelOrder(order) {
  if (order.order_status === 'cancelled') return false
  if (order.order_status === 'delivered' || order.shipping_status === 'delivered') return false
  return true
}

function countForFilter(orders, filterId) {
  return orders.filter((order) => matchesFilter(order, filterId)).length
}

export default function AdminOrders() {
  const { confirm, ConfirmDialog } = useConfirm()
  const [orders, setOrders] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [actionNotice, setActionNotice] = useState('')
  const [actionNoticeVariant, setActionNoticeVariant] = useState('success')
  const [busyAction, setBusyAction] = useState(null)

  function isBusy(orderId, action) {
    if (!busyAction || busyAction.orderId !== orderId) return false
    return !action || busyAction.action === action
  }

  function startBusy(orderId, action) {
    setBusyAction({ orderId, action })
  }

  function endBusy() {
    setBusyAction(null)
  }
  const [filter, setFilter] = useState('needs_shipment')
  const [copiedId, setCopiedId] = useState(null)
  const [orderErrors, setOrderErrors] = useState({})

  async function refresh({ silent = false } = {}) {
    if (!silent) setLoading(true)
    setError('')
    const { data, error: fetchError, count } = await fetchOrdersPage({ offset: 0 })
    if (fetchError) {
      setError(fetchError.message)
    } else {
      setOrders(data || [])
      setTotalCount(count || 0)
    }
    if (!silent) setLoading(false)
  }

  async function loadMore() {
    if (loadingMore || orders.length >= totalCount) return
    setLoadingMore(true)
    setError('')
    const { data, error: fetchError, count } = await fetchOrdersPage({ offset: orders.length })
    if (fetchError) {
      setError(fetchError.message)
    } else {
      setOrders((current) => [...current, ...(data || [])])
      setTotalCount(count || totalCount)
    }
    setLoadingMore(false)
  }

  useEffect(() => {
    let cancelled = false
    fetchOrdersPage({ offset: 0 }).then(({ data, error: fetchError, count }) => {
      if (cancelled) return
      if (fetchError) setError(fetchError.message)
      else {
        setOrders(data || [])
        setTotalCount(count || 0)
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const visibleOrders = useMemo(
    () => orders.filter((order) => matchesFilter(order, filter)),
    [orders, filter],
  )

  const activeFilter = FILTERS.find((item) => item.id === filter)

  async function shipOrder(order) {
    const ok = await confirm({
      title: 'Create NimbusPost shipment?',
      message: `Create NimbusPost shipment for ${order.order_ref}?\n\nThis charges your NimbusPost wallet once.`,
      confirmLabel: 'Ship now',
      variant: 'primary',
    })
    if (!ok) return
    startBusy(order.id, 'ship')
    setError('')
    setActionNotice('')
    setOrderErrors((current) => ({ ...current, [order.id]: '' }))
    const { data, error: invokeError } = await invokeEdgeFunction('admin-create-shipment', {
      orderId: order.id,
    })
    if (invokeError) {
      setError(invokeError)
      setOrderErrors((current) => ({ ...current, [order.id]: invokeError }))
    } else {
      await refresh({ silent: true })

      if (data?.shipment?.awb) {
        setFilter('in_transit')
        setActionNoticeVariant('success')
        setActionNotice(
          `Shipment booked for ${order.order_ref}. AWB ${data.shipment.awb}. The order is now under In transit.`,
        )
      } else if (data?.shipmentWarning) {
        setActionNoticeVariant('warning')
        setActionNotice(data.shipmentWarning)
        setOrderErrors((current) => ({ ...current, [order.id]: data.shipmentWarning }))
      }
    }
    endBusy()
  }

  async function resetStuckOrder(order) {
    const ok = await confirm({
      title: 'Reset shipment?',
      message: isInvalidAwbStored(order)
        ? `Clear invalid shipment data for ${order.order_ref} and move it back to Ready to ship?`
        : `Reset ${order.order_ref} back to "not shipped" so you can try again?`,
      confirmLabel: 'Reset order',
    })
    if (!ok) return
    startBusy(order.id, 'reset')
    setError('')
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        order_status: 'placed',
        shipping_status: 'not_shipped',
        nimbuspost_awb: null,
        nimbuspost_order_id: null,
        nimbuspost_shipment_id: null,
        courier_name: null,
        tracking_url: null,
      })
      .eq('id', order.id)

    if (updateError) {
      setError(updateError.message)
    } else {
      setFilter('needs_shipment')
      setActionNoticeVariant('success')
      setActionNotice(`${order.order_ref} reset. Click Ship via NimbusPost to book it again on NimbusPost.`)
      setOrderErrors((current) => ({ ...current, [order.id]: '' }))
      await refresh({ silent: true })
    }
    endBusy()
  }

  async function copyTrackingLink(order) {
    if (!order.order_access_token) return
    const url = `${window.location.origin}${orderPrivateUrl('/orders', order.order_ref, order.order_access_token)}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(order.id)
      window.setTimeout(() => setCopiedId(null), 2000)
    } catch {
      setError('Could not copy tracking link.')
    }
  }

  async function removeOrder(order) {
    const ok = await confirm({
      title: 'Delete order record?',
      message: `Remove order ${order.order_ref} permanently? This cannot be undone.`,
      confirmLabel: 'Delete record',
      variant: 'danger',
    })
    if (!ok) return

    startBusy(order.id, 'delete')
    setError('')
    setOrderErrors((current) => ({ ...current, [order.id]: '' }))

    const { error: invokeError } = await invokeEdgeFunction('admin-delete-order', {
      orderId: order.id,
    })

    if (invokeError) {
      setError(invokeError)
      setOrderErrors((current) => ({ ...current, [order.id]: invokeError }))
    } else {
      await refresh({ silent: true })
    }
    endBusy()
  }

  async function cancelOrder(order) {
    const nimbusNote = effectiveAwb(order)
      ? `NimbusPost AWB: ${effectiveAwb(order)}\n\nThis cancels the shipment on NimbusPost. If pickup has not happened, freight is usually refunded to your NimbusPost wallet in 1–2 days.`
      : 'This cancels the order in Velisqa before shipping.'
    const ok = await confirm({
      title: `Cancel ${order.order_ref}?`,
      message: nimbusNote,
      confirmLabel: effectiveAwb(order) ? 'Cancel on NimbusPost' : 'Cancel order',
      variant: 'danger',
    })
    if (!ok) return

    startBusy(order.id, 'cancel')
    setError('')
    setActionNotice('')
    setOrderErrors((current) => ({ ...current, [order.id]: '' }))

    const { data, error: invokeError } = await invokeEdgeFunction('admin-cancel-order', {
      orderId: order.id,
    })

    if (invokeError) {
      setError(invokeError)
      setOrderErrors((current) => ({ ...current, [order.id]: invokeError }))
    } else {
      await refresh({ silent: true })
      if (data?.walletNote) {
        setActionNoticeVariant('success')
        setActionNotice(String(data.walletNote))
      }
    }
    endBusy()
  }

  const hasMoreOrders = orders.length < totalCount

  return (
    <AdminShell
      title="Ship orders"
      subtitle="COD orders appear here after checkout. Click Ship via NimbusPost once per order — UPI orders ship automatically when you approve payment."
      onRefresh={refresh}
    >
      {ConfirmDialog}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => {
          const count = countForFilter(orders, item.id)
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] ${
                filter === item.id
                  ? 'bg-[#3d0a21] text-white'
                  : 'border border-[#3d0a21]/20 bg-white text-[#514347]'
              }`}
            >
              {item.label}
              {count > 0 ? ` (${count})` : ''}
            </button>
          )
        })}
      </div>

      {activeFilter?.hint ? (
        <p className="mt-3 text-sm text-[#514347]">{activeFilter.hint}</p>
      ) : null}

      {error && (
        <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>
      )}

      {actionNotice && (
        <p className={`mt-6 rounded-xl border p-4 text-sm ${
          actionNoticeVariant === 'warning'
            ? 'border-amber-200 bg-amber-50 text-amber-950'
            : 'border-[#2d6a4f]/25 bg-[#edf7f1] text-[#1f4334]'
        }`}>
          {actionNotice}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-[#514347]">Loading orders…</p>
      ) : visibleOrders.length === 0 ? (
        <div className="rounded-2xl border border-[#d4af37]/15 bg-white p-8 text-center">
          <p className="font-serif text-xl">Nothing in this list</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#514347]">
            {filter === 'needs_shipment'
              ? 'New COD orders from the website will show here. UPI orders ship from the payment review page after approval.'
              : 'Try another tab or refresh after a customer places an order.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleOrders.map((order) => (
            <article key={order.id} className="rounded-2xl border border-[#d4af37]/15 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-mono text-sm font-semibold text-[#3d0a21]">{order.order_ref}</p>
                    <span className="rounded-full bg-[#f1ede8] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#514347]">
                      {order.payment_method === 'cod' ? 'COD' : 'UPI'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-semibold">{order.customer_name}</p>
                  <p className="text-xs text-[#514347]">
                    {order.customer_phone}
                    {order.delivery_city ? ` · ${order.delivery_city}` : ''}
                    {order.delivery_pincode ? ` · ${order.delivery_pincode}` : ''}
                  </p>
                  <p className="mt-2 text-xs text-[#847377]">
                    Placed {new Date(order.created_at).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-serif text-2xl font-semibold text-[#3d0a21]">{formatInr(order.grand_total)}</p>
                  <p className="mt-1 text-xs text-[#514347]">
                    {order.payment_method === 'cod' ? 'Collect on delivery' : 'Online payment'}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 border-t border-[#d4af37]/15 pt-4 sm:grid-cols-3">
                <StatusPill label="Payment" value={PAYMENT_STATUS_LABELS[order.payment_status] || order.payment_status} />
                <StatusPill label="Shipping" value={SHIPPING_STATUS_LABELS[order.shipping_status] || order.shipping_status} />
                <StatusPill label="Order" value={ORDER_STATUS_LABELS[order.order_status] || order.order_status} />
              </div>

              <div className="mt-4 border-t border-[#d4af37]/15 pt-4">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#847377]">
                  Products ordered
                </h3>
                <div className="mt-3">
                  <AdminOrderItems items={order.order_items} />
                </div>
                {order.delivery_address && (
                  <p className="mt-4 text-xs leading-relaxed text-[#514347]">
                    <span className="font-semibold text-[#130006]">Ship to: </span>
                    {order.delivery_address}
                    {[order.delivery_city, order.delivery_pincode].filter(Boolean).length > 0 && (
                      <>
                        <br />
                        {[order.delivery_city, order.delivery_pincode].filter(Boolean).join(' · ')}
                      </>
                    )}
                  </p>
                )}
              </div>

              {order.order_status === 'cancelled' && (
                <p className="mt-4 rounded-xl border border-[#130006]/10 bg-[#f1ede8] px-4 py-3 text-sm text-[#514347]">
                  This order was cancelled. The customer should not expect delivery.
                </p>
              )}

              {!validateIndianPhone(order.customer_phone).ok && !order.nimbuspost_awb && (
                <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                  Invalid phone number — NimbusPost cannot ship this order.
                </p>
              )}

              {isInvalidAwbStored(order) && (
                <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                  Invalid shipment saved (<strong className="font-mono">{order.nimbuspost_awb}</strong>). NimbusPost did not book this order — the API returned an error that was saved by mistake. Use <strong>Reset &amp; retry ship</strong>, then ship again.
                </p>
              )}

              {isPendingAwbSync(order) && (
                <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                  NimbusPost accepted this order but Velisqa has not synced the AWB yet. Click <strong>Ship via NimbusPost</strong> again to pull the AWB, or check the NimbusPost dashboard.
                </p>
              )}

              {isStuckShipment(order) && (
                <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                  Shipment incomplete — use <strong>Reset &amp; retry</strong>, then ship again.
                </p>
              )}

              {orderErrors[order.id] && (
                <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                  {orderErrors[order.id]}
                </p>
              )}

              {(effectiveAwb(order) || order.courier_name) && (
                <div className="mt-4 rounded-xl bg-[#f0f7f4] p-4 text-sm text-[#514347]">
                  <p className="font-semibold text-[#1b4332]">Shipped via NimbusPost</p>
                  {order.courier_name && <p className="mt-2">Courier: <strong>{order.courier_name}</strong></p>}
                  {effectiveAwb(order) && (
                    <p className="mt-1">AWB: <strong className="font-mono">{effectiveAwb(order)}</strong></p>
                  )}
                  {order.tracking_url && effectiveAwb(order) && (
                    <a
                      href={order.tracking_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex font-semibold text-[#6f334a] hover:underline"
                    >
                      Open NimbusPost tracking →
                    </a>
                  )}
                </div>
              )}

              {isBusy(order.id, 'ship') && (
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#2d6a4f]/25 bg-[#e8f5ef] px-4 py-3 text-sm text-[#1b4332]">
                  <LoadingSpinner className="h-5 w-5 text-[#2d6a4f]" />
                  <div>
                    <p className="font-semibold">Booking shipment with NimbusPost…</p>
                    <p className="mt-0.5 text-xs text-[#40916c]">This usually takes 10–30 seconds. Do not close this page.</p>
                  </div>
                </div>
              )}

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                {canCancelOrder(order) && (
                  <button
                    type="button"
                    disabled={isBusy(order.id)}
                    onClick={() => void cancelOrder(order)}
                    className="min-h-10 rounded-full border border-[#3d0a21]/25 bg-[#3d0a21]/5 px-4 text-xs font-bold uppercase tracking-[0.08em] text-[#3d0a21] disabled:opacity-50 sm:mr-auto"
                  >
                    {isBusy(order.id, 'cancel')
                      ? 'Cancelling…'
                      : effectiveAwb(order)
                        ? 'Cancel on NimbusPost'
                        : 'Cancel order'}
                  </button>
                )}
                <button
                  type="button"
                  disabled={isBusy(order.id)}
                  onClick={() => void removeOrder(order)}
                  className="min-h-10 rounded-full border border-red-300 px-4 text-xs font-bold uppercase tracking-[0.08em] text-red-800 disabled:opacity-50"
                >
                  {isBusy(order.id, 'delete') ? 'Deleting…' : 'Delete record'}
                </button>
                <button
                  type="button"
                  disabled={isBusy(order.id)}
                  onClick={() => void copyTrackingLink(order)}
                  className="min-h-10 rounded-full border border-[#3d0a21]/20 px-4 text-xs font-bold uppercase tracking-[0.08em] text-[#3d0a21] disabled:opacity-50"
                >
                  {copiedId === order.id ? 'Link copied' : 'Copy customer tracking link'}
                </button>
                {(canShip(order) || isInvalidAwbStored(order) || isStuckShipment(order)) && (
                  <>
                    {(isStuckShipment(order) || isInvalidAwbStored(order)) && (
                      <button
                        type="button"
                        disabled={isBusy(order.id)}
                        onClick={() => void resetStuckOrder(order)}
                        className="min-h-10 rounded-full border border-amber-700/30 px-4 text-xs font-bold uppercase tracking-[0.08em] text-amber-950 disabled:opacity-50"
                      >
                        {isBusy(order.id, 'reset') ? 'Resetting…' : 'Reset & retry'}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isBusy(order.id)}
                      onClick={() => void shipOrder(order)}
                      aria-busy={isBusy(order.id, 'ship')}
                      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-5 text-xs font-bold uppercase tracking-[0.08em] transition-colors disabled:cursor-wait ${
                        isBusy(order.id, 'ship')
                          ? 'bg-[#1b4332] text-white shadow-inner ring-2 ring-[#2d6a4f]/40'
                          : 'bg-[#2d6a4f] text-white hover:bg-[#1b4332]'
                      }`}
                    >
                      {isBusy(order.id, 'ship') ? (
                        <>
                          <LoadingSpinner className="h-4 w-4" />
                          Booking AWB…
                        </>
                      ) : (
                        'Ship via NimbusPost'
                      )}
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && hasMoreOrders && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => void loadMore()}
            className="min-h-11 rounded-full border border-[#3d0a21]/20 bg-white px-6 text-xs font-bold uppercase tracking-[0.08em] text-[#3d0a21] disabled:opacity-50"
          >
            {loadingMore ? 'Loading more…' : `Load more orders (${orders.length} of ${totalCount})`}
          </button>
        </div>
      )}
    </AdminShell>
  )
}

function StatusPill({ label, value }) {
  return (
    <div className="rounded-lg border border-[#130006]/8 bg-[#fbf7f1] px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#847377]">{label}</p>
      <p className="mt-0.5 text-sm font-semibold capitalize text-[#130006]" aria-label={`${label}: ${value}`}>
        {value}
      </p>
    </div>
  )
}

function LoadingSpinner({ className = 'h-4 w-4' }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}
