import { useWishlist } from '../../context/WishlistContext'

export default function ProductWishlistButton({
  product,
  className = '',
  size = 'md',
}) {
  const { isWishlisted, toggleWishlist } = useWishlist()
  const active = isWishlisted(product.id)

  const sizeClass =
    size === 'sm'
      ? 'h-8 w-8'
      : size === 'lg'
        ? 'h-11 w-11'
        : 'h-9 w-9'

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
      className={`grid shrink-0 place-items-center rounded-full border bg-white/95 shadow-[0_6px_20px_rgba(19,0,6,0.12)] backdrop-blur-sm transition hover:scale-105 hover:border-[#3d0a21]/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37] focus-visible:ring-offset-2 ${
        active
          ? 'border-[#3d0a21]/25 text-[#3d0a21]'
          : 'border-white/80 text-[#514347] hover:text-[#3d0a21]'
      } ${sizeClass} ${className}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} aria-hidden>
        <path
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}
