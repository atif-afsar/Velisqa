import { useEffect, useState } from 'react'
import AdminShell from '../Components/Admin/AdminShell'
import AdminOrderItems from '../Components/Admin/AdminOrderItems'
import { formatInr } from '../lib/cartStock'
import { getPaymentScreenshotSignedUrl } from '../lib/manualPayments'
import { invokeEdgeFunction } from '../lib/invokeEdgeFunction'
import { supabase } from '../lib/supabaseClient'

async function fetchPendingPayments() {
  return supabase
    .from('orders')
    .select(`
      id,
      order_ref,
      customer_name,
      customer_phone,
      customer_email,
      grand_total,
      payment_utr,
      payment_screenshot_path,
      payment_submitted_at,
      delivery_address,
      delivery_city,
      delivery_pincode,
      order_items (
        product_name,
        product_url,
        image_url,
        quantity,
        unit_price,
        line_total
      )
    `)
    .eq('payment_status', 'payment_submitted')
    .order('payment_submitted_at', { ascending: true })
}

function whatsappPhone(value) {
  const digits = String(value || '').replace(/\D/g, '')
  return digits.length === 10 ? `91${digits}` : digits
}

export default function AdminPayments() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [proofUrls, setProofUrls] = useState({})

  async function refresh() {
    setLoading(true)
    setError('')
    const { data, error: fetchError } = await fetchPendingPayments()
    if (fetchError) {
      setError(fetchError.message)
    } else {
      setOrders(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    fetchPendingPayments().then(({ data, error: fetchError }) => {
      if (cancelled) return
      if (fetchError) {
        setError(fetchError.message)
      } else {
        setOrders(data || [])
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function viewProof(order) {
    if (proofUrls[order.id]) return
    try {
      const signedUrl = await getPaymentScreenshotSignedUrl(order.payment_screenshot_path)
      setProofUrls((current) => ({ ...current, [order.id]: signedUrl }))
    } catch (err) {
      setError(err?.message || 'Could not open payment screenshot.')
    }
  }

  async function approve(order) {
    if (!window.confirm(`Approve payment for ${order.order_ref} and create its shipment?`)) return
    setBusyId(order.id)
    setError('')
    const { error: invokeError } = await invokeEdgeFunction('admin-approve-payment', {
      orderId: order.id,
    })
    if (invokeError) {
      setError(invokeError)
    } else {
      await refresh()
    }
    setBusyId(null)
  }

  async function reject(order) {
    const reason = window.prompt(
      'Reason shown to the customer:',
      'Screenshot unclear — please upload a clearer payment proof.',
    )
    if (!reason?.trim()) return

    setBusyId(order.id)
    setError('')
    const { error: invokeError } = await invokeEdgeFunction('admin-reject-payment', {
      orderId: order.id,
      reason: reason.trim(),
    })
    if (invokeError) {
      setError(invokeError)
    } else {
      const phone = whatsappPhone(order.customer_phone)
      if (phone) {
        const message = encodeURIComponent(
          `Hello ${order.customer_name}, your Velisqa payment proof for ${order.order_ref} needs attention: ${reason.trim()} Please open your private order link and upload a new proof.`,
        )
        window.open(`https://wa.me/${phone}?text=${message}`, '_blank', 'noopener,noreferrer')
      }
      await refresh()
    }
    setBusyId(null)
  }

  async function removeOrder(order) {
    if (!window.confirm(`Remove order ${order.order_ref} permanently? This cannot be undone.`)) return
    setBusyId(order.id)
    setError('')
    const { error: invokeError } = await invokeEdgeFunction('admin-delete-order', {
      orderId: order.id,
    })
    if (invokeError) {
      setError(invokeError)
    } else {
      await refresh()
    }
    setBusyId(null)
  }

  async function cancelOrder(order) {
    if (!window.confirm(`Cancel order ${order.order_ref} before approving payment?`)) return
    setBusyId(order.id)
    setError('')
    const { error: invokeError } = await invokeEdgeFunction('admin-cancel-order', {
      orderId: order.id,
    })
    if (invokeError) {
      setError(invokeError)
    } else {
      await refresh()
    }
    setBusyId(null)
  }

  return (
    <AdminShell
      title="UPI payment reviews"
      subtitle="Customers who chose UPI QR upload a payment screenshot here. Check the proof matches the order amount, then approve to ship automatically."
      onRefresh={refresh}
    >
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>
      )}

      {!loading && orders.length > 0 && (
        <div className="mb-6 rounded-xl border border-[#d4af37]/25 bg-[#fbf7f1] p-4 text-sm text-[#514347]">
          <p className="font-semibold text-[#130006]">What to do for each order</p>
          <p className="mt-1">1. Open payment proof · 2. Confirm amount & UTR · 3. Approve (ships via NimbusPost) or Reject (customer re-uploads)</p>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-[#514347]">Loading payment submissions…</p>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-[#d4af37]/15 bg-white p-8 text-center">
          <p className="font-serif text-xl">No UPI proofs waiting</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#514347]">
            When a customer pays by UPI and uploads proof on the website, the order appears here with a red badge on the admin menu.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
            {orders.map((order) => (
              <article key={order.id} className="rounded-2xl border border-[#d4af37]/15 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-sm font-semibold text-[#3d0a21]">{order.order_ref}</p>
                    <p className="mt-1 text-sm font-semibold">{order.customer_name}</p>
                    <p className="text-xs text-[#514347]">
                      {order.customer_phone}{order.customer_email ? ` · ${order.customer_email}` : ''}
                    </p>
                    <p className="mt-2 text-xs text-[#847377]">
                      Submitted {order.payment_submitted_at ? new Date(order.payment_submitted_at).toLocaleString('en-IN') : 'recently'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-serif text-2xl font-semibold text-[#3d0a21]">{formatInr(order.grand_total)}</p>
                    <p className="mt-1 text-xs text-[#514347]">UTR: {order.payment_utr || 'Not provided'}</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-5 border-t border-[#d4af37]/15 pt-5 lg:grid-cols-2">
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-[#847377]">Products ordered</h2>
                    <div className="mt-2">
                      <AdminOrderItems items={order.order_items} />
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-[#514347]">
                      <span className="font-semibold text-[#130006]">Ship to: </span>
                      {order.delivery_address}
                      <br />
                      {[order.delivery_city, order.delivery_pincode].filter(Boolean).join(' · ')}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-[#847377]">Payment proof</h2>
                      <button
                        type="button"
                        onClick={() => void viewProof(order)}
                        className="text-xs font-semibold text-[#6f334a] hover:underline"
                      >
                        {proofUrls[order.id] ? 'Proof loaded' : 'View proof'}
                      </button>
                    </div>
                    {proofUrls[order.id] && (
                      <a href={proofUrls[order.id]} target="_blank" rel="noreferrer">
                        <img
                          src={proofUrls[order.id]}
                          alt={`Payment proof for ${order.order_ref}`}
                          className="mt-3 max-h-72 w-full rounded-xl border border-[#130006]/10 bg-[#f1ede8] object-contain"
                        />
                      </a>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-2 border-t border-[#d4af37]/15 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={busyId === order.id}
                    onClick={() => void cancelOrder(order)}
                    className="min-h-11 rounded-full border border-[#3d0a21]/25 px-5 text-xs font-bold uppercase tracking-[0.1em] text-[#3d0a21] disabled:opacity-50 sm:mr-auto"
                  >
                    Cancel order
                  </button>
                  <button
                    type="button"
                    disabled={busyId === order.id}
                    onClick={() => void removeOrder(order)}
                    className="min-h-11 rounded-full border border-red-300 px-5 text-xs font-bold uppercase tracking-[0.1em] text-red-800 disabled:opacity-50"
                  >
                    Delete record
                  </button>
                  <button
                    type="button"
                    disabled={busyId === order.id}
                    onClick={() => void reject(order)}
                    className="min-h-11 rounded-full border border-red-300 px-5 text-xs font-bold uppercase tracking-[0.1em] text-red-800 disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    disabled={busyId === order.id}
                    onClick={() => void approve(order)}
                    className="min-h-11 rounded-full bg-[#2d6a4f] px-5 text-xs font-bold uppercase tracking-[0.1em] text-white disabled:opacity-50"
                  >
                    {busyId === order.id ? 'Working…' : 'Approve & create shipment'}
                  </button>
                </div>
              </article>
            ))}
          </div>
      )}
    </AdminShell>
  )
}
