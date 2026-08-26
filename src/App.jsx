import SmoothScroll from './Components/SmoothScroll'
import AccountRoute from './Components/AccountRoute'
import AdminRoute from './Components/AdminRoute'
import { scrollToTop } from './lib/smoothScrollState'
import Navbar from './Components/Navbar'
import PromoAnnouncementBar from './Components/Common/PromoAnnouncementBar'
import CartToast from './Components/Cart/CartToast'
import MiniCartDrawer from './Components/Cart/MiniCartDrawer'
import WishlistToast from './Components/Wishlist/WishlistToast'
// import FloatingWhatsApp from './Components/WhatsApp/FloatingWhatsApp'
import { Route, Routes, useLocation, Navigate } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import { analytics } from './lib/analytics'
import { captureAttribution } from './lib/attribution'
import ConsentBanner from './Components/Common/ConsentBanner'

const Home = lazy(() => import('./Pages/Home'))
const About = lazy(() => import('./Pages/About'))
const Collections = lazy(() => import('./Pages/Collections'))
const Models = lazy(() => import('./Pages/Models'))
const SEOLanding = lazy(() => import('./Pages/SEOLanding'))
const Privacy = lazy(() => import('./Pages/Privacy'))
const Terms = lazy(() => import('./Pages/Terms'))
const Authenticity = lazy(() => import('./Pages/Authenticity'))
const Shipping = lazy(() => import('./Pages/Shipping'))
const ShippingDelivery = lazy(() => import('./Pages/ShippingDelivery'))
const RefundCancellation = lazy(() => import('./Pages/RefundCancellation'))
const Contact = lazy(() => import('./Pages/Contact'))
const FAQ = lazy(() => import('./Pages/FAQ'))
const Order = lazy(() => import('./Pages/Order'))
const Login = lazy(() => import('./Pages/Login'))
const AuthCallback = lazy(() => import('./Pages/AuthCallback'))
const AdminLogin = lazy(() => import('./Pages/AdminLogin'))
const AdminHome = lazy(() => import('./Pages/AdminHome'))
const AdminDashboard = lazy(() => import('./Pages/AdminDashboard'))
const AdminCoupons = lazy(() => import('./Pages/AdminCoupons'))
const ProductDetail = lazy(() => import('./Pages/ProductDetail'))
const SearchResults = lazy(() => import('./Pages/SearchResults'))
const Cart = lazy(() => import('./Pages/Cart'))
const Checkout = lazy(() => import('./Pages/Checkout'))
const Wishlist = lazy(() => import('./Pages/Wishlist'))
const ManualPayment = lazy(() => import('./Pages/ManualPayment'))
const ManualPaymentConfirmation = lazy(() => import('./Pages/ManualPaymentConfirmation'))
const OrderTracking = lazy(() => import('./Pages/OrderTracking'))
const AdminPayments = lazy(() => import('./Pages/AdminPayments'))
const AdminOrders = lazy(() => import('./Pages/AdminOrders'))
const AdminReviews = lazy(() => import('./Pages/AdminReviews'))
const AdminReturns = lazy(() => import('./Pages/AdminReturns'))
const MyOrders = lazy(() => import('./Pages/MyOrders'))
const Founders = lazy(() => import('./Pages/Founders'))
const AdminAnalytics = lazy(() => import('./Pages/AdminAnalytics'))

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
  return (
    <>
      <SmoothScroll />
      <ScrollToTop />
      <AttributionCapture />
      <PromoAnnouncementBar />
      <Navbar />
      <MiniCartDrawer />
      <CartToast />
      <WishlistToast />
      <Suspense fallback={<div className="min-h-[60vh] bg-[#fdf9f4]" aria-label="Loading page" />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/models" element={<Models />} />
          <Route path="/collections" element={<Collections />} />
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
          <Route path="/admin/dashboard" element={<Navigate to="/admin/home" replace />} />
          <Route path="/:slug" element={<SEOLanding />} />
        </Routes>
      </Suspense>
      {/* <FloatingWhatsApp /> */}
      <ConsentBanner />
    </>
  )
}

export default App
