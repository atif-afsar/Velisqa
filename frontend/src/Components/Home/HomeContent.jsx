import Hero from './Hero'
import MobileShopBar from '../Nav/MobileShopBar'
import ProductShowcase from './ProductShowcase'
import EditorialBlock from './EditorialBlock'
import TrustStrip from './TrustStrip'
import ReviewsUgc from './ReviewsUgc'
import NewsletterBand from './NewsletterBand'
import HomeBrandSeo from './HomeBrandSeo'
import { CategoryTiles, OfferBanner, ShopByPrice } from './HomeSections'
import FaqSection from '../Common/FaqSection'
import { HOME_FAQS } from '../../data/homeFaqs'

/**
 * Homepage order (conversion first): hero with offer → large category tiles → bestsellers →
 * live offers → shop by price / gifting → new arrivals (not repeating bestsellers) → real reviews
 * (hidden until there are some) → trust → story → FAQ → SEO copy → newsletter.
 */
export default function HomeContent() {
  return (
    <main className="page-offset-nav bg-paper text-ink">
      <MobileShopBar />
      <Hero />
      <CategoryTiles />
      <ProductShowcase eyebrow="Most loved" title="Bestsellers" sort="best-selling" tabs />
      <OfferBanner />
      <ShopByPrice />
      <ProductShowcase eyebrow="Just landed" title="New arrivals" sort="newest" layout="row" excludeTopOf="best-selling" />
      <ReviewsUgc />
      <TrustStrip />
      <EditorialBlock />
      <FaqSection faqs={HOME_FAQS} />
      <HomeBrandSeo />
      <NewsletterBand />
    </main>
  )
}
