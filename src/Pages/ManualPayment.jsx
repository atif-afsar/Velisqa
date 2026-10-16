import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SEOHead from '../Components/SEO/SEOHead'
import PrivateOrderSummary from '../Components/Checkout/PrivateOrderSummary'
import { useCart } from '../context/CartContext'
import { formatInr } from '../lib/cartStock'
import { orderPrivateUrl } from '../lib/manualPayments'
import { trackPaymentProofSubmitted } from '../lib/metaPixel'
import { usePrivateOrder } from '../hooks/usePrivateOrder'
import { invokeEdgeFunction } from '../lib/invokeEdgeFunction'
import { loadRazorpay } from '../lib/loadRazorpay'

export default function ManualPayment() {
  const navigate = useNavigate()
  const { clearCart } = useCart()
  const { accessToken, order, loading, error, refresh } = usePrivateOrder()
  
  const [initializing, setInitializing] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [rzpActive, setRzpActive] = useState(false)

  useEffect(() => {
    if (!order || (order.paymentStatus !== 'payment_submitted' && order.paymentStatus !== 'paid')) return
    navigate(orderPrivateUrl('/order-confirmation', order.orderRef, accessToken), {
      replace: true,
    })
  }, [accessToken, navigate, order])

  // Automatically trigger Razorpay checkout on load once order details are ready
  useEffect(() => {
    if (order && ['pending', 'awaiting_payment'].includes(order.paymentStatus) && order.paymentMethod !== 'cod' && !rzpActive && !initializing && !verifying && !paymentError) {
      void startRazorpayCheckout()
    }
  }, [order])

  async function startRazorpayCheckout() {
    setInitializing(true)
    setPaymentError('')
    
    try {
      const { data, error: initError } = await invokeEdgeFunction('create-razorpay-order', {
        orderId: order.orderRef,
        accessToken,
      })

      if (initError) {
        setPaymentError(initError)
        setInitializing(false)
        return
      }

      const Razorpay = await loadRazorpay()

      const options = {
        key: data.razorpayKeyId,
        amount: data.amount,
        currency: data.currency,
        name: 'VELISQA',
        description: `Order ${data.orderRef}`,
        order_id: data.razorpayOrderId,
        prefill: {
          name: order.customerName,
          email: order.customerEmail || '',
          contact: order.customerPhone,
        },
        theme: {
          color: '#111111',
        },
        handler: async function (response) {
          setRzpActive(false)
          setInitializing(false)
          setVerifying(true)
          
          const { error: verifyError } = await invokeEdgeFunction('verify-razorpay-payment', {
            orderId: order.id,
            accessToken,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          })

          if (verifyError) {
            setPaymentError(verifyError)
            setVerifying(false)
          } else {
            clearCart()
            trackPaymentProofSubmitted({ orderRef: order.orderRef, value: order.grandTotal })
            navigate(orderPrivateUrl('/order-confirmation', order.orderRef, accessToken), {
              replace: true,
            })
          }
        },
        modal: {
          ondismiss: function () {
            setRzpActive(false)
            setInitializing(false)
          },
        },
      }

      const rzp = new Razorpay(options)
      setRzpActive(true)
      rzp.open()
    } catch (err) {
      console.error('Razorpay initialization error:', err)
      setPaymentError(err?.message || 'Could not connect to Razorpay. Please try again.')
      setInitializing(false)
    }
  }

  if (loading) {
    return (
      <main className="page-offset-nav flex min-h-[60vh] flex-col items-center justify-center bg-mist p-8 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink border-t-transparent" />
        <p className="mt-4 text-sm text-body">Loading order details…</p>
      </main>
    )
  }

  if (error || !order) {
    return (
      <main className="page-offset-nav min-h-[60vh] bg-mist px-4 py-16 text-center">
        <h1 className="font-serif text-2xl text-ink">Payment link unavailable</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-body">{error}</p>
        <Link to="/contact" className="mt-6 inline-flex text-sm font-semibold text-ink hover:underline">
          Contact support
        </Link>
      </main>
    )
  }

  if (order.paymentStatus === 'payment_submitted' || order.paymentStatus === 'paid') return null

  return (
    <>
      <SEOHead
        title={`Pay for ${order.orderRef} | Velisqa`}
        description="Complete your Velisqa order payment securely via Razorpay."
        canonicalPath={`/pay/${order.orderRef}`}
        noindex
      />
      <main className="page-offset-nav min-h-screen bg-mist pb-28 text-ink sm:px-6 sm:py-14 sm:pb-14">
        {/* Sticky amount bar */}
        <div className="sticky top-[calc(var(--announcement-height)+var(--nav-height,0px))] z-30 border-b border-line bg-paper/95 px-4 py-3 backdrop-blur-md sm:static sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
          <div className="container-stitch mx-auto flex max-w-4xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted">Pay exactly</p>
              <p className="font-serif text-2xl font-semibold text-ink sm:text-4xl">{formatInr(order.grandTotal)}</p>
            </div>
            <div className="shrink-0 rounded-xl bg-mist px-3 py-2 text-right">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted">Order</p>
              <p className="max-w-[9rem] truncate font-mono text-[10px] font-semibold text-ink sm:max-w-none sm:text-[11px]">
                {order.orderRef}
              </p>
            </div>
          </div>
        </div>

        <div className="container-stitch mx-auto max-w-4xl px-4 pt-6">
          <div className="mb-6 text-center sm:mb-8">
            <h1 className="font-serif text-2xl font-semibold sm:text-4xl">Complete Payment</h1>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-body">
              Please pay via credit card, debit card, Net Banking, or UPI to confirm your order.
            </p>
          </div>

          <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
            {/* Pay action column */}
            <section className="order-1 flex flex-col items-center justify-center rounded-2xl border border-line bg-white p-6 shadow-[0_14px_44px_rgba(17, 17, 17,0.06)] sm:p-10 lg:col-start-1 lg:row-start-1">
              {initializing ? (
                <div className="flex flex-col items-center py-6">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-ink border-t-transparent" />
                  <p className="mt-4 text-center text-sm font-medium text-ink">Opening Razorpay Checkout…</p>
                  <p className="mt-1 text-center text-xs text-muted">This will only take a moment.</p>
                </div>
              ) : verifying ? (
                <div className="flex flex-col items-center py-6">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#2d6a4f] border-t-transparent" />
                  <p className="mt-4 text-center text-sm font-medium text-[#2d6a4f]">Verifying your payment…</p>
                  <p className="mt-1 text-center text-xs text-muted">Please do not close this window or refresh the page.</p>
                </div>
              ) : (
                <div className="w-full text-center py-4">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-ink/5 text-3xl">
                    💳
                  </div>
                  <h2 className="mt-4 font-serif text-lg font-semibold sm:text-xl">Payment Status: Pending</h2>
                  <p className="mt-2 text-sm text-body">
                    Your order was registered successfully. Complete checkout below to send it to our packing queue.
                  </p>

                  {paymentError && (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                      <strong>Payment Error:</strong> {paymentError}
                    </div>
                  )}

                  <button
                    onClick={() => void startRazorpayCheckout()}
                    className="mt-6 flex min-h-[52px] w-full items-center justify-center rounded-full bg-ink px-6 text-sm font-bold uppercase tracking-[0.08em] text-white transition hover:bg-ink active:scale-[0.98]"
                  >
                    Pay Now — {formatInr(order.grandTotal)}
                  </button>
                </div>
              )}
            </section>

            {/* Order details side-column */}
            <div className="order-2 lg:col-start-2 lg:row-start-1">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Your order details</p>
              <PrivateOrderSummary order={order} />
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
