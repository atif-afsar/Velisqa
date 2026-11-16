import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import SEOHead from '../Components/SEO/SEOHead'
import { api } from '../lib/apiClient'
import { buildImageUrl } from '../lib/imageCdn'
import { displayProductName } from '../lib/productDisplay'
import { optimizeImageFile } from '../lib/imageOptimize'
import { CheckIcon } from '../Components/UI/Icons'

const MAX_PHOTOS = 3

function StarPicker({ value, onChange, label }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n === 1 ? '' : 's'}`}
          onClick={() => onChange(n)}
          className={`grid h-11 w-11 place-items-center text-[1.75rem] leading-none ${n <= value ? 'text-accent-ink' : 'text-line-strong'}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

async function uploadPhoto(file, orderRef, token) {
  const optimized = await optimizeImageFile(file, { maxDimension: 1600 })
  const signed = await api.post(`/review-requests/${encodeURIComponent(orderRef)}/upload-signature`, { t: token })
  const form = new FormData()
  form.append('file', optimized)
  form.append('api_key', signed.apiKey)
  form.append('timestamp', String(signed.timestamp))
  form.append('folder', signed.folder)
  form.append('signature', signed.signature)
  const res = await fetch(signed.uploadUrl, { method: 'POST', body: form })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error?.message || 'Photo upload failed.')
  return data.secure_url
}

/**
 * /review/:orderRef?t=… — opened from the post-delivery email. No sign-in: the signed link
 * proves the purchase. One star rating + short text (+ up to 3 photos) per piece.
 */
export default function ReviewRequest() {
  const { orderRef } = useParams()
  const [params] = useSearchParams()
  const token = params.get('t') || ''
  const [state, setState] = useState({ loading: true, error: '', data: null })
  const [drafts, setDrafts] = useState({})
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false
    api
      .get(`/review-requests/${encodeURIComponent(orderRef)}`, { query: { t: token } })
      .then((data) => {
        if (cancelled) return
        setState({ loading: false, error: '', data })
        setName(data.customerName || '')
      })
      .catch((err) => !cancelled && setState({ loading: false, error: err?.message || 'This review link is invalid or has expired.', data: null }))
    return () => {
      cancelled = true
    }
  }, [orderRef, token])

  const update = (id, patch) => setDrafts((d) => ({ ...d, [id]: { rating: 0, title: '', body: '', files: [], ...d[id], ...patch } }))

  async function submit(e) {
    e.preventDefault()
    setFormError('')
    const ready = Object.entries(drafts).filter(([, d]) => d.rating > 0)
    if (!ready.length) {
      setFormError('Tap the stars to rate at least one piece.')
      return
    }
    for (const [, d] of ready) {
      if (d.body.trim().length < 10) {
        setFormError('Please write at least 10 characters for each piece you rate.')
        return
      }
    }
    setSubmitting(true)
    try {
      const reviews = []
      for (const [productId, d] of ready) {
        const imageUrls = []
        for (const file of d.files.slice(0, MAX_PHOTOS)) imageUrls.push(await uploadPhoto(file, orderRef, token))
        const fallbackTitle = ['', 'Not for me', 'Could be better', 'Good', 'Really like it', 'Love it'][d.rating]
        reviews.push({ productId, rating: d.rating, title: (d.title.trim() || fallbackTitle).slice(0, 100), body: d.body.trim(), imageUrls })
      }
      await api.post(`/review-requests/${encodeURIComponent(orderRef)}`, { t: token, reviewerName: name.trim() || undefined, reviews })
      setDone(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setFormError(err?.message || 'Could not send your review. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const pending = state.data?.items.filter((i) => !i.reviewed) ?? []

  return (
    <>
      <SEOHead title="Rate your order | Velisqa" description="Rate your Velisqa pieces." canonicalPath="/review" noindex />
      <main className="page-offset-nav min-h-svh bg-mist text-ink">
        <div className="mx-auto max-w-xl px-4 py-10 sm:py-14">
          <h1 className="type-display text-center text-[2rem]">Rate your order</h1>

          {state.loading ? (
            <div className="mt-8 h-40 animate-pulse rounded-xl bg-paper" />
          ) : state.error ? (
            <div className="mt-8 rounded-xl bg-paper p-6 text-center">
              <p className="text-body">{state.error}</p>
              <Link to="/account/orders" className="btn btn-secondary mt-6">
                Go to my orders
              </Link>
            </div>
          ) : done || pending.length === 0 ? (
            <div className="mt-8 rounded-xl bg-paper p-8 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent-tint text-accent-ink">
                <CheckIcon size={22} />
              </span>
              <p className="mt-4 font-serif text-2xl">Thank you!</p>
              <p className="mt-2 text-sm text-body">Your review is with our team and will appear on the site once it is checked.</p>
              <Link to="/collections?sort=best-selling" className="btn btn-primary mt-6">
                Shop bestsellers
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-8 space-y-4">
              <p className="text-center text-sm text-body">Order {state.data.orderRef} · takes under a minute, no sign-in needed.</p>
              {pending.map((item) => {
                const d = drafts[item.productId] || { rating: 0, title: '', body: '', files: [] }
                return (
                  <section key={item.productId} className="rounded-xl bg-paper p-5">
                    <div className="flex items-center gap-4">
                      {item.imageUrl && <img src={buildImageUrl(item.imageUrl, { width: 160, pad: true })} alt="" width="64" height="80" className="h-20 w-16 shrink-0 bg-mist object-cover" />}
                      <h2 className="text-sm font-medium text-ink">{displayProductName(item.name)}</h2>
                    </div>
                    <div className="mt-3">
                      <StarPicker value={d.rating} onChange={(rating) => update(item.productId, { rating })} label={`Rating for ${displayProductName(item.name)}`} />
                    </div>
                    {d.rating > 0 && (
                      <div className="mt-3 space-y-3">
                        <input value={d.title} onChange={(e) => update(item.productId, { title: e.target.value })} maxLength={100} placeholder="Headline (optional)" className="field w-full" />
                        <textarea
                          value={d.body}
                          onChange={(e) => update(item.productId, { body: e.target.value })}
                          maxLength={2000}
                          rows={3}
                          placeholder="How does it look and feel? How was the finish and delivery?"
                          className="field w-full resize-y"
                        />
                        <label className="block text-xs text-muted">
                          Add up to {MAX_PHOTOS} photos (optional)
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            onChange={(e) => update(item.productId, { files: Array.from(e.target.files || []).slice(0, MAX_PHOTOS) })}
                            className="mt-1.5 block w-full text-xs file:mr-3 file:min-h-11 file:rounded-md file:border-0 file:bg-mist file:px-3 file:text-xs file:font-semibold file:text-ink"
                          />
                        </label>
                      </div>
                    )}
                  </section>
                )
              })}
              <label className="block rounded-xl bg-paper p-5 text-sm">
                <span className="text-muted">Name shown with your review</span>
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="field mt-1.5 w-full" />
              </label>
              {formError && (
                <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-danger" role="alert">
                  {formError}
                </p>
              )}
              <button type="submit" disabled={submitting} className="btn btn-primary min-h-12 w-full">
                {submitting ? 'Sending…' : 'Submit review'}
              </button>
            </form>
          )}
        </div>
      </main>
    </>
  )
}
