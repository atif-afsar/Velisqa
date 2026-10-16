import { lazy, Suspense, useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import CartNavLink from './Cart/CartNavLink'
import WishlistNavLink from './Wishlist/WishlistNavLink'
import AccountNavMenu from './Nav/AccountNavMenu'
import Drawer from './UI/Drawer'
import { ChevronDownIcon, ChevronRightIcon, LockIcon, MenuIcon, SearchIcon, WhatsAppIcon } from './UI/Icons'
import { useAuth } from '../context/AuthContext'
import { SHOP_CATEGORIES, categoryPath } from '../data/shopCategories'
import { createWhatsAppLink } from './WhatsApp/whatsapp'

// Loaded on first open — keeps ~10 KB of search UI out of the initial bundle.
const SearchDialog = lazy(() => import('./Search/SearchDialog'))

const DISCOVER_LINKS = [
  { label: 'New arrivals', to: '/collections?sort=newest' },
  { label: 'Bestsellers', to: '/collections?sort=best-selling' },
  { label: 'Gifts under ₹999', to: '/search?q=gifts%20under%20999' },
  { label: 'Shop all', to: '/collections' },
]

const PRIMARY_LINKS = [
  { label: 'New in', to: '/collections?sort=newest' },
  { label: 'Bestsellers', to: '/collections?sort=best-selling' },
  { label: 'Our story', to: '/about' },
]

const SECONDARY_LINKS = [
  { label: 'Our story', to: '/about' },
  { label: 'Founders', to: '/founders' },
  { label: 'Creators', to: '/models' },
  { label: 'My orders', to: '/account/orders' },
  { label: 'FAQ', to: '/faq' },
  { label: 'Contact', to: '/contact' },
]

function Logo({ onClick, className = '' }) {
  return (
    <Link
      to="/"
      onClick={onClick}
      className={`font-logo inline-flex min-h-11 items-center text-[1.15rem] uppercase leading-none text-ink lg:text-[1.4rem] ${className}`}
      aria-label="Velisqa — home"
    >
      Velisqa
    </Link>
  )
}

function IconButton({ label, onClick, children, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`grid h-11 w-11 place-items-center text-ink transition-opacity hover:opacity-60 ${className}`}
    >
      {children}
    </button>
  )
}

function MegaMenu({ id, open, onClose, onMouseEnter, onMouseLeave }) {
  if (!open) return null
  return (
    <div
      id={id}
      className="absolute inset-x-0 top-full border-y border-line bg-paper fade-in"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="container-lux grid grid-cols-[1fr_1fr_2.2fr] gap-12 py-10">
        <div>
          <p className="eyebrow text-muted">Shop by category</p>
          <ul className="mt-5 space-y-1">
            {SHOP_CATEGORIES.map((c) => (
              <li key={c.slug}>
                <Link
                  to={categoryPath(c)}
                  onClick={onClose}
                  className="link-underline inline-flex min-h-9 items-center font-serif text-xl text-ink"
                >
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="eyebrow text-muted">Discover</p>
          <ul className="mt-5 space-y-1">
            {DISCOVER_LINKS.map((l) => (
              <li key={l.label}>
                <Link to={l.to} onClick={onClose} className="link-underline inline-flex min-h-9 items-center text-sm text-body hover:text-ink">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="grid grid-cols-3 gap-5">
          {SHOP_CATEGORIES.slice(0, 3).map((c) => (
            <Link key={c.slug} to={categoryPath(c)} onClick={onClose} className="group block">
              <span className="block aspect-[4/5] overflow-hidden bg-mist">
                <img
                  src={c.image(360)}
                  srcSet={`${c.image(360)} 360w, ${c.image(540)} 540w`}
                  sizes="15vw"
                  alt=""
                  width="360"
                  height="450"
                  loading="lazy"
                  decoding="async"
                  className="img-zoom h-full w-full object-cover"
                />
              </span>
              <span className="eyebrow mt-3 block text-ink">{c.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function MobileMenu({ open, onClose, onSearch }) {
  const { user, profile, loading, logout } = useAuth()
  return (
    <Drawer open={open} onClose={onClose} side="left" title="Menu" className="max-w-[420px]">
      <div className="px-5 pb-10 pt-4">
        <button
          type="button"
          onClick={() => {
            onClose()
            onSearch()
          }}
          className="flex min-h-12 w-full items-center gap-3 border border-line px-4 text-left text-sm text-muted"
        >
          <SearchIcon size={18} />
          Search necklaces, rings, earrings…
        </button>

        <p className="eyebrow mt-8 text-muted">Shop</p>
        <ul className="mt-2 divide-y divide-line border-y border-line">
          {SHOP_CATEGORIES.map((c) => (
            <li key={c.slug}>
              <Link to={categoryPath(c)} onClick={onClose} className="flex min-h-14 items-center gap-4">
                <img src={c.image(120)} alt="" width="40" height="50" loading="lazy" className="h-[50px] w-10 bg-mist object-cover" />
                <span className="flex-1 font-serif text-xl text-ink">{c.label}</span>
                <ChevronRightIcon size={16} className="text-muted" />
              </Link>
            </li>
          ))}
          <li>
            <Link to="/collections" onClick={onClose} className="flex min-h-14 items-center justify-between">
              <span className="font-serif text-xl text-ink">Shop all</span>
              <ChevronRightIcon size={16} className="text-muted" />
            </Link>
          </li>
        </ul>

        <ul className="mt-6 grid grid-cols-2 gap-x-4">
          {[...DISCOVER_LINKS.slice(0, 2), ...SECONDARY_LINKS].map((l) => (
            <li key={l.label}>
              <Link to={l.to} onClick={onClose} className="flex min-h-11 items-center text-sm text-body">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-8 space-y-3 border-t border-line pt-6">
          {!loading &&
            (user ? (
              <>
                {profile?.role === 'admin' && (
                  <Link to="/admin/home" onClick={onClose} className="btn btn-secondary w-full">
                    Admin dashboard
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => {
                    void logout()
                    onClose()
                  }}
                  className="btn btn-secondary w-full"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link to="/login" onClick={onClose} className="btn btn-primary w-full">
                Sign in / Create account
              </Link>
            ))}
          <a
            href={createWhatsAppLink('Hi Velisqa, I need some help.')}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center justify-center gap-2 text-sm text-body hover:text-accent-ink"
          >
            <WhatsAppIcon size={18} />
            Chat with us on WhatsApp
          </a>
        </div>
      </div>
    </Drawer>
  )
}

/** Distraction-free header for checkout and payment pages. */
function CheckoutHeader() {
  return (
    <header className="fixed inset-x-0 top-[var(--announcement-height)] z-50 border-b border-line bg-paper">
      <div className="container-lux grid h-[var(--nav-bar-height)] grid-cols-[1fr_auto_1fr] items-center">
        <Link to="/cart" className="inline-flex min-h-11 items-center text-xs uppercase tracking-[0.14em] text-muted hover:text-ink">
          ← <span className="ml-2 hidden sm:inline">Back to bag</span>
        </Link>
        <Logo />
        <p className="flex items-center justify-end gap-2 text-xs uppercase tracking-[0.14em] text-body">
          <LockIcon size={15} className="text-accent-ink" />
          <span className="hidden sm:inline">Secure checkout</span>
        </p>
      </div>
    </header>
  )
}

function AdminHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-paper">
      <div className="container-lux flex h-[var(--nav-bar-height)] items-center justify-between">
        <div className="flex items-center gap-4">
          <Logo />
          <span className="eyebrow text-muted">Admin</span>
        </div>
        <AccountNavMenu />
      </div>
    </header>
  )
}

export default function Navbar() {
  const { pathname, search } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [megaOpen, setMegaOpen] = useState(false)
  const megaId = useId()
  const hoverTimer = useRef(0)

  const closeMega = useCallback(() => setMegaOpen(false), [])
  const closeMenu = useCallback(() => setMenuOpen(false), [])

  // Close overlays on navigation.
  useEffect(() => {
    queueMicrotask(() => {
      setMenuOpen(false)
      setSearchOpen(false)
      setMegaOpen(false)
    })
  }, [pathname, search])

  useEffect(() => {
    if (!megaOpen) return undefined
    const onKey = (e) => e.key === 'Escape' && setMegaOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [megaOpen])

  useEffect(() => () => window.clearTimeout(hoverTimer.current), [])

  if (pathname.startsWith('/admin')) return <AdminHeader />
  if (pathname === '/checkout' || pathname.startsWith('/pay/')) return <CheckoutHeader />

  const openMegaSoon = () => {
    window.clearTimeout(hoverTimer.current)
    hoverTimer.current = window.setTimeout(() => setMegaOpen(true), 120)
  }
  const closeMegaSoon = () => {
    window.clearTimeout(hoverTimer.current)
    hoverTimer.current = window.setTimeout(() => setMegaOpen(false), 160)
  }

  const shopActive = pathname.startsWith('/collections') || pathname.startsWith('/product')

  return (
    <header className="fixed inset-x-0 top-[var(--announcement-height)] z-50 border-b border-line bg-paper">
      <div className="container-lux grid h-[var(--nav-bar-height)] grid-cols-[1fr_auto_1fr] items-center">
        {/* Left: mobile menu + search / desktop navigation */}
        <div className="flex items-center">
          <IconButton label="Open menu" onClick={() => setMenuOpen(true)} className="-ml-3 lg:hidden">
            <MenuIcon size={22} />
          </IconButton>
          <IconButton label="Search" onClick={() => setSearchOpen(true)} className="lg:hidden">
            <SearchIcon size={20} />
          </IconButton>

          <nav aria-label="Primary" className="hidden items-center gap-8 lg:flex">
            <div onMouseEnter={openMegaSoon} onMouseLeave={closeMegaSoon}>
              <button
                type="button"
                aria-expanded={megaOpen}
                aria-controls={megaId}
                onClick={() => setMegaOpen((v) => !v)}
                className={`link-underline inline-flex min-h-11 items-center gap-1.5 text-[0.8125rem] font-medium uppercase tracking-[0.14em] ${
                  shopActive ? 'text-ink' : 'text-body hover:text-ink'
                }`}
              >
                Shop
                <ChevronDownIcon size={14} className={`transition-transform ${megaOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
            {PRIMARY_LINKS.map((l) => {
              // Query-string links (New in, Bestsellers) are active only when the sort matches.
              const [path, query = ''] = l.to.split('?')
              const active = pathname === path && (query ? search === `?${query}` : true)
              return (
                <Link
                  key={l.label}
                  to={l.to}
                  aria-current={active ? 'page' : undefined}
                  className={`link-underline inline-flex min-h-11 items-center text-[0.8125rem] font-medium uppercase tracking-[0.14em] ${
                    active ? 'text-ink' : 'text-body hover:text-ink'
                  }`}
                >
                  {l.label}
                </Link>
              )
            })}
          </nav>
        </div>

        <Logo />

        {/* Right: utilities */}
        <div className="flex items-center justify-end">
          <IconButton label="Search" onClick={() => setSearchOpen(true)} className="hidden lg:grid">
            <SearchIcon size={20} />
          </IconButton>
          <div className="hidden lg:block">
            <AccountNavMenu />
          </div>
          <WishlistNavLink variant="icon" />
          <CartNavLink variant="icon" className="-mr-2.5 lg:mr-0" />
        </div>
      </div>

      <MegaMenu id={megaId} open={megaOpen} onClose={closeMega} onMouseEnter={openMegaSoon} onMouseLeave={closeMegaSoon} />
      <MobileMenu open={menuOpen} onClose={closeMenu} onSearch={() => setSearchOpen(true)} />
      {searchOpen && (
        <Suspense fallback={null}>
          <SearchDialog onClose={() => setSearchOpen(false)} />
        </Suspense>
      )}
    </header>
  )
}
