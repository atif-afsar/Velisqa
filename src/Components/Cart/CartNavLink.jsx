import { Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'

export default function CartNavLink({ onDarkHero, scrolled, onClick, className = '' }) {
  const { itemCount } = useCart()

  return (
    <Link
      to="/cart"
      onClick={onClick}
      className={`relative inline-flex items-center gap-1.5 py-0.5 font-medium transition-colors duration-200 ${
        scrolled ? 'text-[0.62rem] tracking-[0.1em]' : 'text-[0.72rem] tracking-[0.12em]'
      } ${
        onDarkHero
          ? 'text-white/80 hover:text-[#d4af37]'
          : 'text-[#514347]/80 hover:text-[#130006]'
      } ${className}`}
      aria-label={itemCount > 0 ? `Cart, ${itemCount} items` : 'Cart'}
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
      <span className="hidden sm:inline">Cart</span>
      {itemCount > 0 && (
        <span
          className={`absolute -right-2 -top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[9px] font-bold tabular-nums ${
            onDarkHero ? 'bg-[#e9c349] text-[#130006]' : 'bg-[#3d0a21] text-[#fdf9f4]'
          }`}
        >
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </Link>
  )
}
