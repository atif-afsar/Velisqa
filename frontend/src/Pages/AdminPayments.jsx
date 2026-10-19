import { useEffect, useState, useMemo } from 'react'
import AdminShell from '../Components/Admin/AdminShell'
import AdminOrderItems from '../Components/Admin/AdminOrderItems'
import { formatInr } from '../lib/cartStock'
import { useConfirm } from '../hooks/useConfirm'
import { adminApprovePayment, adminShipOrder, fetchAdminOrdersPage } from '../lib/adminApi'
import { buildOrderEmailPayload, submitOrderEmail } from '../lib/orderEmail'

const PAGE_SIZE = 50

const STATUS_FILTERS = [
  { id: 'all', label: 'All Payments' },
  { id: 'paid', label: 'Paid' },
  { id: 'pending', label: 'Pending' },
  { id: 'failed', label: 'Failed/Rejected' },
]

function fetchOnlinePayments({ offset = 0 } = {}) {
  return fetchAdminOrdersPage({ offset, limit: PAGE_SIZE, onlineOnly: true })
}

export default function AdminPayments() {
  const { confirm, ConfirmDialog } = useConfirm()
  const [payments, setPayments] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [actionNotice, setActionNotice] = useState('')
  const [actionNoticeVariant, setActionNoticeVariant] = useState('success')
  const [busyPaymentId, setBusyPaymentId] = useState(null)
  const [filter, setFilter] = useState('all')

  async function refresh({ silent = false } = {}) {
    if (!silent) setLoading(true)
    setError('')
    try {
      const { data, error: fetchError, count } = await fetchOnlinePayments({ offset: 0 })
      if (fetchError) {
        setError(fetchError.message)
      } else {
        setPayments(data || [])
        setTotalCount(count || 0)
      }
    } catch (err) {
      setError(err?.message || 'Could not load payments.')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  async function loadMore() {
    if (loadingMore || payments.length >= totalCount) return
    setLoadingMore(true)
    setError('')
    try {
      const { data, error: fetchError, count } = await fetchOnlinePayments({ offset: payments.length })
      if (fetchError) {
        setError(fetchError.message)
      } else {
        setPayments((current) => [...current, ...(data || [])])
        setTotalCount(count || totalCount)
      }
    } catch (err) {
      setError(err?.message || 'Could not load more payments.')
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  // Confirm payment & automatically book NimbusPost shipment + notify via email
  async function confirmAndShipPayment(item) {
    const ok = await confirm({
      title: 'Confirm payment & book shipment?',
      message: `Are you sure you want to mark ${item.order_ref} (₹${item.grand_total}) as PAID?\n\nThis will confirm the payment, book the shipment on NimbusPost, and send the email notification.`,
      confirmLabel: 'Confirm & Book Shipment',
      variant: 'primary',
    })
    if (!ok) return

    setBusyPaymentId(item.id)
    setError('')
    setActionNotice('')

    try {
      // 1. Confirm payment through the audited server command (marks paid, logs the review)
      const { error: orderUpdateErr } = await adminApprovePayment(item.id, { razorpayPaymentId: item.razorpay_payment_id })
      if (orderUpdateErr) throw new Error(orderUpdateErr)

      // 2. Send email notification to admin via FormSubmit
      try {
        const emailPayload = buildOrderEmailPayload({
          productName: (item.order_items || []).map((i) => i.product_name).join(', '),
          productUrl: '',
          cartItems: (item.order_items || []).map((i) => ({
            productId: i.product_id,
            name: i.product_name,
            price: i.unit_price,
            quantity: i.quantity,
          })),
          stockWarnings: [],
          paymentMethod: 'online',
          customer: {
            name: item.customer_name || 'Customer',
            phone: item.customer_phone || '',
            email: item.customer_email || null,
            address: item.delivery_address || '',
            city: item.delivery_city || null,
            pincode: item.delivery_pincode || '',
          },
          enquiryType: 'order',
          orderRef: item.order_ref,
        })
        await submitOrderEmail({
          ...emailPayload,
          customer: {
            name: item.customer_name,
            phone: item.customer_phone,
            email: item.customer_email || null,
          },
        })
      } catch (emailErr) {
        console.warn('Order email notification failed:', emailErr)
      }

      // 3. Book shipment on NimbusPost
      let awbMsg = ''
      const { data: shipData, error: shipError } = await adminShipOrder(item.id)

      if (shipError) {
        setActionNoticeVariant('warning')
        setActionNotice(`Payment confirmed for ${item.order_ref}, but NimbusPost booking failed: ${shipError}. You can retry shipping from Ship Orders tab.`)
      } else if (shipData?.shipment?.awb) {
        awbMsg = ` NimbusPost AWB: ${shipData.shipment.awb}`
        setActionNoticeVariant('success')
        setActionNotice(`Payment confirmed for ${item.order_ref}! Shipment booked.${awbMsg}`)
      } else {
        setActionNoticeVariant('success')
        setActionNotice(`Payment confirmed for ${item.order_ref}! Order is ready for shipment.`)
      }

      await refresh({ silent: true })
    } catch (err) {
      setError(err?.message || 'Failed to confirm payment.')
    } finally {
      setBusyPaymentId(null)
    }
  }

  // Ship an already paid order directly via NimbusPost
  async function shipDirectly(item) {
    const ok = await confirm({
      title: 'Book NimbusPost shipment?',
      message: `Create NimbusPost shipment for ${item.order_ref}?\n\nThis will charge your NimbusPost wallet.`,
      confirmLabel: 'Ship Now',
      variant: 'primary',
    })
    if (!ok) return

    setBusyPaymentId(item.id)
    setError('')
    setActionNotice('')

    try {
      const { data, error: shipError } = await adminShipOrder(item.id)
      if (shipError) {
        setActionNoticeVariant('warning')
        setActionNotice(`NimbusPost shipment booking failed: ${shipError}`)
      } else if (data?.shipment?.awb) {
        setActionNoticeVariant('success')
        setActionNotice(`Shipment booked for ${item.order_ref}! AWB: ${data.shipment.awb}`)
      } else {
        setActionNoticeVariant('warning')
        setActionNotice(data?.shipmentWarning || 'Shipment created, waiting for AWB sync.')
      }
      await refresh({ silent: true })
    } catch (err) {
      setError(err?.message || 'Shipment booking failed.')
    } finally {
      setBusyPaymentId(null)
    }
  }

  const filteredPayments = useMemo(() => {
    return payments.filter((item) => {
      if (filter === 'all') return true
      if (filter === 'paid') return item.payment_status === 'paid'
      if (filter === 'pending') return item.payment_status === 'pending' || item.payment_status === 'awaiting_payment'
      if (filter === 'failed') return item.payment_status === 'failed' || item.payment_status === 'rejected'
      return true
    })
  }, [payments, filter])

  const hasMore = payments.length < totalCount

  return (
    <AdminShell
      title="Payments history"
      subtitle="View all Razorpay online transactions, including order references, amounts, and statuses."
      onRefresh={refresh}
    >
      {ConfirmDialog}

      <div className="flex flex-wrap gap-2 mb-4">
        {STATUS_FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] transition-colors ${
              filter === item.id
                ? 'bg-ink text-white'
                : 'border border-ink/20 bg-white text-body hover:bg-[#fcfaf7]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {actionNotice && (
        <div
          className={`mb-4 rounded-xl border p-4 text-sm font-medium ${
            actionNoticeVariant === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
              : 'border-amber-200 bg-amber-50 text-amber-950'
          }`}
        >
          {actionNotice}
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-body">Loading transactions…</p>
      ) : filteredPayments.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white p-8 text-center">
          <p className="font-serif text-xl">No payments found</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-body">
            Try changing the filter tab or refresh to check for new orders.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPayments.map((item) => {
            const isPaid = item.payment_status === 'paid'
            const isBusy = busyPaymentId === item.id
            const hasAwb = Boolean(item.nimbuspost_awb)

            return (
              <article key={item.id} className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-sm font-semibold text-ink">{item.order_ref}</p>
                      <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] ${
                        isPaid
                          ? 'bg-[#edf7f1] text-[#2d6a4f] border border-[#2d6a4f]/20'
                          : item.payment_status === 'pending' || item.payment_status === 'awaiting_payment'
                            ? 'bg-amber-50 text-amber-950 border border-amber-200'
                            : 'bg-red-50 text-red-950 border border-red-200'
                      }`}>
                        {item.payment_status}
                      </span>
                      {hasAwb && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-emerald-800 border border-emerald-300">
                          NimbusPost AWB: {item.nimbuspost_awb}
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm font-semibold">{item.customer_name}</p>
                    <p className="text-xs text-body">
                      {item.customer_phone} {item.customer_email ? `· ${item.customer_email}` : ''}
                    </p>
                    <p className="mt-2 text-xs text-muted">
                      Transaction Date: {new Date(item.created_at).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-serif text-xl font-semibold text-ink">{formatInr(item.grand_total)}</p>
                    <p className="mt-1 text-xs text-body">Razorpay Online Payment</p>
                  </div>
                </div>

                {/* Razorpay Transaction Identifiers */}
                <div className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Razorpay Order ID</span>
                    <p className="font-mono mt-0.5 text-sm font-medium text-ink break-all">{item.razorpay_order_id || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Razorpay Payment ID</span>
                    <p className="font-mono mt-0.5 text-sm font-medium text-ink break-all">{item.razorpay_payment_id || 'N/A'}</p>
                  </div>
                </div>

                {/* Shipping & NimbusPost Status */}
                {hasAwb && (
                  <div className="mt-4 rounded-xl bg-[#f0f7f4] p-3 text-xs text-[#1b4332] border border-[#2d6a4f]/20">
                    <p className="font-semibold">Shipped via NimbusPost</p>
                    {item.courier_name && <p className="mt-1">Courier: <strong>{item.courier_name}</strong></p>}
                    <p className="mt-0.5">AWB: <strong className="font-mono">{item.nimbuspost_awb}</strong></p>
                    {item.tracking_url && (
                      <a
                        href={item.tracking_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1.5 inline-flex font-semibold text-ink hover:underline"
                      >
                        Track shipment on NimbusPost →
                      </a>
                    )}
                  </div>
                )}

                {/* Items Summary */}
                <div className="mt-4 border-t border-line pt-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Items</h3>
                  <div className="mt-2">
                    <AdminOrderItems items={item.order_items} />
                  </div>
                </div>

                {/* Action Toolbar */}
                <div className="mt-5 flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4">
                  {!isPaid && (
                    <div className="flex flex-wrap items-center gap-2 w-full justify-between sm:w-auto sm:justify-end">
                      <span className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                        Customer paid on Razorpay? Confirm below to book shipping.
                      </span>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void confirmAndShipPayment(item)}
                        className="min-h-10 inline-flex items-center justify-center rounded-full bg-[#2d6a4f] px-5 text-xs font-bold uppercase tracking-[0.08em] text-white hover:bg-[#1b4332] disabled:opacity-50 transition-colors shadow-sm"
                      >
                        {isBusy ? 'Processing…' : '✓ Confirm Paid & Book NimbusPost'}
                      </button>
                    </div>
                  )}

                  {isPaid && !hasAwb && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void shipDirectly(item)}
                      className="min-h-10 inline-flex items-center justify-center rounded-full bg-ink px-5 text-xs font-bold uppercase tracking-[0.08em] text-white hover:bg-[#250514] disabled:opacity-50 transition-colors"
                    >
                      {isBusy ? 'Booking NimbusPost…' : 'Ship via NimbusPost'}
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      {!loading && hasMore && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => void loadMore()}
            className="min-h-11 rounded-full border border-ink/20 bg-white px-6 text-xs font-bold uppercase tracking-[0.08em] text-ink disabled:opacity-50"
          >
            {loadingMore ? 'Loading more…' : 'Load more transactions'}
          </button>
        </div>
      )}
    </AdminShell>
  )
}
