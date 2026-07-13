import SmoothScroll from './Components/SmoothScroll'
import AdminRoute from './Components/AdminRoute'
import { scrollToTop } from './lib/smoothScrollState'
import Navbar from './Components/Navbar'
import PromoAnnouncementBar from './Components/Common/PromoAnnouncementBar'
import CartToast from './Components/Cart/CartToast'
import WishlistToast from './Components/Wishlist/WishlistToast'
// import FloatingWhatsApp from './Components/WhatsApp/FloatingWhatsApp'
import { Route, Routes, useLocation, Navigate } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'

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
const AdminDashboard = lazy(() => import('./Pages/AdminDashboard'))
const ProductDetail = lazy(() => import('./Pages/ProductDetail'))
const Cart = lazy(() => import('./Pages/Cart'))
const Wishlist = lazy(() => import('./Pages/Wishlist'))

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    scrollToTop({ immediate: true })
  }, [pathname])

  return null
}

function App() {
  return (
    <>
      <SmoothScroll />
      <ScrollToTop />
      <PromoAnnouncementBar />
      <Navbar />
      <CartToast />
      <WishlistToast />
      <Suspense fallback={<div className="min-h-[60vh] bg-[#fdf9f4]" aria-label="Loading page" />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/models" element={<Models />} />
          <Route path="/collections" element={<Collections />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/authenticity" element={<Authenticity />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/shipping-delivery" element={<ShippingDelivery />} />
          <Route path="/refund-cancellation" element={<RefundCancellation />} />
          <Route path="/shipping-returns" element={<Shipping />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/order" element={<Order />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin-login" element={<Navigate to="/admin" replace />} />
          <Route
            path="/admin/panel"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route path="/admin/dashboard" element={<Navigate to="/admin/panel" replace />} />
          <Route path="/:slug" element={<SEOLanding />} />
        </Routes>
      </Suspense>
      {/* <FloatingWhatsApp /> */}
    </>
  )
}

export default App
