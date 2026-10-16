import { Link } from 'react-router-dom'
import { SHOP_CATEGORIES, categoryPath } from '../../data/shopCategories'
import SectionHeading from './SectionHeading'

/** Shop by category — swipeable row on mobile, five columns on desktop. */
export default function CategoryTiles() {
  return (
    <section aria-labelledby="categories-heading" className="responsive-section">
      <div className="container-lux">
        <SectionHeading id="categories-heading" eyebrow="Shop by category" title="Find your signature" />
      </div>
      <ul className="scrollbar-none mt-10 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 sm:gap-5 md:scroll-px-8 md:px-8 lg:container-lux lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0">
        {SHOP_CATEGORIES.map((c) => (
          <li key={c.slug} className="w-[42%] shrink-0 snap-start sm:w-[30%] lg:w-auto">
            <Link to={categoryPath(c)} className="group block">
              <span className="block aspect-[4/5] overflow-hidden bg-mist">
                <img
                  src={c.image(480)}
                  srcSet={`${c.image(320)} 320w, ${c.image(480)} 480w, ${c.image(720)} 720w`}
                  sizes="(min-width: 1024px) 18vw, (min-width: 640px) 30vw, 42vw"
                  alt={c.imageAlt}
                  width="480"
                  height="600"
                  loading="lazy"
                  decoding="async"
                  className="img-zoom h-full w-full object-cover"
                />
              </span>
              <span className="mt-4 flex items-center justify-between">
                <span className="font-serif text-xl text-ink sm:text-2xl">{c.label}</span>
                <span className="eyebrow text-muted transition-colors group-hover:text-accent-ink">Shop</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
