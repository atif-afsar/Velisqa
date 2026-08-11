import { useCart } from '../../context/CartContext'

function BagIcon({ size = 21 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="transition-transform duration-300"
    >
      <path
        d="M6.5 8.5h11l-.7 11H7.2l-.7-11Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />

      <path
        d="M9 8.5V6.8a3 3 0 0 1 6 0v1.7"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </svg>
  )
}

function BagBadge({ count }) {
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

export default function CartNavLink({
  variant = 'text',
  onDarkHero = false,
  scrolled = true,
  onClick,
  className = '',
}) {
  const {
    itemCount,
    openCartDrawer,
  } = useCart()

  function handleClick(event) {
    onClick?.(event)
    openCartDrawer()
  }

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
      <button
        type="button"
        onClick={handleClick}
        aria-label={
          itemCount > 0
            ? `Bag, ${itemCount} items`
            : 'Bag'
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
          <BagIcon />

          <BagBadge count={itemCount} />
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
            Bag
          </span>
        )}
      </button>
    )
  }

  // ------------------------------------------------------------
  // TEXT VARIANT
  // ------------------------------------------------------------

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={
        itemCount > 0
          ? `Bag, ${itemCount} items`
          : 'Bag'
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
        <BagIcon size={19} />

        <BagBadge count={itemCount} />
      </span>

      <span className="hidden uppercase sm:inline">
        Bag
      </span>
    </button>
  )
}