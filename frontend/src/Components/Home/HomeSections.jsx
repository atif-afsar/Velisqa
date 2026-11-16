import { Link } from 'react-router-dom'
import { SHOP_CATEGORIES, categoryPath } from '../../data/shopCategories'
import { CART_OFFERS } from '../../lib/cartOffers'
import { describeOffer, useOffers } from '../../lib/offers'
import { formatInr } from '../../lib/promoPricing'
import { ArrowRightIcon, GiftIcon, TagIcon } from '../UI/Icons'

/** Large photo tiles, 2 × 3 on phones and 3 × 2 from tablet (P1-10). */
export function CategoryTiles() {
  return (
    <section aria-labelledby="categories-heading" className="pb-4 pt-6 sm:pt-12 lg:pt-16">
      <div className="container-lux">
        <h2 id="categories-heading" className="font-serif text-[1.625rem] leading-tight text-ink sm:text-center sm:text-[2.25rem]">
          Shop by category
        </h2>
        <ul className="mt-4 grid grid-cols-2 gap-2 sm:mt-8 sm:grid-cols-3 sm:gap-4">
          {SHOP_CATEGORIES.map((c) => (
            <li key={c.slug}>
              <Link to={categoryPath(c)} className="group relative block aspect-[4/5] overflow-hidden bg-mist">
                <img
                  src={c.image(480)}
                  srcSet={`${c.image(320)} 320w, ${c.image(480)} 480w, ${c.image(720)} 720w`}
                  sizes="(min-width: 640px) 32vw, 48vw"
                  alt={c.imageAlt}
                  width="480"
                  height="600"
                  loading="lazy"
                  decoding="async"
                  className={`h-full w-full transition-transform duration-500 group-hover:scale-[1.03] ${c.imageFit === 'cover' ? 'object-cover' : 'object-contain p-4'}`}
                />
                <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/50 to-transparent px-3 pb-3 pt-10 text-white">
                  <span className="font-serif text-lg sm:text-xl">{c.label}</span>
                  <ArrowRightIcon size={16} />
                </span>
              </Link>
            </li>
          ))}
          <li>
            <Link to="/collections?maxPrice=499" className="group relative flex aspect-[4/5] flex-col items-center justify-center gap-3 bg-ink px-4 text-center text-white">
              <GiftIcon size={34} strokeWidth={1.2} />
              <span className="font-serif text-lg sm:text-xl">Gifts under ₹499</span>
              <span className="text-xs uppercase tracking-[0.16em] text-white/80">Gift wrap at checkout</span>
            </Link>
          </li>
        </ul>
      </div>
    </section>
  )
}

/** Live offers (admin coupons shown on site) + the free-gift threshold. Hidden when nothing applies. */
export function OfferBanner() {
  const offers = useOffers()
  const gift = CART_OFFERS.freeGift
  const lines = [
    ...offers.slice(0, 2).map((o) => ({ key: o.code, text: `${describeOffer(o)} · code ${o.code}` })),
    ...(gift.enabled ? [{ key: 'gift', text: `Spend ${formatInr(gift.threshold)} and choose a complimentary gift` }] : []),
  ]
  if (!lines.length) return null
  return (
    <section aria-label="Current offers" className="container-lux py-6">
      <Link to="/collections" className="flex flex-col items-start gap-2 bg-accent-tint px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <ul className="space-y-1">
          {lines.map((l) => (
            <li key={l.key} className="flex items-center gap-2 text-sm font-medium text-accent-ink sm:text-base">
              <TagIcon size={16} className="shrink-0" /> {l.text}
            </li>
          ))}
        </ul>
        <span className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink">
          Shop now <ArrowRightIcon size={14} />
        </span>
      </Link>
    </section>
  )
}

const PRICE_TILES = [399, 499, 699, 999]

/** Shop by price + gifting by budget (P1-3 / P1-10). */
export function ShopByPrice() {
  return (
    <section aria-labelledby="price-heading" className="border-y border-line bg-mist py-10 sm:py-14">
      <div className="container-lux">
        <p className="eyebrow text-muted">Gifts &amp; everyday treats</p>
        <h2 id="price-heading" className="mt-2 font-serif text-[1.75rem] leading-tight text-ink sm:text-[2.25rem]">
          Shop by price
        </h2>
        <ul className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
          {PRICE_TILES.map((max) => (
            <li key={max}>
              <Link
                to={`/collections?maxPrice=${max}`}
                className="flex min-h-24 flex-col items-center justify-center border border-line bg-paper px-3 py-5 text-center transition-colors hover:border-ink"
              >
                <span className="text-xs uppercase tracking-[0.16em] text-muted">Under</span>
                <span className="type-price mt-1 font-serif text-2xl text-ink">{formatInr(max)}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-5 flex items-center gap-2 text-sm text-body">
          <GiftIcon size={18} className="shrink-0 text-ink" /> Sending it as a gift? Add gift wrap and a message card at checkout.
        </p>
      </div>
    </section>
  )
}
