import { useCallback, useEffect, useState } from 'react'
import AdminShell from '../Components/Admin/AdminShell'
import { useCatalog } from '../context/CatalogContext'
import {
  fetchAdminProductReviews,
  moderateProductReview,
} from '../lib/productReviews'

const FILTERS = ['pending', 'approved', 'rejected', 'reported', 'all']

export default function AdminReviews() {
  const { notifyCatalogChange } = useCatalog()
  const [filter, setFilter] = useState('pending')
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busyId, setBusyId] = useState(null)

  const refresh = useCallback(async () => {
    setError('')
    try {
      setReviews(await fetchAdminProductReviews(filter))
    } catch (err) {
      const migrationHint = /product_reviews/i.test(err?.message || '')
        ? ' Run supabase/product-reviews.sql in the Supabase SQL Editor.'
        : ''
      setError(`${err?.message || 'Could not load reviews.'}${migrationHint}`)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    let cancelled = false
    fetchAdminProductReviews(filter)
      .then((data) => {
        if (!cancelled) {
          setReviews(data)
          setError('')
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const hint = /product_reviews/i.test(err?.message || '')
            ? ' Run supabase/product-reviews.sql in the Supabase SQL Editor.'
            : ''
          setError(`${err?.message || 'Could not load reviews.'}${hint}`)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [filter])

  async function moderate(review, status) {
    setBusyId(review.id)
    setError('')
    setNotice('')
    try {
      await moderateProductReview(review.id, status)
      notifyCatalogChange()
      setNotice(`Review marked ${status}. Product rating aggregates were updated automatically.`)
      await refresh()
    } catch (err) {
      setError(err?.message || 'Could not update this review.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <AdminShell
      title="Customer reviews"
      subtitle="Approve only genuine, useful reviews. Approved reviews automatically update product ratings and counts."
      onRefresh={refresh}
    >
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              setLoading(true)
              setFilter(item)
            }}
            className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] ${
              filter === item
                ? 'bg-[#3d0a21] text-[#f7ead0]'
                : 'border border-[#847377]/20 bg-white text-[#514347]'
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {error && <p className="mb-5 whitespace-pre-line rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      {notice && <p className="mb-5 rounded-xl border border-[#2d6a4f]/20 bg-[#edf7f1] px-4 py-3 text-sm text-[#1f4334]">{notice}</p>}

      {loading ? (
        <p className="text-sm text-[#847377]">Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <div className="rounded-2xl border border-[#2d6a4f]/20 bg-[#edf7f1] p-8 text-center">
          <p className="font-serif text-xl text-[#1f4334]">No {filter === 'all' ? '' : filter} reviews</p>
          <p className="mt-2 text-sm text-[#52705f]">There is nothing to moderate in this view.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <article key={review.id} className="rounded-2xl border border-[#847377]/15 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#847377]">
                    {review.products?.name || 'Deleted product'}
                  </p>
                  <div className="mt-1 text-sm tracking-[0.08em] text-[#d4af37]" aria-label={`${review.rating} stars`}>
                    {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                  </div>
                  <h2 className="mt-1 font-serif text-xl">{review.title}</h2>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] ${
                  review.status === 'approved'
                    ? 'bg-[#2d6a4f]/10 text-[#2d6a4f]'
                    : review.status === 'rejected'
                      ? 'bg-red-50 text-red-700'
                      : 'bg-amber-50 text-amber-800'
                }`}>
                  {review.status}
                </span>
              </div>

              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[#514347]">{review.body}</p>

              {review.image_urls?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {review.image_urls.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer">
                      <img src={url} alt="Review evidence" className="h-20 w-20 rounded-lg object-cover" />
                    </a>
                  ))}
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#847377]/10 pt-4 text-xs text-[#847377]">
                <span className="font-semibold text-[#514347]">{review.reviewer_name}</span>
                {review.is_verified_purchase && <span className="font-semibold text-[#2d6a4f]">✓ Verified purchase</span>}
                <span>Order {review.order_id.slice(0, 8)}</span>
                <time dateTime={review.created_at}>{new Date(review.created_at).toLocaleString('en-IN')}</time>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {review.status !== 'approved' && (
                  <ActionButton disabled={busyId === review.id} onClick={() => moderate(review, 'approved')} tone="approve">
                    Approve
                  </ActionButton>
                )}
                {review.status !== 'rejected' && (
                  <ActionButton disabled={busyId === review.id} onClick={() => moderate(review, 'rejected')} tone="reject">
                    Reject
                  </ActionButton>
                )}
                {review.status !== 'reported' && (
                  <ActionButton disabled={busyId === review.id} onClick={() => moderate(review, 'reported')}>
                    Mark reported
                  </ActionButton>
                )}
                {review.status !== 'pending' && (
                  <ActionButton disabled={busyId === review.id} onClick={() => moderate(review, 'pending')}>
                    Return to pending
                  </ActionButton>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </AdminShell>
  )
}

function ActionButton({ children, tone = 'default', ...props }) {
  const tones = {
    default: 'border-[#847377]/25 text-[#514347]',
    approve: 'border-[#2d6a4f]/25 bg-[#edf7f1] text-[#1f4334]',
    reject: 'border-red-200 bg-red-50 text-red-700',
  }
  return (
    <button type="button" {...props} className={`rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-[0.1em] disabled:opacity-50 ${tones[tone]}`}>
      {children}
    </button>
  )
}
