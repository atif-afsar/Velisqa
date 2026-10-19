import { Link } from 'react-router-dom'
import { isOrderDelivered } from '../../lib/orderReturns'

function uniqueReviewItems(items = []) {
  const seen = new Set()
  return items.filter((item) => {
    const productId = item.product_id || item.productId
    if (!productId || seen.has(productId)) return false
    seen.add(productId)
    return true
  })
}

export default function OrderReviewLinks({ order, items = [], className = '' }) {
  if (!isOrderDelivered(order)) return null

  const reviewItems = uniqueReviewItems(items)
  if (!reviewItems.length) return null

  return (
    <div className={` border border-line bg-paper px-4 py-4 sm:px-5 ${className}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Customer reviews</p>
      <p className="mt-1 font-serif text-lg text-ink">Share your experience</p>
      <p className="mt-1 text-sm leading-relaxed text-body">
        Your delivered order qualifies for verified reviews on these pieces.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {reviewItems.map((item) => {
          const productId = item.product_id || item.productId
          const label = item.product_name || item.name || 'Review product'
          return (
            <Link
              key={productId}
              to={`/product/${productId}#product-reviews`}
              className="inline-flex min-h-9 items-center border border-ink/20 bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink transition hover:border-ink/35 hover:bg-white"
            >
              Review {label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
