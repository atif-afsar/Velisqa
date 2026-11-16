import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useWishlist } from '../../context/WishlistContext'
import { useCart } from '../../context/CartContext'
import { BagIcon, GridIcon, HeartIcon, HomeIcon, TagIcon } from '../UI/Icons'
import { isTabBarHidden } from '../../lib/mobileNav'

function Tab({ to, onClick, active, label, icon: Icon, badge }) {
  const content = (
    <>
      <span className="relative">
        <Icon size={22} strokeWidth={active ? 1.8 : 1.4} />
        {badge > 0 && (
          <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-ink px-1 text-[0.625rem] font-semibold leading-none text-white ring-2 ring-paper">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </span>
      <span className={`text-[0.625rem] tracking-[0.06em] ${active ? 'font-semibold text-ink' : 'text-muted'}`}>{label}</span>
    </>
  )
  const cls = 'flex h-14 flex-1 flex-col items-center justify-center gap-1 text-ink'
  return to ? (
    <Link to={to} className={cls} aria-current={active ? 'page' : undefined}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {content}
    </button>
  )
}

/** App-style bottom navigation on phones (hidden from 1024px up). */
export default function MobileTabBar() {
  const { pathname } = useLocation()
  const { wishlistCount } = useWishlist()
  const { itemCount } = useCart()
  const hidden = isTabBarHidden(pathname)

  useEffect(() => {
    document.documentElement.classList.toggle('no-tabbar', hidden)
  }, [hidden])

  if (hidden) return null

  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <div className="mx-auto flex max-w-lg">
        <Tab to="/" active={pathname === '/'} label="Home" icon={HomeIcon} />
        <Tab to="/collections" active={pathname.startsWith('/collections')} label="Shop" icon={GridIcon} />
        <Tab to="/offers" active={pathname === '/offers'} label="Offers" icon={TagIcon} />
        <Tab to="/wishlist" active={pathname === '/wishlist'} label="Wishlist" icon={HeartIcon} badge={wishlistCount} />
        <Tab to="/cart" active={pathname === '/cart'} label="Bag" icon={BagIcon} badge={itemCount} />
      </div>
    </nav>
  )
}
