import { useMemo } from 'react'
import { useProducts } from '../../hooks/useProducts'
import { isProductSoldOut } from '../../lib/cartStock'
import { EMPTY_PRODUCT_FILTERS, filterAndSortProducts } from '../../lib/productFilters'
import { createWhatsAppLink } from '../WhatsApp/whatsapp'
import ProductCard from '../Product/ProductCard'
import { WhatsAppIcon } from '../UI/Icons'

/** Dead ends (zero search results, 404, empty states): bestsellers + "Chat with us on WhatsApp". */
export default function BestsellerFallback({ title = 'Bestsellers', whatsappMessage = 'Hi Velisqa, I am looking for something specific.' }) {
  const { products } = useProducts()
  const picks = useMemo(
    () => filterAndSortProducts(products.filter((p) => !isProductSoldOut(p)), { ...EMPTY_PRODUCT_FILTERS, sort: 'best-selling' }).slice(0, 4),
    [products],
  )
  return (
    <section className="container-lux pb-20 pt-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="type-section text-ink">{title}</h2>
        <a
          href={createWhatsAppLink(whatsappMessage)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-ink underline underline-offset-4 hover:text-accent-ink"
        >
          <WhatsAppIcon size={18} /> Can’t find it? Chat with us on WhatsApp
        </a>
      </div>
      {picks.length > 0 && (
        <ul className="mt-8 grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6">
          {picks.map((p) => (
            <li key={p.id}>
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
