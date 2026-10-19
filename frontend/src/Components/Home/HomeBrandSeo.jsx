import { Link } from 'react-router-dom'
import { categoryPath } from '../../data/shopCategories'

/** Short, crawlable brand introduction near the end of the homepage. */
export default function HomeBrandSeo() {
  return (
    <section aria-labelledby="brand-seo-heading" className="py-16 lg:py-20">
      <div className="container-lux max-w-3xl text-center">
        <h2 id="brand-seo-heading" className="font-serif text-2xl text-ink sm:text-3xl">
          Velisqa Jewellery — modern jewellery for women in India
        </h2>
        <p className="mt-5 text-sm leading-relaxed text-muted">
          Velisqa designs premium fashion jewellery for everyday elegance: minimal{' '}
          <Link to={categoryPath('necklaces')} className="text-body underline underline-offset-4 hover:text-accent-ink">
            necklaces
          </Link>{' '}
          and pendants,{' '}
          <Link to={categoryPath('earrings')} className="text-body underline underline-offset-4 hover:text-accent-ink">
            earrings
          </Link>
          , stackable{' '}
          <Link to={categoryPath('rings')} className="text-body underline underline-offset-4 hover:text-accent-ink">
            rings
          </Link>
          ,{' '}
          <Link to={categoryPath('bracelets')} className="text-body underline underline-offset-4 hover:text-accent-ink">
            bracelets
          </Link>{' '}
          and{' '}
          <Link to={categoryPath('bangles')} className="text-body underline underline-offset-4 hover:text-accent-ink">
            bangles
          </Link>{' '}
          in gold and silver tones. Every order ships across India, with free shipping on prepaid orders and simple
          5-day returns.
        </p>
      </div>
    </section>
  )
}
