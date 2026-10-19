import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useWishlist } from '../../context/WishlistContext'
import { GridIcon, HeartIcon, HomeIcon, SearchIcon, UserIcon } from '../UI/Icons'
import { OPEN_SEARCH_EVENT, isTabBarHidden } from '../../lib/mobileNav'

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
  const { user } = useAuth()
  const { wishlistCount } = useWishlist()
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
        <Tab onClick={() => window.dispatchEvent(new Event(OPEN_SEARCH_EVENT))} active={pathname === '/search'} label="Search" icon={SearchIcon} />
        <Tab to="/wishlist" active={pathname === '/wishlist'} label="Wishlist" icon={HeartIcon} badge={wishlistCount} />
        <Tab
          to={user ? '/account/orders' : '/login'}
          active={pathname.startsWith('/account') || pathname === '/login'}
          label={user ? 'Orders' : 'Account'}
          icon={UserIcon}
        />
      </div>
    </nav>
  )
}
