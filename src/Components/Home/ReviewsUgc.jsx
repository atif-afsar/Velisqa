import { useEffect, useState } from 'react'
import { fetchLatestApprovedReviews } from '../../lib/productReviews'
import { INSTAGRAM_URL } from '../SEO/siteConfig'
import { InstagramIcon, StarIcon } from '../UI/Icons'
import Picture from '../UI/Picture'

const MIN_REVIEWS = 3

function Stars({ value }) {
  return (
    <span className="flex gap-0.5 text-ink" aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <StarIcon key={i} size={14} filled={i < Math.round(value)} />
      ))}
    </span>
  )
}

/**
 * Real, approved customer reviews only. Until there are enough to show, the section
 * invites customers to share how they wear Velisqa on Instagram (no placeholder testimonials).
 */
export default function ReviewsUgc() {
  const [reviews, setReviews] = useState([])

  useEffect(() => {
    let cancelled = false
    fetchLatestApprovedReviews(6)
      .then((rows) => !cancelled && setReviews(rows))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  if (reviews.length >= MIN_REVIEWS) {
    return (
      <section aria-labelledby="reviews-heading" className="responsive-section">
        <div className="container-lux">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow text-muted">In their words</p>
            <h2 id="reviews-heading" className="type-section mt-3 text-ink">
              Loved by our customers
            </h2>
          </div>
          <ul className="mt-12 grid gap-6 md:grid-cols-3">
            {reviews.slice(0, 3).map((r) => (
              <li key={r.id} className="flex flex-col border border-line p-8">
                <Stars value={r.rating} />
                {r.title && <p className="mt-5 font-serif text-xl text-ink">{r.title}</p>}
                <p className="mt-3 line-clamp-5 text-sm leading-relaxed text-body">{r.body}</p>
                <p className="eyebrow mt-auto pt-6 text-muted">
                  {r.reviewer_name || 'Verified customer'}
                  {r.is_verified_purchase && <span className="ml-2 text-accent-ink">· Verified</span>}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    )
  }

  return (
    <section aria-labelledby="ugc-heading" className="responsive-section">
      <div className="container-lux grid max-w-6xl items-center gap-10 md:grid-cols-2 lg:gap-20">
        <div className="relative aspect-[4/5] overflow-hidden bg-mist md:order-2">
          <Picture
            slot="editorial-necklace"
            alt="Close-up of a fine gold chain necklace worn with a black blazer"
            sizes="(min-width: 768px) 50vw, 100vw"
            className="absolute inset-0"
          />
        </div>
        <div className="max-w-md">
          <p className="eyebrow text-muted">#WearVelisqa</p>
          <h2 id="ugc-heading" className="type-section mt-3 text-ink">
            How you wear it
          </h2>
          <p className="mt-5 text-[0.95rem] leading-relaxed text-body">
            Share your Velisqa moments and tag us on Instagram for a chance to be featured. After delivery, you can
            also review your pieces from your orders page — every review is from a verified customer.
          </p>
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="btn btn-secondary mt-8">
            <InstagramIcon size={18} />
            Follow @velisqa.in
          </a>
        </div>
      </div>
    </section>
  )
}
