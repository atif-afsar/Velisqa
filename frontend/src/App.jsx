import AccountRoute from './Components/AccountRoute'
import AdminRoute from './Components/AdminRoute'
import { scrollToTop } from './lib/smoothScrollState'
import Navbar from './Components/Navbar'
import PromoAnnouncementBar from './Components/Common/PromoAnnouncementBar'
import CartToast from './Components/Cart/CartToast'
import MiniCartDrawer from './Components/Cart/MiniCartDrawer'
import WishlistToast from './Components/Wishlist/WishlistToast'
import { Route, Routes, useLocation, Navigate } from 'react-router-dom'
import { Suspense, useEffect } from 'react'
import { analytics } from './lib/analytics'
import { captureAttribution } from './lib/attribution'
import ConsentBanner from './Components/Common/ConsentBanner'
import SiteFooter from './Components/SiteFooter'
import MobileTabBar from './Components/Nav/MobileTabBar'
import InactiveTabTitle from './Components/Common/InactiveTabTitle'
// Eager: the homepage HTML ships a prerendered hero, so its component must render on the first pass.
import Home from './Pages/Home'

import {
  About,
  Collections,
  Models,
  SEOLanding,
  Privacy,
  Terms,
  Authenticity,
  Shipping,
  ShippingDelivery,
  RefundCancellation,
  Contact,
  FAQ,
  Order,
  Login,
  AuthCallback,
  ResetPassword,
  AdminLogin,
  AdminHero,
  AdminBulkProducts,
  AdminHome,
  AdminDashboard,
  AdminCoupons,
  ProductDetail,
  SearchResults,
  Cart,
  Checkout,
  Wishlist,
  ManualPayment,
  ManualPaymentConfirmation,
  OrderTracking,
  AdminPayments,
  AdminOrders,
  AdminReviews,
  AdminReturns,
  MyOrders,
  Founders,
  AdminAnalytics,
  NotFound,
} from './pages'

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    scrollToTop({ immediate: true })
    analytics.pageView()
  }, [pathname])

  return null
}

/** Capture UTM / click-ID attribution from the landing URL (once). */
function AttributionCapture() {
  useEffect(() => {
    captureAttribution()
  }, [])
  return null
}

function App() {
  // The admin console has its own full-screen layout, without the storefront chrome.
  const isAdmin = useLocation().pathname.startsWith('/admin')
  return (
    <>
      <ScrollToTop />
      <AttributionCapture />
      <InactiveTabTitle />
      {!isAdmin && (
        <>
          <PromoAnnouncementBar />
          <Navbar />
          <MiniCartDrawer />
          <CartToast />
          <WishlistToast />
        </>
      )}
      <Suspense fallback={<div className="min-h-svh bg-paper" aria-label="Loading page" />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/models" element={<Models />} />
          <Route path="/collections" element={<Collections />} />
          <Route path="/collections/:slug" element={<Collections />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/pay/:orderRef" element={<ManualPayment />} />
          <Route path="/order-confirmation/:orderRef" element={<ManualPaymentConfirmation />} />
          <Route path="/orders/:orderRef" element={<OrderTracking />} />
          <Route
            path="/account/orders"
            element={(
              <AccountRoute>
                <MyOrders />
              </AccountRoute>
            )}
          />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/authenticity" element={<Authenticity />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/shipping-delivery" element={<ShippingDelivery />} />
          <Route path="/refund-cancellation" element={<RefundCancellation />} />
          <Route path="/shipping-returns" element={<Shipping />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/founders" element={<Founders />} />
          <Route path="/order" element={<Order />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin-login" element={<Navigate to="/admin" replace />} />
          <Route
            path="/admin/home"
            element={(
              <AdminRoute>
                <AdminHome />
              </AdminRoute>
            )}
          />
          <Route
            path="/admin/panel"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/payments"
            element={
              <AdminRoute>
                <AdminPayments />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <AdminRoute>
                <AdminOrders />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/reviews"
            element={
              <AdminRoute>
                <AdminReviews />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/coupons"
            element={
              <AdminRoute>
                <AdminCoupons />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/returns"
            element={
              <AdminRoute>
                <AdminReturns />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <AdminRoute>
                <AdminAnalytics />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/hero"
            element={(
              <AdminRoute>
                <AdminHero />
              </AdminRoute>
            )}
          />
          <Route
            path="/admin/bulk"
            element={(
              <AdminRoute>
                <AdminBulkProducts />
              </AdminRoute>
            )}
          />
          <Route path="/admin/dashboard" element={<Navigate to="/admin/home" replace />} />
          <Route path="/:slug" element={<SEOLanding />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      {!isAdmin && (
        <>
          <SiteFooter />
          <MobileTabBar />
          <ConsentBanner />
        </>
      )}
    </>
  )
}

export default App
