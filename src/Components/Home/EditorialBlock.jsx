import { Link } from 'react-router-dom'
import Picture from '../UI/Picture'

/** Homepage "Our story" moment: lifestyle image + short brand story + founders. */
export default function EditorialBlock() {
  return (
    <section aria-labelledby="editorial-heading" className="bg-mist">
      <div className="grid lg:grid-cols-2">
        <div className="relative aspect-[4/5] overflow-hidden sm:aspect-[4/3] lg:aspect-auto lg:min-h-[760px]">
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
            <p className="eyebrow text-muted">Our story</p>
            <h2 id="editorial-heading" className="type-display mt-4 text-ink">
              Designed for the moments in between
            </h2>
            <p className="mt-6 text-[0.95rem] leading-relaxed text-body">
              Velisqa began in Aligarh with a simple idea: jewellery that feels considered shouldn’t be saved for special
              occasions. Every piece is designed with clean lines and a luminous finish — for the meeting, the dinner and
              everything in between.
            </p>
            <div className="mt-8 flex items-center gap-4 border-t border-line pt-6">
              <div className="flex -space-x-3" aria-hidden="true">
                {['founder-sameer-shameem', 'founder-atif-afsar'].map((slot) => (
                  <span key={slot} className="relative block h-12 w-12 overflow-hidden rounded-full border-2 border-mist bg-line">
                    <Picture slot={slot} alt="" sizes="48px" className="absolute inset-0" objectPosition="50% 25%" />
                  </span>
                ))}
              </div>
              <p className="text-sm text-body">
                Founded by{' '}
                <Link to="/founders" className="text-ink underline underline-offset-4 hover:text-accent-ink">
                  Sameer Shameem &amp; Atif Afsar
                </Link>
              </p>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
              <Link to="/about" className="btn btn-secondary">
                Read our story
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
