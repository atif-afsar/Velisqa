import { useCart } from '../../context/CartContext'

export default function CartNavLink({
  variant = 'text',
  onDarkHero,
  scrolled,
  onClick,
  className = '',
}) {
  const { itemCount, openCartDrawer } = useCart()
  const handleClick = (event) => {
    onClick?.(event)
    openCartDrawer()
  }
  const badge =
    itemCount > 0 ? (
      <span
        className={`absolute flex items-center justify-center rounded-full font-bold tabular-nums ${
          variant === 'icon' || variant === 'plain'
            ? `-right-0.5 -top-0.5 h-[18px] min-w-[18px] px-1 text-[10px] ${
                variant === 'plain' || !onDarkHero ? 'bg-[#130006] text-white' : 'bg-[#e9c349] text-[#130006]'
              }`
            : `-right-2 -top-1.5 h-4 min-w-[1rem] px-1 text-[9px] ${
                onDarkHero ? 'bg-[#e9c349] text-[#130006]' : 'bg-[#3d0a21] text-[#fdf9f4]'
              }`
        }`}
      >
        {itemCount > 99 ? '99+' : itemCount}
      </span>
    ) : null

  if (variant === 'icon' || variant === 'plain') {
    const plain = variant === 'plain'
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={itemCount > 0 ? `Bag, ${itemCount} items` : 'Bag'}
        className={`relative grid shrink-0 place-items-center transition-colors duration-200 ${
          plain
            ? 'h-10 w-10 text-[#130006] hover:opacity-70'
            : `h-9 w-9 rounded-full border max-md:h-9 max-md:w-9 ${
                onDarkHero
                  ? 'border-white/30 text-white hover:border-white/50 hover:bg-white/10'
                  : 'border-[#130006]/12 text-[#130006] hover:border-[#3d0a21]/30 hover:bg-[#3d0a21]/5'
              }`
        } ${className}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M6 6h15l-1.5 9h-12L6 6zm0 0L5 3H2M9 20a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {badge}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`relative inline-flex items-center gap-1.5 py-0.5 font-medium transition-colors duration-200 ${
        scrolled ? 'text-[0.62rem] tracking-[0.1em]' : 'text-[0.72rem] tracking-[0.12em]'
      } ${
        onDarkHero
          ? 'text-white/80 hover:text-[#d4af37]'
          : 'text-[#514347]/80 hover:text-[#130006]'
      } ${className}`}
      aria-label={itemCount > 0 ? `Bag, ${itemCount} items` : 'Bag'}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
        <path
          d="M6 6h15l-1.5 9h-12L6 6zm0 0L5 3H2M9 20a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="hidden sm:inline">Bag</span>
      {badge}
    </button>
  )
}
