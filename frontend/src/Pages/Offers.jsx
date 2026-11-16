import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import SEOHead from '../Components/SEO/SEOHead'
import ProductCard from '../Components/Product/ProductCard'
import ProductOffers from '../Components/Product/ProductOffers'
import { useProducts } from '../hooks/useProducts'
import { useOffers } from '../lib/offers'
import { CART_OFFERS } from '../lib/cartOffers'
import { isProductSoldOut } from '../lib/cartStock'
import { getPromoPriceDisplay, formatInr } from '../lib/promoPricing'
import { GiftIcon, TruckIcon } from '../Components/UI/Icons'

/** /offers — every live offer in one place + the biggest real MRP savings. */
export default function Offers() {
  const offers = useOffers()
  const { products, loading } = useProducts()
  const deals = useMemo(
    () =>
      products
        .filter((p) => !isProductSoldOut(p) && getPromoPriceDisplay(p).hasPromo)
        .sort((a, b) => getPromoPriceDisplay(b).discountPercent - getPromoPriceDisplay(a).discountPercent)
        .slice(0, 12),
    [products],
  )
  const gift = CART_OFFERS.freeGift

  return (
    <>
      <SEOHead title="Offers | Velisqa" description="Current Velisqa offers, codes and the best savings on jewellery." canonicalPath="/offers" />
      <main className="page-offset-nav min-h-svh bg-paper text-ink">
        <div className="container-lux py-8 sm:py-12">
          <h1 className="font-serif text-[2rem] leading-tight sm:text-[2.75rem]">Offers</h1>

          <div className="mt-6 grid gap-3 lg:grid-cols-2">
            {offers.length > 0 && (
              <div className="lg:col-span-2">
                <ProductOffers price={0} />
              </div>
            )}
            {gift.enabled && (
              <p className="flex items-center gap-3 rounded-lg border border-line px-4 py-3 text-sm text-body">
                <GiftIcon size={20} className="shrink-0 text-ink" />
                Spend {formatInr(gift.threshold)} and choose a complimentary gift at checkout.
              </p>
            )}
            <p className="flex items-center gap-3 rounded-lg border border-line px-4 py-3 text-sm text-body">
              <TruckIcon size={20} className="shrink-0 text-ink" />
              Free shipping on every prepaid order. Cash on delivery available.
            </p>
          </div>

          <h2 className="type-section mt-12 text-ink">Biggest savings</h2>
          {loading && !products.length ? (
            <p className="mt-6 text-sm text-muted">Loading…</p>
          ) : deals.length ? (
            <ul className="mt-6 grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4">
              {deals.map((p) => (
                <li key={p.id}>
                  <ProductCard product={p} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 text-sm text-body">
              <Link to="/collections" className="underline underline-offset-4">
                Shop the collection
              </Link>
            </p>
          )}
        </div>
      </main>
    </>
  )
}
