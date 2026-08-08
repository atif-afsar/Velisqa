import { useEffect, useState, useMemo } from 'react'
import AdminShell from '../Components/Admin/AdminShell'
import AdminOrderItems from '../Components/Admin/AdminOrderItems'
import { formatInr } from '../lib/cartStock'
import { supabase } from '../lib/supabaseClient'

const PAGE_SIZE = 50

const STATUS_FILTERS = [
  { id: 'all', label: 'All Payments' },
  { id: 'paid', label: 'Paid' },
  { id: 'pending', label: 'Pending' },
  { id: 'failed', label: 'Failed/Rejected' },
]

async function fetchOnlinePayments({ offset = 0 } = {}) {
  return supabase
    .from('orders')
    .select(`
      id,
      order_ref,
      customer_name,
      customer_phone,
      customer_email,
      grand_total,
      payment_method,
      payment_status,
      razorpay_order_id,
      razorpay_payment_id,
      created_at,
      order_items (
        product_name,
        quantity,
        unit_price,
        line_total
      )
    `, { count: 'exact' })
    .eq('is_enquiry', false)
    .eq('payment_method', 'online')
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)
}

export default function AdminPayments() {
  const [payments, setPayments] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
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
      <div className="flex flex-wrap gap-2 mb-4">
        {STATUS_FILTERS.map((item) => (
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
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-[#514347]">Loading transactions…</p>
      ) : filteredPayments.length === 0 ? (
        <div className="rounded-2xl border border-[#d4af37]/15 bg-white p-8 text-center">
          <p className="font-serif text-xl">No payments found</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#514347]">
            Try changing the filter tab or refresh to check for new orders.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPayments.map((item) => (
            <article key={item.id} className="rounded-2xl border border-[#d4af37]/15 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-mono text-sm font-semibold text-[#3d0a21]">{item.order_ref}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] ${
                      item.payment_status === 'paid'
                        ? 'bg-[#edf7f1] text-[#2d6a4f]'
                        : item.payment_status === 'pending' || item.payment_status === 'awaiting_payment'
                          ? 'bg-amber-50 text-amber-950 border border-amber-200'
                          : 'bg-red-50 text-red-950 border border-red-200'
                    }`}>
                      {item.payment_status}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-semibold">{item.customer_name}</p>
                  <p className="text-xs text-[#514347]">
                    {item.customer_phone} {item.customer_email ? `· ${item.customer_email}` : ''}
                  </p>
                  <p className="mt-2 text-xs text-[#847377]">
                    Transaction Date: {new Date(item.created_at).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-serif text-xl font-semibold text-[#3d0a21]">{formatInr(item.grand_total)}</p>
                  <p className="mt-1 text-xs text-[#514347]">Razorpay Payment</p>
                </div>
              </div>

              {/* Razorpay Transaction Identifiers */}
              <div className="mt-4 grid gap-3 border-t border-[#d4af37]/15 pt-4 sm:grid-cols-2 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#847377]">Razorpay Order ID</span>
                  <p className="font-mono mt-0.5 text-sm font-medium text-[#130006] break-all">{item.razorpay_order_id || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#847377]">Razorpay Payment ID</span>
                  <p className="font-mono mt-0.5 text-sm font-medium text-[#130006] break-all">{item.razorpay_payment_id || 'N/A'}</p>
                </div>
              </div>

              {/* Items Summary */}
              <div className="mt-4 border-t border-[#d4af37]/15 pt-4">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#847377]">Items</h3>
                <div className="mt-2">
                  <AdminOrderItems items={item.order_items} />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && hasMore && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => void loadMore()}
            className="min-h-11 rounded-full border border-[#3d0a21]/20 bg-white px-6 text-xs font-bold uppercase tracking-[0.08em] text-[#3d0a21] disabled:opacity-50"
          >
            {loadingMore ? 'Loading more…' : 'Load more transactions'}
          </button>
        </div>
      )}
    </AdminShell>
  )
}
