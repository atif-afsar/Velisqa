import Hero from './Hero'
import TrustMarquee from './TrustMarquee'
import CategoryCircles from './CategoryCircles'
import ProductShowcase from './ProductShowcase'
import EditorialBlock from './EditorialBlock'
import TrustStrip from './TrustStrip'
import ReviewsUgc from './ReviewsUgc'
import NewsletterBand from './NewsletterBand'
import HomeBrandSeo from './HomeBrandSeo'
import FaqSection from '../Common/FaqSection'
import { HOME_FAQS } from '../../data/homeFaqs'

/** Homepage: campaign hero, categories, shoppable edits, story, reassurance. Renders immediately — no loader. */
export default function HomeContent() {
  return (
    <main className="page-offset-nav bg-paper text-ink">
      <Hero />
      <TrustMarquee />
      <CategoryCircles />
      <ProductShowcase eyebrow="Most loved" title="Bestsellers" sort="best-selling" tabs />
      <EditorialBlock />
      <ProductShowcase eyebrow="Just landed" title="New arrivals" sort="newest" layout="row" />
      <TrustStrip />
      <ReviewsUgc />
      <FaqSection faqs={HOME_FAQS} />
      <HomeBrandSeo />
      <NewsletterBand />
    </main>
  )
}
