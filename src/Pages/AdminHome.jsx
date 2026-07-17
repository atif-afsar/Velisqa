import { Link } from 'react-router-dom'
import AdminShell from '../Components/Admin/AdminShell'
import { formatInr } from '../lib/cartStock'
import { useAdminInbox } from '../hooks/useAdminInbox'

function ActionCard({ title, count, description, href, cta, tone = 'default' }) {
  const tones = {
    default: 'border-[#d4af37]/20 bg-white',
    urgent: 'border-amber-300 bg-amber-50',
    calm: 'border-[#2d6a4f]/20 bg-[#f0f7f4]',
  }

  return (
    <Link
      to={href}
      className={`block rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${tones[tone]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#847377]">{title}</p>
          <p className="mt-2 font-serif text-3xl font-semibold text-[#130006]">{count}</p>
        </div>
        {count > 0 ? (
          <span className="rounded-full bg-[#c0392b] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white">
            Action needed
          </span>
        ) : (
          <span className="rounded-full bg-[#2d6a4f]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#2d6a4f]">
            All clear
          </span>
        )}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-[#514347]">{description}</p>
      <p className="mt-4 text-sm font-semibold text-[#6f334a]">{cta} →</p>
    </Link>
  )
}

export default function AdminHome() {
  const { inbox, loading, error, refresh } = useAdminInbox({ pollMs: 45000 })
  const counts = inbox?.counts || {
    paymentReviews: 0,
    needsShipment: 0,
    awaitingUpi: 0,
    inTransit: 0,
    totalOpen: 0,
  }

  return (
    <AdminShell
      title="Admin overview"
      subtitle="See new customer orders at a glance. UPI orders need payment proof approval; COD orders need shipping from here."
      onRefresh={refresh}
    >
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>
      ) : null}

      {loading && !inbox ? (
        <p className="text-sm text-[#514347]">Loading your inbox…</p>
      ) : (
        <>
          {counts.totalOpen > 0 ? (
            <div className="mb-6 rounded-2xl border border-[#3d0a21]/15 bg-[#3d0a21] p-5 text-[#fdf9f4] sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#d4af37]">Needs attention now</p>
              <p className="mt-2 font-serif text-2xl font-semibold">
                {counts.totalOpen} open task{counts.totalOpen === 1 ? '' : 's'} from the shop
              </p>
              <ul className="mt-3 space-y-1 text-sm text-white/85">
                {counts.paymentReviews > 0 ? (
                  <li>• {counts.paymentReviews} customer{counts.paymentReviews === 1 ? '' : 's'} uploaded UPI payment proof</li>
                ) : null}
                {counts.needsShipment > 0 ? (
                  <li>• {counts.needsShipment} COD order{counts.needsShipment === 1 ? '' : 's'} waiting for NimbusPost shipment</li>
                ) : null}
              </ul>
            </div>
          ) : (
            <div className="mb-6 rounded-2xl border border-[#2d6a4f]/20 bg-[#f0f7f4] p-5 sm:p-6">
              <p className="font-semibold text-[#1b4332]">You&apos;re all caught up</p>
              <p className="mt-1 text-sm text-[#514347]">No UPI proofs to review and no COD orders waiting to ship.</p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <ActionCard
              title="UPI payment reviews"
              count={counts.paymentReviews}
              description="Customer chose UPI QR and uploaded a screenshot. Verify the payment, then approve to create the NimbusPost shipment."
              href="/admin/payments"
              cta="Review payment proofs"
              tone={counts.paymentReviews > 0 ? 'urgent' : 'calm'}
            />
            <ActionCard
              title="Orders to ship"
              count={counts.needsShipment}
              description="COD orders (or paid orders) that still need AWB creation in NimbusPost. Click Ship once per order."
              href="/admin/orders"
              cta="Open shipping queue"
              tone={counts.needsShipment > 0 ? 'urgent' : 'calm'}
            />
            <ActionCard
              title="In transit"
              count={counts.inTransit}
              description="Orders already shipped with an AWB. Track delivery status on NimbusPost or share the customer tracking link."
              href="/admin/orders"
              cta="View shipped orders"
              tone="default"
            />
          </div>

          <section className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-[#d4af37]/15 bg-white p-5">
              <h2 className="font-serif text-xl font-semibold">How orders flow</h2>
              <ol className="mt-4 space-y-3 text-sm leading-relaxed text-[#514347]">
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#3d0a21] text-xs font-bold text-white">1</span>
                  <span><strong>Customer places order</strong> on the website (COD or UPI).</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#3d0a21] text-xs font-bold text-white">2</span>
                  <span><strong>UPI only:</strong> they pay and upload proof → you review under <Link to="/admin/payments" className="font-semibold text-[#6f334a] hover:underline">UPI reviews</Link>.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#3d0a21] text-xs font-bold text-white">3</span>
                  <span><strong>Ship the order</strong> from <Link to="/admin/orders" className="font-semibold text-[#6f334a] hover:underline">Ship orders</Link> → NimbusPost creates AWB.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#3d0a21] text-xs font-bold text-white">4</span>
                  <span><strong>Customer tracks</strong> via the private link you copy from the order card.</span>
                </li>
              </ol>
            </div>

            <div className="rounded-2xl border border-[#d4af37]/15 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-serif text-xl font-semibold">Latest from shop</h2>
                <Link to="/admin/orders" className="text-xs font-semibold text-[#6f334a] hover:underline">
                  All orders →
                </Link>
              </div>
              {(inbox?.recentOrders || []).length === 0 ? (
                <p className="mt-4 text-sm text-[#514347]">No orders yet.</p>
              ) : (
                <ul className="mt-4 divide-y divide-[#130006]/8">
                  {inbox.recentOrders.map((order) => (
                    <li key={order.id} className="flex items-start justify-between gap-3 py-3">
                      <div>
                        <p className="font-mono text-xs font-semibold text-[#3d0a21]">{order.order_ref}</p>
                        <p className="text-sm">{order.customer_name}</p>
                        <p className="text-xs text-[#847377]">
                          {order.payment_method === 'cod' ? 'COD' : 'UPI'} · {order.payment_status.replace(/_/g, ' ')}
                        </p>
                      </div>
                      <p className="text-sm font-semibold">{formatInr(order.grand_total)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </>
      )}
    </AdminShell>
  )
}
