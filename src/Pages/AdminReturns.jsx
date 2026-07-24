import { useCallback, useEffect, useState } from 'react'
import AdminShell from '../Components/Admin/AdminShell'
import { formatInr } from '../lib/cartStock'
import { RETURN_STATUS_LABELS } from '../lib/orderReturns'
import { adminManageReturn, fetchAdminOrderReturns } from '../lib/orderReturnsAdmin'
import { formatReturnMigrationHint } from '../lib/orderReturns'

const FILTERS = [
  { id: 'pending', label: 'Pending' },
  { id: 'active', label: 'In progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'all', label: 'All' },
]

export default function AdminReturns() {
  const [filter, setFilter] = useState('pending')
  const [returns, setReturns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [reverseForms, setReverseForms] = useState({})
  const [rejectForms, setRejectForms] = useState({})

  const refresh = useCallback(async () => {
    setError('')
    try {
      if (filter === 'all') {
        const [pending, active, completed] = await Promise.all([
          fetchAdminOrderReturns('pending'),
          fetchAdminOrderReturns('active'),
          fetchAdminOrderReturns('completed'),
        ])
        setReturns([...pending, ...active, ...completed])
      } else {
        setReturns(await fetchAdminOrderReturns(filter))
      }
    } catch (err) {
      setError(`${err?.message || 'Could not load returns.'}${formatReturnMigrationHint(err?.message)}`)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    setLoading(true)
    void refresh()
  }, [refresh])

  async function runAction(returnId, payload) {
    setBusyId(returnId)
    setNotice('')
    setError('')
    try {
      const data = await adminManageReturn({ returnId, ...payload })
      setNotice(data?.message || 'Updated.')
      await refresh()
    } catch (err) {
      setError(err?.message || 'Action failed.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <AdminShell
      title="Customer returns"
      subtitle="Approve post-delivery returns, enter NimbusPost reverse AWB, QC at warehouse, then mark refunded."
      onRefresh={refresh}
    >
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setLoading(true)
              setFilter(item.id)
            }}
            className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] ${
              filter === item.id
                ? 'bg-[#3d0a21] text-[#f7ead0]'
                : 'border border-[#847377]/20 bg-white text-[#514347]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {notice && (
        <p className="mb-4 rounded-xl border border-[#2d6a4f]/25 bg-[#f0f7f4] p-4 text-sm text-[#1b4332]">{notice}</p>
      )}
      {error && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-[#514347]">Loading return requests…</p>
      ) : returns.length === 0 ? (
        <p className="rounded-xl border border-[#d4af37]/20 bg-white p-6 text-sm text-[#514347]">
          No return requests in this view.
        </p>
      ) : (
        <ul className="space-y-4">
          {returns.map((row) => {
            const order = row.orders || {}
            const busy = busyId === row.id
            const reverse = reverseForms[row.id] || { awb: row.reverse_awb || '', url: row.reverse_tracking_url || '' }
            const rejectReason = rejectForms[row.id] || ''

            return (
              <li
                key={row.id}
                className="rounded-2xl border border-[#d4af37]/20 bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm font-semibold text-[#3d0a21]">{order.order_ref}</p>
                    <p className="mt-1 text-sm text-[#514347]">
                      {order.customer_name} · {order.customer_phone}
                    </p>
                    <p className="mt-1 text-xs text-[#847377]">
                      Requested {new Date(row.requested_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-serif text-xl font-semibold text-[#130006]">{formatInr(order.grand_total)}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#6f334a]">
                      {RETURN_STATUS_LABELS[row.status] || row.status}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-sm text-[#514347]">
                  <span className="font-semibold text-[#130006]">Reason:</span> {row.reason}
                </p>
                {row.customer_notes && (
                  <p className="mt-2 text-sm text-[#514347]">{row.customer_notes}</p>
                )}

                <div className="mt-5 flex flex-wrap gap-2">
                  {row.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void runAction(row.id, { action: 'approve' })}
                        className="rounded-full bg-[#2d6a4f] px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-white disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <div className="flex min-w-[220px] flex-1 flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={rejectReason}
                          onChange={(event) => setRejectForms((prev) => ({ ...prev, [row.id]: event.target.value }))}
                          placeholder="Rejection reason for customer"
                          className="min-w-[180px] flex-1 rounded-lg border border-[#130006]/15 px-3 py-2 text-sm"
                        />
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void runAction(row.id, { action: 'reject', rejectionReason: rejectReason })}
                          className="rounded-full border border-red-300 px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-red-800 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </>
                  )}

                  {['approved', 'pickup_scheduled', 'in_transit'].includes(row.status) && (
                    <div className="w-full space-y-2 rounded-xl bg-[#f1ede8] p-3">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#847377]">Reverse pickup (NimbusPost)</p>
                      <input
                        type="text"
                        value={reverse.awb}
                        onChange={(event) =>
                          setReverseForms((prev) => ({
                            ...prev,
                            [row.id]: { ...reverse, awb: event.target.value },
                          }))
                        }
                        placeholder="Reverse AWB"
                        className="w-full rounded-lg border border-[#130006]/15 px-3 py-2 text-sm font-mono"
                      />
                      <input
                        type="url"
                        value={reverse.url}
                        onChange={(event) =>
                          setReverseForms((prev) => ({
                            ...prev,
                            [row.id]: { ...reverse, url: event.target.value },
                          }))
                        }
                        placeholder="Tracking URL (optional)"
                        className="w-full rounded-lg border border-[#130006]/15 px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void runAction(row.id, {
                            action: 'set_reverse_awb',
                            reverseAwb: reverse.awb,
                            reverseTrackingUrl: reverse.url,
                          })
                        }
                        className="rounded-full bg-[#3d0a21] px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-[#f7ead0] disabled:opacity-50"
                      >
                        Save reverse AWB
                      </button>
                    </div>
                  )}

                  {['pickup_scheduled', 'in_transit', 'approved'].includes(row.status) && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void runAction(row.id, { action: 'mark_received' })}
                      className="rounded-full border border-[#3d0a21]/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-[#3d0a21] disabled:opacity-50"
                    >
                      Mark received
                    </button>
                  )}

                  {row.status === 'received' && (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void runAction(row.id, { action: 'qc_pass' })}
                        className="rounded-full bg-[#2d6a4f] px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-white disabled:opacity-50"
                      >
                        QC pass + restock
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void runAction(row.id, { action: 'qc_fail' })}
                        className="rounded-full border border-amber-400 px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-amber-900 disabled:opacity-50"
                      >
                        QC fail
                      </button>
                    </>
                  )}

                  {row.status === 'qc_passed' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void runAction(row.id, { action: 'mark_refunded' })}
                      className="rounded-full bg-[#6f334a] px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-white disabled:opacity-50"
                    >
                      Mark refunded
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </AdminShell>
  )
}
