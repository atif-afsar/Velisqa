import { Link } from 'react-router-dom'
import { SHOP_CATEGORIES, categoryPath } from '../../data/shopCategories'
import { ArrowRightIcon } from '../UI/Icons'
import SectionHeading from './SectionHeading'

const SIZES = '(min-width: 1024px) 15vw, (min-width: 640px) 30vw, 46vw'

/**
 * Shop by category: an even grid (2 → 3 → 6 columns) of equal-size tiles —
 * five categories plus "Shop all", so every row is complete at every breakpoint.
 */
export default function CategoryTiles() {
  return (
    <section aria-labelledby="categories-heading" className="responsive-section">
      <div className="container-lux">
        <SectionHeading id="categories-heading" eyebrow="Shop by category" title="Find your signature" />

        <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:mt-14 lg:grid-cols-6 lg:gap-5">
          {SHOP_CATEGORIES.map((c) => (
            <li key={c.slug}>
              <Link to={categoryPath(c)} className="group flex h-full flex-col border border-line bg-paper transition-colors hover:border-ink">
                <span className={`relative block aspect-[4/5] overflow-hidden ${c.imageFit === 'cover' ? '' : 'p-[8%]'}`}>
                  <img
                    src={c.image(480)}
                    srcSet={`${c.image(320)} 320w, ${c.image(480)} 480w, ${c.image(720)} 720w`}
                    sizes={SIZES}
                    alt={c.imageAlt}
                    width="480"
                    height="600"
                    loading="lazy"
                    decoding="async"
                    className={`img-zoom h-full w-full ${c.imageFit === 'cover' ? 'object-cover' : 'object-contain'}`}
                  />
                </span>
                <span className="flex min-h-14 items-center justify-between gap-2 border-t border-line px-4">
                  <span className="font-serif text-xl text-ink">{c.label}</span>
                  <ArrowRightIcon size={16} className="shrink-0 text-muted transition-transform group-hover:translate-x-1 group-hover:text-accent-ink" />
                </span>
              </Link>
            </li>
          ))}
          <li>
            <Link to="/collections" className="group flex h-full min-h-full flex-col justify-between bg-ink p-5 text-white transition-colors hover:bg-ink-soft sm:p-6">
              <span className="eyebrow text-white/70">{SHOP_CATEGORIES.length} categories</span>
              <span>
                <span className="block font-serif text-3xl leading-tight">Shop all jewellery</span>
                <span className="mt-4 inline-flex items-center gap-2 text-[0.75rem] font-medium uppercase tracking-[0.16em]">
                  Explore <ArrowRightIcon size={16} className="transition-transform group-hover:translate-x-1" />
                </span>
              </span>
            </Link>
          </li>
        </ul>
      </div>
    </section>
  )
}
