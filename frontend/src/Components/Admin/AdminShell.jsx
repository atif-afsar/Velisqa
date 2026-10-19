import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useAdminInbox } from '../../hooks/useAdminInbox'

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [{ to: '/admin/home', label: 'Dashboard', match: (path) => path === '/admin/home' }],
  },
  {
    label: 'Orders',
    items: [
      { to: '/admin/orders', label: 'Ship orders', badgeKey: 'needsShipment', match: (path) => path.startsWith('/admin/orders') },
      { to: '/admin/payments', label: 'Payments', badgeKey: 'paymentReviews', match: (path) => path.startsWith('/admin/payments') },
      { to: '/admin/returns', label: 'Returns', badgeKey: 'pendingReturns', match: (path) => path.startsWith('/admin/returns') },
    ],
  },
  {
    label: 'Catalogue',
    items: [
      { to: '/admin/panel', label: 'Products', match: (path) => path.startsWith('/admin/panel') },
      { to: '/admin/bulk', label: 'Bulk & AI upload', match: (path) => path.startsWith('/admin/bulk') },
      { to: '/admin/reviews', label: 'Reviews', badgeKey: 'pendingReviews', match: (path) => path.startsWith('/admin/reviews') },
      { to: '/admin/coupons', label: 'Coupons', match: (path) => path.startsWith('/admin/coupons') },
    ],
  },
  {
    label: 'Storefront',
    items: [
      { to: '/admin/hero', label: 'Homepage banners', match: (path) => path.startsWith('/admin/hero') },
      { to: '/admin/analytics', label: 'Analytics', match: (path) => path.startsWith('/admin/analytics') },
    ],
  },
]

function NavBadge({ count }) {
  if (!count) return null
  return (
    <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--a-accent)] px-1.5 py-px text-[10px] font-semibold tabular-nums text-white">
      {count > 99 ? '99+' : count}
    </span>
  )
}

function NavList({ counts, pathname, onNavigate }) {
  return (
    <nav aria-label="Admin" className="space-y-7">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="admin-eyebrow mb-2 px-3">{group.label}</p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = item.match(pathname)
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-2 border-l-2 px-3 py-2 text-[13px] tracking-[0.02em] transition-colors ${
                      active ? 'border-[var(--a-accent)] bg-white font-medium text-ink' : 'border-transparent text-[var(--a-text)] hover:bg-white/70 hover:text-ink'
                    }`}
                  >
                    {item.label}
                    <NavBadge count={item.badgeKey ? counts?.[item.badgeKey] : 0} />
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

/**
 * Admin console frame: quiet ivory sidebar, serif wordmark and gold hairlines —
 * the restrained look of an international jewellery house. Pages render inside.
 */
export default function AdminShell({ title, subtitle, children, actions = null, onRefresh }) {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const { inbox, refresh: refreshInbox } = useAdminInbox()
  const [menuOpen, setMenuOpen] = useState(false)
  const counts = inbox?.counts

  // Phone menu: lock page scroll while open, close on Escape or navigation.
  useEffect(() => {
    if (!menuOpen) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event) => event.key === 'Escape' && setMenuOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])
  const openTasks = counts?.totalOpen || 0

  async function handleRefresh() {
    await refreshInbox()
    if (onRefresh) await onRefresh()
  }

  const sidebarFooter = (
    <div className="space-y-3 border-t border-[var(--a-line)] pt-5">
      <p className="truncate px-3 text-xs text-[var(--a-muted)]" title={user?.email}>{user?.email}</p>
      <div className="flex gap-2 px-3">
        <Link to="/" className="admin-btn-ghost admin-btn-sm flex-1">View shop</Link>
        <button type="button" onClick={() => logout()} className="admin-btn-ghost admin-btn-sm flex-1">Sign out</button>
      </div>
    </div>
  )

  return (
    <div className="admin-theme min-h-screen bg-[var(--a-canvas)] text-ink lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between overflow-y-auto border-r border-[var(--a-line)] bg-[var(--a-canvas)] px-3 py-8 lg:flex">
        <div>
          <Link to="/admin/home" className="mb-10 block px-3">
            <span className="block admin-wordmark text-[1.5rem] text-ink">VELISQA</span>
            <span className="mt-1 block h-px w-10 bg-[var(--a-accent)]" />
            <span className="admin-eyebrow mt-2 block">Seller console</span>
          </Link>
          <NavList counts={counts} pathname={pathname} />
        </div>
        {sidebarFooter}
      </aside>

      {/* Mobile top bar + drawer */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-[var(--a-line)] bg-[var(--a-canvas)]/95 px-4 py-3 backdrop-blur lg:hidden">
        <Link to="/admin/home" className="admin-wordmark text-xl">VELISQA</Link>
        <button type="button" onClick={() => setMenuOpen(true)} className="admin-btn-ghost" aria-expanded={menuOpen} aria-controls="admin-mobile-nav">
          Menu{openTasks ? ` · ${openTasks}` : ''}
        </button>
      </div>
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-ink/30" onClick={() => setMenuOpen(false)} />
          <div id="admin-mobile-nav" className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col justify-between overflow-y-auto bg-[var(--a-canvas)] px-3 py-5">
            <div className="mb-6 flex items-center justify-between px-3">
              <span className="admin-wordmark text-xl">VELISQA</span>
              <button type="button" onClick={() => setMenuOpen(false)} className="admin-btn-ghost admin-btn-sm" aria-label="Close menu">Close</button>
            </div>
            <div className="flex-1"><NavList counts={counts} pathname={pathname} onNavigate={() => setMenuOpen(false)} /></div>
            <div className="mt-8">{sidebarFooter}</div>
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1">
        {openTasks > 0 && pathname !== '/admin/home' && (
          <div className="border-b border-[var(--a-accent-line)] bg-[var(--a-accent-tint)] px-4 py-2.5 text-xs text-[var(--a-accent-dark)] sm:px-8">
            <strong className="font-semibold">{openTasks} task{openTasks === 1 ? '' : 's'} awaiting you</strong>
            {counts?.needsShipment ? <> · <Link to="/admin/orders" className="underline-offset-4 hover:underline">{counts.needsShipment} to ship</Link></> : null}
            {counts?.paymentReviews ? <> · <Link to="/admin/payments" className="underline-offset-4 hover:underline">{counts.paymentReviews} payment{counts.paymentReviews === 1 ? '' : 's'} to review</Link></> : null}
            {counts?.pendingReviews ? <> · <Link to="/admin/reviews" className="underline-offset-4 hover:underline">{counts.pendingReviews} review{counts.pendingReviews === 1 ? '' : 's'}</Link></> : null}
            {counts?.pendingReturns ? <> · <Link to="/admin/returns" className="underline-offset-4 hover:underline">{counts.pendingReturns} return{counts.pendingReturns === 1 ? '' : 's'}</Link></> : null}
          </div>
        )}

        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
          <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--a-line)] pb-6">
            <div className="min-w-0">
              <h1 className="font-serif text-3xl font-normal tracking-[0.01em] text-ink sm:text-[2.35rem]">{title}</h1>
              {subtitle ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--a-text-2)]">{subtitle}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {actions}
              <button type="button" onClick={() => void handleRefresh()} className="admin-btn-ghost">Refresh</button>
            </div>
          </header>

          <div className="mt-8 min-w-0 max-w-full">{children}</div>
        </div>
      </main>
    </div>
  )
}
