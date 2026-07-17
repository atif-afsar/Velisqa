import { useEffect, useMemo, useState } from 'react'
import AdminShell from '../Components/Admin/AdminShell'
import AdminOrderItems from '../Components/Admin/AdminOrderItems'
import { formatInr } from '../lib/cartStock'
import { orderPrivateUrl } from '../lib/manualPayments'
import { PAYMENT_STATUS_LABELS, SHIPPING_STATUS_LABELS, ORDER_STATUS_LABELS } from '../lib/orderStatuses'
import { invokeEdgeFunction } from '../lib/invokeEdgeFunction'
import { validateIndianPhone } from '../lib/indianPhone'
import { orderNeedsShipment } from '../lib/adminInbox'
import { supabase } from '../lib/supabaseClient'

const FILTERS = [
  { id: 'needs_shipment', label: 'Ready to ship', hint: 'COD orders waiting for NimbusPost AWB' },
  { id: 'in_transit', label: 'In transit', hint: 'Already shipped — share tracking with customer' },
  { id: 'delivered', label: 'Delivered', hint: 'Completed deliveries' },
  { id: 'all', label: 'All orders', hint: 'Full order history' },
]

async function fetchOrders() {
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
    `)
    .eq('is_enquiry', false)
    .order('created_at', { ascending: false })
    .limit(100)
}

function isStuckShipment(order) {
  return !order.nimbuspost_awb
    && (order.shipping_status === 'shipped' || order.order_status === 'shipped')
}

function canShip(order) {
  return orderNeedsShipment(order)
}

function matchesFilter(order, filter) {
  if (filter === 'all') return true
  if (filter === 'needs_shipment') return canShip(order)
  if (filter === 'in_transit') {
    return Boolean(order.nimbuspost_awb) && order.shipping_status !== 'delivered' && order.shipping_status !== 'rto'
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
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [filter, setFilter] = useState('needs_shipment')
  const [copiedId, setCopiedId] = useState(null)
  const [orderErrors, setOrderErrors] = useState({})

  async function refresh() {
    setLoading(true)
    setError('')
    const { data, error: fetchError } = await fetchOrders()
    if (fetchError) {
      setError(fetchError.message)
    } else {
      setOrders(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    fetchOrders().then(({ data, error: fetchError }) => {
      if (cancelled) return
      if (fetchError) setError(fetchError.message)
      else setOrders(data || [])
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
    if (!window.confirm(`Create NimbusPost shipment for ${order.order_ref}?\n\nThis charges your NimbusPost wallet once.`)) return
    setBusyId(order.id)
    setError('')
    setOrderErrors((current) => ({ ...current, [order.id]: '' }))
    const { error: invokeError } = await invokeEdgeFunction('admin-create-shipment', {
      orderId: order.id,
    })
    if (invokeError) {
      setError(invokeError)
      setOrderErrors((current) => ({ ...current, [order.id]: invokeError }))
    } else {
      await refresh()
    }
    setBusyId(null)
  }

  async function resetStuckOrder(order) {
    if (!window.confirm(`Reset ${order.order_ref} back to "not shipped" so you can try again?`)) return
    setBusyId(order.id)
    setError('')
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        order_status: 'placed',
        shipping_status: 'not_shipped',
      })
      .eq('id', order.id)
      .is('nimbuspost_awb', null)

    if (updateError) {
      setError(updateError.message)
    } else {
      setOrderErrors((current) => ({ ...current, [order.id]: '' }))
      await refresh()
    }
    setBusyId(null)
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
    if (!window.confirm(`Remove order ${order.order_ref} permanently? This cannot be undone.`)) return

    setBusyId(order.id)
    setError('')
    setOrderErrors((current) => ({ ...current, [order.id]: '' }))

    const { error: invokeError } = await invokeEdgeFunction('admin-delete-order', {
      orderId: order.id,
    })

    if (invokeError) {
      setError(invokeError)
      setOrderErrors((current) => ({ ...current, [order.id]: invokeError }))
    } else {
      await refresh()
    }
    setBusyId(null)
  }

  async function cancelOrder(order) {
    const nimbusNote = order.nimbuspost_awb
      ? `\n\nNimbusPost AWB: ${order.nimbuspost_awb}\nThis cancels the shipment on NimbusPost. If pickup has not happened, freight is usually refunded to your NimbusPost wallet in 1–2 days.`
      : '\n\nThis cancels the order in Velisqa before shipping.'
    if (!window.confirm(`Cancel order ${order.order_ref} for the customer?${nimbusNote}`)) return

    setBusyId(order.id)
    setError('')
    setOrderErrors((current) => ({ ...current, [order.id]: '' }))

    const { data, error: invokeError } = await invokeEdgeFunction('admin-cancel-order', {
      orderId: order.id,
    })

    if (invokeError) {
      setError(invokeError)
      setOrderErrors((current) => ({ ...current, [order.id]: invokeError }))
    } else {
      await refresh()
      if (data?.walletNote) {
        window.alert(String(data.walletNote))
      }
    }
    setBusyId(null)
  }

  return (
    <AdminShell
      title="Ship orders"
      subtitle="COD orders appear here after checkout. Click Ship via NimbusPost once per order — UPI orders ship automatically when you approve payment."
      onRefresh={refresh}
    >
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

              {isStuckShipment(order) && (
                <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                  Shipment incomplete — use <strong>Reset &amp; retry</strong>, then ship again.
                </p>
              )}

              {orderErrors[order.id] && (
                <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {orderErrors[order.id]}
                </p>
              )}

              {(order.nimbuspost_awb || order.courier_name || order.tracking_url) && (
                <div className="mt-4 rounded-xl bg-[#f0f7f4] p-4 text-sm text-[#514347]">
                  <p className="font-semibold text-[#1b4332]">Shipped via NimbusPost</p>
                  {order.courier_name && <p className="mt-2">Courier: <strong>{order.courier_name}</strong></p>}
                  {order.nimbuspost_awb && (
                    <p className="mt-1">AWB: <strong className="font-mono">{order.nimbuspost_awb}</strong></p>
                  )}
                  {order.tracking_url && (
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

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                {canCancelOrder(order) && (
                  <button
                    type="button"
                    disabled={busyId === order.id}
                    onClick={() => void cancelOrder(order)}
                    className="min-h-10 rounded-full border border-[#3d0a21]/25 bg-[#3d0a21]/5 px-4 text-xs font-bold uppercase tracking-[0.08em] text-[#3d0a21] disabled:opacity-50 sm:mr-auto"
                  >
                    {busyId === order.id
                      ? 'Cancelling…'
                      : order.nimbuspost_awb
                        ? 'Cancel on NimbusPost'
                        : 'Cancel order'}
                  </button>
                )}
                <button
                  type="button"
                  disabled={busyId === order.id}
                  onClick={() => void removeOrder(order)}
                  className="min-h-10 rounded-full border border-red-300 px-4 text-xs font-bold uppercase tracking-[0.08em] text-red-800 disabled:opacity-50"
                >
                  {busyId === order.id ? 'Working…' : 'Delete record'}
                </button>
                <button
                  type="button"
                  onClick={() => void copyTrackingLink(order)}
                  className="min-h-10 rounded-full border border-[#3d0a21]/20 px-4 text-xs font-bold uppercase tracking-[0.08em] text-[#3d0a21]"
                >
                  {copiedId === order.id ? 'Link copied' : 'Copy customer tracking link'}
                </button>
                {canShip(order) && (
                  <>
                    {isStuckShipment(order) && (
                      <button
                        type="button"
                        disabled={busyId === order.id}
                        onClick={() => void resetStuckOrder(order)}
                        className="min-h-10 rounded-full border border-amber-700/30 px-4 text-xs font-bold uppercase tracking-[0.08em] text-amber-950 disabled:opacity-50"
                      >
                        Reset &amp; retry
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busyId === order.id}
                      onClick={() => void shipOrder(order)}
                      className="min-h-10 rounded-full bg-[#2d6a4f] px-5 text-xs font-bold uppercase tracking-[0.08em] text-white disabled:opacity-50"
                    >
                      {busyId === order.id ? 'Creating shipment…' : 'Ship via NimbusPost'}
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </AdminShell>
  )
}

function StatusPill({ label, value }) {
  return (
    <div className="rounded-lg border border-[#130006]/8 bg-[#fbf7f1] px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#847377]">{label}</p>
      <p className="mt-0.5 text-sm font-semibold capitalize text-[#130006]">{value}</p>
    </div>
  )
}
