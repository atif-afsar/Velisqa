import { Link } from 'react-router-dom'
import { useWishlist } from '../../context/WishlistContext'

export default function WishlistNavLink({
  variant = 'text',
  onDarkHero,
  scrolled,
  onClick,
  className = '',
}) {
  const { wishlistCount } = useWishlist()

  const badge =
    wishlistCount > 0 ? (
      <span
        className={`absolute flex items-center justify-center rounded-full font-bold tabular-nums ${
          variant === 'icon'
            ? `-right-0.5 -top-0.5 h-[18px] min-w-[18px] px-1 text-[10px] ${
                onDarkHero ? 'bg-[#e9c349] text-[#130006]' : 'bg-[#3d0a21] text-[#fdf9f4]'
              }`
            : `-right-2 -top-1.5 h-4 min-w-[1rem] px-1 text-[9px] ${
                onDarkHero ? 'bg-[#e9c349] text-[#130006]' : 'bg-[#3d0a21] text-[#fdf9f4]'
              }`
        }`}
      >
        {wishlistCount > 99 ? '99+' : wishlistCount}
      </span>
    ) : null

  if (variant === 'icon') {
    return (
      <Link
        to="/wishlist"
        onClick={onClick}
        aria-label={wishlistCount > 0 ? `Wishlist, ${wishlistCount} items` : 'Wishlist'}
        className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-colors duration-200 max-md:h-9 max-md:w-9 ${
          onDarkHero
            ? 'border-white/30 text-white hover:border-white/50 hover:bg-white/10'
            : 'border-[#130006]/12 text-[#130006] hover:border-[#3d0a21]/30 hover:bg-[#3d0a21]/5'
        } ${className}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
        {badge}
      </Link>
    )
  }

  return (
    <Link
      to="/wishlist"
      onClick={onClick}
      className={`relative inline-flex items-center gap-1.5 py-0.5 font-medium transition-colors duration-200 ${
        scrolled ? 'text-[0.62rem] tracking-[0.1em]' : 'text-[0.72rem] tracking-[0.12em]'
      } ${
        onDarkHero
          ? 'text-white/80 hover:text-[#d4af37]'
          : 'text-[#514347]/80 hover:text-[#130006]'
      } ${className}`}
      aria-label={wishlistCount > 0 ? `Wishlist, ${wishlistCount} items` : 'Wishlist'}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
        <path
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      <span className="hidden sm:inline">Wishlist</span>
      {badge}
    </Link>
  )
}
