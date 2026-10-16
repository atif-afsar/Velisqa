import { Link } from 'react-router-dom'
import Picture from '../UI/Picture'
import { SHOP_CATEGORIES, categoryPath } from '../../data/shopCategories'
import { ArrowRightIcon } from '../UI/Icons'

const necklaces = SHOP_CATEGORIES.find((c) => c.slug === 'necklaces')
const bangles = SHOP_CATEGORIES.find((c) => c.slug === 'bangles')

/** Frosted feature card used on the right of the hero (desktop). */
function GlassCard({ children, className = '' }) {
  return (
    <div className={`border border-white/35 bg-white/10 p-3 backdrop-blur-md ${className}`}>
      {children}
    </div>
  )
}

/**
 * Full-bleed campaign hero: one photograph (the LCP image) with a soft dark wash,
 * the brand tagline as a large serif headline, CTAs bottom-left and
 * frosted feature cards bottom-right on desktop.
 */
export default function Hero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative isolate h-[calc(100svh-var(--nav-height))] max-h-[880px] min-h-[600px] overflow-hidden bg-[#8f8f94] text-white"
    >
      <Picture
        slot="campaign-hero-c"
        alt="Model with hands in her hair wearing gold knot earrings and a fine gold necklace"
        sizes="100vw"
        priority
        className="absolute inset-0 -z-10"
        imgClassName="object-[50%_30%] lg:object-[50%_58%]"
      />
      {/* Legibility wash: left on desktop, bottom on mobile */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/65 via-black/15 to-transparent lg:bg-gradient-to-r lg:from-black/55 lg:via-black/15 lg:to-transparent" />

      <div className="container-lux flex h-full flex-col justify-end pb-10 sm:pb-14 lg:justify-between lg:pb-14 lg:pt-24">
        <div>
          <h1 id="hero-heading" className="max-w-[11ch] font-serif text-[clamp(2.9rem,6.4vw,6rem)] font-medium leading-[1.02] tracking-[-0.02em]">
            Some things you don’t take off
          </h1>
        </div>

        <div className="mt-8 flex items-end justify-between gap-10">
          <div className="max-w-md">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to="/collections" className="btn btn-light w-full sm:w-auto">
                Shop the collection
              </Link>
              <Link to="/collections?sort=best-selling" className="btn w-full border-white/60 text-white hover:border-white hover:bg-white/10 sm:w-auto">
                Bestsellers
              </Link>
            </div>
          </div>

          {/* Feature cards (desktop) */}
          <div className="hidden w-[340px] shrink-0 space-y-2.5 lg:block xl:w-[380px]">
            <GlassCard>
              <Link to="/collections?sort=newest" className="group flex items-center gap-4">
                <span className="relative block h-24 w-24 shrink-0 overflow-hidden">
                  <Picture slot="editorial-story" alt="" sizes="96px" className="absolute inset-0" imgClassName="img-zoom" objectPosition="40% 30%" />
                </span>
                <span>
                  <span className="block font-serif text-xl uppercase leading-tight tracking-[0.02em]">Explore the new season</span>
                  <span className="mt-3 inline-flex min-h-8 items-center gap-2 bg-white px-3 text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-ink">
                    View more <ArrowRightIcon size={14} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </span>
              </Link>
            </GlassCard>
            <GlassCard className="grid grid-cols-2 gap-2.5">
              {[necklaces, bangles].filter(Boolean).map((c) => (
                <Link key={c.slug} to={categoryPath(c)} className="group relative block aspect-[16/10] overflow-hidden bg-white">
                  <img src={c.image(360)} alt="" width="360" height="270" loading="lazy" decoding="async" className="img-zoom h-full w-full object-cover" />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-3 pb-2 pt-6 text-xs font-medium uppercase tracking-[0.14em]">
                    {c.label}
                  </span>
                </Link>
              ))}
            </GlassCard>
          </div>
        </div>
      </div>
    </section>
  )
}
