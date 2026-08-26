import { useEffect, useState, useMemo } from 'react'
import AdminShell from '../Components/Admin/AdminShell'
import { supabase } from '../lib/supabaseClient'
import { formatInr } from '../lib/cartStock'

// ── Date range presets ──────────────────────────────────────

function getDateRange(preset) {
  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  let start

  switch (preset) {
    case '7d':
      start = new Date(end)
      start.setDate(start.getDate() - 6)
      start.setHours(0, 0, 0, 0)
      break
    case '30d':
      start = new Date(end)
      start.setDate(start.getDate() - 29)
      start.setHours(0, 0, 0, 0)
      break
    case '90d':
      start = new Date(end)
      start.setDate(start.getDate() - 89)
      start.setHours(0, 0, 0, 0)
      break
    default:
      start = new Date(end)
      start.setDate(start.getDate() - 6)
      start.setHours(0, 0, 0, 0)
  }

  return { start: start.toISOString(), end: end.toISOString() }
}

// ── Metric Card ─────────────────────────────────────────────

function MetricCard({ label, value, sublabel, highlight = false }) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm ${
        highlight
          ? 'border-[#D4AF37]/30 bg-gradient-to-br from-[#3B0D23]/5 to-[#D4AF37]/5'
          : 'border-[#d4af37]/15 bg-white'
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#847377]">{label}</p>
      <p className="mt-2 font-serif text-2xl font-semibold text-[#130006] sm:text-3xl">{value}</p>
      {sublabel && (
        <p className="mt-1 text-xs text-[#847377]">{sublabel}</p>
      )}
    </div>
  )
}

// ── Funnel Step ─────────────────────────────────────────────

function FunnelStep({ label, count, width, color }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-[#514347]">{label}</span>
        <span className="font-bold text-[#130006]">{count}</span>
      </div>
      <div className="h-3 w-full rounded-full bg-[#f0ebe5]">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${width}%`, backgroundColor: color, minWidth: count > 0 ? '8px' : '0' }}
        />
      </div>
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────

export default function AdminAnalytics() {
  const [range, setRange] = useState('7d')
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function fetchOrders() {
    setLoading(true)
    setError(null)
    try {
      const { start, end } = getDateRange(range)
      const { data, error: fetchErr } = await supabase
        .from('orders')
        .select('id, order_ref, grand_total, payment_status, payment_method, created_at, utm_source, utm_medium, utm_campaign, line_items, device_type, city, state')
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false })

      if (fetchErr) {
        // Some columns might not exist yet — retry with fewer columns
        const { data: fallbackData, error: fallbackErr } = await supabase
          .from('orders')
          .select('id, order_ref, grand_total, payment_status, payment_method, created_at, line_items')
          .gte('created_at', start)
          .lte('created_at', end)
          .order('created_at', { ascending: false })

        if (fallbackErr) throw fallbackErr
        setOrders(fallbackData || [])
      } else {
        setOrders(data || [])
      }
    } catch (err) {
      setError(err.message)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [range]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Computed Metrics ────────────────────────────────────

  const metrics = useMemo(() => {
    const totalOrders = orders.length
    const paidOrders = orders.filter(
      (o) => o.payment_status === 'paid' || o.payment_method === 'cod',
    )
    const revenue = paidOrders.reduce((sum, o) => sum + (Number(o.grand_total) || 0), 0)
    const aov = paidOrders.length > 0 ? Math.round(revenue / paidOrders.length) : 0
    const codOrders = orders.filter((o) => o.payment_method === 'cod').length
    const onlineOrders = orders.filter((o) => o.payment_method !== 'cod').length
    const pendingPayments = orders.filter(
      (o) => o.payment_status !== 'paid' && o.payment_method !== 'cod',
    ).length

    return { totalOrders, paidOrders: paidOrders.length, revenue, aov, codOrders, onlineOrders, pendingPayments }
  }, [orders])

  // ── Traffic sources ───────────────────────────────────

  const trafficSources = useMemo(() => {
    const sourceMap = {}
    for (const o of orders) {
      const source = o.utm_source || 'Direct'
      const medium = o.utm_medium || '(none)'
      const key = `${source} / ${medium}`
      if (!sourceMap[key]) {
        sourceMap[key] = { source, medium, orders: 0, revenue: 0 }
      }
      sourceMap[key].orders += 1
      sourceMap[key].revenue += Number(o.grand_total) || 0
    }
    return Object.values(sourceMap).sort((a, b) => b.orders - a.orders)
  }, [orders])

  // ── Campaign breakdown ────────────────────────────────

  const campaigns = useMemo(() => {
    const campMap = {}
    for (const o of orders) {
      const campaign = o.utm_campaign || '(none)'
      if (!campMap[campaign]) {
        campMap[campaign] = { campaign, orders: 0, revenue: 0 }
      }
      campMap[campaign].orders += 1
      campMap[campaign].revenue += Number(o.grand_total) || 0
    }
    return Object.values(campMap).sort((a, b) => b.revenue - a.revenue)
  }, [orders])

  // ── Top Products ──────────────────────────────────────

  const topProducts = useMemo(() => {
    const productMap = {}
    for (const o of orders) {
      const items = o.line_items || []
      for (const item of items) {
        const name = item.name || item.product_name || 'Unknown'
        const id = item.product_id || item.productId || name
        if (!productMap[id]) {
          productMap[id] = { name, purchases: 0, revenue: 0, quantity: 0 }
        }
        productMap[id].purchases += 1
        productMap[id].quantity += Number(item.quantity) || 1
        productMap[id].revenue += (Number(item.price) || 0) * (Number(item.quantity) || 1)
      }
    }
    return Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10)
  }, [orders])

  // ── Payment method split ──────────────────────────────

  const paymentSplit = useMemo(() => {
    const cod = orders.filter((o) => o.payment_method === 'cod').length
    const online = orders.filter((o) => o.payment_method !== 'cod').length
    const total = orders.length || 1
    return {
      cod: { count: cod, pct: Math.round((cod / total) * 100) },
      online: { count: online, pct: Math.round((online / total) * 100) },
    }
  }, [orders])

  // ── Funnel data ───────────────────────────────────────

  const funnel = useMemo(() => {
    const total = metrics.totalOrders
    const paid = metrics.paidOrders
    return [
      { label: 'Orders Placed', count: total, color: '#3B0D23' },
      { label: 'Paid / COD Confirmed', count: paid, color: '#D4AF37' },
    ]
  }, [metrics])

  const maxFunnel = Math.max(1, ...funnel.map((f) => f.count))

  return (
    <AdminShell
      title="Analytics"
      subtitle="Order-based performance metrics"
      onRefresh={fetchOrders}
    >
      {/* Date range picker */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {[
          { key: '7d', label: 'Last 7 days' },
          { key: '30d', label: 'Last 30 days' },
          { key: '90d', label: 'Last 90 days' },
        ].map((opt) => (
          <button
            key={opt.key}
            onClick={() => setRange(opt.key)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
              range === opt.key
                ? 'bg-[#3B0D23] text-white shadow-md'
                : 'bg-white border border-[#d4af37]/20 text-[#514347] hover:border-[#d4af37]/50'
            }`}
          >
            {opt.label}
          </button>
        ))}
        <a
          href="https://analytics.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto flex items-center gap-1.5 rounded-full border border-[#4285F4]/30 px-4 py-1.5 text-xs font-semibold text-[#4285F4] transition-all hover:bg-[#4285F4]/5"
        >
          <span>Open GA4</span>
          <span className="text-[10px]">↗</span>
        </a>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <svg className="animate-spin h-8 w-8 text-[#3B0D23]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
          {error}
        </div>
      ) : (
        <div className="space-y-8">
          {/* ── Overview Cards ─────────────────────── */}
          <section>
            <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-[#847377]">Overview</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
              <MetricCard label="Total Orders" value={metrics.totalOrders} highlight />
              <MetricCard label="Revenue" value={formatInr(metrics.revenue)} highlight />
              <MetricCard label="Avg Order Value" value={formatInr(metrics.aov)} />
              <MetricCard
                label="Paid Orders"
                value={metrics.paidOrders}
                sublabel={`${metrics.pendingPayments} pending`}
              />
            </div>
          </section>

          {/* ── Payment Split ─────────────────────── */}
          <section>
            <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-[#847377]">Payment Method</h2>
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                label="COD"
                value={paymentSplit.cod.count}
                sublabel={`${paymentSplit.cod.pct}%`}
              />
              <MetricCard
                label="Online"
                value={paymentSplit.online.count}
                sublabel={`${paymentSplit.online.pct}%`}
              />
            </div>
          </section>

          {/* ── Funnel ────────────────────────────── */}
          <section>
            <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-[#847377]">Order Funnel</h2>
            <div className="rounded-2xl border border-[#d4af37]/15 bg-white p-5 space-y-3">
              {funnel.map((step) => (
                <FunnelStep
                  key={step.label}
                  label={step.label}
                  count={step.count}
                  width={Math.round((step.count / maxFunnel) * 100)}
                  color={step.color}
                />
              ))}
              <p className="text-[10px] text-[#847377] pt-2">
                For the full visitor → purchase funnel, check{' '}
                <a
                  href="https://analytics.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-[#4285F4]"
                >
                  GA4 Funnel Reports
                </a>.
              </p>
            </div>
          </section>

          {/* ── Top Products ──────────────────────── */}
          {topProducts.length > 0 && (
            <section>
              <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-[#847377]">Top Products</h2>
              <div className="overflow-x-auto rounded-2xl border border-[#d4af37]/15 bg-white">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#f0ebe5] text-[10px] font-bold uppercase tracking-[0.14em] text-[#847377]">
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3 text-right">Qty Sold</th>
                      <th className="px-4 py-3 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((p, i) => (
                      <tr key={i} className="border-b border-[#f0ebe5]/60 last:border-0">
                        <td className="px-4 py-3 font-medium text-[#130006]">{p.name}</td>
                        <td className="px-4 py-3 text-right text-[#514347]">{p.quantity}</td>
                        <td className="px-4 py-3 text-right font-semibold text-[#130006]">{formatInr(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ── Traffic Sources ───────────────────── */}
          {trafficSources.length > 0 && trafficSources[0].source !== 'Direct' && (
            <section>
              <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-[#847377]">Traffic Sources</h2>
              <div className="overflow-x-auto rounded-2xl border border-[#d4af37]/15 bg-white">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#f0ebe5] text-[10px] font-bold uppercase tracking-[0.14em] text-[#847377]">
                      <th className="px-4 py-3">Source / Medium</th>
                      <th className="px-4 py-3 text-right">Orders</th>
                      <th className="px-4 py-3 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trafficSources.map((s, i) => (
                      <tr key={i} className="border-b border-[#f0ebe5]/60 last:border-0">
                        <td className="px-4 py-3 font-medium text-[#130006]">{s.source} / {s.medium}</td>
                        <td className="px-4 py-3 text-right text-[#514347]">{s.orders}</td>
                        <td className="px-4 py-3 text-right font-semibold text-[#130006]">{formatInr(s.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ── Campaign Performance ──────────────── */}
          {campaigns.length > 1 && (
            <section>
              <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-[#847377]">Campaign Performance</h2>
              <div className="overflow-x-auto rounded-2xl border border-[#d4af37]/15 bg-white">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#f0ebe5] text-[10px] font-bold uppercase tracking-[0.14em] text-[#847377]">
                      <th className="px-4 py-3">Campaign</th>
                      <th className="px-4 py-3 text-right">Orders</th>
                      <th className="px-4 py-3 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((c, i) => (
                      <tr key={i} className="border-b border-[#f0ebe5]/60 last:border-0">
                        <td className="px-4 py-3 font-medium text-[#130006]">{c.campaign}</td>
                        <td className="px-4 py-3 text-right text-[#514347]">{c.orders}</td>
                        <td className="px-4 py-3 text-right font-semibold text-[#130006]">{formatInr(c.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ── External dashboards ──────────────── */}
          <section className="rounded-2xl border border-[#d4af37]/15 bg-gradient-to-r from-[#f8f6f3] to-white p-6">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[#847377]">
              Full Analytics Dashboards
            </h2>
            <p className="mb-4 text-sm leading-relaxed text-[#514347]">
              For detailed visitor analytics, traffic sources, conversion funnels, device reports,
              and campaign performance, use the platform dashboards directly:
            </p>
            <div className="flex flex-wrap gap-3">
              {[
                { label: 'Google Analytics', href: 'https://analytics.google.com', color: '#4285F4' },
                { label: 'Google Ads', href: 'https://ads.google.com', color: '#34A853' },
                { label: 'Meta Business', href: 'https://business.facebook.com', color: '#1877F2' },
                { label: 'Clarity', href: 'https://clarity.microsoft.com', color: '#6C2BD9' },
              ].map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-all hover:shadow-md"
                  style={{ borderColor: `${link.color}30`, color: link.color }}
                >
                  {link.label}
                  <span className="text-[10px]">↗</span>
                </a>
              ))}
            </div>
          </section>
        </div>
      )}
    </AdminShell>
  )
}
