import { Link } from 'react-router-dom'
import { SHOP_CATEGORIES, categoryPath } from '../../data/shopCategories'
import { GridIcon, SparkIcon } from '../UI/Icons'

/**
 * Shop by category as round thumbnails — a thumb-friendly horizontal row on phones,
 * centred on larger screens.
 */
export default function CategoryCircles() {
  return (
    <section aria-labelledby="categories-heading" className="pb-2 pt-8 sm:pt-12 lg:pt-16">
      <div className="container-lux text-center">
        <p className="eyebrow text-muted">Shop by category</p>
        <h2 id="categories-heading" className="mt-2 font-serif text-[1.75rem] leading-tight text-ink sm:text-[2.25rem]">
          Find your signature
        </h2>
      </div>
      <ul className="scrollbar-none mt-6 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:justify-center sm:gap-7 md:px-8 lg:mt-10 lg:gap-10">
        <li className="shrink-0 snap-start">
          <Link to="/collections?sort=newest" className="group flex w-[76px] flex-col items-center gap-2 sm:w-24 lg:w-28">
            <span className="grid aspect-square w-full place-items-center rounded-full bg-ink text-white ring-1 ring-line ring-offset-2 transition-transform group-hover:scale-[1.03]">
              <SparkIcon size={26} />
            </span>
            <span className="text-[0.75rem] font-medium text-ink sm:text-[0.8125rem]">New in</span>
          </Link>
        </li>
        {SHOP_CATEGORIES.map((c) => (
          <li key={c.slug} className="shrink-0 snap-start">
            <Link to={categoryPath(c)} className="group flex w-[76px] flex-col items-center gap-2 sm:w-24 lg:w-28">
              <span className="block aspect-square w-full overflow-hidden rounded-full bg-mist ring-1 ring-line ring-offset-2 transition-transform group-hover:scale-[1.03]">
                <img
                  src={c.image(240)}
                  srcSet={`${c.image(160)} 160w, ${c.image(240)} 240w, ${c.image(320)} 320w`}
                  sizes="(min-width: 1024px) 112px, (min-width: 640px) 96px, 76px"
                  alt={c.imageAlt}
                  width="160"
                  height="200"
                  loading="lazy"
                  decoding="async"
                  className={`h-full w-full ${c.imageFit === 'cover' ? 'object-cover' : 'scale-[1.15] object-contain object-[50%_35%]'}`}
                />
              </span>
              <span className="text-[0.75rem] font-medium text-ink sm:text-[0.8125rem]">{c.label}</span>
            </Link>
          </li>
        ))}
        <li className="shrink-0 snap-start">
          <Link to="/collections" className="group flex w-[76px] flex-col items-center gap-2 sm:w-24 lg:w-28">
            <span className="grid aspect-square w-full place-items-center rounded-full border border-ink text-ink ring-offset-2 transition-transform group-hover:scale-[1.03]">
              <GridIcon size={24} />
            </span>
            <span className="text-[0.75rem] font-medium text-ink sm:text-[0.8125rem]">Shop all</span>
          </Link>
        </li>
      </ul>
    </section>
  )
}
