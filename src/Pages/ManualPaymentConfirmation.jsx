import { Link } from 'react-router-dom'
import SEOHead from '../Components/SEO/SEOHead'
import { orderPrivateUrl } from '../lib/manualPayments'
import { usePrivateOrder } from '../hooks/usePrivateOrder'
import { formatInr } from '../lib/cartStock'
import { useMemo, useEffect, useState } from 'react'
import { analytics } from '../lib/analytics'
import { SHOP_CATEGORIES, categoryPath } from '../data/shopCategories'
import { WHATSAPP_PHONE } from '../Components/SEO/siteConfig'

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
  const [copied, setCopied] = useState(false)

  // Safety-net purchase tracking — deduplication prevents double-fire
  useEffect(() => {
    if (!order?.orderRef) return
    analytics.purchase({
      transaction_id: order.orderRef,
      value: Number(order.total) || 0,
      items: (order.items || []).map((item) => ({
        id: item.productId || item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
    })
  }, [order?.orderRef]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleCopyRef() {
    if (!order?.orderRef) return
    navigator.clipboard.writeText(order.orderRef)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <main className="page-offset-nav min-h-[65vh] bg-mist p-8 text-center flex flex-col justify-center items-center gap-4">
        <div className="relative flex h-14 w-14 items-center justify-center">
          <div className="absolute h-full w-full animate-ping rounded-full bg-ink/15"></div>
          <svg className="animate-spin h-8 w-8 text-ink" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <span className="font-serif text-lg text-ink">Loading confirmation details…</span>
      </main>
    )
  }

  if (error || !order) {
    return (
      <main className="page-offset-nav min-h-[65vh] bg-mist px-4 py-16 text-center">
        <div className="mx-auto max-w-md border border-line bg-white p-8">
          <h1 className="font-serif text-2xl font-bold text-ink">Order Link Unavailable</h1>
          <p className="mt-3 text-sm text-body">{error || 'We could not retrieve details for this order.'}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/"
              className="inline-flex min-h-[44px] items-center justify-center bg-ink px-6 text-xs font-bold uppercase tracking-[0.1em] text-white hover:bg-ink"
            >
              Return Home
            </Link>
            <Link
              to="/collections"
              className="inline-flex min-h-[44px] items-center justify-center border border-ink/30 px-6 text-xs font-bold uppercase tracking-[0.1em] text-ink hover:bg-ink/5"
            >
              Browse Shop
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const isPaid = order.paymentStatus === 'paid'
  const isCod = order.paymentMethod === 'cod'
  const whatsappHelpUrl = `https://wa.me/${WHATSAPP_PHONE.replace(/\+/g, '')}?text=${encodeURIComponent(
    `Hello Velisqa! I just placed order ${order.orderRef}. Could you assist me with tracking details?`
  )}`

  return (
    <>
      <SEOHead
        title={`Order Confirmed ${order.orderRef} | VELISQA`}
        description="Thank you for your purchase with Velisqa luxury jewellery."
        canonicalPath={`/order-confirmation/${order.orderRef}`}
        noindex
      />
      <main className="page-offset-nav min-h-screen bg-paper px-4 py-8 text-ink sm:px-6 sm:py-14">
        <div className="mx-auto max-w-3xl space-y-8">
          
          {/* Main Success Card */}
          <div className="overflow-hidden border border-line bg-white p-6 sm:p-10">
            {/* Header / Celebration */}
            <div className="text-center space-y-3">
              <div className="mx-auto relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-[#2d6a4f] to-[#52b788] text-white text-4xl font-bold shadow-[#2d6a4f]/20">
                <span>✓</span>
              </div>
              <div className="pt-2">
                <span className="inline-block bg-[#edf7f1] px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#2d6a4f] border border-[#2d6a4f]/20">
                  Order Successfully Placed
                </span>
              </div>
              <h1 className="font-serif text-3xl font-bold text-ink sm:text-4xl tracking-tight">
                Thank You, {order.customerName ? order.customerName.split(' ')[0] : 'Valued Customer'}!
              </h1>
              <p className="mx-auto max-w-md text-sm text-body leading-relaxed">
                Your luxury jewellery piece is being prepared with utmost care. You will receive real-time SMS &amp; WhatsApp updates as your parcel moves.
              </p>
            </div>

            {/* Order Reference Pill */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 bg-mist p-4 text-center border border-line">
              <span className="text-xs font-semibold text-muted">Order Reference:</span>
              <span className="font-mono text-base font-bold text-ink">{order.orderRef}</span>
              <button
                type="button"
                onClick={handleCopyRef}
                className="ml-2 border border-ink/20 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-ink hover:bg-ink hover:text-white transition"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            {/* Visual Order Progress Tracker */}
            <div className="mt-8 border-t border-line pt-6">
              <h3 className="text-center text-[10px] font-bold uppercase tracking-[0.16em] text-muted mb-6">
                Delivery Timeline
              </h3>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="space-y-1.5">
                  <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#2d6a4f] text-white font-bold text-xs">
                    ✓
                  </div>
                  <p className="font-bold text-[#1b4332] text-[11px]">Placed</p>
                  <p className="text-[10px] text-body">Confirmed</p>
                </div>
                <div className="space-y-1.5">
                  <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-ink text-white font-bold text-xs">
                    2
                  </div>
                  <p className="font-bold text-ink text-[11px]">Packing</p>
                  <p className="text-[10px] text-body">Quality Checked</p>
                </div>
                <div className="space-y-1.5">
                  <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-mist border border-ink/20 text-body font-semibold text-xs">
                    3
                  </div>
                  <p className="font-medium text-body text-[11px]">Shipped</p>
                  <p className="text-[10px] text-muted">NimbusPost</p>
                </div>
                <div className="space-y-1.5">
                  <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-mist border border-ink/20 text-body font-semibold text-xs">
                    4
                  </div>
                  <p className="font-medium text-body text-[11px]">Delivered</p>
                  <p className="text-[10px] text-muted">{expectedDate}</p>
                </div>
              </div>
            </div>

            {/* Products Summary */}
            <div className="mt-8 border-t border-line pt-6">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted mb-4">
                Ordered Items ({(order.items || []).length})
              </h3>
              <ul className="divide-y divide-line">
                {(order.items || []).map((item, index) => (
                  <li key={`${item.name}-${index}`} className="flex items-center gap-4 py-3.5">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-16 w-14 shrink-0 bg-mist object-cover border border-line"
                      />
                    ) : (
                      <div className="h-16 w-14 shrink-0 bg-mist flex items-center justify-center text-xs text-muted border">
                        Jewellery
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-ink truncate">{item.name}</p>
                      <p className="mt-1 text-xs text-muted">
                        Qty: {item.quantity} × {formatInr(item.unitPrice)}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-ink tabular-nums">{formatInr(item.lineTotal)}</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Payment & Estimated Delivery Status */}
            <div className="mt-6 grid gap-4 bg-paper p-5 border border-line sm:grid-cols-2 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Payment Status</span>
                <p className="font-semibold text-emerald-800 flex items-center gap-1.5 text-sm">
                  <span>✓</span>
                  <span>{isPaid ? 'Paid Securely via Razorpay' : isCod ? 'Pay on Delivery (COD)' : 'Payment Verified'}</span>
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Expected Delivery</span>
                <p className="font-semibold text-ink text-sm">{expectedDate}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center border-t border-line pt-6">
              <Link
                to={orderPrivateUrl('/orders', order.orderRef, accessToken)}
                className="inline-flex min-h-[48px] items-center justify-center bg-ink px-8 text-xs font-bold uppercase tracking-[0.12em] text-white hover:bg-ink transition"
              >
                Track My Order →
              </Link>
              <Link
                to="/collections"
                className="inline-flex min-h-[48px] items-center justify-center border border-ink/25 bg-white px-8 text-xs font-bold uppercase tracking-[0.12em] text-ink hover:bg-ink/5 transition"
              >
                Continue Shopping
              </Link>
              <a
                href={whatsappHelpUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[48px] items-center justify-center bg-[#25D366]/10 border border-[#25D366]/30 px-6 text-xs font-bold uppercase tracking-[0.1em] text-[#128C7E] hover:bg-[#25D366]/20 transition"
              >
                WhatsApp Concierge
              </a>
            </div>
          </div>

          {/* Explore Other Categories Section */}
          <section className="space-y-4 pt-4">
            <div className="flex flex-wrap items-end justify-between gap-2 border-b border-line pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent-ink">Curated For You</p>
                <h2 className="font-serif text-2xl font-bold text-ink">Explore Other Categories</h2>
              </div>
              <Link
                to="/collections"
                className="text-xs font-bold uppercase tracking-[0.1em] text-ink hover:underline"
              >
                View All Collections →
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
              {SHOP_CATEGORIES.map((cat) => (
                <Link
                  key={cat.label}
                  to={categoryPath(cat)}
                  className="group flex flex-col items-center border border-line bg-white p-3 text-center hover:border-ink/40 transition duration-300"
                >
                  <div className="aspect-square w-full overflow-hidden bg-mist">
                    <img
                      src={cat.image(300)}
                      alt={cat.label}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <span className="mt-2.5 font-serif text-sm font-semibold text-ink group-hover:text-ink">
                    {cat.label}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.08em] text-muted group-hover:text-accent-ink">
                    Shop Now
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {/* Quick Return to Home Footer Banner */}
          <div className="border border-line bg-gradient-to-r from-ink to-[#511330] p-6 text-center text-white sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">Velisqa Luxury</p>
            <h3 className="font-serif text-2xl font-semibold mt-1">Discover Handcrafted Elegance</h3>
            <p className="mx-auto mt-2 max-w-md text-xs text-white/80 leading-relaxed">
              Explore statement necklaces, premium earrings, and authentic bridal collections on our homepage.
            </p>
            <div className="mt-5">
              <Link
                to="/"
                className="inline-flex min-h-[42px] items-center justify-center bg-white px-7 text-xs font-bold uppercase tracking-[0.1em] text-ink hover:bg-paper transition"
              >
                Back to Home
              </Link>
            </div>
          </div>

        </div>
      </main>
    </>
  )
}
