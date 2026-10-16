import { Link } from 'react-router-dom'
import { formatInr } from '../../lib/cartStock'

export default function AdminOrderItems({ items, showImages = true }) {
  if (!items?.length) {
    return (
      <p className="text-sm text-muted">No products recorded for this order.</p>
    )
  }

  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li
          key={`${item.product_name}-${index}`}
          className="flex items-start gap-3 rounded-xl border border-ink/6 bg-mist p-3"
        >
          {showImages && item.image_url ? (
            <img
              src={item.image_url}
              alt=""
              className="h-14 w-12 shrink-0 rounded-md bg-mist object-cover"
            />
          ) : showImages ? (
            <div className="flex h-14 w-12 shrink-0 items-center justify-center rounded-md bg-mist text-[10px] text-muted">
              No img
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            {item.product_url ? (
              <Link
                to={item.product_url}
                className="text-sm font-semibold text-ink hover:text-ink hover:underline"
              >
                {item.product_name}
              </Link>
            ) : (
              <p className="text-sm font-semibold text-ink">{item.product_name}</p>
            )}
            <p className="mt-0.5 text-xs text-body">
              Qty {item.quantity} × {formatInr(item.unit_price)}
            </p>
          </div>
          <p className="shrink-0 text-sm font-semibold tabular-nums text-ink">
            {formatInr(item.line_total)}
          </p>
        </li>
      ))}
    </ul>
  )
}
