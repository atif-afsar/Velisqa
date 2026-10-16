import Hero from './Hero'
import CategoryTiles from './CategoryTiles'
import ProductShowcase from './ProductShowcase'
import EditorialBlock from './EditorialBlock'
import TrustStrip from './TrustStrip'
import ReviewsUgc from './ReviewsUgc'
import NewsletterBand from './NewsletterBand'
import HomeBrandSeo from './HomeBrandSeo'

/** Short, editorial homepage. Renders immediately — no full-screen loader. */
export default function HomeContent() {
  return (
    <main className="page-offset-nav bg-paper text-ink">
      <Hero />
      <CategoryTiles />
      <ProductShowcase />
      <EditorialBlock />
      <TrustStrip />
      <ReviewsUgc />
      <HomeBrandSeo />
      <NewsletterBand />
    </main>
  )
}
