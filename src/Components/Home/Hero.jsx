import { Link } from 'react-router-dom'
import Picture from '../UI/Picture'
import { SHOP_CATEGORIES, categoryPath } from '../../data/shopCategories'

/**
 * Campaign hero: one portrait image (the LCP element) + headline + primary CTA.
 * Mobile: image first, copy below. Desktop: split — copy left, full-height portrait right.
 */
export default function Hero() {
  return (
    <section aria-labelledby="hero-heading" className="lg:grid lg:min-h-[min(calc(100svh-var(--nav-height)),880px)] lg:grid-cols-2">
      <div className="relative aspect-[4/5] max-h-[calc(100svh-var(--nav-height)-6rem)] w-full overflow-hidden bg-[#d9d9d6] sm:aspect-[16/12] lg:order-2 lg:aspect-auto lg:max-h-none">
        <Picture
          slot="campaign-hero-b"
          alt="Model in a white ribbed turtleneck wearing a sculpted gold statement earring"
          sizes="(min-width: 1024px) 50vw, 100vw"
          priority
          className="absolute inset-0"
          objectPosition="50% 30%"
        />
      </div>

      <div className="flex items-center bg-mist lg:order-1">
        <div className="container-lux py-10 text-center sm:py-14 lg:mx-0 lg:w-full lg:max-w-none lg:px-16 lg:text-left xl:px-24">
          <p className="eyebrow text-muted">The new season edit</p>
          <h1 id="hero-heading" className="type-hero mt-4 text-ink lg:max-w-xl">
            Jewellery, quietly extraordinary
          </h1>
          <p className="mx-auto mt-5 max-w-md text-[0.95rem] leading-relaxed text-body lg:mx-0">
            Modern pieces in gold and silver tones — made to be worn every day and noticed every time.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Link to="/collections" className="btn btn-primary w-full sm:w-auto">
              Shop the collection
            </Link>
            <Link to="/collections?sort=best-selling" className="btn btn-secondary w-full sm:w-auto">
              Bestsellers
            </Link>
          </div>
          <ul className="mt-10 hidden flex-wrap gap-x-6 gap-y-2 lg:flex" aria-label="Shop by category">
            {SHOP_CATEGORIES.map((c) => (
              <li key={c.slug}>
                <Link to={categoryPath(c)} className="link-underline text-sm text-body hover:text-ink">
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs text-muted lg:mt-8">Free shipping on prepaid orders · 5-day returns · Secure payment</p>
        </div>
      </div>
    </section>
  )
}
