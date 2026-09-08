import { Link } from 'react-router-dom'
import SEOHead from '../Components/SEO/SEOHead'
import { orderPrivateUrl } from '../lib/manualPayments'
import { usePrivateOrder } from '../hooks/usePrivateOrder'
import { formatInr } from '../lib/cartStock'
import { useMemo, useEffect, useState } from 'react'
import { analytics } from '../lib/analytics'
import { shopCategories } from '../Components/Home/homeData'
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
      <main className="page-offset-nav min-h-[65vh] bg-[#F8F6F3] p-8 text-center flex flex-col justify-center items-center gap-4">
        <div className="relative flex h-14 w-14 items-center justify-center">
          <div className="absolute h-full w-full animate-ping rounded-full bg-[#3B0D23]/15"></div>
          <svg className="animate-spin h-8 w-8 text-[#3B0D23]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <span className="font-serif text-lg text-[#3B0D23]">Loading confirmation details…</span>
      </main>
    )
  }

  if (error || !order) {
    return (
      <main className="page-offset-nav min-h-[65vh] bg-[#F8F6F3] px-4 py-16 text-center">
        <div className="mx-auto max-w-md rounded-2xl border border-[#D4AF37]/20 bg-white p-8 shadow-sm">
          <h1 className="font-serif text-2xl font-bold text-[#3B0D23]">Order Link Unavailable</h1>
          <p className="mt-3 text-sm text-[#514347]">{error || 'We could not retrieve details for this order.'}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#3B0D23] px-6 text-xs font-bold uppercase tracking-[0.1em] text-white hover:bg-[#2A0718]"
            >
              Return Home
            </Link>
            <Link
              to="/collections"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#3B0D23]/30 px-6 text-xs font-bold uppercase tracking-[0.1em] text-[#3B0D23] hover:bg-[#3B0D23]/5"
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
      <main className="page-offset-nav min-h-screen bg-[#FDFBF7] px-4 py-8 text-[#1A1A1A] sm:px-6 sm:py-14">
        <div className="mx-auto max-w-3xl space-y-8">
          
          {/* Main Success Card */}
          <div className="overflow-hidden rounded-3xl border border-[#D4AF37]/20 bg-white p-6 shadow-md sm:p-10">
            {/* Header / Celebration */}
            <div className="text-center space-y-3">
              <div className="mx-auto relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-[#2d6a4f] to-[#52b788] text-white text-4xl font-bold shadow-lg shadow-[#2d6a4f]/20">
                <span>✓</span>
              </div>
              <div className="pt-2">
                <span className="inline-block rounded-full bg-[#edf7f1] px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#2d6a4f] border border-[#2d6a4f]/20">
                  Order Successfully Placed
                </span>
              </div>
              <h1 className="font-serif text-3xl font-bold text-[#3B0D23] sm:text-4xl tracking-tight">
                Thank You, {order.customerName ? order.customerName.split(' ')[0] : 'Valued Customer'}!
              </h1>
              <p className="mx-auto max-w-md text-sm text-[#514347] leading-relaxed">
                Your luxury jewellery piece is being prepared with utmost care. You will receive real-time SMS &amp; WhatsApp updates as your parcel moves.
              </p>
            </div>

            {/* Order Reference Pill */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-[#F8F6F3] p-4 text-center border border-[#D4AF37]/15">
              <span className="text-xs font-semibold text-[#847377]">Order Reference:</span>
              <span className="font-mono text-base font-bold text-[#3B0D23]">{order.orderRef}</span>
              <button
                type="button"
                onClick={handleCopyRef}
                className="ml-2 rounded-full border border-[#3B0D23]/20 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#3B0D23] hover:bg-[#3B0D23] hover:text-white transition"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            {/* Visual Order Progress Tracker */}
            <div className="mt-8 border-t border-[#D4AF37]/15 pt-6">
              <h3 className="text-center text-[10px] font-bold uppercase tracking-[0.16em] text-[#847377] mb-6">
                Delivery Timeline
              </h3>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="space-y-1.5">
                  <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#2d6a4f] text-white font-bold text-xs shadow-sm">
                    ✓
                  </div>
                  <p className="font-bold text-[#1b4332] text-[11px]">Placed</p>
                  <p className="text-[10px] text-[#514347]">Confirmed</p>
                </div>
                <div className="space-y-1.5">
                  <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#3B0D23] text-white font-bold text-xs">
                    2
                  </div>
                  <p className="font-bold text-[#3B0D23] text-[11px]">Packing</p>
                  <p className="text-[10px] text-[#514347]">Quality Checked</p>
                </div>
                <div className="space-y-1.5">
                  <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#F8F6F3] border border-[#3B0D23]/20 text-[#514347] font-semibold text-xs">
                    3
                  </div>
                  <p className="font-medium text-[#514347] text-[11px]">Shipped</p>
                  <p className="text-[10px] text-[#847377]">NimbusPost</p>
                </div>
                <div className="space-y-1.5">
                  <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#F8F6F3] border border-[#3B0D23]/20 text-[#514347] font-semibold text-xs">
                    4
                  </div>
                  <p className="font-medium text-[#514347] text-[11px]">Delivered</p>
                  <p className="text-[10px] text-[#847377]">{expectedDate}</p>
                </div>
              </div>
            </div>

            {/* Products Summary */}
            <div className="mt-8 border-t border-[#D4AF37]/15 pt-6">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#847377] mb-4">
                Ordered Items ({(order.items || []).length})
              </h3>
              <ul className="divide-y divide-[#D4AF37]/10">
                {(order.items || []).map((item, index) => (
                  <li key={`${item.name}-${index}`} className="flex items-center gap-4 py-3.5">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-16 w-14 shrink-0 rounded-xl bg-[#F8F6F3] object-cover border border-[#D4AF37]/15 shadow-sm"
                      />
                    ) : (
                      <div className="h-16 w-14 shrink-0 rounded-xl bg-[#F8F6F3] flex items-center justify-center text-xs text-[#847377] border">
                        Jewellery
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-[#130006] truncate">{item.name}</p>
                      <p className="mt-1 text-xs text-[#847377]">
                        Qty: {item.quantity} × {formatInr(item.unitPrice)}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-[#3B0D23] tabular-nums">{formatInr(item.lineTotal)}</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Payment & Estimated Delivery Status */}
            <div className="mt-6 grid gap-4 rounded-2xl bg-[#FDFBF7] p-5 border border-[#D4AF37]/15 sm:grid-cols-2 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#847377]">Payment Status</span>
                <p className="font-semibold text-emerald-800 flex items-center gap-1.5 text-sm">
                  <span>✓</span>
                  <span>{isPaid ? 'Paid Securely via Razorpay' : isCod ? 'Pay on Delivery (COD)' : 'Payment Verified'}</span>
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#847377]">Expected Delivery</span>
                <p className="font-semibold text-[#3B0D23] text-sm">{expectedDate}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center border-t border-[#D4AF37]/15 pt-6">
              <Link
                to={orderPrivateUrl('/orders', order.orderRef, accessToken)}
                className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-[#3B0D23] px-8 text-xs font-bold uppercase tracking-[0.12em] text-white hover:bg-[#2A0718] transition shadow-sm"
              >
                Track My Order →
              </Link>
              <Link
                to="/collections"
                className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#3B0D23]/25 bg-white px-8 text-xs font-bold uppercase tracking-[0.12em] text-[#3B0D23] hover:bg-[#3B0D23]/5 transition"
              >
                Continue Shopping
              </Link>
              <a
                href={whatsappHelpUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-[#25D366]/10 border border-[#25D366]/30 px-6 text-xs font-bold uppercase tracking-[0.1em] text-[#128C7E] hover:bg-[#25D366]/20 transition"
              >
                WhatsApp Concierge
              </a>
            </div>
          </div>

          {/* Explore Other Categories Section */}
          <section className="space-y-4 pt-4">
            <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[#D4AF37]/15 pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#B76E79]">Curated For You</p>
                <h2 className="font-serif text-2xl font-bold text-[#3B0D23]">Explore Other Categories</h2>
              </div>
              <Link
                to="/collections"
                className="text-xs font-bold uppercase tracking-[0.1em] text-[#3B0D23] hover:underline"
              >
                View All Collections →
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
              {shopCategories.map((cat) => (
                <Link
                  key={cat.label}
                  to={`/collections?category=${cat.type.toLowerCase()}`}
                  className="group flex flex-col items-center rounded-2xl border border-[#D4AF37]/15 bg-white p-3 text-center shadow-sm hover:border-[#3B0D23]/40 hover:shadow-md transition duration-300"
                >
                  <div className="aspect-square w-full overflow-hidden rounded-xl bg-[#F8F6F3]">
                    <img
                      src={cat.image}
                      alt={cat.label}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <span className="mt-2.5 font-serif text-sm font-semibold text-[#130006] group-hover:text-[#3B0D23]">
                    {cat.label}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.08em] text-[#847377] group-hover:text-[#B76E79]">
                    Shop Now
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {/* Quick Return to Home Footer Banner */}
          <div className="rounded-2xl border border-[#D4AF37]/15 bg-gradient-to-r from-[#3B0D23] to-[#511330] p-6 text-center text-white shadow-sm sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]">Velisqa Luxury</p>
            <h3 className="font-serif text-2xl font-semibold mt-1">Discover Handcrafted Elegance</h3>
            <p className="mx-auto mt-2 max-w-md text-xs text-white/80 leading-relaxed">
              Explore statement necklaces, premium earrings, and authentic bridal collections on our homepage.
            </p>
            <div className="mt-5">
              <Link
                to="/"
                className="inline-flex min-h-[42px] items-center justify-center rounded-full bg-white px-7 text-xs font-bold uppercase tracking-[0.1em] text-[#3B0D23] hover:bg-[#FDFBF7] transition shadow-sm"
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
