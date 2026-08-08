import { Link } from 'react-router-dom'
import SEOHead from '../Components/SEO/SEOHead'
import { orderPrivateUrl } from '../lib/manualPayments'
import { usePrivateOrder } from '../hooks/usePrivateOrder'
import { formatInr } from '../lib/cartStock'
import { useMemo } from 'react'

function getExpectedDeliveryDateRange() {
  const today = new Date()
  const start = new Date(today)
  start.setDate(today.getDate() + 3)
  const end = new Date(today)
  end.setDate(today.getDate() + 5)
  
  const options = { day: 'numeric', month: 'short' }
  return `${start.toLocaleDateString('en-IN', options)} – ${end.toLocaleDateString('en-IN', options)}`
}

export default function ManualPaymentConfirmation() {
  const { accessToken, order, loading, error } = usePrivateOrder()
  const expectedDate = useMemo(() => getExpectedDeliveryDateRange(), [])

  if (loading) {
    return (
      <main className="page-offset-nav min-h-[60vh] bg-[#F8F6F3] p-8 text-center flex flex-col justify-center items-center gap-4">
        <svg className="animate-spin h-8 w-8 text-[#3B0D23]" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm font-medium text-[#514347]">Loading confirmation details…</span>
      </main>
    )
  }

  if (error || !order) {
    return (
      <main className="page-offset-nav min-h-[60vh] bg-[#F8F6F3] px-4 py-16 text-center">
        <h1 className="font-serif text-2xl text-[#3B0D23]">Order link unavailable</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-[#514347]">{error}</p>
      </main>
    )
  }

  const isPaid = order.paymentStatus === 'paid'
  const isCod = order.paymentMethod === 'cod'

  return (
    <>
      <SEOHead
        title={`Order Confirmed ${order.orderRef} | Velisqa`}
        description="Thank you for your purchase with Velisqa jewelry."
        canonicalPath={`/order-confirmation/${order.orderRef}`}
        noindex
      />
      <main className="page-offset-nav min-h-screen bg-[#F8F6F3] px-4 py-12 text-[#1A1A1A] sm:px-6 sm:py-16">
        <div className="mx-auto max-w-xl bg-white rounded-2xl border border-[#D4AF37]/15 p-6 sm:p-8 shadow-sm space-y-6">
          
          {/* Header checkmark */}
          <div className="text-center space-y-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#edf7f1] text-[#2d6a4f] text-3xl font-bold border border-emerald-200">
              ✓
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#B76E79]">Thank You</p>
            <h1 className="font-serif text-3xl font-bold text-[#3B0D23] uppercase tracking-[0.05em]">
              Order Confirmed
            </h1>
            <p className="mx-auto max-w-md text-xs text-[#514347] leading-relaxed">
              Your order has been successfully placed. We'll send your order updates via SMS / WhatsApp.
            </p>
          </div>

          {/* Reference Block */}
          <div className="rounded-xl bg-[#F8F6F3] p-4 text-center">
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#847377]">Order Reference</span>
            <p className="font-mono text-base font-bold text-[#3B0D23] mt-0.5">{order.orderRef}</p>
          </div>

          {/* Products Summary */}
          <div className="border-t border-[#D4AF37]/10 pt-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#847377] mb-3">Items Ordered</h3>
            <ul className="divide-y divide-[#D4AF37]/10">
              {(order.items || []).map((item, index) => (
                <li key={`${item.name}-${index}`} className="flex items-center gap-3 py-3">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-14 w-12 shrink-0 rounded-md bg-[#F8F6F3] object-cover border border-[#D4AF37]/5"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-[#1A1A1A]">{item.name}</p>
                    <p className="mt-0.5 text-[10px] text-[#847377]">
                      {item.quantity} × {formatInr(item.unitPrice)}
                    </p>
                  </div>
                  <p className="text-xs font-bold text-[#3B0D23] tabular-nums">{formatInr(item.lineTotal)}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Payment & Delivery Status */}
          <div className="grid gap-4 border-t border-[#D4AF37]/10 pt-4 sm:grid-cols-2 text-xs">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#847377]">Payment</span>
              <p className="font-semibold text-emerald-800 flex items-center gap-1">
                <span>✓</span>
                <span>{isPaid ? 'Paid Securely' : isCod ? 'Pay on Delivery' : 'Awaiting Payment'}</span>
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#847377]">Estimated Delivery</span>
              <p className="font-semibold text-[#3B0D23]">{expectedDate}</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="border-t border-[#D4AF37]/10 pt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              to={orderPrivateUrl('/orders', order.orderRef, accessToken)}
              className="w-full sm:w-auto inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#3B0D23] px-8 text-xs font-bold uppercase tracking-[0.12em] text-white hover:bg-[#2A0718] transition shadow-sm"
            >
              Track Order
            </Link>
            <Link
              to="/collections"
              className="w-full sm:w-auto inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#3B0D23]/20 px-8 text-xs font-bold uppercase tracking-[0.12em] text-[#3B0D23] hover:bg-[#3B0D23]/5 transition"
            >
              Continue Shopping
            </Link>
          </div>

        </div>
      </main>
    </>
  )
}
