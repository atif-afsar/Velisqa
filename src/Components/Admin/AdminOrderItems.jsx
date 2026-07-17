import { Link } from 'react-router-dom'
import { formatInr } from '../../lib/cartStock'

export default function AdminOrderItems({ items, showImages = true }) {
  if (!items?.length) {
    return (
      <p className="text-sm text-[#847377]">No products recorded for this order.</p>
    )
  }

  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li
          key={`${item.product_name}-${index}`}
          className="flex items-start gap-3 rounded-xl border border-[#130006]/6 bg-[#fbf7f1] p-3"
        >
          {showImages && item.image_url ? (
            <img
              src={item.image_url}
              alt=""
              className="h-14 w-12 shrink-0 rounded-md bg-[#f1ede8] object-cover"
            />
          ) : showImages ? (
            <div className="flex h-14 w-12 shrink-0 items-center justify-center rounded-md bg-[#f1ede8] text-[10px] text-[#847377]">
              No img
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            {item.product_url ? (
              <Link
                to={item.product_url}
                className="text-sm font-semibold text-[#130006] hover:text-[#6f334a] hover:underline"
              >
                {item.product_name}
              </Link>
            ) : (
              <p className="text-sm font-semibold text-[#130006]">{item.product_name}</p>
            )}
            <p className="mt-0.5 text-xs text-[#514347]">
              Qty {item.quantity} × {formatInr(item.unit_price)}
            </p>
          </div>
          <p className="shrink-0 text-sm font-semibold tabular-nums text-[#3d0a21]">
            {formatInr(item.line_total)}
          </p>
        </li>
      ))}
    </ul>
  )
}
