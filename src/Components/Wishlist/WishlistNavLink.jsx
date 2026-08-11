import { Link } from 'react-router-dom'
import { useWishlist } from '../../context/WishlistContext'

function HeartIcon({ size = 21 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="
        transition-all
        duration-300
        group-hover:scale-[1.04]
      "
    >
      <path
        d="
          M20.8 8.7
          c0 5.2-8.8 10.1-8.8 10.1
          S3.2 13.9 3.2 8.7
          A4.7 4.7 0 0 1 12 5.8
          A4.7 4.7 0 0 1 20.8 8.7Z
        "
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function WishlistBadge({ count }) {
  if (!count) return null

  return (
    <span
      className="
        absolute
        -right-2
        -top-2
        flex
        h-[15px]
        min-w-[15px]
        items-center
        justify-center
        rounded-full
        bg-[#3d0a21]
        px-1
        text-[8px]
        font-bold
        leading-none
        tabular-nums
        text-white
        ring-2
        ring-[#fffdfb]
      "
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

export default function WishlistNavLink({
  variant = 'text',
  onDarkHero = false,
  scrolled = true,
  onClick,
  className = '',
}) {
  const { wishlistCount } =
    useWishlist()

  // ------------------------------------------------------------
  // ICON / PLAIN / LABELLED
  // ------------------------------------------------------------

  if (
    variant === 'icon' ||
    variant === 'plain' ||
    variant === 'labelled'
  ) {
    const labelled =
      variant === 'labelled'

    return (
      <Link
        to="/wishlist"
        onClick={onClick}
        aria-label={
          wishlistCount > 0
            ? `Wishlist, ${wishlistCount} items`
            : 'Wishlist'
        }
        className={`
          group
          relative
          inline-flex
          shrink-0
          items-center
          justify-center
          text-[#1b0b12]
          transition-opacity
          duration-200
          hover:opacity-60

          ${
            labelled
              ? 'min-h-10 min-w-[44px] px-1.5'
              : 'h-10 w-10'
          }

          ${className}
        `}
      >
        <span className="relative">
          <HeartIcon />

          <WishlistBadge
            count={wishlistCount}
          />
        </span>

        {labelled && (
          <span
            className="
              ml-1.5
              hidden
              text-[8px]
              font-semibold
              uppercase
              tracking-[0.14em]
              text-[#514347]
              md:block
            "
          >
            Wishlist
          </span>
        )}
      </Link>
    )
  }

  // ------------------------------------------------------------
  // TEXT VARIANT
  // ------------------------------------------------------------

  return (
    <Link
      to="/wishlist"
      onClick={onClick}
      aria-label={
        wishlistCount > 0
          ? `Wishlist, ${wishlistCount} items`
          : 'Wishlist'
      }
      className={`
        group
        relative
        inline-flex
        items-center
        gap-2
        text-[#514347]
        transition-colors
        duration-200
        hover:text-[#1b0b12]

        ${
          scrolled
            ? 'text-[10px] tracking-[0.12em]'
            : 'text-[11px] tracking-[0.14em]'
        }

        ${onDarkHero ? 'text-white/85 hover:text-white' : ''}

        ${className}
      `}
    >
      <span className="relative">
        <HeartIcon size={19} />

        <WishlistBadge
          count={wishlistCount}
        />
      </span>

      <span className="hidden uppercase sm:inline">
        Wishlist
      </span>
    </Link>
  )
}