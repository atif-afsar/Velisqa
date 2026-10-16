import { Link } from 'react-router-dom'
import { formatInr, getCartLineSubtotal, getProductStock } from '../../lib/cartStock'
import { getPromoPriceDisplay } from '../../lib/promoPricing'
import { displayProductName } from '../../lib/productDisplay'
import { productPath } from '../../lib/productUrl'
import QuantityStepper from './QuantityStepper'

/** One bag line: image, name, unit price, quantity, remove, stock warnings. */
export default function CartLine({ line, issue, onNavigate, onQuantityChange, onRemove, size = 'md' }) {
  const stock = getProductStock({ stock: line.stock })
  const { hasPromo, compare } = getPromoPriceDisplay(line)
  const href = productPath({ id: line.productId, name: line.name })
  const name = displayProductName(line.name)
  const large = size === 'lg'

  return (
    <li className="flex gap-4 py-5">
      <Link to={href} onClick={onNavigate} className={`shrink-0 bg-mist ${large ? 'h-[150px] w-[120px]' : 'h-[110px] w-[88px]'}`}>
        {line.imageUrl ? (
          <img src={line.imageUrl} alt="" className="h-full w-full object-cover" width="120" height="150" loading="lazy" />
        ) : null}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <Link to={href} onClick={onNavigate} className="line-clamp-2 text-sm text-ink hover:text-accent-ink">
            {name}
          </Link>
          <p className="type-price shrink-0 text-sm text-ink">{formatInr(getCartLineSubtotal(line))}</p>
        </div>
        <p className="mt-1 text-xs text-muted">
          {formatInr(line.price)} each
          {hasPromo && <s className="ml-2">{formatInr(compare)}</s>}
        </p>
        {!issue && stock > 0 && stock <= 3 && <p className="mt-1 text-xs text-accent-ink">Only {stock} left</p>}
        {issue && (
          <p className="mt-2 text-xs text-danger" role="alert">
            {issue.message}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          <QuantityStepper
            value={line.quantity}
            max={stock}
            size="sm"
            disabled={issue?.issue === 'out_of_stock'}
            onChange={(q) => onQuantityChange(line.productId, q)}
          />
          <button
            type="button"
            onClick={() => onRemove(line.productId)}
            className="min-h-10 text-xs text-muted underline underline-offset-4 hover:text-ink"
            aria-label={`Remove ${name} from bag`}
          >
            Remove
          </button>
        </div>
      </div>
    </li>
  )
}
