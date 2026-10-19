import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  fetchApprovedProductReviewsPage,
  fetchProductReviewSummary,
  fetchReviewViewerState,
  MAX_REVIEW_IMAGES,
  reportProductReview,
  REVIEWS_PAGE_SIZE,
  submitProductReview,
  uploadReviewImages,
} from '../../lib/productReviews'
import { productPath } from '../../lib/productUrl'

const EMPTY_FORM = { rating: 5, title: '', body: '' }

function Stars({ rating, className = 'text-sm' }) {
  return (
    <span className={`tracking-[0.08em] text-muted ${className}`} aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (index < rating ? '★' : '☆')).join('')}
    </span>
  )
}

function RatingBreakdown({ summary }) {
  if (!summary?.total) return null

  return (
    <div className="mt-5 space-y-2">
      {[5, 4, 3, 2, 1].map((value) => {
        const count = summary.distribution[value] || 0
        const width = summary.total ? `${Math.round((count / summary.total) * 100)}%` : '0%'
        return (
          <div key={value} className="grid grid-cols-[2.5rem_1fr_2rem] items-center gap-2 text-xs text-body">
            <span className="font-medium tabular-nums">{value}★</span>
            <div className="h-2 overflow-hidden rounded-full bg-mist">
              <div className="h-full rounded-full bg-ink" style={{ width }} />
            </div>
            <span className="text-right tabular-nums text-muted">{count}</span>
          </div>
        )
      })}
    </div>
  )
}

function ReviewCard({ review, onReport, reportingId }) {
  return (
    <article className="border border-muted/12 bg-paper p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Stars rating={review.rating} />
          <h3 className="mt-1 font-serif text-lg">{review.title}</h3>
        </div>
        <time className="text-xs text-muted" dateTime={review.created_at}>
          {new Date(review.created_at).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </time>
      </div>
      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-body">{review.body}</p>
      {review.image_urls?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {review.image_urls.map((url) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              <img src={url} alt="Customer review" className="h-20 w-20 object-cover" />
            </a>
          ))}
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold text-ink">{review.reviewer_name}</span>
        {review.is_verified_purchase && (
          <span className="bg-[#2d6a4f]/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-[#2d6a4f]">
            Verified purchase
          </span>
        )}
        {onReport && (
          <button
            type="button"
            onClick={() => onReport(review.id)}
            disabled={reportingId === review.id}
            className="ml-auto text-[10px] font-semibold uppercase tracking-[0.08em] text-muted transition hover:text-ink disabled:opacity-50"
          >
            {reportingId === review.id ? 'Reporting…' : 'Report'}
          </button>
        )}
      </div>
    </article>
  )
}

function PendingReviewCard({ review }) {
  return (
    <article className="border border-amber-200 bg-amber-50/70 p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-900">Your review · Pending moderation</p>
      <div className="mt-2">
        <Stars rating={review.rating} />
        <h3 className="mt-1 font-serif text-lg text-ink">{review.title}</h3>
      </div>
      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-body">{review.body}</p>
      <p className="mt-3 text-xs text-muted">It will appear publicly after the Velisqa team approves it.</p>
    </article>
  )
}

export default function ProductReviews({ product }) {
  const { user, profile, loading: authLoading, requireSignIn } = useAuth()
  const [reviews, setReviews] = useState([])
  const [summary, setSummary] = useState(null)
  const [totalReviews, setTotalReviews] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [viewerState, setViewerState] = useState({ eligible: false, ownReview: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [imageFiles, setImageFiles] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [reportingId, setReportingId] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function loadReviews() {
      setLoading(true)
      setError('')
      setPage(0)
      try {
        const [pageResult, reviewSummary, state] = await Promise.all([
          fetchApprovedProductReviewsPage(product.id, 0, REVIEWS_PAGE_SIZE),
          fetchProductReviewSummary(product.id),
          fetchReviewViewerState(product.id, user?.id),
        ])
        if (!cancelled) {
          setReviews(pageResult.reviews)
          setTotalReviews(pageResult.total)
          setHasMore(pageResult.hasMore)
          setSummary(reviewSummary)
          setViewerState(state)
        }
      } catch {
        if (!cancelled) {
          setError('Reviews could not be loaded. Please try again later.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadReviews()
    return () => {
      cancelled = true
    }
  }, [product.id, user?.id])


  // Only approved customer reviews count towards the displayed rating.
  const aggregateCount = Number(summary?.total || 0)
  const aggregateRating = aggregateCount > 0 ? Number(summary?.average || 0) : 0
  const reviewerName =
    profile?.full_name
    || user?.user_metadata?.full_name
    || 'Verified customer'

  async function loadMoreReviews() {
    const nextPage = page + 1
    setLoadingMore(true)
    setError('')
    try {
      const pageResult = await fetchApprovedProductReviewsPage(product.id, nextPage, REVIEWS_PAGE_SIZE)
      setReviews((current) => [...current, ...pageResult.reviews])
      setPage(nextPage)
      setHasMore(pageResult.hasMore)
      setTotalReviews(pageResult.total)
    } catch (err) {
      setError(err?.message || 'Could not load more reviews.')
    } finally {
      setLoadingMore(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const title = form.title.trim()
    const body = form.body.trim()
    if (title.length < 3 || body.length < 10) {
      setError('Add a short title and at least 10 characters about your experience.')
      return
    }

    setSubmitting(true)
    setError('')
    setNotice('')
    try {
      const imageUrls = await uploadReviewImages(imageFiles)
      const reviewId = await submitProductReview({
        productId: product.id,
        rating: form.rating,
        title,
        body,
        reviewerName,
        imageUrls,
      })
      setViewerState({
        eligible: true,
        ownReview: {
          id: reviewId,
          rating: form.rating,
          title,
          body,
          image_urls: imageUrls,
          status: 'pending',
          created_at: new Date().toISOString(),
        },
      })
      setForm(EMPTY_FORM)
      setImageFiles([])
      setNotice('Thank you. Your review was submitted and will appear after moderation.')
    } catch (err) {
      setError(err?.message || 'Could not submit your review.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReport(reviewId) {
    if (!user) {
      requireSignIn(() => {}, { returnTo: `${productPath(product)}#product-reviews` })
      return
    }

    setReportingId(reviewId)
    setError('')
    setNotice('')
    try {
      await reportProductReview(reviewId)
      setReviews((current) => current.filter((review) => review.id !== reviewId))
      setTotalReviews((current) => Math.max(0, current - 1))
      if (summary) {
        setSummary((current) => ({
          ...current,
          total: Math.max(0, current.total - 1),
        }))
      }
      setNotice('Thanks. This review was reported and hidden while our team reviews it.')
    } catch (err) {
      setError(err?.message || 'Could not report this review.')
    } finally {
      setReportingId(null)
    }
  }

  return (
    <section
      id="product-reviews"
      className="mt-14 scroll-mt-[calc(var(--nav-height)+1rem)] border-t border-line pt-10 sm:mt-20 sm:pt-14"
      aria-labelledby="product-reviews-title"
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.65fr)] lg:gap-12">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">Customer experiences</p>
          <div className="mt-2 flex flex-wrap items-end gap-3">
            <h2 id="product-reviews-title" className="font-serif text-3xl">Reviews</h2>
            {aggregateCount > 0 ? (
              <p className="pb-1 text-sm text-body">
                <span className="font-semibold text-ink">{aggregateRating.toFixed(1)} ★</span>
                {' · '}
                {aggregateCount} approved review{aggregateCount === 1 ? '' : 's'}
              </p>
            ) : (
              <p className="pb-1 text-sm text-muted">No reviews yet</p>
            )}
          </div>

          {summary?.total > 0 && <RatingBreakdown summary={summary} />}

          {loading ? (
            <div className="mt-6 space-y-3">
              <div className="h-28 animate-pulse bg-mist" />
              <div className="h-28 animate-pulse bg-mist" />
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {viewerState.ownReview?.status === 'pending' && (
                <PendingReviewCard review={viewerState.ownReview} />
              )}

              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    onReport={user ? handleReport : null}
                    reportingId={reportingId}
                  />
                ))
              ) : !viewerState.ownReview ? (
                <div className="border border-dashed border-line bg-paper px-5 py-10 text-center">
                  <p className="font-serif text-xl">Be the first to review this piece</p>
                  <p className="mt-2 text-sm text-muted">Reviews are accepted from customers after delivery.</p>
                </div>
              ) : null}

              {hasMore && (
                <button
                  type="button"
                  onClick={() => void loadMoreReviews()}
                  disabled={loadingMore}
                  className="w-full border border-ink/20 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-ink transition hover:bg-white disabled:opacity-60"
                >
                  {loadingMore ? 'Loading…' : `Load more reviews (${reviews.length} of ${totalReviews})`}
                </button>
              )}
            </div>
          )}
        </div>

        <aside className="lg:pt-5">
          <div className="border border-line bg-paper p-5 sm:p-6">
            <h3 className="font-serif text-xl">Share your experience</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Only verified buyers with a delivered order can submit a review. Each customer may review a product once.
            </p>

            {error && <p className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
            {notice && <p className="mt-4 border border-[#2d6a4f]/20 bg-[#edf7f1] px-3 py-2 text-sm text-[#1f4334]">{notice}</p>}

            {!authLoading && !user ? (
              <div className="mt-4">
                <p className="text-sm leading-relaxed text-body">Sign in with the account used for your delivered order.</p>
                <button
                  type="button"
                  onClick={() => requireSignIn(() => {}, { returnTo: `${productPath(product)}#product-reviews` })}
                  className="mt-4 w-full bg-ink px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white"
                >
                  Sign in to review
                </button>
              </div>
            ) : viewerState.ownReview ? (
              <div className="mt-4 text-sm leading-relaxed text-body">
                <p className="font-semibold text-ink">Review submitted</p>
                <p className="mt-1">
                  Status: <span className="capitalize">{viewerState.ownReview.status}</span>.
                  {viewerState.ownReview.status === 'pending' && ' It will appear publicly after moderation.'}
                  {viewerState.ownReview.status === 'approved' && ' Thank you for helping other shoppers.'}
                  {viewerState.ownReview.status === 'rejected' && ' Contact support if you believe this was a mistake.'}
                </p>
              </div>
            ) : user && viewerState.eligible ? (
              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <fieldset>
                  <legend className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Your rating</legend>
                  <div className="mt-2 flex gap-1" role="radiogroup" aria-label="Rating">
                    {Array.from({ length: 5 }, (_, index) => index + 1).map((value) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={form.rating === value}
                        onClick={() => setForm((current) => ({ ...current, rating: value }))}
                        className={`text-2xl ${value <= form.rating ? 'text-muted' : 'text-muted'}`}
                        aria-label={`${value} star${value === 1 ? '' : 's'}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </fieldset>
                <label className="block">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Title</span>
                  <input
                    value={form.title}
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                    maxLength={100}
                    required
                    className="mt-1.5 w-full border border-muted/20 bg-white px-3 py-2.5 text-sm outline-none focus:border-ink/40"
                    placeholder="Beautiful everyday piece"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Review</span>
                  <textarea
                    value={form.body}
                    onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
                    minLength={10}
                    maxLength={2000}
                    required
                    rows={5}
                    className="mt-1.5 w-full resize-y border border-muted/20 bg-white px-3 py-2.5 text-sm outline-none focus:border-ink/40"
                    placeholder="Tell other customers about the finish, fit, and delivery…"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Photos (optional, up to {MAX_REVIEW_IMAGES})</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={(event) => setImageFiles(Array.from(event.target.files || []).slice(0, MAX_REVIEW_IMAGES))}
                    className="mt-1.5 block w-full text-xs text-body file:mr-3 file:rounded-full file:border-0 file:bg-ink/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-ink"
                  />
                  {imageFiles.length > 0 && (
                    <p className="mt-1 text-xs text-muted">
                      {imageFiles.length} photo{imageFiles.length === 1 ? '' : 's'} selected
                    </p>
                  )}
                </label>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-ink px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white disabled:opacity-60"
                >
                  {submitting ? 'Submitting…' : 'Submit for review'}
                </button>
              </form>
            ) : user && !loading ? (
              <p className="mt-4 text-sm leading-relaxed text-body">
                You can review this piece after an order containing it has been delivered to your account.
              </p>
            ) : (
              <p className="mt-4 text-sm text-muted">Checking purchase eligibility…</p>
            )}
          </div>
        </aside>
      </div>
    </section>
  )
}
