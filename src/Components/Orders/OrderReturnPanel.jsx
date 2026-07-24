import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  RETURN_REASONS,
  RETURN_STATUS_LABELS,
  checkCanRequestReturn,
  fetchReturnForOrder,
  formatReturnMigrationHint,
  isOrderDelivered,
  submitOrderReturn,
} from '../../lib/orderReturns'

const fieldClass =
  'box-border w-full rounded-lg border border-[#130006]/15 bg-white px-3 py-2.5 text-sm text-[#130006] outline-none focus:border-[#6f334a] focus:ring-1 focus:ring-[#6f334a]/20'

export default function OrderReturnPanel({ orderId, orderRef, order }) {
  const [returnRow, setReturnRow] = useState(null)
  const [canRequest, setCanRequest] = useState(false)
  const [loading, setLoading] = useState(true)
  const [reason, setReason] = useState(RETURN_REASONS[0].value)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const delivered = isOrderDelivered(order)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!orderId || !delivered) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')
      try {
        const [existing, eligible] = await Promise.all([
          fetchReturnForOrder(orderId),
          checkCanRequestReturn(orderId),
        ])
        if (cancelled) return
        setReturnRow(existing)
        setCanRequest(eligible && !existing)
      } catch (err) {
        if (!cancelled) {
          setError(`${err?.message || 'Could not load return status.'}${formatReturnMigrationHint(err?.message)}`)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [orderId, delivered])

  if (!delivered || loading) return null

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await submitOrderReturn({ orderId, reason, customerNotes: notes })
      const existing = await fetchReturnForOrder(orderId)
      setReturnRow(existing)
      setCanRequest(false)
      setNotice('Your return request was submitted. We will review it shortly.')
    } catch (err) {
      setError(`${err?.message || 'Could not submit return request.'}${formatReturnMigrationHint(err?.message)}`)
    } finally {
      setBusy(false)
    }
  }

  const statusLabel = returnRow ? RETURN_STATUS_LABELS[returnRow.status] || returnRow.status : null

  return (
    <section className="mt-6 rounded-2xl border border-[#d4af37]/25 bg-white/80 p-4 sm:p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#847377]">Return after delivery</p>

      {notice && (
        <p className="mt-3 rounded-xl border border-[#2d6a4f]/25 bg-[#f0f7f4] px-3 py-2.5 text-sm text-[#1b4332]">
          {notice}
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-900">
          {error}
        </p>
      )}

      {returnRow ? (
        <div className="mt-3 space-y-2 text-sm text-[#514347]">
          <p className="font-semibold text-[#130006]">{statusLabel}</p>
          <p>
            Reason: <span className="text-[#130006]">{returnRow.reason}</span>
          </p>
          {returnRow.rejection_reason && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-red-900">
              {returnRow.rejection_reason}
            </p>
          )}
          {returnRow.reverse_awb && (
            <p>
              Reverse AWB:{' '}
              <span className="font-mono font-semibold text-[#130006]">{returnRow.reverse_awb}</span>
            </p>
          )}
          {returnRow.reverse_tracking_url && (
            <a
              href={returnRow.reverse_tracking_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex font-semibold text-[#6f334a] underline-offset-2 hover:underline"
            >
              Track return shipment
            </a>
          )}
          {returnRow.status === 'refunded' && (
            <p className="text-[#1b4332]">Your refund has been processed per our policy.</p>
          )}
        </div>
      ) : canRequest ? (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <p className="text-sm text-[#514347]">
            Not satisfied with order <span className="font-mono font-semibold">{orderRef}</span>? Request a return within
            5 days of delivery.
          </p>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#847377]">Reason</span>
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className={`${fieldClass} mt-1`}
              required
            >
              {RETURN_REASONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#847377]">Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              maxLength={1000}
              className={`${fieldClass} mt-1 resize-y`}
              placeholder="Tell us what went wrong (optional)."
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="min-h-10 rounded-full bg-[#3d0a21] px-5 text-xs font-bold uppercase tracking-[0.08em] text-[#f7ead0] disabled:opacity-50"
          >
            {busy ? 'Submitting…' : 'Request return'}
          </button>
        </form>
      ) : (
        <p className="mt-3 text-sm text-[#514347]">
          This order is not eligible for an online return (window expired or already handled). See our{' '}
          <Link to="/refund-cancellation" className="font-semibold text-[#6f334a] underline-offset-2 hover:underline">
            refund policy
          </Link>{' '}
          or contact us on WhatsApp for help.
        </p>
      )}

      <p className="mt-4 text-xs text-[#847377]">
        Read the full{' '}
        <Link to="/refund-cancellation" className="text-[#6f334a] underline-offset-2 hover:underline">
          Refund &amp; cancellation policy
        </Link>
        .
      </p>
    </section>
  )
}
