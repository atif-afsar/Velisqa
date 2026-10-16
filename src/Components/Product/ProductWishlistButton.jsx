import { useWishlist } from '../../context/WishlistContext'
import { HeartIcon } from '../UI/Icons'

/** Heart toggle. 44px hit area; the visible circle scales with `size`. */
export default function ProductWishlistButton({ product, className = '', size = 'md' }) {
  const { isWishlisted, toggleWishlist } = useWishlist()
  const active = isWishlisted(product.id)
  const iconSize = size === 'lg' ? 22 : 18

  function handleClick(e) {
    e.preventDefault()
    e.stopPropagation()
    toggleWishlist(product)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={active ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
      aria-pressed={active}
      className={`grid h-11 w-11 shrink-0 place-items-center transition-transform hover:scale-110 ${
        active ? 'text-accent-ink' : 'text-ink'
      } ${className}`}
    >
      <HeartIcon size={iconSize} filled={active} />
    </button>
  )
}
