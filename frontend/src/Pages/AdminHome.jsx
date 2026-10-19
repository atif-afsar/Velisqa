import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminShell from '../Components/Admin/AdminShell'
import { api } from '../lib/apiClient'
import { formatInr } from '../lib/cartStock'
import { useAdminInbox } from '../hooks/useAdminInbox'

// ── India-calendar date helpers (orders are reported by IST day) ─────────

const istDate = (date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(date)
const addDays = (ymd, days) => {
  const d = new Date(`${ymd}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
const daysBetween = (from, to) => Math.round((new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`)) / 86_400_000)
const prettyDay = (ymd, opts = { day: 'numeric', month: 'short' }) => new Date(`${ymd}T00:00:00Z`).toLocaleDateString('en-IN', { ...opts, timeZone: 'UTC' })

function presetRange(id) {
  const today = istDate()
  switch (id) {
    case 'today':
      return { from: today, to: today }
    case 'yesterday':
      return { from: addDays(today, -1), to: addDays(today, -1) }
    case '30d':
      return { from: addDays(today, -29), to: today }
    case 'month':
      return { from: `${today.slice(0, 8)}01`, to: today }
    default:
      return { from: addDays(today, -6), to: today }
  }
}

const PRESETS = [
  ['today', 'Today'],
  ['yesterday', 'Yesterday'],
  ['7d', '7 days'],
  ['30d', '30 days'],
  ['month', 'This month'],
]

function rangeLabel({ from, to }) {
  if (from === to) return prettyDay(from, { weekday: 'long', day: 'numeric', month: 'long' })
  return `${prettyDay(from)} – ${prettyDay(to, { day: 'numeric', month: 'short', year: 'numeric' })}`
}

// ── Order status, in shop-owner terms ─────────────────────────────────────

function orderState(order) {
  if (order.order_status === 'cancelled') return { label: 'Cancelled', tone: 'muted' }
  if (order.payment_method === 'online' && order.payment_status !== 'paid' && order.payment_status !== 'refunded') {
    return { label: 'Awaiting payment', tone: 'gold' }
  }
  if (order.shipping_status === 'delivered' || order.order_status === 'delivered') return { label: 'Delivered', tone: 'sage' }
  if (order.shipping_status === 'shipped' || order.shipping_status === 'out_for_delivery') return { label: 'In transit', tone: 'ink' }
  return { label: 'To ship', tone: 'gold' }
}

const TONE = {
  gold: 'border-[#f3d6b8] bg-[var(--a-warn-tint)] text-[var(--a-warn)]',
  sage: 'border-[var(--a-good-line)] bg-[var(--a-good-tint)] text-[var(--a-good)]',
  ink: 'border-[var(--a-line-strong)] bg-white text-[var(--a-ink)]',
  muted: 'border-[var(--a-line)] bg-[var(--a-canvas)] text-[var(--a-muted)]',
}

// ── Pieces ────────────────────────────────────────────────────────────────

/** Change vs the previous period of the same length. */
function Delta({ current, previous }) {
  if (previous == null) return null
  if (!previous) {
    return current ? <span className="text-xs font-semibold text-[var(--a-good)]">New this period</span> : <span className="text-xs text-[var(--a-muted)]">No change</span>
  }
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct === 0) return <span className="text-xs text-[var(--a-muted)]">No change</span>
  const up = pct > 0
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${up ? 'text-[var(--a-good)]' : 'text-[var(--a-bad)]'}`}>
      <span aria-hidden="true">{up ? '▲' : '▼'}</span>
      {Math.abs(pct)}%
      <span className="font-normal text-[var(--a-muted)]">vs previous</span>
    </span>
  )
}

function Stat({ label, value, hint, current, previous }) {
  return (
    <div className="px-5 py-5 sm:px-6">
      <p className="admin-eyebrow">{label}</p>
      <p className="mt-2 text-[1.75rem] font-bold leading-none tracking-[-0.02em] text-[var(--a-ink)]">{value}</p>
      <div className="mt-2 min-h-4">
        {current != null ? <Delta current={current} previous={previous} /> : null}
        {hint ? <p className="text-xs text-[var(--a-muted)]">{hint}</p> : null}
      </div>
    </div>
  )
}

const STATUS_ROWS = [
  ['to_ship', 'To ship', 'bg-[var(--a-warn)]'],
  ['awaiting_payment', 'Awaiting payment', 'bg-[var(--a-faint)]'],
  ['in_transit', 'In transit', 'bg-[var(--a-text-2)]'],
  ['delivered', 'Delivered', 'bg-[var(--a-good)]'],
  ['returned', 'Returned', 'bg-[var(--a-muted)]'],
  ['cancelled', 'Cancelled', 'bg-[var(--a-bad)]'],
]

function Panel({ title, children, action }) {
  return (
    <section className="border border-[var(--a-line)] bg-white p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-base">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function Insights({ summary }) {
  const statusTotal = Object.values(summary.status || {}).reduce((sum, n) => sum + n, 0)
  const mixTotal = summary.cod.orders + summary.online.orders
  const codPct = mixTotal ? Math.round((summary.cod.orders / mixTotal) * 100) : 0
  const topMax = Math.max(1, ...summary.topProducts.map((product) => product.revenue))
  const cancelRate = statusTotal ? Math.round(((summary.status.cancelled || 0) / statusTotal) * 100) : 0

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-3">
      <Panel title="Top products" action={<Link to="/admin/panel" className="admin-eyebrow hover:text-[var(--a-ink)]">Catalogue →</Link>}>
        {summary.topProducts.length ? (
          <ol className="space-y-3">
            {summary.topProducts.map((product, index) => (
              <li key={product.id} className="flex items-center gap-3">
                <span className="w-4 shrink-0 text-xs font-semibold text-[var(--a-muted)]">{index + 1}</span>
                {product.image ? <img src={product.image} alt="" className="h-10 w-10 shrink-0 rounded-md bg-[var(--a-canvas)] object-cover" loading="lazy" /> : <span className="h-10 w-10 shrink-0 rounded-md bg-[var(--a-canvas)]" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--a-ink)]" title={product.name}>{product.name}</p>
                  <div className="mt-1 h-1.5 rounded-full bg-[var(--a-canvas)]">
                    <div className="h-full rounded-full bg-[var(--a-accent)]" style={{ width: `${Math.max(4, (product.revenue / topMax) * 100)}%` }} />
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-[var(--a-ink)]">{formatInr(product.revenue)}</p>
                  <p className="text-xs text-[var(--a-muted)]">{product.units} sold</p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="py-6 text-center text-sm text-[var(--a-muted)]">No sales in this period yet.</p>
        )}
      </Panel>

      <Panel title="Order status" action={<span className="admin-eyebrow">{statusTotal} orders</span>}>
        {statusTotal ? (
          <ul className="space-y-3">
            {STATUS_ROWS.filter(([key]) => summary.status[key]).map(([key, label, color]) => {
              const count = summary.status[key] || 0
              const pct = Math.round((count / statusTotal) * 100)
              return (
                <li key={key}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-[var(--a-text)]">{label}</span>
                    <span className="font-semibold text-[var(--a-ink)]">{count} <span className="text-xs font-normal text-[var(--a-muted)]">· {pct}%</span></span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-[var(--a-canvas)]">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(3, pct)}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="py-6 text-center text-sm text-[var(--a-muted)]">No orders in this period.</p>
        )}
        {statusTotal ? <p className="mt-4 text-xs text-[var(--a-muted)]">Cancellation rate: <strong className="text-[var(--a-ink)]">{cancelRate}%</strong></p> : null}
      </Panel>

      <Panel title="Payment mix">
        {mixTotal ? (
          <>
            <div className="flex h-3 overflow-hidden rounded-full bg-[var(--a-canvas)]" role="img" aria-label={`Cash on delivery ${codPct}%, online ${100 - codPct}%`}>
              {codPct > 0 && <div className="h-full bg-[var(--a-accent)]" style={{ width: `${codPct}%` }} />}
              {codPct > 0 && codPct < 100 && <div className="h-full w-[2px] bg-white" />}
              {codPct < 100 && <div className="h-full flex-1 bg-[var(--a-text-2)]" />}
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-4">
              <div>
                <dt className="flex items-center gap-2 text-xs text-[var(--a-muted)]"><span className="h-2.5 w-2.5 rounded-sm bg-[var(--a-accent)]" />Cash on delivery</dt>
                <dd className="mt-1 text-lg font-bold text-[var(--a-ink)]">{codPct}%</dd>
                <dd className="text-xs text-[var(--a-muted)]">{summary.cod.orders} orders · {formatInr(summary.cod.revenue)}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-2 text-xs text-[var(--a-muted)]"><span className="h-2.5 w-2.5 rounded-sm bg-[var(--a-text-2)]" />Online (prepaid)</dt>
                <dd className="mt-1 text-lg font-bold text-[var(--a-ink)]">{100 - codPct}%</dd>
                <dd className="text-xs text-[var(--a-muted)]">{summary.online.orders} orders · {formatInr(summary.online.revenue)}</dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-[var(--a-muted)]">Prepaid orders avoid COD fees and return-to-origin risk.</p>
          </>
        ) : (
          <p className="py-6 text-center text-sm text-[var(--a-muted)]">No orders in this period.</p>
        )}
      </Panel>
    </div>
  )
}

/** Day-by-day sales: one series, one hue, hover for exact values; table view alongside. */
function DailyChart({ from, to, daily }) {
  const [hover, setHover] = useState(null)
  const [asTable, setAsTable] = useState(false)
  const days = useMemo(() => {
    const byDate = new Map(daily.map((day) => [day.date, day]))
    // Long ranges: chart the most recent 92 days (the table and totals cover the whole range).
    const span = Math.min(daysBetween(from, to), 92)
    const first = addDays(to, -span)
    return Array.from({ length: span + 1 }, (_, i) => {
      const date = addDays(first, i)
      return byDate.get(date) || { date, orders: 0, revenue: 0 }
    })
  }, [from, to, daily])
  const max = Math.max(1, ...days.map((day) => day.revenue))
  const withOrders = days.filter((day) => day.orders > 0).reverse()

  return (
    <section aria-labelledby="daily-heading" className="border border-[var(--a-line)] bg-white p-5 sm:p-6">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 id="daily-heading" className="font-serif text-xl">Sales by day</h2>
        <button type="button" className="admin-eyebrow hover:text-[var(--a-ink)]" onClick={() => setAsTable((v) => !v)}>
          {asTable ? 'Show chart' : 'Show table'}
        </button>
      </div>

      {asTable ? (
        withOrders.length ? (
          <table className="w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-[0.12em] text-[var(--a-muted)]">
              <tr><th className="pb-2 font-semibold">Date</th><th className="pb-2 text-right font-semibold">Orders</th><th className="pb-2 text-right font-semibold">Sales</th></tr>
            </thead>
            <tbody>
              {withOrders.map((day) => (
                <tr key={day.date} className="border-t border-[var(--a-line)]">
                  <td className="py-2">{prettyDay(day.date, { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                  <td className="py-2 text-right">{day.orders}</td>
                  <td className="py-2 text-right">{formatInr(day.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="py-8 text-center text-sm text-[var(--a-muted)]">No orders in this period.</p>
        )
      ) : (
        <div className="relative">
          <div className="flex h-40 items-end gap-[2px] border-b border-[var(--a-line-strong)]" onMouseLeave={() => setHover(null)}>
            {days.map((day, index) => (
              <button
                key={day.date}
                type="button"
                className="group flex h-full min-w-0 flex-1 items-end"
                onMouseEnter={() => setHover(index)}
                onFocus={() => setHover(index)}
                onBlur={() => setHover(null)}
                aria-label={`${prettyDay(day.date)}: ${day.orders} orders, ${formatInr(day.revenue)}`}
              >
                <span
                  className={`mx-auto block w-full max-w-[22px] rounded-t-[4px] transition-colors ${day.revenue ? (hover === index ? 'bg-[var(--a-accent-dark)]' : 'bg-[var(--a-accent)]') : 'bg-transparent'}`}
                  style={{ height: day.revenue ? `${Math.max(3, (day.revenue / max) * 100)}%` : 0 }}
                />
              </button>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-[var(--a-muted)]">
            <span>{prettyDay(days[0].date)}</span>
            {days.length > 2 ? <span>{prettyDay(days[days.length - 1].date)}</span> : null}
          </div>
          {hover != null && (
            <div
              className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap border border-[var(--a-accent-line)] bg-white px-3 py-2 text-xs shadow-[0_6px_18px_rgba(26,24,20,0.08)]"
              style={{ left: `${((hover + 0.5) / days.length) * 100}%` }}
            >
              <p className="font-medium text-[var(--a-ink)]">{prettyDay(days[hover].date, { weekday: 'short', day: 'numeric', month: 'short' })}</p>
              <p className="text-[var(--a-text-2)]">{days[hover].orders} order{days[hover].orders === 1 ? '' : 's'} · {formatInr(days[hover].revenue)}</p>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function TaskRow({ count, title, detail, to, action }) {
  const open = count > 0
  return (
    <li className="flex items-center gap-4 px-5 py-4">
      <span className={`grid h-10 w-10 shrink-0 place-items-center border font-serif text-lg ${open ? 'border-[var(--a-accent)] bg-[var(--a-accent-tint)] text-[var(--a-accent-dark)]' : 'border-[var(--a-line)] text-[var(--a-faint)]'}`}>
        {open ? count : '✓'}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${open ? 'text-[var(--a-ink)]' : 'text-[var(--a-muted)]'}`}>{title}</p>
        <p className="mt-0.5 text-xs text-[var(--a-muted)]">{open ? detail : 'Nothing waiting'}</p>
      </div>
      <Link to={to} className={open ? 'admin-btn' : 'admin-btn-ghost'}>{open ? action : 'Open'}</Link>
    </li>
  )
}

const QUICK_LINKS = [
  ['/admin/panel', 'Add a product', 'Single piece with photos'],
  ['/admin/bulk', 'Bulk & AI upload', 'Many products from photos or CSV'],
  ['/admin/hero', 'Homepage banners', 'Change the hero images'],
  ['/admin/coupons', 'Create a coupon', 'Discount codes'],
]

const greeting = (hour) => (hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening')

// ── Page ──────────────────────────────────────────────────────────────────

export default function AdminHome() {
  const { inbox, refresh: refreshInbox } = useAdminInbox({ pollMs: 45000 })
  const [preset, setPreset] = useState('7d')
  const [range, setRange] = useState(() => presetRange('7d'))
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [hour] = useState(() => Number(new Intl.DateTimeFormat('en-IN', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Kolkata' }).format(new Date())))
  const today = istDate()

  const load = useCallback(async () => {
    setError('')
    try {
      setSummary(await api.get('/admin/dashboard/summary', { query: { start: `${range.from}T00:00:00+05:30`, end: `${range.to}T23:59:59.999+05:30` } }))
    } catch (err) {
      setError(err.message || 'Could not load the dashboard.')
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => {
    void load()
  }, [load])

  function choosePreset(id) {
    setPreset(id)
    setLoading(true)
    setRange(presetRange(id))
  }

  function setCustom(field, value) {
    if (!value) return
    setPreset('custom')
    setLoading(true)
    setRange((current) => {
      const next = { ...current, [field]: value > today ? today : value }
      // Keep the range ordered whichever end the admin changes.
      return next.from > next.to ? { from: next.to, to: next.from } : next
    })
  }

  const counts = inbox?.counts || {}
  const open = counts.totalOpen || 0
  const tasks = [
    { key: 'ship', count: counts.needsShipment || 0, title: 'Orders to ship', detail: 'Paid or COD orders waiting for a NimbusPost AWB.', to: '/admin/orders', action: 'Ship now' },
    { key: 'pay', count: counts.paymentReviews || 0, title: 'Payments to review', detail: 'Customers sent proof of a UPI payment.', to: '/admin/payments', action: 'Review' },
    { key: 'returns', count: counts.pendingReturns || 0, title: 'Return requests', detail: 'Approve or decline within the 5-day policy.', to: '/admin/returns', action: 'Review' },
    { key: 'reviews', count: counts.pendingReviews || 0, title: 'Customer reviews', detail: 'Approve before they appear on product pages.', to: '/admin/reviews', action: 'Moderate' },
  ].sort((a, b) => (b.count > 0) - (a.count > 0))

  const codShare = summary && summary.orders ? Math.round((summary.cod.orders / summary.orders) * 100) : 0

  return (
    <AdminShell
      title={greeting(hour)}
      subtitle={open ? `${open} thing${open === 1 ? ' needs' : 's need'} your attention today.` : 'Everything is up to date. Nothing needs your attention right now.'}
      onRefresh={async () => {
        await refreshInbox()
        await load()
      }}
    >
      {/* Date range */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="admin-eyebrow">Showing</p>
          <p className="mt-1 font-serif text-2xl text-[var(--a-ink)]">{rangeLabel(range)}</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-wrap border border-[var(--a-line-strong)] bg-white" role="group" aria-label="Date range">
            {PRESETS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => choosePreset(id)}
                aria-pressed={preset === id}
                className={`px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors ${preset === id ? 'bg-[var(--a-ink)] text-white' : 'text-[var(--a-text)] hover:bg-[var(--a-canvas)]'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-[var(--a-text-2)]">
            From
            <input type="date" className="admin-input !min-h-9 !w-auto !py-1.5" value={range.from} max={today} onChange={(e) => setCustom('from', e.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-xs text-[var(--a-text-2)]">
            To
            <input type="date" className="admin-input !min-h-9 !w-auto !py-1.5" value={range.to} max={today} onChange={(e) => setCustom('to', e.target.value)} />
          </label>
        </div>
      </div>

      {error ? <p className="mb-6 border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}

      {/* Key numbers for the range */}
      <section aria-label="Sales in this period" className={`grid grid-cols-2 border border-[var(--a-line)] bg-white lg:grid-cols-4 ${loading ? 'opacity-60' : ''}`}>
        <div className="border-b border-r border-[var(--a-line)] lg:border-b-0"><Stat label="Orders" value={summary ? summary.orders : '—'} current={summary?.orders} previous={summary?.previous.orders} /></div>
        <div className="border-b border-[var(--a-line)] lg:border-b-0 lg:border-r"><Stat label="Sales" value={summary ? formatInr(summary.revenue) : '—'} current={summary?.revenue} previous={summary?.previous.revenue} /></div>
        <div className="border-r border-[var(--a-line)]"><Stat label="Average order" value={summary ? formatInr(Math.round(summary.avgOrderValue)) : '—'} current={summary?.avgOrderValue} previous={summary?.previous.avgOrderValue} /></div>
        <div><Stat label="Cancelled" value={summary ? summary.cancelled : '—'} hint={summary ? `Not counted in sales · ${codShare}% COD` : null} /></div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        {summary ? <DailyChart from={range.from} to={range.to} daily={summary.daily} /> : <div className="h-64 border border-[var(--a-line)] bg-white" />}

        <section aria-labelledby="todo-heading">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="todo-heading" className="font-serif text-xl">To do</h2>
            <span className="admin-eyebrow">{open ? `${open} open` : 'All clear'}</span>
          </div>
          <ul className="divide-y divide-[var(--a-line)] border border-[var(--a-line)] bg-white">
            {tasks.map(({ key, ...task }) => <TaskRow key={key} {...task} />)}
          </ul>
          {counts.inTransit || counts.awaitingUpi ? (
            <p className="mt-3 text-xs text-[var(--a-muted)]">
              {counts.inTransit ? `${counts.inTransit} with the courier. ` : ''}
              {counts.awaitingUpi ? `${counts.awaitingUpi} online order${counts.awaitingUpi === 1 ? '' : 's'} waiting for the customer to pay.` : ''}
            </p>
          ) : null}
        </section>
      </div>

      {summary ? <Insights summary={summary} /> : null}

      {/* Orders in the range */}
      <section aria-labelledby="orders-heading" className="mt-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="orders-heading" className="font-serif text-xl">
            Orders in this period{summary ? <span className="ml-2 font-sans text-sm text-[var(--a-muted)]">{summary.listTotal}</span> : null}
          </h2>
          <Link to="/admin/orders" className="admin-eyebrow hover:text-[var(--a-ink)]">Manage orders →</Link>
        </div>
        <div className="overflow-x-auto border border-[var(--a-line)] bg-white">
          {!summary || summary.list.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-[var(--a-muted)]">{loading ? 'Loading…' : 'No orders were placed in this period.'}</p>
          ) : (
            <table className="w-full text-left text-sm sm:min-w-[640px]">
              <thead className="bg-[var(--a-canvas)] text-[11px] uppercase tracking-[0.12em] text-[var(--a-muted)]">
                <tr>
                  <th className="px-3 py-3 font-semibold sm:px-5">Date</th>
                  <th className="px-5 py-3 font-semibold">Customer</th>
                  <th className="hidden px-5 py-3 font-semibold lg:table-cell">Order</th>
                  <th className="hidden px-5 py-3 font-semibold sm:table-cell">Payment</th>
                  <th className="hidden px-5 py-3 font-semibold sm:table-cell">Status</th>
                  <th className="px-3 py-3 text-right font-semibold sm:px-5">Amount</th>
                </tr>
              </thead>
              <tbody>
                {summary.list.map((order) => {
                  const state = orderState(order)
                  const placed = new Date(order.created_at)
                  return (
                    <tr key={order.id} className="border-t border-[var(--a-line)]">
                      <td className="whitespace-nowrap px-3 py-3 text-[var(--a-text-2)] sm:px-5">
                        {placed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })}
                        <span className="ml-1.5 hidden text-xs text-[var(--a-muted)] sm:inline">{placed.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })}</span>
                      </td>
                      <td className="px-3 py-3 sm:px-5">
                        <span className="block max-w-[11rem] truncate font-medium text-[var(--a-ink)] sm:max-w-none">{order.customer_name}</span>
                        <span className="mt-0.5 block text-[11px] text-[var(--a-muted)] sm:hidden">{state.label} · {order.payment_method === 'cod' ? 'COD' : 'Online'}</span>
                      </td>
                      <td className="hidden whitespace-nowrap px-5 py-3 text-xs text-[var(--a-text-2)] lg:table-cell">{order.order_ref}</td>
                      <td className="hidden px-5 py-3 text-[var(--a-text-2)] sm:table-cell">{order.payment_method === 'cod' ? 'COD' : 'Online'}</td>
                      <td className="hidden px-5 py-3 sm:table-cell">
                        <span className={`whitespace-nowrap border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${TONE[state.tone]}`}>{state.label}</span>
                      </td>
                      <td className={`whitespace-nowrap px-3 py-3 text-right font-medium sm:px-5 ${order.order_status === 'cancelled' ? 'text-[var(--a-muted)] line-through' : 'text-[var(--a-ink)]'}`}>{formatInr(order.grand_total)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          {summary && summary.listTotal > summary.list.length ? (
            <p className="border-t border-[var(--a-line)] px-5 py-3 text-xs text-[var(--a-muted)]">Showing the latest {summary.list.length} of {summary.listTotal}. See all in Manage orders.</p>
          ) : null}
        </div>
      </section>

      {/* Shortcuts */}
      <section aria-labelledby="quick-heading" className="mt-10">
        <h2 id="quick-heading" className="admin-eyebrow mb-3">Shortcuts</h2>
        <div className="grid gap-px border border-[var(--a-line)] bg-[var(--a-line)] sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_LINKS.map(([to, title, hint]) => (
            <Link key={to} to={to} className="group block bg-white px-5 py-4 transition-colors hover:bg-[var(--a-canvas)]">
              <p className="text-sm font-medium text-[var(--a-ink)]">{title} <span className="text-[var(--a-accent)]">→</span></p>
              <p className="mt-0.5 text-xs text-[var(--a-muted)]">{hint}</p>
            </Link>
          ))}
        </div>
      </section>
    </AdminShell>
  )
}
