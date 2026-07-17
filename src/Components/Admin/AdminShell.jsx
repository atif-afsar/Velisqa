import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useAdminInbox } from '../../hooks/useAdminInbox'

const NAV = [
  { to: '/admin/home', label: 'Overview', match: (path) => path === '/admin/home' },
  {
    to: '/admin/payments',
    label: 'UPI reviews',
    badgeKey: 'paymentReviews',
    match: (path) => path.startsWith('/admin/payments'),
  },
  {
    to: '/admin/orders',
    label: 'Ship orders',
    badgeKey: 'needsShipment',
    match: (path) => path.startsWith('/admin/orders'),
  },
  { to: '/admin/panel', label: 'Products', match: (path) => path.startsWith('/admin/panel') },
]

function NavBadge({ count }) {
  if (!count) return null
  return (
    <span className="ml-1.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#c0392b] px-1.5 text-[10px] font-bold text-white">
      {count > 99 ? '99+' : count}
    </span>
  )
}

export default function AdminShell({
  title,
  subtitle,
  children,
  actions = null,
  onRefresh,
}) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const { inbox, refresh: refreshInbox } = useAdminInbox()
  const counts = inbox?.counts

  async function handleRefresh() {
    await refreshInbox()
    if (onRefresh) await onRefresh()
  }

  const openTasks = counts?.totalOpen || 0

  return (
    <main className="page-offset-nav min-h-screen bg-[#f4f1ec] text-[#130006]">
      <div className="border-b border-[#3d0a21]/10 bg-[#130006] text-[#fdf9f4]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d4af37]/80">Velisqa admin</p>
            <p className="text-sm text-white/70">{user?.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleRefresh()}
              className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/90 hover:bg-white/10"
            >
              Refresh
            </button>
            <Link
              to="/"
              className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/90 hover:bg-white/10"
            >
              View shop
            </Link>
            <button
              type="button"
              onClick={() => logout()}
              className="rounded-full bg-[#d4af37] px-3 py-1.5 text-xs font-semibold text-[#130006]"
            >
              Sign out
            </button>
          </div>
        </div>

        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-0 sm:px-6">
          {NAV.map((item) => {
            const active = item.match(location.pathname)
            const badgeCount = item.badgeKey ? counts?.[item.badgeKey] : 0
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`whitespace-nowrap rounded-t-xl px-4 py-3 text-xs font-bold uppercase tracking-[0.08em] transition ${
                  active
                    ? 'bg-[#f4f1ec] text-[#130006]'
                    : 'text-white/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.label}
                <NavBadge count={badgeCount} />
              </Link>
            )
          })}
        </nav>
      </div>

      {openTasks > 0 && location.pathname !== '/admin/home' && (
        <div className="border-b border-amber-200 bg-amber-50">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm text-amber-950 sm:px-6">
            <p>
              <strong>{openTasks} task{openTasks === 1 ? '' : 's'} need your attention</strong>
              {counts?.paymentReviews ? ` · ${counts.paymentReviews} UPI proof${counts.paymentReviews === 1 ? '' : 's'} to review` : ''}
              {counts?.needsShipment ? ` · ${counts.needsShipment} order${counts.needsShipment === 1 ? '' : 's'} ready to ship` : ''}
            </p>
            <div className="flex flex-wrap gap-2">
              {counts?.paymentReviews ? (
                <Link to="/admin/payments" className="font-semibold text-[#6f334a] hover:underline">
                  Review payments →
                </Link>
              ) : null}
              {counts?.needsShipment ? (
                <Link to="/admin/orders" className="font-semibold text-[#6f334a] hover:underline">
                  Ship orders →
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-semibold">{title}</h1>
            {subtitle ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#514347]">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>

        <div className="mt-8">{children}</div>
      </div>
    </main>
  )
}
