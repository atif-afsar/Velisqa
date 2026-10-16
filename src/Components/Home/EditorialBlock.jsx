import { Link } from 'react-router-dom'
import Picture from '../UI/Picture'

/** One editorial campaign moment: lifestyle image + short brand story. */
export default function EditorialBlock() {
  return (
    <section aria-labelledby="editorial-heading" className="bg-mist">
      <div className="grid lg:grid-cols-2">
        <div className="relative aspect-[4/5] overflow-hidden sm:aspect-[4/3] lg:aspect-auto lg:min-h-[720px]">
          <Picture
            slot="editorial-story"
            alt="Model in profile wearing sculpted gold drop earrings against a grey backdrop"
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="absolute inset-0"
            objectPosition="50% 30%"
          />
        </div>
        <div className="flex items-center px-6 py-16 sm:px-12 lg:px-20 lg:py-24">
          <div className="max-w-md">
            <p className="eyebrow text-muted">The Velisqa story</p>
            <h2 id="editorial-heading" className="type-display mt-4 text-ink">
              Designed for the moments in between
            </h2>
            <p className="mt-6 text-[0.95rem] leading-relaxed text-body">
              Velisqa began with a simple idea: jewellery that feels considered should not be kept for special occasions.
              Each piece is designed in India with clean lines, luminous finishes and a quiet confidence — for the
              meeting, the dinner and everything in between.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
              <Link to="/about" className="btn btn-secondary">
                Our story
              </Link>
              <Link to="/collections?sort=newest" className="btn btn-link">
                New arrivals
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
